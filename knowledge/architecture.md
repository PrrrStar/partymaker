# Architecture

## 전체 흐름

```text
Guest / Admin / Screen
        │
        ├─ GET  /api/events/:id/view
        ├─ POST /api/events/:id/commands
        ├─ GET  /api/events/:id/stream (SSE)
        └─ WS   /api/events/:id/lobby (joystick snapshots)
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
- `modules`: Stage/Cue에 연결한 versioned game/tool instances와 Timer runtime

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
- 영속 항목: 전체 `EventState`, command receipt, throttled lobby avatar checkpoint
- 메모리 전용 항목: 현재 연결된 SSE controller, lobby WebSocket과 move sequence/rate-limit

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

## Role-aware surface design

세 운영 화면은 기능 맥락이 달라 palette와 density를 분리하되 semantic token 이름과
interaction 계약은 공유한다.

- Guest `/guest`: `pm-guest-shell`, white/light-gray canvas, black text, Yanolja
  Orange selection/CTA, compact form controls. 민엠따의 task-first light UI에서 가져왔다.
- Admin `/admin`: `pm-admin-shell`, black canvas, translucent panel, white telemetry,
  Yanolja Orange border/focus와 compact radius. devops-brain HUD에서 가져왔다.
- Screen `/screen`: 기존 R3F Midnight Garden 구조를 유지하고 black/orange/white
  projector palette로 핵심 카피와 scene 조명을 통일한다.
- Home `/`: 세 launcher가 각 surface palette를 미리 보여주는 role gateway다.
- Guest/Admin에는 Three.js import가 없으며 이 경계는 `surface-design.test.ts`가 검증한다.

## Interaction 결과 공개 경계

`publish → respond → close → reveal`은 네 단계로 분리한다.

- `open`: Guest 응답 가능, `after-reveal` Screen 결과 없음
- `closed`: 추가 응답 거부, Admin만 aggregate 확인, Screen은 공개 대기
- `revealed`: Screen/Guest aggregate와 정답 공개, 점수 1회 반영
- `live`: 명시적으로 설정한 interaction만 open 중 aggregate 공개

Screen selector가 공개 여부를 결정하므로 UI에서 결과 DOM을 숨기는 것만으로 보안을
대체하지 않는다.

## Admin recovery와 content CRUD

복구 command:

- `interaction.reopen`: closed + unrevealed interaction을 open으로 복귀, 기존 응답 유지
- `interaction.reset`: 해당 interaction의 response·score·derived fact 제거 후 draft 복귀
- 기존 `runtime.advance previous`: Stage/Cue 이동 실수 복구
- `event.reset-demo`: 전체 상태 초기화, 최후 수단

Content command:

- `content.create`: 현재 Stage 끝에 announcement/mission/interaction Cue 추가
- `content.update`: 같은 kind의 문구·점수·선택지 수정
- `content.delete`: Cue와 연결 entity/artifact를 cascade 삭제

Admin `ContentManager` modal이 command를 전송하고 Durable Object transaction이 snapshot을
원자적으로 갱신한다. interaction은 draft 상태에서만 선택지 수정이 가능하며, 응답이 시작된
질문은 개별 초기화 후 수정한다.

## CHECK IN direct-control lobby

`Guest pointer/keyboard → WebSocket direction input → PartyEventDurableObject → bounded position → WebSocket avatar snapshot → Screen interpolation`

- endpoint: `GET /api/events/:eventId/lobby?role=guest|screen&guestId=...`
- Guest는 좌표가 아니라 `[-1, 1]` 방향 vector와 monotonic sequence를 전송한다.
- Durable Object가 최대 20Hz rate limit, 속도, world bounds와 sequence를 검증한다.
- authoritative avatar는 최대 80개를 broadcast하고 1초 이하로 storage write를 throttle한다.
- Screen은 snapshot 사이를 R3F `useFrame`에서 보간해 network frequency와 render fps를 분리한다.
- avatar style, table color, ready ring과 short-lived emote를 Screen Canvas에서 렌더한다.
- CHECK IN 이외 Stage에서는 서버가 move/emote/ready 입력을 무시한다.
- `event.reset-demo`는 event modules뿐 아니라 lobby checkpoint도 초기화한다.
- plain Next dev server에는 Durable Object WebSocket이 없으므로 lobby E2E는 local workerd 또는 production에서 검증한다.

## Modular game/tool runtime

`Module Registry → Admin ModuleManager → EventModule instance → reducer command → surface activeModules`

- registry: timer, team-score, tournament, league, prompt-quiz, ai-rps
- 한 scope(Stage + optional Cue)에 enabled primary game은 최대 1개다.
- Timer와 Team Score는 overlay라 primary와 함께 조립할 수 있다.
- instance는 definition version, config, phase, order, enabled, optional timer runtime을 가진다.
- Admin은 추가, 활성/비활성, 순서 이동, 삭제와 Timer start/pause/+10/reset을 command로 수행한다.
- Timer는 interaction publish/reopen과 함께 자동 시작하고 close/reset과 lifecycle을 맞춘다.
- Timer 만료 뒤 interaction이 아직 open이어도 reducer가 늦은 응답을 거부한다.
- Guest/Admin/Screen selector는 현재 Stage/Cue에 적용되는 enabled module만 `activeModules`로 제공한다.
- module code upload는 허용하지 않는다. registry에 build-time 등록된 definition만 조립한다.
