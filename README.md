# Odoo Wrapper API

API em NestJS que atua como wrapper da API do Odoo (instâncias odoo.com). Oferece autenticação baseada em login Odoo (OAuth-like), armazena sessões em PostgreSQL e expõe endpoints REST para CRUD de **Chamados** (Helpdesk) e **Base de Conhecimento** (Knowledge). A comunicação com o Odoo é feita via **JSON-RPC**.

## Requisitos

- Node.js 18+
- PostgreSQL
- Instância Odoo (ex.: odoo.com) com acesso à API externa (planos Custom)

## Instalação

```bash
npm install
cp .env.example .env
# Edite .env com DATABASE_*, ENCRYPTION_KEY, ODOO_DEFAULT_URL e ODOO_DEFAULT_DB.
```

## Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (default: 3000) |
| `DATABASE_URL` | URL de conexão Postgres (ou use `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`) |
| `DATABASE_SSL` | `true` para usar SSL na conexão com o Postgres (útil em clouds) |
| `DATABASE_SSL_REJECT_UNAUTHORIZED` | `false` para aceitar certificados auto-assinados (default: true quando SSL ativo) |
| `ENCRYPTION_KEY` | Chave para criptografar senhas Odoo nas sessões (mín. 32 caracteres) |
| `ODOO_DEFAULT_URL` | URL da instância Odoo (ex.: `https://mycompany.odoo.com`). Usada em todas as chamadas à API. Obrigatória. |
| `ODOO_DEFAULT_DB` | Nome do banco/instância Odoo (ex.: `mycompany`). Obrigatória. |
| `CORS_ORIGIN` | Origens permitidas para CORS (separadas por vírgula). Se não definido, permite todas em dev. Em produção, defina explicitamente. |

## Execução

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

O banco auxiliar (PostgreSQL) é usado para armazenar sessões/tokens; as operações de negócio (Chamados, Base de Conhecimento) são realizadas no Odoo via JSON-RPC.

## Swagger

A documentação interativa da API está disponível em:

**http://localhost:3000/api**

É possível testar os endpoints diretamente na UI. Para rotas protegidas, use **Authorize** e informe o token obtido no login (`Bearer <access_token>`).

## Endpoints

### Autenticação

- **POST /auth/login**  
  Body: `{ "username", "password" }` (ou `apiKey` no lugar de `password`). A URL e o banco do Odoo vêm de `ODOO_DEFAULT_URL` e `ODOO_DEFAULT_DB`.  
  Retorna: `{ "access_token", "expires_in" }`. Use o `access_token` no header `Authorization: Bearer <token>` nas demais rotas.

- **POST /auth/logout**  
  Requer `Authorization: Bearer <token>`. Invalida a sessão.

### Chamados (Helpdesk – modelo `helpdesk.ticket`)

- **GET /tickets** – Lista chamados (query: `teamId` obrigatório, `limit`, `offset`, `fields`, `state`, `odoo`)
- **GET /tickets/teams** – Lista equipes (query: `limit`, `offset`, `fields`, `odoo`)
- **GET /tickets/:id** – Obtém um chamado (query: `odoo`; inclui mensagens/respostas)
- **POST /tickets** – Cria chamado (body: `teamId` obrigatório, `name`, `description`, `odoo`)
- **POST /tickets/:id/responses** – Adiciona resposta (body: `body`, `message_type`, `subject`, `odoo`)
- **PATCH /tickets/:id** – Atualiza chamado (body: `name`, `description`, `odoo`)
- **DELETE /tickets/:id** – Remove chamado

### Base de Conhecimento (modelo `knowledge.article`)

- **GET /knowledge/articles** – Lista artigos (query: `limit`, `offset`, `fields`, `root_article_id`, `odoo`)
- **GET /knowledge/articles/:id** – Obtém um artigo (query: `odoo`)
- **POST /knowledge/articles** – Cria artigo (body: `name`, `body`, `odoo`)
- **PATCH /knowledge/articles/:id** – Atualiza artigo (body: `name`, `body`, `odoo`)
- **DELETE /knowledge/articles/:id** – Remove artigo

## Exemplo de uso

```bash
# Login (ODOO_DEFAULT_URL e ODOO_DEFAULT_DB devem estar definidas no .env)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"senha"}'

# Resposta: {"access_token":"abc123...","expires_in":86400}

# Listar chamados (teamId obrigatório)
curl -H "Authorization: Bearer abc123..." "http://localhost:3000/tickets?teamId=1"
```

## Propriedade dinâmica `odoo`

Todos os endpoints aceitam a propriedade `odoo` para enviar campos ou kwargs extras ao Odoo:

- **Body (POST/PATCH):** objeto `odoo` opcional, mesclado ao payload enviado ao Odoo (ex.: `{ "odoo": { "priority": "1", "tag_ids": [[6, 0, [1,2]]] } }`). Para `priority`, usar `"0"` (baixa), `"1"` (normal) ou `"2"` (alta).
- **Query (GET):** parâmetro `odoo` como JSON string (ex.: `?odoo={"order":"id desc"}`).

Isso permite usar campos do modelo Odoo sem alterar a API.

## Observações

- Nos planos Odoo Online (odoo.com), o usuário precisa ter senha definida (Settings → Users → Change Password) ou usar API Key para acesso via API.
- Os modelos `helpdesk.ticket` e `knowledge.article` dependem dos apps Helpdesk e Knowledge instalados na instância Odoo. Se não existirem, as chamadas podem retornar erro 502.
- A API externa JSON-RPC do Odoo (`/jsonrpc`) está prevista para remoção no Odoo 20; a migração para a nova API pode ser feita alterando apenas o cliente em `OdooJsonRpcService`.
