# Plano de Implementação: Restrições de Log, Login com @ e Efeito de Desintegração de Ativos Premium

Este plano detalha as modificações necessárias para ocultar e proteger a seção de Logs do Sistema apenas para o perfil **Desenvolvedor**, ajustar o login do usuário para suportar nomes precedidos por `@` (como `@jfleal`) e aprimorar o efeito visual de desintegração (efeito Thanos) ao excluir um ativo para que as partículas fluam para fora do card (sem corte de `overflow: hidden`).

## User Review Required

> [!IMPORTANT]
> **Alteração do Efeito Visual de Desintegração:**
> Durante o efeito de desintegração, o container principal do card terá suas bordas, fundo e sombras ocultados instantaneamente (`bg-transparent border-transparent shadow-none`) e a propriedade `overflow` alterada de `hidden` para `visible`. O canvas de partículas será expandido em `150px` em cada direção para permitir que as partículas flutuem de forma livre e orgânica para fora dos limites originais do card.

> [!NOTE]
> **Consistência de Segurança:**
> Além de ocultar o link no menu lateral (`Sidebar`), a rota `/logs` e `/gestao-ativo` serão protegidas a nível de `middleware` e a nível de página (`page.tsx`) para garantir que mesmo digitando o caminho na barra de endereço, usuários que não possuem o cargo de **Desenvolvedor** sejam redirecionados ou bloqueados.

## Proposed Changes

---

### Componente: Interface do Dashboard (Menu Lateral)

#### [MODIFY] [Sidebar.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/Sidebar.tsx)
- Modificar o mapeamento do item `logs` em `navItems` para torná-lo condicional, exibindo-o somente se `userProfile?.role === 'Desenvolvedor'`.

---

### Componente: Página de Logs

#### [MODIFY] [page.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/logs/page.tsx)
- Adicionar validação de papel na página para que, caso o usuário não seja `Desenvolvedor`, seja exibida uma tela de acesso restrito.

---

### Componente: Segurança (Middleware)

#### [MODIFY] [middleware.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/middleware.ts)
- Adicionar validação de rotas restritas no middleware do Next.js. Se o cargo no cookie `spci_user_role` não for `Desenvolvedor`, tentativas de acesso às rotas `/logs` e `/gestao-ativo` serão redirecionadas para `/dashboard`.

---

### Componente: Autenticação (Supabase Auth)

#### [MODIFY] [supabaseAuth.ts](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/lib/supabaseAuth.ts)
- Atualizar a função `signInWithEmailOrUsername` para:
  1. Tratar strings de usuário que iniciam com o caractere `@`, limpando-o.
  2. Utilizar uma expressão regular para validar se o identificador realmente é um e-mail. Caso não seja (ou se for apenas um username limpo), realizar o lookup do e-mail associado na tabela `public.usuarios` antes de executar `signInWithPassword`.

---

### Componente: Visual (Efeito de Desintegração de Ativos)

#### [MODIFY] [DisintegrationOverlay.tsx](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/components/DisintegrationOverlay.tsx)
- Expandir o tamanho do canvas em `150px` em todas as quatro direções para evitar o corte de partículas.
- Atualizar o posicionamento absoluto do canvas via estilo CSS para `top: -150px; left: -150px; width: calc(100% + 300px); height: calc(100% + 300px)`.
- Adicionar um deslocamento (offset) de `150px` ao gerar e mover as partículas no canvas (posições inicializadas com `padding = 150`), garantindo que a renderização se alinhe perfeitamente aos limites originais do card e as partículas possam viajar para fora.

#### [MODIFY] [page.tsx (extintores)](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/extintores/page.tsx)
- Ajustar a classe do card container (`motion.div` em torno da linha 1579) para que, caso `deletingAssetId === asset.id`, ele mude dinamicamente para `overflow-visible border-transparent shadow-none bg-transparent` de modo a não restringir as partículas do canvas.

#### [MODIFY] [page.tsx (hidrantes)](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/hidrantes/page.tsx)
- Alterar o `div` do card para alternar dinamicamente suas classes, removendo bordas/sombras/background e aplicando `overflow-visible` no momento da exclusão (`deletingAssetId === asset.id`).

#### [MODIFY] [page.tsx (sinalizacao)](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/sinalizacao/page.tsx)
- Alterar o `div` do card para alternar dinamicamente suas classes, removendo bordas/sombras/background e aplicando `overflow-visible` no momento da exclusão (`deletingAssetId === asset.id`).

#### [MODIFY] [page.tsx (iluminacao)](file:///c:/Users/jacks/OneDrive/Documentos/Jackson%20Leal/ANTIGRAVITY_PROJECTS/New_Project_SPCI---Master/app/(dashboard)/iluminacao/page.tsx)
- Alterar o `div` do card para alternar dinamicamente suas classes, removendo bordas/sombras/background e aplicando `overflow-visible` no momento da exclusão (`deletingAssetId === asset.id`).

---

## Verification Plan

### Automated Tests
- Executar `npm.cmd run build` para validar se as modificações em TypeScript/Next.js compilam perfeitamente sem erros.

### Manual Verification
1. **Verificação de Sidebar (Técnico e Admin):** Logar com perfil Técnico (`iderlandiagm@gmail.com`) ou Administrador e certificar-se de que o menu "Logs do Sistema" não é renderizado na lateral.
2. **Verificação de Rota (/logs):** Tentar navegar manualmente para `/logs` com os perfis de Técnico e Admin e certificar-se de que há redirecionamento/bloqueio imediato.
3. **Teste de Login com `@`:** Tentar logar no Cockpit utilizando `@jfleal` (com a senha geral definida para ele) e garantir o sucesso da autenticação.
4. **Verificação Visual do Efeito Thanos (Desintegração):** Excluir um ativo de teste em qualquer uma das quatro abas (Extintores, Hidrantes, Sinalização, Iluminação) e verificar que as partículas de desintegração flutuam livremente para fora das bordas do card e que o card some de forma suave e premium.
