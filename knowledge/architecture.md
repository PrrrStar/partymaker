# Architecture

## 전체 흐름

```text
Guest / Admin / Screen
        │
        ├─ GET  /api/events/:id/view
        ├─ POST /api/events/:id/commands
        └─ GET  /api/events/:id/stream (SSE)
                         │
                         ▼
                authoritative EventState
                 │                     │
        local Next.js             Cloudflare Worker
        MemoryEventStore          PartyEventDurableObject
        process memory            SQLite-backed storage
```

명령 성공 후 서버 상태가 바뀌면 SSE로 `eventId`와 `version`만 보낸다. 각 클라이언트는
전체 view를 다시 조회한다. SSE 메시지 유실이나 브라우저 재접속이 있어도 최신 snapshot을
가져오므로 중간 알림 재생에 의존하지 않는다.

## 기술 구성

- Next.js `16.3.5`
- React `19.2.8`
- TypeScript
- Tailwind CSS 4
- Motion
- Vitest
- vinext `1.0.0-beta.10`
- Wrangler `4.133.0`
- Cloudflare Workers + Static Assets + SQLite Durable Objects

## 상태 모델

`EventState`가 유일한 도메인 원본이다.

- `event`: 이벤트 메타데이터
- `runtime`: 현재 Stage, Cue, pause, Screen override, activation history
- `stageOrder`, `stages`, `cues`: 실행 가능한 쇼 구성
- `guests`, `tables`: 참가자와 테이블
- `missions`, `missionProgress`: 미션과 완료 상태
- `interactions`, `responses`: 투표/퀴즈와 응답
- `scoreEvents`: 점수 원장
- `connections`: 행사에서 새로 만난 관계
- `facts`: 현장에서 포착한 재사용 가능한 TMI

`src/domain/reducer.ts`의 `reduceEvent`만 상태 전이를 만든다. Guest/Admin/Screen은
각자 상태를 재해석하지 않고 `src/domain/selectors.ts`의 surface별 view를 사용한다.

## 명령 안정성

- 모든 command는 최대 120자의 고유 `commandId`가 필요하다.
- 동일 `commandId` 재시도는 저장된 receipt를 반환하며 두 번째 상태 변경을 만들지 않는다.
- `expectedVersion`이 현재 version과 다르면 `409 version-conflict`를 반환한다.
- 점수도 `sourceKey`로 중복 반영을 막는다.
- 로컬 store는 promise queue로 명령을 직렬화한다.
- Cloudflare store는 event ID별 Durable Object와 storage transaction으로 직렬화한다.

## 로컬 어댑터

- 진입점: `src/server/store.ts`
- 구현: `src/server/memory-event-store.ts`
- 장점: 외부 계정 없이 빠르게 개발 가능
- 제약: 단일 Node 프로세스에서만 일관되며 재시작 시 seed로 초기화

## Cloudflare 어댑터

- 진입 Worker: `src/cloudflare/worker.ts`
- 상태 객체: `src/cloudflare/party-event-do.ts`
- binding: `PARTY_EVENTS`
- static assets binding: `ASSETS`
- migration: `v1`, `new_sqlite_classes: [PartyEventDurableObject]`
- routing: `PARTY_EVENTS.getByName(eventId)`
- 현재 허용 event ID: `demo`
- 영속 항목: 전체 `EventState`, command receipt
- 메모리 전용 항목: 현재 연결된 SSE stream controller

중요 상태는 publish 전에 storage transaction에 기록된다. Durable Object가 eviction되거나
Worker가 재배포돼도 SQLite 상태는 유지되며, SSE는 클라이언트가 다시 연결해 현재 version을
받는다.

## API 계약

### View

`GET /api/events/:eventId/view?surface=guest|admin|screen&guestId=...`

- `guestId`는 Guest view 개인화에만 필요
- Admin view는 optional admin secret 검사를 거침
- 응답은 `Cache-Control: no-store`

### Command

`POST /api/events/:eventId/commands`

```json
{
  "commandId": "stage:unique-id",
  "expectedVersion": 4,
  "command": { "type": "runtime.advance", "direction": "next" },
  "view": { "surface": "admin" }
}
```

성공 응답은 `receipt`와 요청한 surface의 최신 `view`를 포함한다.

### Stream

`GET /api/events/:eventId/stream`

- content type: `text/event-stream`
- 연결 직후 현재 version 전송
- 이후 변경된 version만 전송
- 브라우저 retry 힌트: 1500ms

## 주요 파일 지도

- `src/domain/types.ts`: 전체 상태와 surface view 타입
- `src/domain/commands.ts`: 명령 계약과 Guest 명령 판별
- `src/domain/reducer.ts`: 모든 상태 전이와 검증
- `src/domain/selectors.ts`: Guest/Admin/Screen projection
- `src/domain/seed.ts`: demo 이벤트
- `src/client/event-gateway.ts`: HTTP/SSE 브라우저 gateway
- `src/features/guest/guest-app.tsx`: Guest UI
- `src/features/admin/admin-app.tsx`: Admin UI
- `src/features/screen/screen-app.tsx`: Screen UI
- `src/server/*`: Next.js 로컬 어댑터
- `src/cloudflare/*`: Workers/Durable Object 어댑터
- `wrangler.jsonc`: Cloudflare source-of-truth config
- `vite.config.ts`: vinext + Cloudflare build

## 보안 모델

- Guest 명령: join, interaction response, mission completion은 공개
- `/guest`, `/screen`, SSE version stream은 공개
- `/admin` 문서, Admin view, 나머지 명령은 `PARTYMAKER_ADMIN_SECRET` 대상
- 브라우저는 HTTP Basic Auth를 사용하며 ID는 `admin`, password는 secret 값
- API client는 `x-partymaker-admin-secret` 또는 bearer header도 계속 사용 가능
- secret은 source/config/문서에 기록하지 않고 `wrangler secret put`으로만 저장
- 별도 로그인 UI, cookie session, localStorage credential은 사용하지 않음

## Screen 3D scene 구조

3D는 Main Screen `/screen`에만 적용한다. Guest는 입력폼과 게임 리모컨, Admin은
운영 콘솔로 유지해 휴대폰 GPU와 MC 조작 안정성을 우선한다.

- `src/components/scene/stage-visuals.ts`: 9개 Stage와 Cue/Reveal/참가자 수를
  camera, target, wedding palette, energy, tree growth로 변환하는 순수 모델
- `src/components/scene/party-scene.tsx`: client-only R3F Canvas, procedural tree,
  Drei particles, GSAP camera transition, WebGL fallback
- `src/features/screen/screen-app.tsx`: authoritative Screen view를 scene props로 연결하고
  QR·미션·투표·Reveal HTML을 Canvas 위 접근 가능한 overlay로 유지
- dynamic import로 `/screen`에서만 3D chunk를 로드
- DPR 1~1.5, geometry 1회 생성, requestAnimationFrame 기반 loop, reduced-motion 시
  demand render로 전환
- scene palette는 midnight ink 위 champagne, blush, lavender, sage, moonlight, pearl을 사용

Stage 변경 흐름:

`Admin command → Durable Object version → SSE invalidation → Screen refetch →
resolveStageVisual → GSAP camera/light transition`
