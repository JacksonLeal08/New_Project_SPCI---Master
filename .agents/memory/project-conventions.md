---
type: project
created: 2026-05-25
updated: 2026-06-10
---


# Project Conventions

## Git Workflow
- Always create a new dedicated branch for major code changes.
- Branch name format should follow: `feature/[task-slug]` or `fix/[bug-slug]`.

## Arquivamento de Planos de Implementação (P0)
- **Cópia no Workspace:** Sempre que um Plano de Implementação (`implementation_plan.md`) ou Relatório de Entrega (`walkthrough.md`) for criado ou atualizado no diretório temporário do chat (`brain`), o assistente deve copiar uma versão para o diretório `/docs/planos/[slug]/` do projeto para persistência histórica.
- **Pergunta sobre Git Commit:** Antes de realizar commits das alterações de código, o assistente deve perguntar ao usuário se deseja incluir os arquivos do plano no commit, e oferecer incluir o resumo detalhado do plano no escopo da mensagem de commit do Git.
