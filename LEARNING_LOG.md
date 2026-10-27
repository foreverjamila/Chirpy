# Chirpy — Learning Log

## Initial commits: saving the project to git (2026-10-18)

### What I just did

Turned an untracked working folder into two commits on `main` and pushed them to
`github.com/foreverjamila/Chirpy`. The repo had **no commits at all** before this —
`git log` reported *"your current branch 'main' does not have any commits yet"*, and
every file showed as `??` (untracked), not `M` (modified).

**Commit `735f232` — `chore: set up TypeScript and Express build tooling`**

| File | What it does |
|---|---|
| `.gitignore` | Keeps `node_modules/`, `dist/`, `server.log` out of git — all three are regenerated or local-only |
| `.nvmrc` | Records the Node version the project targets |
| `package.json` | Declares `"type": "module"` (ESM) and the `build`/`start`/`dev` scripts |
| `package-lock.json` | Pins exact dependency versions so installs are reproducible |
| `tsconfig.json` | `nodenext` resolution + `strict` mode, `src/` in and `dist/` out |

**Commit `85d91fe` — `feat: serve static app and add readiness endpoint`**

| File | What it does |
|---|---|
| `src/index.ts` | Entry point: creates the app, mounts static files, registers `/healthz`, listens on 8080 |
| `src/handler.ts` | `handlerReadiness` — returns plain-text `OK` |
| `src/middleware.ts` | `middlewareLogResponses` — logs non-200 responses |
| `src/app/index.html` | The static welcome page |
| `src/app/assets/logo.png` | Static asset |

**Deliberately left untracked:** `src/config.ts` — still just a bare `type APIConfig`
with no `export` and no importers, so excluding it breaks nothing.

### Key lines worth reading

- `src/index.ts:3` and `src/index.ts:9` — `index.ts` **imports and uses** `middleware.ts`.
  This is why `middleware.ts` could not be held back: a commit containing `index.ts`
  without it would not compile.
- `src/index.ts:8` — `app.use("/app", express.static("./src/app"))`. The static root is a
  path *relative to where the process starts*, which is why `src/app/**` belongs in the
  same commit as the entry point.
- `src/middleware.ts:14` — the `next()` call. Middleware that forgets this hangs every
  request.
- `src/handler.ts:4` — setting `Content-Type` explicitly, so `/healthz` is parseable by a
  machine instead of guessed at.

### How I can check it myself

```bash
git log --oneline --decorate        # two commits, main and origin/main together
git status --short                  # only ?? src/config.ts remains
git ls-tree -r HEAD --name-only     # exactly what got committed
git show --stat 85d91fe             # files in one commit
```

To prove a *commit* builds — not just your working folder, which may contain files git
never saved:

```bash
git archive HEAD | tar -x -C /tmp/verify-head
ln -s "$PWD/node_modules" /tmp/verify-head/node_modules
cd /tmp/verify-head && npx tsc --noEmit    # exit 0 = the commit compiles
```

This passed with exit 0.

### One thing to remember

**A commit is not "my folder right now" — it is the specific set of files you staged.**
Code can work perfectly on your disk while the committed snapshot is broken, because an
excluded file still exists locally for the compiler to find. That is exactly the trap here:
excluding `middleware.ts` would have left `index.ts` importing a module that is not in the
repo, and the breakage would only appear on a fresh clone. Before excluding a file, check
what imports it:

```bash
grep -rn "middleware" src/ --include=*.ts
```

### Mistake to avoid

Never reach for `git add -A` or `git add .` to "just save everything". It would have swept
`src/config.ts` straight in, silently undoing the exclusion. Stage explicit paths, then
read `git status` before committing — `A` means staged, `??` means still untracked.

### Open divergence (not resolved)

`.nvmrc` says **22.14.0**, but the installed Node is **22.15.0**
(`/home/hpjamila/.nvm/versions/node/v22.15.0/bin/node`). Committed as-is rather than
silently edited either way. Decide later whether to bump the file or install 22.14.0.

## Metrics ticket: counting requests to `/app` (2026-10-18)

### What I just did

Fixed three bugs in the hit-counter work. All three were **one concept wearing three
costumes**: in Express, every request must be either *answered* or *passed along*, and a
function that does neither leaves the request hanging until the client gives up.

| File | What changed |
|---|---|
| [src/middleware.ts](src/middleware.ts) | `middlewareMetricsInc` now passes control onward after incrementing, so static files actually get served |
| [src/handler.ts](src/handler.ts) | `/metrics` writes to the HTTP response instead of the server console; `/reset` now answers; handler renamed `handlerMetricsReport` |
| [src/index.ts](src/index.ts) | Import updated for the rename |
| [src/config.ts](src/config.ts) | (unchanged — was already correct) |

### Key lines worth reading

- [src/middleware.ts:19](src/middleware.ts#L19) — the hand-off. Before this line existed,
  **every single request to `/app` hung forever** and the homepage was dead. The counter
  still incremented, which is what made it confusing: the middleware clearly ran, it just
  never let go.
- [src/handler.ts:12](src/handler.ts#L12) — writing to the *response*, not to `console.log`.
  The old version logged `Hit: 6` to my terminal while the caller received nothing. The
  number existed; it was just pointed at the wrong audience.
- [src/handler.ts:11](src/handler.ts#L11) and [src/handler.ts:5](src/handler.ts#L5) — the
  same `Content-Type` line in both handlers. "Plain text" is a promise you make in a
  header, not something the body conveys on its own.
- [src/index.ts:7-8](src/index.ts#L7-L8) — registration order. The counter middleware is
  mounted on `/app` *before* `express.static`, which is what makes it count homepage hits
  rather than miss them.

### How I can check it myself

```bash
npx tsc && node dist/index.js > ~/chirpy.log 2>&1 &
curl -s http://localhost:8080/app/ >/dev/null   # hit the homepage
curl -s http://localhost:8080/app/ >/dev/null   # twice
curl -i --max-time 3 http://localhost:8080/metrics   # want: Hits: 2, text/plain
curl -i --max-time 3 http://localhost:8080/reset
curl -i --max-time 3 http://localhost:8080/metrics   # want: Hits: 0
kill $(pgrep -f "dist/inde[x].js")
```

Verified output: three homepage hits produced `Hits: 3`, reset produced `Hits: 0`
afterwards, and `/app/nope` returned 404 **and** was logged as
`[NON-OK] GET /app/nope - Status: 404`.

Always pass `--max-time` to curl. Without it a hung endpoint looks like a network
problem instead of a bug in my handler.

### One thing to remember

**A green typecheck is not a working server.** `npx tsc --noEmit` exited `0` on the
broken version — every type lined up perfectly while three endpoints hung. TypeScript
checks the *shapes* of values; it has no way to express "this function is obliged to
produce a response." Only actually sending a request can tell me that.

### Mistake to avoid

I had already written the `next()` lesson down at
[LEARNING_LOG.md:43-44](LEARNING_LOG.md#L43-L44) the day before — *"Middleware that
forgets this hangs every request"* — and then wrote a middleware without it. Knowing a
rule and applying it while concentrating on something else are different skills. Before
writing a new middleware, re-read the one that already works next to it
([src/middleware.ts:4-14](src/middleware.ts#L4-L14)) and check I'm doing the same two
jobs it does.

### Divergence noted

[LEARNING_LOG.md:32-33](LEARNING_LOG.md#L32-L33) describes `src/config.ts` as "a bare
`type APIConfig` with no `export` and no importers". True at commit `85d91fe`, stale now
— [src/config.ts:10](src/config.ts#L10) exports and two files import it. Left the old
line alone because it documents a past decision, not current state.

## Metrics ticket, part 2: refactor into `src/api/` + middleware ordering (2026-10-18)

### What I just did

Split the single `handler.ts` / `middleware.ts` pair into one file per concern under
[src/api/](src/api/), and fixed the middleware registration order in
[src/index.ts](src/index.ts).

| File | What it does |
|---|---|
| [src/api/readiness.ts](src/api/readiness.ts) | `/healthz` — plain-text `OK` (moved out of the old `handler.ts`) |
| [src/api/metrics.ts](src/api/metrics.ts) | `/metrics` — reports `Hits: n` |
| [src/api/reset.ts](src/api/reset.ts) | `/reset` — puts the counter back to 0 |
| [src/api/middleware.ts](src/api/middleware.ts) | both middlewares: the response logger and the hit counter |
| [src/config.ts](src/config.ts) | the shared in-memory state (unchanged) |
| `src/handler.ts`, `src/middleware.ts` | deleted — their contents live in `src/api/` now |

### Key lines worth reading

- [src/index.ts:9-11](src/index.ts#L9-L11) — **the ordering fix.** The logger is now
  registered *before* `express.static`, not after. This matters because
  `express.static` **ends the response itself** when it finds the file, so anything
  registered after it never runs for a successful `/app` hit. Registered first, the
  logger attaches its listener before static gets a chance to finish the request.
- [src/api/middleware.ts:7](src/api/middleware.ts#L7) — the log condition moved from
  `!= 200` to `>= 300`. The old version called *every* non-200 an error, including
  successes like `201 Created` and `204 No Content`. I will hit `201` in a later chapter
  when chirps get posted, and the old condition would have flagged every successful
  creation as `[NON-OK]`.
- [src/api/middleware.ts:19](src/api/middleware.ts#L19) and
  [src/api/middleware.ts:13](src/api/middleware.ts#L13) — both middlewares hand control
  onward. Same rule as before, now in two places.

### How I can check it myself

```bash
npx tsc && node dist/index.js > ~/chirpy.log 2>&1 &
for i in 1 2 3; do curl -s -o /dev/null http://localhost:8080/app/; done
curl -s http://localhost:8080/metrics      # want: Hits: 3
curl -s http://localhost:8080/reset
curl -s http://localhost:8080/metrics      # want: Hits: 0
kill $(pgrep -f "dist/inde[x].js")
```

Verified output on the refactored code:

```
/metrics  -> Hits: 3
/reset    -> <0>
/metrics  -> Hits: 0
/healthz  -> OK
```

### One thing to remember

**Middleware order is not cosmetic — it decides what runs at all.** `app.use` builds an
ordered chain, and any middleware that ends a response stops everything registered after
it. `express.static` is exactly that kind of middleware for files it finds. So "register
the logger somewhere" and "register the logger *first*" are different programs, and the
difference is invisible until something downstream needs to observe a request that static
already answered.

### Mistake to avoid

Two bugs in the same area can **mask each other**, and fixing one can leave me trusting
incomplete data. The old `!= 200` condition discarded every 200, which hid the fact that
the old ordering *also* lost `/app` 200s. Had I fixed only the condition, the log would
have looked complete while silently omitting every successful homepage hit — the exact
traffic this ticket exists to count. Fixing the ordering at the same time is what makes
the log trustworthy. When I change a filter, I should re-check the thing the filter was
hiding.

### Still open (not fixed in this round)

Deliberately recorded as unfinished rather than quietly dropped:

- [src/api/middleware.ts:9](src/api/middleware.ts#L9) — `>= 300` still logs `304 Not
  Modified` as `[NON-OK]`. Verified: a conditional request produced
  `[NON-OK] GET /healthz - Status: 304`. 3xx is not an error family.
- ~~[src/api/reset.ts](src/api/reset.ts) — `res.send(config.fileserverHits = 0)`~~
  **Resolved.** The assignment is now its own statement, and the body is a deliberate
  `"Hits reset to 0"` rather than the `0` that fell out of the expression.
- ~~`dist/handler.js` and `dist/middleware.js` are stale build output from the deleted
  source files.~~ **Resolved.** Deleted by hand. Worth knowing that `tsc` only writes
  output, it never removes files whose source is gone — so `dist/` can keep serving a
  module I deleted weeks ago.

## API namespace: move endpoints under `/api` (2026-10-18)

### What I just did

Prepended `/api` to every non-fileserver endpoint in
[src/index.ts](src/index.ts) — commit `2f835c7`. `/app` was left alone.

### Key lines worth reading

- [src/index.ts:17-19](src/index.ts#L17-L19) — the path prefix is the only thing that
  changed. No handler was touched, because a route's path and its logic are separate
  concerns: `app.get` decides *when* a handler runs, the handler decides *what* it does.

### How I can check it myself

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/api/healthz   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8080/healthz       # 404
```

Verified: new paths 200, old paths 404, `/app/` untouched.

### One thing to remember

**`npm run dev` is a one-shot, not a watcher.** It runs `npx tsc && node dist/index.js`:
compile once, then run. A running Node process holds the modules it loaded at startup, so
editing a `.ts` file changes nothing until I rebuild *and* restart. I lost time here
testing a server whose build predated my edit — old paths answered 200 and the new ones
404'd, which looks exactly like broken code.

Two separate staleness layers, which is what makes it confusing:

1. `dist/` is stale until `tsc` runs again — Node executes the compiled JS, not my TS.
2. The process is stale until restarted — a fresh `dist/` never reaches a process that
   already loaded the old one.

```bash
ls -la dist/index.js src/index.ts    # source newer than build = my test is meaningless
```

### Mistake to avoid

Renaming an endpoint **breaks every existing caller** — `/healthz` now returns 404 to
anything that remembers it. Nothing in this repo pointed at the old paths (checked with
`grep -rn`), but "rename the endpoint" and "break every client" are the same action. Real
APIs handle this with versioned namespaces, which is what `/api` is the first step toward.

## Reset becomes POST-only (2026-10-18)

### What I just did

Changed `/admin/reset` from `app.get` to `app.post` — commit `f4c2ddf`, one line.

### Key lines worth reading

- [src/index.ts:20](src/index.ts#L20) — `app.post` instead of `app.get`. The handler itself
  did not change, because *which method is allowed* is a routing decision, not handler logic.

### How I can check it myself

```bash
curl -s -o /dev/null -w '%{http_code}\n'         http://localhost:8080/admin/reset  # 404
curl -s -o /dev/null -w '%{http_code}\n' -X POST http://localhost:8080/admin/reset  # 200
```

Verified: GET returns 404 and leaves the count alone; POST returns 200 and zeroes it.

### One thing to remember

**HTTP methods are promises about what a request does, not just labels.** GET is *safe* —
it asks for something and changes nothing, and callers are entitled to rely on that. POST
is unsafe and may change state. "Safe" here means "the world is the same afterwards", not
"secure". Browsers prefetch links, caches store responses and crawlers follow URLs on the
strength of that promise, so a `GET /admin/reset` invites any of them to wipe the counter
with nobody clicking anything.

### Mistake to avoid

Express answers **404 Not Found** when the path exists but the method doesn't — verified:
`GET /admin/reset` and `POST /admin/metrics` both return 404, not 405 Method Not Allowed.
405 is the semantically correct answer and far more useful when debugging a client, but
Express's router doesn't do it for free. So when a URL I am certain exists returns 404,
**check the method before hunting for a typo in the path.**

## Admin namespace: HTML metrics page (2026-10-18)

### What I just did

Moved the metrics endpoint out of `/api` and turned it into a human-facing HTML page.

| File | What changed |
|---|---|
| [src/api/metrics.ts](src/api/metrics.ts) | Returns an HTML document with the count interpolated, `Content-Type: text/html` |
| [src/index.ts](src/index.ts) | `/api/metrics` → `/admin/metrics`, `/api/reset` → `/admin/reset` |
| [src/api/readiness.ts](src/api/readiness.ts) | `res.set` → `res.setHeader` (unrelated to this ticket) |

### Key lines worth reading

- [src/api/metrics.ts:6](src/api/metrics.ts#L6) — `text/html` instead of `text/plain`. Same
  number, different *representation*. The header is the entire difference between a browser
  rendering a heading and showing angle brackets as text.
- [src/index.ts:17-19](src/index.ts#L17-L19) — three namespaces now, split by audience:
  `/app` for the public site, `/api` for machines, `/admin` for a human operator. `/api`
  holds only `healthz`.

### How I can check it myself

```bash
curl -i http://localhost:8080/admin/metrics     # want text/html + the count
curl -s http://localhost:8080/app/ >/dev/null   # bump the counter
curl -s http://localhost:8080/admin/metrics | grep visited
```

Verified: `visited 8 times` → 5 hits → `visited 13 times` → 2 more → `visited 15 times`,
and `visited 0 times` after `/admin/reset`.

### One thing to remember

An endpoint's URL, its content type and its audience travel together. Moving metrics from
`/api` to `/admin` was not cosmetic: it changed who the endpoint is *for*, and the content
type changed to match. When the audience changes, expect the representation to change too.

### Mistake to avoid

Interpolating a value straight into an HTML string is safe **here** only because the value
is a number I control. The moment interpolated text comes from a user, that same pattern is
an XSS hole — the text would be parsed as markup. Worth remembering before chirps get
rendered into a page.

## Chirp validation: reading a JSON request body (2026-10-19)

### What I just did

Added [src/api/validate-chirp.ts](src/api/validate-chirp.ts) — `POST /api/validate_chirp`,
which reads a JSON body, rejects chirps over 140 characters, and answers in JSON.

### Key lines worth reading

- [src/api/validate-chirp.ts:8-13](src/api/validate-chirp.ts#L8-L13) — the body arrives in
  **chunks**, not all at once. A request body is a stream: `data` fires repeatedly as bytes
  land, `end` fires when there are no more. Nothing can be parsed until `end`.
- [src/api/validate-chirp.ts:14](src/api/validate-chirp.ts#L14) — `JSON.parse` throws on
  malformed input, so it needs the `try`. An unguarded parse on a client-supplied string is
  a crash waiting for a typo.
- [src/api/validate-chirp.ts:18](src/api/validate-chirp.ts#L18) — the `typeof` guard. A JSON
  body can legally contain `{"body": 123}` or `{"body": null}`; both would blow up on
  `.length` without this check.
- [src/api/validate-chirp.ts:24](src/api/validate-chirp.ts#L24) — `> 140`, not `>= 140`.
  Verified both sides: 140 characters returns `valid`, 141 returns `too long`.

### How I can check it myself

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"body":"hello"}' http://localhost:8080/api/validate_chirp
# 200 {"valid":true}

C=$(printf 'a%.0s' $(seq 1 141))
curl -s -X POST -H "Content-Type: application/json" \
  -d "{\"body\":\"$C\"}" http://localhost:8080/api/validate_chirp
# 400 {"error":"Chirp is too long"}
```

### One thing to remember

**Test both sides of a boundary, not just one.** "140 or less" has exactly one line in it,
and `>` versus `>=` moves that line by one character. Checking 141 proves the rejection
works; only checking 140 proves the rule isn't off by one. One test without the other
leaves the bug that matters undetected.

### Mistake to avoid

`.length` on a string counts **UTF-16 code units, not characters.** Verified: 100 emoji were
rejected as "too long" because their `.length` is 200, while 140 `é` passed. For ASCII the
two agree, which is why this hides until someone posts an emoji.

## Profanity filter: replacing words in a chirp (2026-10-20)

### What I just did

Extended [src/api/validate-chirp.ts](src/api/validate-chirp.ts) to blank out three banned
words and to return `cleanedBody` instead of the `valid` boolean.

### Key lines worth reading

- [src/api/validate-chirp.ts:18](src/api/validate-chirp.ts#L18) — `body.split(" ")`. This
  looks naive next to a regex, and it is the **correct** choice here, for a reason worth
  understanding. The spec says `"Sharbert!"` must *not* be replaced. A regex using word
  boundaries (`\b`) treats the boundary between `t` and `!` as a word edge, so it would
  match `Sharbert` inside `Sharbert!` and replace it — failing the spec. Splitting on
  spaces makes `sharbert!` a different token from `sharbert`, which is exactly the
  definition of "word" the assignment asked for.
- [src/api/validate-chirp.ts:21](src/api/validate-chirp.ts#L21) — `word.toLowerCase()`
  compared against an all-lowercase list. One normalisation on one side handles every
  case variant, instead of listing `Kerfuffle`, `KERFUFFLE` and the rest.
- [src/api/validate-chirp.ts:12](src/api/validate-chirp.ts#L12) — the length check still
  runs *before* the cleaning, so a 141-character chirp is rejected rather than cleaned.
  Verified both ways.

### How I can check it myself

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"body":"This is a kerfuffle opinion I need to share with the world"}' \
  http://localhost:8080/api/validate_chirp
# {"cleanedBody":"This is a **** opinion I need to share with the world"}

curl -s -X POST -H "Content-Type: application/json" \
  -d '{"body":"Sharbert!"}' http://localhost:8080/api/validate_chirp
# {"cleanedBody":"Sharbert!"}   <- punctuation means it is a different word
```

Verified: all three words replaced in every case variant, punctuation-attached versions
left alone, clean text untouched, and `split(" ")` / `join(" ")` preserved runs of
multiple spaces exactly (`"a  kerfuffle  b"` -> `"a  ****  b"`).

### One thing to remember

**The simplest tool was the correct one, not a shortcut.** My instinct on seeing
`split(" ")` was that a regex would be more robust — but "more powerful" is not the same
as "matches the spec". The spec defined a word as a space-delimited token, and the simple
split models that definition exactly while a regex models a different one. Read what the
requirement actually says before reaching for the stronger tool.

### Mistake to avoid

`split(" ")` splits on exactly one literal character. Verified: `"hello\nkerfuffle"` and
`"hello\tkerfuffle"` are **not** filtered, because a newline is not a space, so the whole
thing stays a single token. Fine for this assignment, but a reminder that "split on
whitespace" and "split on a space" are different operations, and only one of them is what
`split(" ")` does.
