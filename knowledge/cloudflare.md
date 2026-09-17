# Cloudflare Handoff

## 현재 상태

- 2026-09-17 개인 Cloudflare 계정에 Worker `partymaker`를 새로 배포했다.
- 공개 주소는 `https://partymaker.jmeef0802.workers.dev`다.
- Wrangler CLI는 개인 계정 OAuth에 인증돼 있다.
- 이전 임시 preview account의 Worker와 데이터는 이전하지 않았다.
- 전체 API smoke와 Worker 재배포 후 SQLite Durable Object 영속성을 검증했다.
- 검증 후 demo reset을 실행해 version `15`, 참가자 4명, `CHECK IN` 상태다.
- `/admin`은 ID `admin`과 Cloudflare secret 비밀번호의 HTTP Basic Auth로 보호한다.

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
- Cloudflare Git build command: `pnpm build` (`next build && vinext build`)

Cloudflare Git integration은 build 단계에서 `pnpm build`로 Next와 vinext 산출물을
함께 만든 뒤 기본 `npx wrangler deploy`를 실행한다. vinext build가
`dist/client`, `dist/server`, `.wrangler/deploy/config.json`을 생성하므로 clean checkout에서도
generated Wrangler config로 배포된다.

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

## Admin Basic Auth

`/admin`은 브라우저 HTTP Basic Auth로 보호한다.

- ID: `admin` 고정
- password: Cloudflare secret `PARTYMAKER_ADMIN_SECRET`
- 저장 위치: Cloudflare secret만 사용하고 source, config, 문서, Git history에 기록하지 않음
- Guest와 Screen은 공개 유지
- API client는 기존 `x-partymaker-admin-secret` 또는 bearer header도 계속 사용 가능

비밀번호를 교체할 때만 아래 명령을 실행하고 새 값을 표준입력으로 전달한다.

```bash
pnpm exec wrangler secret put PARTYMAKER_ADMIN_SECRET --name partymaker
```

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
