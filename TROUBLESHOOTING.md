# Troubleshooting

Referência de problemas encontrados e soluções aplicadas. Atualizar sempre que um problema for confirmado como resolvido.

---

## Odoo JSON-RPC: PATCH /tickets/:id (write) falhando

**Sintomas:** Erros variados ao chamar `write` via `execute_kw`:
- `HelpdeskTicket.write() got an unexpected keyword argument 'name'`
- `too many values to unpack (expected 2)`
- `not enough values to unpack (expected at least 5, got 2)`

**Causa:** Formato incorreto dos parâmetros enviados ao `execute_kw`. O Odoo espera 7 argumentos posicionais:

```
execute_kw(db, uid, password, model, method, args, kwargs)
```

- 6º: **lista** com os argumentos posicionais do método (ex: `[[id], values]` para `write`)
- 7º: **dict** com os argumentos nomeados do método (ex: `{}` para `write`, `{limit, offset, fields}` para `search_read`)

**Solução:** Em `OdooJsonRpcService.executeKw`, enviar `args` e `kwargs` como 6º e 7º elementos, não espalhados:

```typescript
const fullArgs: unknown[] = [
  creds.odooDb,
  creds.odooUid,
  creds.odooPassword,
  model,
  method,
  args,   // 6º: lista de args do método
  kwargs // 7º: dict de kwargs do método
];
return this.call(creds.odooUrl, 'object', 'execute_kw', fullArgs, {});
```

**Referência:** [Odoo External RPC API](https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html) — seção "Calling methods".

---

## helpdesk.ticket.priority: Wrong value (ex.: 3)

**Sintomas:** `ValueError: Wrong value for helpdesk.ticket.priority: 3` ao criar ou atualizar ticket.

**Causa:** O campo `priority` do `helpdesk.ticket` é um Selection com valores fixos. Valores inválidos (ex.: `3`, `"3"`) ou tipos incorretos (integer em vez de string) geram erro.

**Solução:** Usar apenas os valores válidos, como **strings**:
- `"0"` = Baixa
- `"1"` = Normal
- `"2"` = Alta

Exemplo correto em `odoo`:
```json
{ "odoo": { "priority": "1" } }
```

Evitar: `"priority": 3`, `"priority": "3"`, `"priority": 1` (integer).

---

## Docker: exec format error ao rodar container

**Sintomas:** `exec format error` ou `failed to load docker-entrypoint.sh` ao iniciar o container em servidor/VPS.

**Causa:** Imagem construída em arquitetura diferente da do host (ex.: ARM64 no Mac M1 vs AMD64 no servidor).

**Solução:** O script `npm run docker:push` usa `--platform linux/amd64` por padrão. Reconstrua e faça push novamente.

---

## GET /knowledge/articles: Domain() invalid item in domain: []

**Sintomas:** `ValueError: Domain() invalid item in domain: []` ao listar artigos.

**Causa:** O `search_read` recebia `[[domain]]`; quando `domain = []`, isso virava `[[[]]]` e o Odoo interpretava o domínio como `[[]]` (lista com item inválido `[]`).

**Solução:** Passar `[domain]` em vez de `[[domain]]` para `search_read`. O primeiro argumento deve ser o domínio em si (`[]` para sem filtro), não uma lista aninhada.

---

## PostgreSQL: no pg_hba.conf entry for host, no encryption

**Sintomas:** `no pg_hba.conf entry for host "X.X.X.X", user "odoo_wrapper_api", database "odoo_wrapper_api", no encryption`

**Causa:** O servidor PostgreSQL exige conexões SSL (pg_hba.conf com `hostssl` ou similar), mas a aplicação está conectando sem SSL.

**Solução:** Definir `DATABASE_SSL=true` no `.env`. A config aplica SSL na conexão e, quando usa `DATABASE_URL`, adiciona `sslmode=require` à URL se ainda não estiver presente.

---
 
## PostgreSQL: self-signed certificate in certificate chain

**Sintomas:** `Error: self-signed certificate in certificate chain` ao conectar com SSL.

**Causa:** O servidor PostgreSQL usa certificado autoassinado; o Node.js rejeita por padrão. Além disso, o parâmetro `sslmode` na `DATABASE_URL` (ex.: `verify-full` injetado pelo provedor) **sobrescreve** o objeto `ssl` passado ao pg.Pool.

**Solução:** Definir `DATABASE_SSL_REJECT_UNAUTHORIZED=false` no `.env`. A config remove qualquer `sslmode` existente na URL e adiciona `sslmode=no-verify`, garantindo que a verificação seja desativada. Use apenas em ambientes confiáveis (ex.: VPS própria).

---

## GET /tickets/:id: messages vazio mesmo com respostas

**Sintomas:** Ao consultar um ticket com respostas, o array `messages` retorna vazio.

**Causa:** `message_ids` pode não vir no read do ticket em algumas versões; ou o `read` de `mail.message` falha (ex.: permissão) e o erro era engolido.

**Solução:** O `TicketsService.read` agora:
1. Garante `message_ids` nos fields quando o usuário passa campos customizados
2. Extrai IDs de `message_ids` em vários formatos (`[1,2,3]`, `[[1,"x"],[2,"y"]]`, etc.)
3. Usa fallback `search_read` em `mail.message` por `res_id` e `res_model` quando `message_ids` está vazio ou o `read` falha
4. Registra erros em log em vez de engolir silenciosamente

---

## Odoo Server Error: retorno 500

**Comportamento:** Quando o Odoo retorna erro com mensagem "Odoo Server Error" (ou código JSON-RPC -32603), a API responde com **HTTP 500** em vez de 502 (Bad Gateway). Erros de gateway/proxy continuam retornando 502.

---

## Knowledge: AccessError em audit_report_id

**Sintomas:** `AccessError: Failed to read field knowledge.article.audit_report_id` ao listar ou ler artigos da base de conhecimento.

**Causa:** O campo `audit_report_id` (e outros customizados) exigem permissões específicas (ex.: Accounting/Bookkeeper). Sem especificar `fields`, o Odoo retorna todos os campos.

**Solução:** A API passa a usar apenas campos essenciais por padrão: `id`, `name`, `body`, `parent_id`, `root_article_id`, `sequence`, `active`, `create_date`, `write_date`. Para campos customizados, use o parâmetro `fields` na query.
