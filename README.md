# Chirpy

A JSON API for a Twitter-like service: users sign up, log in, post short messages
("chirps"), and delete their own. Written in TypeScript with Express and
PostgreSQL.

Built while working through [Boot.dev](https://boot.dev)'s HTTP servers course, so
the feature list is the course's rather than mine. What is mine is every line of
the implementation, the design decisions behind it, and the reasoning recorded
against each one.

## Why look at this

It is a small codebase that covers the parts of a backend that are easy to get
subtly wrong:

- **Authentication that can actually be revoked.** Short-lived JWTs (1 hour) paired
  with long-lived refresh tokens stored in Postgres. A JWT cannot be withdrawn once
  signed, so the refresh token is the thing that has a row, an expiry and a
  `revoked_at` column — `POST /api/revoke` works because of that split.
- **Authentication vs authorization, kept separate.** `PUT /api/users` takes the id
  of the row to update from the *token*, never from the request body — there is
  deliberately no "which user?" parameter to tamper with. `DELETE /api/chirps/:id`
  answers 403, not 401, when the chirp belongs to someone else: the caller is known,
  and the answer is still no.
- **Passwords hashed with argon2** before they reach the database, so plaintext
  never appears in a query log.
- **Login that does not leak which emails exist.** A missing field, an unknown
  address and a wrong password all return the same 401 with the same message.
- **A machine-to-machine webhook** (`POST /api/polka/webhooks`) authenticated with a
  shared API key rather than a user token, because there is no logged-in person on
  the other end.
- **Schema as code.** The database shape lives in `src/db/schema.ts`; Drizzle
  generates the migration SQL from it, and the server applies pending migrations on
  boot.

## Requirements

- **Node 22** — the version is pinned in `.nvmrc`
- **PostgreSQL 16** running and reachable

## Install and run

```bash
git clone https://github.com/foreverjamila/Chirpy.git
cd Chirpy
npm install
```

Create the database:

```bash
createdb chirpy
```

Or, with Docker instead of a local install:

```bash
docker run --rm -d --name chirpy-pg \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 postgres:16
docker exec chirpy-pg createdb -U postgres chirpy
```

Create a `.env` file in the project root. All five variables are required — the
server throws on startup if any is missing, rather than booting in a half-configured
state:

```ini
DB_URL=postgres://postgres:postgres@localhost:5432/chirpy?sslmode=disable
PORT=8080
PLATFORM=dev
JWT_SECRET=<any long random string>
POLKA_KEY=<any string; the webhook caller must send this back>
```

A usable `JWT_SECRET`:

```bash
openssl rand -base64 64
```

Then start it:

```bash
npm run dev
```

That compiles TypeScript to `dist/` and starts the server on
`http://localhost:8080`. Migrations in `src/db/migrations/` are applied
automatically at boot, so there is no separate migrate step on a fresh database.

Check it is up:

```bash
curl localhost:8080/api/healthz
# OK
```

### Other commands

| Command | What it does |
| --- | --- |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the already-compiled server |
| `npm run dev` | Compile, then run |
| `npm test` | Run the unit tests (vitest) |
| `npm run generate` | Generate a migration after editing `src/db/schema.ts` |
| `npm run migrate` | Apply migrations manually |

## API

`Bearer` means an `Authorization: Bearer <access token>` header, obtained from
`POST /api/login`.

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `POST` | `/api/users` | — | Create an account from `email` + `password`. `201` |
| `POST` | `/api/login` | — | Returns the user, an access token and a refresh token. `200` |
| `PUT` | `/api/users` | Bearer | Update your own email and password. `200` |
| `POST` | `/api/refresh` | Bearer *refresh* token | Exchange a refresh token for a new access token. `200` |
| `POST` | `/api/revoke` | Bearer *refresh* token | Revoke a refresh token. `204` |
| `POST` | `/api/chirps` | Bearer | Post a chirp. Max 140 characters. `201` |
| `GET` | `/api/chirps` | — | List chirps. `200` |
| `GET` | `/api/chirps/:chirpId` | — | One chirp, or `404` |
| `DELETE` | `/api/chirps/:chirpId` | Bearer | Delete your own chirp. `204`, or `403` if it is not yours |
| `POST` | `/api/polka/webhooks` | `ApiKey` | Payment provider marks a user as Chirpy Red. `204` |
| `GET` | `/api/healthz` | — | Liveness probe. `200 OK` |
| `GET` | `/admin/metrics` | — | HTML page counting `/app` visits |
| `POST` | `/admin/reset` | — | Deletes all users and resets the counter. `403` unless `PLATFORM=dev` |
| `GET` | `/app/*` | — | Static file server, and the only route counted by `/admin/metrics` |

### Listing chirps

`GET /api/chirps` takes two optional query parameters:

| Parameter | Values | Default | Effect |
| --- | --- | --- | --- |
| `authorId` | a user's uuid | all authors | Return only that author's chirps |
| `sort` | `asc` \| `desc` | `asc` | Order by `created_at` |

```bash
curl "localhost:8080/api/chirps?authorId=<uuid>&sort=desc"
```

### Example: sign up, post, read back

```bash
# Create an account
curl -X POST localhost:8080/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"jemilat@example.com","password":"correct-horse-battery"}'

# Log in and keep the access token
TOKEN=$(curl -s -X POST localhost:8080/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"jemilat@example.com","password":"correct-horse-battery"}' \
  | jq -r .token)

# Post a chirp
curl -X POST localhost:8080/api/chirps \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"body":"Hello from Chirpy"}'

# Read them back, newest first
curl -s "localhost:8080/api/chirps?sort=desc" | jq
```

## How it is organised

```
src/
├── index.ts              Route table; runs migrations, then listens
├── config.ts             Environment variables, validated at startup
├── auth.ts               JWTs, argon2 hashing, Authorization header parsing
├── auth.test.ts          Unit tests for the above
├── api/
│   ├── chirps.ts         Chirp handlers
│   ├── users.ts          Account creation and update
│   ├── auth.ts           Login, refresh, revoke
│   ├── webhooks.ts       Polka payment webhook
│   ├── middleware.ts     Request logging, hit counter, error-to-status mapping
│   ├── errors.ts         Error classes that map to 400/401/403/404
│   └── metrics.ts, readiness.ts, reset.ts
└── db/
    ├── schema.ts         Table definitions — the source of truth for the schema
    ├── migrations/       Generated SQL, applied on boot
    └── queries/          One file per table
```

Handlers throw typed errors (`UserBadRequestError`, `UserUnAuthorizedError`,
`UserForbiddenError`, `UserNotFoundError`) and a single error-handling middleware
turns them into status codes. No handler sets an error status itself, so the
mapping lives in exactly one place.

## Licence

ISC
