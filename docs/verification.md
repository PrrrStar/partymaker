# MVP 0 verification

This checklist verifies PartyMaker's first vertical slice across `/guest`, `/admin`, and `/screen`. It treats the server-side event store as authoritative: UI actions send commands with HTTP `POST`, and SSE tells connected clients to refetch the latest snapshot.

Do not validate realtime behavior by sharing browser local storage. Guest, admin, and screen may run in separate browser contexts or on separate devices as long as they can reach the same PartyMaker server.

## Test setup

- [ ] Install dependencies with `pnpm install`.
- [ ] Start a fresh server with `pnpm dev`.
- [ ] Confirm `/guest`, `/admin`, and `/screen` load without a console error.
- [ ] On the CHECK IN screen, scan the rendered QR and confirm it opens `/guest` on the same host.
- [ ] Confirm the demo event and seed content appear in `/admin`.
- [ ] Confirm `GET /api/events/demo/view?surface=admin` returns an admin view with a numeric version.
- [ ] Confirm a successful command response contains both a command `receipt` and a surface-specific `view`.
- [ ] Open guest, admin, and screen in separate windows or Playwright pages.
- [ ] For multi-guest tests, use separate browser contexts so each guest receives an independent local identity.
- [ ] In browser automation, use retrying UI assertions instead of fixed sleeps.

Suggested viewports:

- Guest: `390 × 844`, with a small-phone pass at `320 × 568`
- Admin: `1366 × 768`, with a compact pass at `1024 × 768`
- Screen: `1920 × 1080`, plus `1366 × 768` and `1024 × 768`

## 1. Join flow

- [ ] Open `/guest` with a fresh browser context.
- [ ] Complete every required profile field and join the event.
- [ ] Confirm the guest sees a joined/welcome state instead of the form.
- [ ] Confirm `/admin` shows the new guest and participant count exactly once.
- [ ] Confirm `/screen` updates its participant count without a reload.
- [ ] Reload `/guest`; confirm the guest remains joined and is not registered again.
- [ ] Rapidly submit JOIN twice; confirm the server still contains one participant for that guest identity.
- [ ] Try a blank display name and unchecked display consent; confirm the profile is not accepted.

## 2. Live stage changes

- [ ] Change the active stage from `/admin`.
- [ ] Confirm `/guest` and `/screen` display the same new stage without a reload.
- [ ] Exercise NEXT and PREVIOUS where the admin UI permits them.
- [ ] Trigger two rapid stage commands; confirm every surface converges on the final authoritative stage.
- [ ] Refresh each surface in a different order; confirm the stage remains unchanged.

## 3. Mission publication

- [ ] Publish or unlock one seeded mission from `/admin`.
- [ ] Confirm `/guest` shows the exact mission once.
- [ ] Confirm `/screen` shows the mission announcement if that screen state is implemented.
- [ ] Open a new guest page after publication; confirm it fetches the already-active mission.
- [ ] Repeat or double-click the publish action; confirm it does not create duplicate active missions.
- [ ] Reload all three surfaces; confirm the active mission persists until the server state changes.

## 4. Poll publication and answer

- [ ] Publish one seeded poll or question from `/admin`.
- [ ] Confirm `/guest` shows the prompt and enabled answer choices.
- [ ] Confirm `/screen` shows the live interaction rather than stale stage content.
- [ ] Submit one answer from the guest.
- [ ] Confirm the guest sees a submitted state and cannot submit the same interaction again.
- [ ] Confirm `/admin` shows exactly one incoming answer.
- [ ] Confirm `/screen` updates without a reload while respecting the interaction's result-visibility policy.
- [ ] Before close, confirm an `after-close` interaction does not leak its option distribution or correct answer.

For aggregation coverage, use three independent guest contexts:

- [ ] Submit two votes for option A and one vote for option B.
- [ ] Confirm the admin's authoritative total is `3` before close.
- [ ] After close, confirm counts are `2` and `1` and displayed percentages round consistently, for example `67%` and `33%`.
- [ ] Reload the screen and confirm the same aggregate is fetched from the server.

## 5. Close, reveal, and scoring

- [ ] Close voting from `/admin`.
- [ ] Confirm every guest answer control becomes disabled or the closed state replaces it.
- [ ] Attempt a late submission from a guest page that was already open; confirm the server rejects it and totals do not change.
- [ ] Confirm `/screen` shows the closed aggregate according to the configured result-visibility policy.
- [ ] Close a zero-vote interaction; confirm results never render `NaN`, `Infinity`, or a negative percentage.
- [ ] Reveal the interaction from `/admin`.
- [ ] Confirm `/screen` shows the revealed result and `/guest` shows the appropriate outcome.
- [ ] Record the relevant score before and after reveal; confirm the expected points are applied exactly once.
- [ ] Double-click or retry CLOSE and REVEAL; confirm totals, phase, and score remain stable.
- [ ] Reload all surfaces; confirm reveal and score effects are not replayed.

## 6. SSE and reconnect recovery

- [ ] Confirm each live surface opens an SSE request whose response type is `text/event-stream`.
- [ ] Confirm a new stream immediately emits the current version and later emits only newer versions after accepted mutations.
- [ ] Change state from `/admin`; confirm connected clients refetch and render the new snapshot.
- [ ] Close `/guest`, change stage or publish a mission, then reopen `/guest`; confirm it loads the latest state without needing a historical SSE message.
- [ ] Put one client offline or abort its SSE connection, mutate server state, then reconnect it.
- [ ] Confirm the recovering client fetches the latest snapshot and does not replay stale intermediate states.
- [ ] Restart only a browser page, not the server; confirm event state remains intact.
- [ ] Check browser consoles for runaway reconnect loops or duplicate EventSource connections after repeated navigation.

## 7. Duplicate and concurrent commands

- [ ] Rapidly double-click each high-impact admin action: stage transition, publish, close, reveal, and reset if exposed.
- [ ] Confirm each logical command produces at most one state transition.
- [ ] Retry the exact command envelope with the same `commandId`; confirm it does not create a second mutation or score event.
- [ ] Send a command with a stale `expectedVersion`; confirm the server rejects the stale write and the client can refetch the current view.
- [ ] Submit a guest answer at the same time the admin changes stage or publishes a mission.
- [ ] Confirm both accepted mutations survive in the next snapshot; one must not overwrite the other.
- [ ] Send a retry of the same guest answer after a simulated response interruption.
- [ ] Confirm the guest still has one answer and receives points at most once.
- [ ] Confirm stale clients cannot reopen a closed poll or replace a newer stage with an older snapshot.

## 8. Reset and process lifecycle

- [ ] Use **데모 초기화** in `/admin` and confirm its warning, or POST an `event.reset-demo` command envelope to `/api/events/demo/commands`.
- [ ] Confirm reset restores the documented seed event, removes runtime guests/answers, and notifies connected clients.
- [ ] Set `PARTYMAKER_ADMIN_SECRET` and confirm `/admin`, admin views, reset, and other non-guest commands return `401` plus a Basic challenge without credentials.
- [ ] Confirm username `admin` and the secret as password allow `/admin` and protected API requests, while Guest and Screen remain public.
- [ ] With `pnpm dev`, stop and restart the Next.js server.
- [ ] Confirm the previous runtime state is gone and the initial demo state is recreated. This is expected only for the process-local development store.
- [ ] With `pnpm start:vinext`, mutate the demo event, stop Wrangler, and start it again.
- [ ] Confirm the Cloudflare-local event state and idempotency receipts survive the Wrangler restart.
- [ ] After a Cloudflare deployment update, confirm the event state still exists in the bound Durable Object.

## 9. Responsive and venue checks

- [ ] Guest view has no horizontal overflow at `320 × 568` or `390 × 844`.
- [ ] Guest answer and join controls are not obscured by fixed UI or safe-area insets.
- [ ] Primary guest touch targets are approximately `44 px` or larger.
- [ ] Admin current state and primary controls remain visible and non-overlapping at `1024 × 768`.
- [ ] Screen content fits without browser scrolling at each target display size.
- [ ] Screen question and result typography is readable from across a room.
- [ ] Run the guest smoke flow in Chromium and WebKit to catch mobile Safari differences.
- [ ] Start with `pnpm dev --hostname 0.0.0.0` and complete one join from a physical phone on the same LAN.
- [ ] Disconnect and reconnect the phone's Wi-Fi; confirm it recovers the latest event state.

## 10. Automated repository checks

- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`
- [ ] `pnpm check`
- [ ] `pnpm check:cloudflare`

Capture a Playwright trace for any intermittent realtime failure. The trace should show the initiating POST, the resulting SSE invalidation, the snapshot refetch, and the final UI assertion.

## Known MVP boundaries

- The local Next.js adapter proves one server process and intentionally loses event state on restart.
- The Cloudflare adapter serializes each event through one SQLite Durable Object and retains its state across Worker restarts and deployments.
- The MVP has no backup, restore, event-management, or disaster-recovery workflow.
- SSE provides invalidation and reconnect behavior; it does not provide durable event history.
- `PARTYMAKER_ADMIN_SECRET` enables shared-password HTTP Basic Auth for `/admin` and protected APIs; it is intentionally not per-operator production authentication.
