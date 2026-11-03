# Planejador de Eventos · Feashion

App da Diretoria de Eventos da Feashion (Liga de Fashion Business da USP): planejamento de eventos, base de eventos, convidados, salas, calendário, documentos e membros.

- **Site:** GitHub Pages (este repositório).
- **Dados e login:** Firebase (Firestore + login com Google). Ficam na nuvem e são compartilhados entre todos os membros.
- **Acesso:** só os e-mails da lista "Quem pode entrar" (na página Membros) abrem o app. Todos têm as mesmas permissões.
- **Instalar:** no Chrome, use "Instalar app"; no iPhone, use Compartilhar → "Adicionar à Tela de Início".

## Estrutura
| Arquivo | Para que serve |
|---|---|
| `index.html` | O app (gerado por `tools/build.py` a partir das peças da Sandbox) |
| `plataforma.js` | Liga o app ao Firebase: login, lista de permitidos, arquivos, backup. Toda a conversa com o banco fica aqui. |
| `config.js` | Configuração pública do projeto Firebase |
| `firestore.rules` | Regras de segurança (colar em Firestore → Regras). O e-mail inicial fica só no console. |
| `sw.js`, `manifest.webmanifest`, `icons/` | App instalável e funcionamento sem internet |
| `vendor/` | Firebase 10.12.2 (compat) e PDF.js 3.11.174 |

## Coleções do Firestore
`eventos`, `salas`, `calendario`, `convidados`, `listas`, `documentos`, `parametros`, `membros/{uid}`, `permitidos/{email}`, `arquivos/{id}` (+ `partes/{n}` com o arquivo em base64), `perfisImportados/{email}` (temporária, para migração).

## Backup
Parâmetros → Backup: "Exportar tudo" baixa um JSON com todos os dados e arquivos; "Importar backup" grava de volta (substitui registros com o mesmo identificador).
