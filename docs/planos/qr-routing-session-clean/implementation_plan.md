# Correções de QR Code, Sessão e Interface SPCI

Este plano aborda a correção de três anomalias reportadas no sistema SPCI e propõe melhorias na experiência do usuário técnico e administrativo, além de orientações para personalização do link de acesso.

## User Review Required

> [!IMPORTANT]
> **Alteração do Link de Credenciais Compartilhadas:**
> Para resolver a anomalia de login automático (onde o novo usuário abria o perfil do administrador), alteramos o link compartilhado para incluir o parâmetro `?new_session=true`. 
> O middleware do Next.js interceptará esse parâmetro e apagará os cookies de sessão ativos no navegador atual para forçar um login limpo. Isso afeta o administrador se ele clicar no próprio link de teste no mesmo navegador, deslogando-o. Por favor, confirme se este comportamento é aceitável.

## Open Questions

*Nenhuma questão em aberto pendente de aprovação.*

## Proposed Changes

---

### Componente: Utilitários e Helpers

#### [MODIFY] [utils.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/utils.ts)
- Adicionar a função auxiliar `extractIdOrHashFromUrl` para isolar o UUID ou o código de patrimônio quando uma URL completa for escaneada pelo leitor integrado do app.

---

### Componente: Banco de Dados Supabase

#### [MODIFY] [supabaseDb.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseDb.ts)
- Atualizar a função `fetchAtivoParaInspecao` para aceitar UUIDs que correspondam tanto à chave primária `id` quanto à coluna pública `qr_code_hash` na view de extintores, utilizando uma consulta lógica `OR`.

---

### Componente: Telas de Ronda e Inspeções

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/inspecao/page.tsx)
- Integrar `extractIdOrHashFromUrl` em `handleScanSuccess` para que leituras de URLs completas de QR Codes redirecionem corretamente para `/inspecao/[id]` sem anomalias de caminho relativo duplicado.

#### [MODIFY] [layout.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/layout.tsx)
- Chamar `extractIdOrHashFromUrl` em `handleQrScanSuccess` e expandir a lógica de busca local do React/IndexedDB para verificar também correspondências contra a propriedade `qr_code_hash`.

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/dashboard/page.tsx)
- Remover o bloco do banner verde de conexão do banco de dados ("Banco de Dados Supabase Conectado" / "Sessão Segura & Ativa") que ficava sob o painel principal, limpando a poluição visual reportada como "Google DB Conectante".

---

### Componente: Segurança e Acesso (Middleware e Configurações)

#### [MODIFY] [middleware.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/middleware.ts)
- Interceptar o parâmetro `new_session=true` nas requisições. Se presente, remover os cookies corporativos de sessão e redirecionar limpo para `/login`, quebrando qualquer persistência indesejada de credenciais administradoras no momento de onboarding.

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/configuracoes/page.tsx)
- Alterar as mensagens de envio de credenciais (tanto copiar clipboard quanto enviar via WhatsApp) para anexar o parâmetro `?new_session=true` ao link de login.

## Verification Plan

### Automated Tests
- Executar `npm run build` para garantir que as alterações no TypeScript e Next.js não quebrem a compilação de produção.

### Manual Verification
1. **Teste de QR Code:** Simular escaneamento de um QR Code completo (ex: contendo `https://dominio/qr/hash-uuid`) no app Ronda de Campo (`app/inspecao/page.tsx`) e verificar se o sistema direciona e abre a tela de vistoria correspondente com sucesso.
2. **Teste de Login Limpo:** Abrir o link gerado com `?new_session=true` em um navegador logado como administrador e confirmar que a sessão é limpa, redirecionando o usuário para a tela de login.
3. **Teste de Layout:** Acessar a Dashboard e garantir que a barra verde com informações de conexão do Supabase foi removida.
