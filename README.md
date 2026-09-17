# PartyMaker

PartyMaker is the live operating surface for a wedding after-party. It connects the MC, guests' phones, and the venue screen so the room can move through stages, missions, polls, reveals, and scores without forcing the event into a fixed timeline.

Agents and maintainers taking over the project should start with the
[project knowledge base](knowledge/README.md). It records the product intent,
architecture decisions, verified state, Cloudflare handoff, and prioritized roadmap.

MVP 0 proves one complete loop:

1. A guest joins from a phone.
2. The MC sees the guest and changes the active stage.
3. Guest and screen views update live.
4. The MC publishes a mission and a poll.
5. The guest answers, the MC closes voting, and the screen presents the aggregate before the reveal.

The app can run locally with an in-memory store or on Cloudflare Workers with
SQLite-backed Durable Object storage.

## Surfaces

With the development server running at `http://localhost:3000`:

- Guest: [http://localhost:3000/guest](http://localhost:3000/guest)
- MC admin: [http://localhost:3000/admin](http://localhost:3000/admin)
- Main screen: [http://localhost:3000/screen](http://localhost:3000/screen)

Open all three surfaces at once to exercise the live flow. The guest surface is mobile-first, the admin surface favors large operational controls, and the screen surface is intended for a TV or projector.

## MVP architecture

PartyMaker uses Next.js 16, React 19, and TypeScript.

PartyMaker follows a server-authoritative model:

1. A browser sends an event command with an HTTP `POST`.
2. The server validates the command and applies it to the authoritative event store.
3. The store publishes an SSE invalidation after the authoritative event snapshot changes.
4. Connected guest, admin, and screen clients refetch the current snapshot and render the same state.

SSE carries change notifications, not the canonical event record. Reconnecting clients can therefore recover by fetching the latest server snapshot instead of relying on every live notification being delivered.

Local Next.js development uses a process-local `MemoryEventStore`. The Cloudflare
deployment routes each event to one SQLite-backed Durable Object, so commands,
receipts, snapshots, and SSE invalidations share one ordered, persistent owner even
when requests reach different Worker isolates.

The browser gateway uses these event-scoped contracts:

- `GET /api/events/:eventId/view?surface=guest|admin|screen&guestId=...` fetches a surface-specific snapshot. `guestId` is used for a personalized guest view.
- `POST /api/events/:eventId/commands` applies a command envelope containing a unique command ID and, when needed, an expected version. A successful response returns both its `receipt` and the requested surface `view`.
- `GET /api/events/:eventId/stream` keeps an SSE connection open and emits newer store versions.

The bundled demo event ID is `demo`.

## Local setup

Prerequisites:

- Node.js `>=20.9.0`
- Corepack or pnpm `10.12.1` (the repository-pinned version)

Install and start the app:

```bash
corepack enable
pnpm install
pnpm dev
```

Then open the three URLs listed above.

No environment variables are required for the local demo. Copying `.env.example` is optional:

```bash
cp .env.example .env.local
```

`PARTYMAKER_ADMIN_SECRET` is optional. When it is set, `/admin` uses browser HTTP Basic Auth with username `admin` and the secret as its password. Admin views and non-guest commands require the same credentials. API clients may continue to send the value through `x-partymaker-admin-secret` or `Authorization: Bearer`. Keep it server-only and never expose it through a `NEXT_PUBLIC_` variable. Leave it empty only for an unprotected local demo.

## Cloudflare Workers

Build the vinext Worker bundle and run it in the local Workers runtime:

```bash
pnpm build:vinext
pnpm start:vinext
```

The local Worker defaults to `http://localhost:8787`. Its Durable Object data is
stored under `.wrangler/`, so it survives a Wrangler restart. Deploy with:

```bash
pnpm deploy:vinext
```

To protect the deployed Admin surface, configure its Basic Auth password after
deploying. The username is always `admin`:

```bash
pnpm exec wrangler secret put PARTYMAKER_ADMIN_SECRET
```

The deployed CHECK IN QR automatically uses the public Worker origin. Cloudflare's
Workers Free plan is suitable for this MVP's event-scale traffic, but its request,
CPU, storage, and Durable Object allowances are finite; confirm the current
[Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and
[Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
before a real event.

## Use a phone on the same LAN

Bind the development server to all local interfaces:

```bash
pnpm dev --hostname 0.0.0.0
```

Find the computer's LAN address. On macOS Wi-Fi, this is commonly:

```bash
ipconfig getifaddr en0
```

If the command returns, for example, `192.168.0.42`, open this URL on a phone connected to the same network:

```text
http://192.168.0.42:3000/guest
```

Use the same address with `/admin` and `/screen` on other devices if needed. If the phone cannot connect, confirm that both devices are on the same LAN and that the computer firewall allows inbound connections to the development server.

The CHECK IN screen renders a scannable QR from the exact host used to open
`/screen`. For phone testing, open the screen with the LAN address (for example,
`http://192.168.0.42:3000/screen`) rather than `localhost`; the QR will then point
the phone to `http://192.168.0.42:3000/guest`.

## Demo seed and reset

The event store owns the demo event and seed content. The current seed defines nine stages, four tables, four sample guests, two missions, and two interactions. Start the server, open `/admin`, and confirm that content is present before testing.

Reset belongs in the admin command API, not browser storage. Use **데모 초기화** in `/admin` and confirm the warning, or send an `event.reset-demo` command envelope to `POST /api/events/demo/commands`. Reset recreates the bundled seed state and emits a new version so connected surfaces refetch it.

For an unprotected local demo, replace `reset:unique-id` with a new command ID each time:

```bash
curl --request POST http://localhost:3000/api/events/demo/commands \
  --header 'content-type: application/json' \
  --data '{"commandId":"reset:unique-id","command":{"type":"event.reset-demo"}}'
```

If `PARTYMAKER_ADMIN_SECRET` is configured, also supply the matching admin header described above.

Stopping and restarting `pnpm dev` also discards the process-local store and recreates the seed. Cloudflare's SQLite Durable Object retains the event state across Worker restarts and deployments; use **데모 초기화** when you intentionally want to restore the seed.

Do not treat clearing one browser's local storage as an event reset. The authoritative state lives on the server.

## Verification

The complete manual and browser-automation checklist is in [docs/verification.md](docs/verification.md).

Run the repository checks with:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Or run the combined check:

```bash
pnpm check
```

Verify the Cloudflare build separately with:

```bash
pnpm check:cloudflare
```

## Current limitations

- `pnpm dev` uses an in-memory store and loses runtime state when that process restarts.
- Cloudflare persists event state in a SQLite Durable Object, but the MVP has no backup, export, restore, or multi-region disaster-recovery workflow.
- The bundled application exposes only the single `demo` event and has no event-management UI.
- Admin uses a single shared-password HTTP Basic Auth through `PARTYMAKER_ADMIN_SECRET`; it does not provide per-operator accounts, roles, or audit logs.
- LAN testing over plain HTTP is intended only for a trusted local network.

Before using PartyMaker at a real event, add appropriate admin authentication and
test the deployed app on the venue network and display hardware.
