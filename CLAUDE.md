# Orientações para o agente neste repositório

## Handoffs do escritório

O Daniel trabalha em duas máquinas (escritório e casa). O que o agente do escritório deixa
registrado para a outra máquina fica em `docs/handoff/`, um arquivo por assunto, com data no nome.

**Quando o Daniel pedir para carregar um handoff, leia o arquivo correspondente por inteiro antes de
agir e siga o que ele diz.** Não carregue por conta própria: só quando for solicitado.

| Quando o Daniel pedir                                                                  | Arquivo                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| "carregar o handoff do relatório semanal de 02/10" (ou "relatório da semana 1 e 2/10") | `docs/handoff/2026-10-02-relatorio-semanal-e-publicacao.md` |
| "carregar o handoff de correspondentes de 07/10"                                       | `docs/handoff/2026-10-07-correspondentes.md`                |

Ao criar um handoff novo, acrescente uma linha nesta tabela com a frase que o Daniel vai usar.

## Convenções que valem aqui

- Commits em Conventional Commits. Os hooks (`husky`) rodam `lint-staged` no commit e `format:check` no
  push; não use `--no-verify` sem o Daniel autorizar na hora.
- Não escrever em `develop` nem em `main` e não fazer force push: o trabalho do escritório viaja em
  branches datadas (`escritorio-AAAA-MM-DD`).
