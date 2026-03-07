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
