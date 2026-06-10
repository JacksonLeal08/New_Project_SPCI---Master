# Plano de Implementação: Links Compartilhados Temporários (Ronda de Campo)

Este plano detalha o desenvolvimento técnico para implementar **Links de Acesso Compartilhados e Temporários** para o portal de Ronda de Campo (`/inspecao`), conforme a nova lógica de segurança refinada. Isso permite que técnicos efetuem inspeções sem login manual, herdando um escopo seguro do usuário que compartilhou o link, com expiração automática à meia-noite (00:00), revogação ao efetuar logout e controle manual de encerramento pelo Cockpit.

---

## User Review Required

> [!IMPORTANT]
> ### 1. Lógica do Token Temporário (`shared_sessions`)
> Para não deixar as tabelas de ativos e locais abertas publicamente para toda a internet, criaremos uma tabela de controle de sessões compartilhadas (`shared_sessions`). 
> * Quando um usuário logado na Web compartilhar o link através do menu **Despacho & Ronda Campo** (`/ronda`), o sistema gerará um token único (UUID) associado ao seu usuário.
> * A URL de acesso enviada ao técnico conterá o token: `https://meudominio.com/inspecao?token=UUID`.
> * Ao acessar o link, o técnico recebe um cookie temporário local (`spci_shared_token`) que valida sua sessão.
> * **Segurança contra acessos indesejados:** Se um terceiro tentar acessar a rota `/inspecao` sem um token ou com um token inválido/revogado, ele será redirecionado imediatamente para a tela de login corporativo padrão.

> [!WARNING]
> ### 2. Regras de Expiração e Desconexão
> Conforme solicitado, o acesso do técnico no app de campo será invalidado sob três condições estritas:
> 1. **Meia-Noite (00:00):** O token possui expiração às 23:59:59 do próprio dia de criação. Após a meia-noite, a validação falhará e a conexão cairá.
> 2. **Logout do Compartilhador:** Quando o usuário que gerou o token clicar em "Sair do Cockpit" na aplicação web, o sistema executará uma query revogando todos os seus tokens ativos no banco.
> 3. **Encerramento Manual (End of Shift):** Adicionaremos um botão no Cockpit (`/ronda`) chamado **"Encerrar Acessos Despachados"** para permitir que o administrador revogue o token compartilhado imediatamente ao fim do turno.
> 4. **Resiliência Offline Pós-Expiração (Opção B Selecionada):** O banco de dados aceitará inspeções se a data em que foram preenchidas no celular (`data_inspecao`) for anterior à expiração do token (antes de 23:59:59), mesmo que o envio à rede ocorra após a meia-noite.

---

## Open Questions

> [!NOTE]
> ### Questões de Fluxo Adicionais (Aguardando Retorno)
> 
> 1. **Senha no Cadastro de Usuários (Configurações):**
>    Ao cadastrar novos colaboradores no painel de configurações, prefere **digitar a senha manualmente** ou deseja manter a **geração automática de senhas temporárias** pelo banco de dados?
> 
> 2. **Identificação do Técnico:**
>    Com o acesso sem login, o campo **Nome do Técnico** será livre para digitação no laudo. Deseja aplicar alguma validação extra ou manter como campo de texto normal?

## Decisões de Design Alinhadas

* **Estilo do Alerta no Mobile:** Será exibido um banner persistente em tons de âmbar no topo do formulário (com opção de fechar) contendo um botão de informação e ação explicativa.
* **Fluxo de Solicitação de Cadastro:** A ação de "Solicitar Cadastro" exibirá de forma amigável e direta que o técnico deve entrar em contato com o administrador responsável do sistema para a liberação de seu perfil individual.

---

## Proposed Changes

Abaixo estão as modificações propostas agrupadas por componente:

### 1. Banco de Dados (Supabase Migrations)

#### [NEW] [20260610010000_shared_sessions_schema.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260610010000_shared_sessions_schema.sql)
* Criar a tabela `shared_sessions` e funções de validação RPC para o cliente anônimo:
  ```sql
  -- Tabela para rastrear tokens de compartilhamento
  CREATE TABLE IF NOT EXISTS public.shared_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
      created_by_nome TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked'))
  );

  ALTER TABLE public.shared_sessions ENABLE ROW LEVEL SECURITY;

  -- Qualquer usuário autenticado pode criar sessões
  CREATE POLICY "Usuarios autenticados criam shared_sessions" 
  ON public.shared_sessions FOR INSERT TO authenticated WITH CHECK (true);

  -- Usuários autenticados podem ver suas próprias sessões
  CREATE POLICY "Usuarios veem suas proprias shared_sessions" 
  ON public.shared_sessions FOR SELECT TO authenticated USING (created_by = auth.uid());

  -- Usuários autenticados podem revogar suas próprias sessões
  CREATE POLICY "Usuarios atualizam suas proprias shared_sessions" 
  ON public.shared_sessions FOR UPDATE TO authenticated USING (created_by = auth.uid());

  -- Função RPC de validação de token usada pelo middleware e cliente público
  CREATE OR REPLACE FUNCTION public.validate_shared_token(p_token UUID)
  RETURNS JSONB
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
      v_session RECORD;
  BEGIN
      SELECT * INTO v_session FROM public.shared_sessions 
      WHERE id = p_token AND status = 'active' AND expires_at > now();

      IF FOUND THEN
          RETURN jsonb_build_object(
              'valid', true,
              'created_by', v_session.created_by,
              'created_by_nome', v_session.created_by_nome,
              'expires_at', v_session.expires_at
          );
      ELSE
          RETURN jsonb_build_object('valid', false);
      END IF;
  END;
  $$;
  ```

---

### 2. Roteamento e Segurança (Middleware)

#### [MODIFY] [middleware.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/middleware.ts)
* Atualizar o middleware para capturar o parâmetro `token` na query string ou ler o cookie `spci_shared_token`.
* Se um token válido for detectado (validado via chamada rápida à tabela ou RPC), permitir o acesso à rota `/inspecao` e anexar o cookie `spci_shared_token` com duração estendida até a meia-noite (23:59:59).
* Se o token não for fornecido e não houver um cookie `spci_session_token` (login tradicional), redirecionar o usuário para o `/login` corporativo, preservando a blindagem padrão do sistema.

---

### 3. Emissor de Convite e Visualizador (Cockpit de Ronda)

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/ronda/page.tsx)
* Integrar estado local de `activeSharedToken`.
* Na inicialização da página `/ronda`, buscar se há um token ativo gerado hoje pelo usuário logado. Caso contrário, criar um inserindo na tabela `shared_sessions`.
* Atualizar a montagem de links para incluir o parâmetro de token:
  * `const linkPortal = `${origin}/inspecao?token=${activeSharedToken}`;`
  * `const linkVistoria = `${origin}/inspecao/${selectedAsset.idAtivo}?token=${activeSharedToken}`;`
* Adicionar um card interativo no topo da ficha de despacho:
  * **Status da Conexão de Campo:** Mostra se o link compartilhado está "ATIVO" (verde).
  * Exibe o horário de expiração (meia-noite de hoje).
  * **Botão "Encerrar Acessos Compartilhados":** Permite atualizar o status do token para `revoked` no Supabase instantaneamente, interrompendo o acesso do técnico no mesmo segundo.
* **Componente de Aviso Premium (WARNING - Regras de Expiração):**
  * Inserir um ícone elegante de `Info` (Information) ao lado do status ou do painel de compartilhamento.
  * Ao clicar, abrir um modal premium com animação suave de entrada (Framer Motion `AnimatePresence` + `motion.div`) contendo a explicação didática do funcionamento das sessões temporárias.
  * O design utilizará uma paleta premium em tons escuros e bordas definidas de alto contraste (sem usar tons de roxo), exibindo de forma didática o impacto de realizar inspeções utilizando o link temporário de outro usuário (administrador) em vez de possuir um perfil individual, com as regras descritas no item abaixo.

---

### 4. Logout e Sessão no Contexto

#### [MODIFY] [SpciContext.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/context/SpciContext.tsx)
* Modificar a rotina de encerramento de sessão (`handleLogout` / `logout`):
  * Antes de realizar o `supabase.auth.signOut()`, executar uma query para atualizar os tokens ativos criados pelo usuário atual para `revoked`:
    ```typescript
    if (currentUser) {
      await supabase
        .from('shared_sessions')
        .update({ status: 'revoked' })
        .eq('created_by', currentUser.uid);
    }
    ```

---

### 5. RLS (Políticas de Tabelas de Ativos e Inspeções)

#### [NEW] [20260610020000_public_rls_policies.sql](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/supabase/migrations/20260610020000_public_rls_policies.sql)
* Implementar a função utilitária `public.is_valid_shared_token(p_token uuid)` e atualizar as políticas RLS para aceitarem a verificação de token nos cabeçalhos de requisição `x-shared-token` ou liberar operações sob validação:
  ```sql
  -- Função para validar se o header contém um token válido
  CREATE OR REPLACE FUNCTION public.current_request_has_valid_token()
  RETURNS BOOLEAN
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  DECLARE
      v_token_str TEXT;
      v_token UUID;
  BEGIN
      v_token_str := current_setting('request.headers', true)::json->>'x-shared-token';
      IF v_token_str IS NULL OR v_token_str = '' THEN
          RETURN FALSE;
      END IF;
      
      BEGIN
          v_token := v_token_str::UUID;
      EXCEPTION WHEN OTHERS THEN
          RETURN FALSE;
      END;

      RETURN EXISTS (
          SELECT 1 FROM public.shared_sessions
          WHERE id = v_token AND status = 'active' AND expires_at > now()
      );
  END;
  $$;

  -- Ajustar políticas das tabelas para aceitar ou técnico autenticado ou token HTTP válido
  -- 1. Locais
  DROP POLICY IF EXISTS "Leitura de locais para autenticados" ON public.locais;
  CREATE POLICY "Leitura de locais flexível" ON public.locais 
  FOR SELECT TO authenticated, anon 
  USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

  -- 2. Sub-locais
  DROP POLICY IF EXISTS "Leitura de sub_locais para autenticados" ON public.sub_locais;
  CREATE POLICY "Leitura de sub_locais flexível" ON public.sub_locais 
  FOR SELECT TO authenticated, anon 
  USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

  -- 3. Modelos
  DROP POLICY IF EXISTS "Leitura de modelos para autenticados" ON public.modelos_extintores;
  CREATE POLICY "Leitura de modelos flexível" ON public.modelos_extintores 
  FOR SELECT TO authenticated, anon 
  USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

  -- 4. Ativos Extintores
  DROP POLICY IF EXISTS "Leitura de ativos_extintores para autenticados" ON public.ativos_extintores;
  CREATE POLICY "Leitura de ativos_extintores flexível" ON public.ativos_extintores 
  FOR SELECT TO authenticated, anon 
  USING (auth.role() = 'authenticated' OR public.current_request_has_valid_token());

  -- 5. Inspeções Realizadas (Inserção pública)
  DROP POLICY IF EXISTS "Inserção de inspecoes para autenticados" ON public.inspecoes_realizadas;
  CREATE POLICY "Inserção de inspecoes flexível" ON public.inspecoes_realizadas 
  FOR INSERT TO authenticated, anon 
  WITH CHECK (auth.role() = 'authenticated' OR public.current_request_has_valid_token());
  ```

---

### 6. Inicialização do Supabase Client e Interface de Alerta no Portal Móvel

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/inspecao/[id]/page.tsx) e [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/inspecao/page.tsx)
* Capturar o token do cookie `spci_shared_token` na inicialização da página.
* Atualizar o cabeçalho global do cliente supabase com o token de cabeçalho `x-shared-token` caso o usuário seja anônimo, para que todas as queries de leitura e escrita passem pelas regras RLS descritas acima.
* **Componente de Alerta Móvel (WARNING - Informações do Link Temporário):**
  * Se o acesso for via token compartilhado (anônimo), renderizar no cabeçalho um badge de status em tons de âmbar ("Acesso Temporário") ou um ícone discreto de `Info`.
  * Ao clicar no ícone, disparar um **Bottom Sheet** (painel inferior deslizante) animado com spring physics via Framer Motion, ideal para telas de dispositivos móveis.
  * **Conteúdo Didático do WARNING:**
    1. **Uso de Login Alheio:** Alerta didaticamente que o técnico está operando sob a sessão/link gerada pelo administrador ("login de outro usuário").
    2. **Regras de Expiração:** Explica que a conexão se encerrará automaticamente à meia-noite (23:59:59), ao administrador deslogar do sistema ou ao clicar em "Encerrar Acessos".
    3. **Risco no Plantão Noturno:** Adverte que o técnico perderá a conexão à meia-noite, podendo interromper vistorias em andamento.
    4. **Solicitação de Cadastro (CTA):** Incentiva o técnico: *"Caso você não possua perfil de acesso individual cadastrado, solicite ao administrador a criação de seu cadastro nas configurações para fazer login diretamente e evitar desconexões."*

---

### 7. Lógica e Viabilidade PWA (Progressive Web App)

A implementação PWA já está pré-configurada no projeto via `app/manifest.ts` e registro do `sw.js` no `layout.tsx`. Para estender e otimizar essa lógica tanto para o Painel Web quanto para a Ronda de Campo Mobile, propomos as seguintes ações:
* **Viabilidade:** Totalmente viável. O PWA permite que a aplicação web e o portal técnico móvel `/inspecao` rodem em modo offline, instalando-se como aplicativo nativo no celular do técnico ou desktop do gestor.
* **Service Worker Avançado (`public/sw.js`):**
  * Configurar cache agressivo em estratégias *Stale-While-Revalidate* para assets estáticos (HTML, CSS, JS, fontes de ícones e fontes Google).
  * Isolar chamadas de API do Supabase e rotas `/api/` para bypass do cache do Service Worker, permitindo que a fila de sincronização `SyncQueue` (gerenciada via IndexedDB e `useSync`) envie as vistorias pendentes sem interferência do proxy de rede.
* **Banner de Instalação Customizado (A2HS):**
  * Detectar o evento `beforeinstallprompt` no Portal Técnico Móvel e na aplicação Web.
  * Renderizar um banner elegante, discreto e moderno estimulando o usuário a "Instalar Aplicativo SPCI" para acesso direto da tela inicial, melhorando a performance e experiência de uso em campo.

---

### 8. Lógica de Responsividade Total (Web & Mobile)

Garantiremos que todas as telas se adaptem a qualquer formato físico (Desktops UltraWide, Notebooks de 13", Tablets e Celulares de 320px de largura):
* **Web Dashboard (Painel de Controle / Configurações / Cockpit):**
  * Sidebar retrátil no mobile: no desktop fica fixo à esquerda; no mobile colapsa e abre em overlay/drawer lateral acionado por botão hambúrguer.
  * Gráficos e tabelas com rolagem horizontal contida ou transposição de linhas para cartões empilhados no mobile.
* **Portal de Inspeção Técnico (Mobile-First):**
  * Layout otimizado para operação com apenas uma das mãos (áreas de toque de pelo menos 44px x 44px de acordo com a WCAG).
  * Eliminação de hovers persistentes em dispositivos móveis que podem causar travamentos ou comportamentos indesejados.
  * Utilização de grids flexíveis (`grid-cols-2 sm:grid-cols-3 md:grid-cols-5`) para adaptar os cards de categoria e a listagem de equipamentos conforme a largura útil da tela.

---

## Verification Plan

### Automated Tests
* Executar `npx.cmd tsc --noEmit` para garantir ausência de quebras estáticas.
* Executar `npm.cmd run lint` para conformidade visual e de regras.

### Manual Verification
1. **Teste de Geração de Link:**
   * Logar com conta corporativa na Web, ir até a página `/ronda`.
   * Verificar a criação automática de registro de sessão na tabela `shared_sessions`.
   * Copiar o link de inspeção de um extintor.
2. **Teste de Acesso ao Link Compartilhado:**
   * Abrir uma aba anônima e colar o link copiado.
   * Confirmar se a tela de laudo do extintor correspondente abre perfeitamente, populando os campos com os dados do Supabase.
3. **Teste de Revogação por Logout:**
   * Efetuar o logout na aba da aplicação web.
   * Atualizar a aba anônima do técnico e garantir que o acesso foi bloqueado, redirecionando para a tela de login.
4. **Teste de Revogação Manual:**
   * Na página `/ronda`, clicar no botão "Encerrar Acessos Despachados".
   * Recarregar a aba anônima e atestar o bloqueio do laudo técnico.
