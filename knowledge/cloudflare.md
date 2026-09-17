# Cloudflare Handoff

## 현재 상태

- 사용자는 개인 Cloudflare 계정을 만들고 브라우저에 로그인했다.
- Wrangler CLI는 아직 개인 계정에 인증되지 않았다.
- 이전 임시 preview account와 Worker URL은 Claim 만료로 삭제됐다.
- 따라서 옮길 활성 Worker는 없고, 나중에 개인 계정으로 새 무료 배포를 만들면 된다.
- 실제 행사 데이터는 없고 seed/demo 상태뿐이므로 데이터 이전은 필요하지 않다.

## 배포 구성

- Worker name: `partymaker`
- entry: `src/cloudflare/worker.ts`
- generated deploy config: `dist/server/wrangler.json`
- static assets: `dist/client`
- Durable Object binding: `PARTY_EVENTS`
- class: `PartyEventDurableObject`
- storage: SQLite
- migration tag: `v1`
- observability: enabled
- compatibility date: `2026-09-17`
- compatibility flag: `nodejs_compat`

`wrangler.jsonc`가 binding과 migration의 source of truth다. `cloudflare-env.d.ts`는
Wrangler가 생성하며 직접 손으로 편집하지 않는다.

## 개인 계정 무료 재배포 절차

사용자가 “지금 개인 계정으로 배포하자”고 명시했을 때만 진행한다.

```bash
pnpm exec wrangler login
pnpm exec wrangler whoami
pnpm check
pnpm check:cloudflare
pnpm exec wrangler deploy --config dist/server/wrangler.json --dry-run
pnpm exec wrangler deploy --config dist/server/wrangler.json
```

확인 사항:

- `whoami`가 사용자의 개인 Cloudflare 계정인지 확인
- Workers Free 플랜인지 확인하고 유료 업그레이드/결제는 하지 않음
- 배포 결과의 새 `workers.dev` URL 기록
- `/guest`, `/admin`, `/screen`, view API, SSE를 다시 검증
- Admin에서 Stage를 바꾼 뒤 Screen 동기화 확인
- 재배포 후 Durable Object version 유지 확인
- 완료 후 이 문서와 `current-state.md`의 URL/상태 갱신

## Admin secret 주의

현재 API는 `PARTYMAKER_ADMIN_SECRET`을 지원하지만 Admin 브라우저 UI가 이 값을
전송하지 않는다. 아래 명령을 먼저 실행하면 Admin UI가 401로 막힌다.

```bash
pnpm exec wrangler secret put PARTYMAKER_ADMIN_SECRET
```

따라서 실제 secret 설정은 Admin 인증 입력/세션 흐름을 구현한 다음 진행한다. secret은
문서, `.env.example`의 값, Git history, tool output에 남기지 않는다.

## 무료 한도 운영 원칙

2026-09-17 확인 당시 Workers Free는 하루 100,000 request와 invocation당 10ms CPU
한도를 제공했고, SQLite Durable Objects도 Free에서 사용할 수 있었다. 한도와 가격은
바뀔 수 있으므로 배포 직전에 공식 문서를 다시 확인한다.

- Workers limits: https://developers.cloudflare.com/workers/platform/limits/
- Workers pricing: https://developers.cloudflare.com/workers/platform/pricing/
- Durable Objects pricing: https://developers.cloudflare.com/durable-objects/platform/pricing/

무료 한도 초과 시 유료로 자동 전환하지 않는다. 기능을 줄이거나 행사 트래픽을 추정한 뒤
사용자에게 선택지를 제시한다.

## 상태 이전 의미

새 Cloudflare 계정에 deploy하면 새 Durable Object namespace가 생기므로 이전 임시
계정의 SQLite 상태가 자동으로 따라오지 않는다. 현재는 seed 데이터만 있었고 임시 계정이
삭제됐으므로 새 배포 후 `데모 초기화` 상태에서 시작하는 것이 맞다.
