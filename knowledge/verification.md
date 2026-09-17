# Verification Record

## 자동 검사

2026-09-17 최종 Cloudflare 배포 코드에서 아래 검사가 통과했다.

```bash
pnpm check
pnpm check:cloudflare
pnpm exec wrangler deploy --config dist/server/wrangler.json --dry-run
git diff --check
```

세부 결과:

- ESLint 통과
- Next route type 생성 + `tsc --noEmit` 통과
- Vitest 6개 파일, 31개 테스트 통과
- Next production build 통과
- Wrangler binding type drift 검사 통과
- vinext 5단계 build 통과
- Wrangler dry-run에서 Worker, static assets, `PARTY_EVENTS`, `ASSETS` 확인

참고: Vite 9 예정 deprecation과 Node experimental glob warning은 출력되지만 실패 원인은 아니다.

## 로컬 Next.js 검증

세 개의 독립 브라우저 화면으로 MVP 전체 루프를 확인했다.

- Guest 등록
- Admin 참가자 표시
- Stage 변경과 Guest/Screen 실시간 갱신
- 미션 공개와 Guest 완료
- 투표 공개, Guest 응답, Admin 집계
- 투표 종료 후 Screen 집계
- 결과 공개와 점수 1회 반영

## 로컬 Workers 검증

`pnpm start:vinext --port 8787`로 실제 workerd + SQLite Durable Object 경로를 검증했다.

- 초기 Screen: `CHECK IN`, 4 players
- 신규 Guest `CF검증` 등록
- Admin → `WARM UP`, Screen 동기화
- 미션 공개/완료
- poll 공개/응답/종료/결과 공개
- Guest 점수 `15`, table 점수 `0`
- mutation 후 Wrangler를 종료하고 다시 시작해 동일 version과 Guest 상태 유지

## 공개 Cloudflare 임시 배포 검증

2026-09-17 임시 주소에서 확인했지만 현재 주소는 Claim 만료로 삭제됐다.

- `/`, `/guest`, `/admin`, `/screen`: 모두 HTTP 200
- `GET /api/events/demo/view`: 정상 view
- 지원하지 않는 event ID: HTTP 404
- SSE 연결 직후 현재 version 수신
- Admin의 `CHECK IN → WARM UP` 변경이 Screen에 실시간 반영
- Worker 재배포 뒤 Durable Object version 유지
- Admin 데스크톱에서 reset 버튼이 하단 고정 제어에 가리던 문제 재현
- `md:pb-36` 수정 후 force 없이 reset 버튼 클릭 성공
- reset 후 Screen `CHECK IN`, 4 players, version 4 확인

## 개인 Cloudflare 배포 검증

2026-09-17 16:59 KST 개인 계정의
`https://partymaker.jmeef0802.workers.dev`에서 확인했다.

- `/`, `/guest`, `/admin`, `/screen`: 모두 HTTP 200
- 지원하지 않는 event ID: HTTP 404
- SSE 연결 직후 현재 version 수신
- Guest `배포검증` 등록 후 참가자 5명 확인
- `CHECK IN → WARM UP → TELEPATHY` Stage 전환
- 미션 공개·완료와 Guest 5점 반영
- 투표 공개·응답·마감·결과 공개와 정답 10점 반영
- 같은 command ID를 재전송해 응답 수와 receipt version이 증가하지 않음
- Worker 재배포 뒤 Durable Object version `11`과 Guest 상태 유지
- 검증 후 demo reset: version `12`, 참가자 4명, `CHECK IN`
- Basic Auth 배포 후 익명 `/admin`, Admin view, non-guest command: HTTP 401
- 401 응답의 `WWW-Authenticate: Basic realm="PartyMaker Admin"` challenge 확인
- ID `admin`과 secret password로 `/admin`, Admin view, command: HTTP 200
- Guest와 Screen은 인증 없이 HTTP 200 유지
- secret 활성화 후 인증 없는 Guest join command와 개인화 view 정상
- Cloudflare Git clean build에서 `dist/client` 누락 실패를 재현하고 기본
  `pnpm build`를 `next build && vinext build`로 수정해 `npx wrangler deploy` 전에
  vinext assets와 generated deploy config를 생성
- 인증 검증 후 최종 demo reset: version `15`, 참가자 4명, `CHECK IN`

## 아직 필요한 검증

- [x] 개인 Cloudflare 계정 무료 배포 후 전체 smoke 재실행
- [ ] 실물 iPhone Safari와 Android Chrome
- [ ] 행사장 Wi-Fi에서 Guest 다중 동시 접속
- [ ] 프로젝터/TV 1920×1080 실제 거리 가독성
- [ ] 네트워크 단절/복귀와 EventSource 재연결
- [ ] 3명 이상 동시 투표의 67%/33% 집계
- [ ] 늦은 응답, stale version, 같은 command ID 재시도 API 검증
- [x] Admin Basic Auth 구현 후 비인가 401와 정상 조작
- [ ] 행사 직전 최소 30~60분 soak test

더 세밀한 수동 체크리스트는 `docs/verification.md`를 사용한다.

## Main Screen 3D prod 검증

2026-09-17 개인 Cloudflare Worker에 procedural Midnight Garden scene을 배포했다.

- 활성 배포 version: `09fc39a5-14e3-42e7-8a3c-db9314221c94`
- Three.js `0.186.0`, R3F `9.7.0`, Drei `10.7.8`, GSAP `3.15.0` exact pin
- Vitest 6개 파일, 31개 테스트 통과
- ESLint, TypeScript, Next production build, vinext 5단계 build 통과
- Worker dry-run: assets 163개, 총 gzip 613.23 KiB
- `/screen` 전용 dynamic `party-scene` chunk CDN HTTP 200, 972,897 bytes
- `/`, `/guest`, `/screen`: HTTP 200, 익명 `/admin`: 401, 인증 `/admin`: 200
- Admin command로 Screen `WARM UP → FINALE` view 전환 확인
- SSE initial version 수신 확인
- 최종 demo reset: version `18`, 참가자 4명, `CHECK IN`
- 시각 캡처는 사용자 지시에 따라 실행하지 않고 사용자가 실제 Screen에서 확인

## Main Screen 3D production endpoint soak

2026-09-17 약 60분 동안 5분 간격 11회로 개인 Cloudflare production을 점검했다.

- Guest와 Screen HTTP 200 연속 유지
- 익명 Admin HTTP 401 + Basic challenge, 인증 Admin HTTP 200 연속 유지
- Screen view version `18`, `CHECK IN`, `cue-welcome`, 참가자 4명 유지
- SSE 연결 직후 version event 연속 수신
- `party-scene` CDN chunk HTTP 200, 972,897 bytes 연속 유지
- GitHub main `6a02ec1`의 Workers Builds check success 유지
- 60분 soak 검증 대상 Cloudflare deployment: `26cfe8d5-c7bb-4da6-b80f-ef4bdf6286d9`
- soak 중 애플리케이션 오류, 상태 drift, 재배포 또는 수정 필요 사항 없음

이 검증은 endpoint/CDN/SSE 안정성 soak다. 실제 브라우저에서 WebGL을 60분 연속
렌더링한 GPU soak와 행사장 프로젝터 가독성 검증은 별도 리허설로 남는다.

## Role-aware surface design 검증

민엠따와 devops-brain의 실제 UI를 참고해 세 surface의 역할별 디자인 시스템을 적용했다.

- Guest: porcelain canvas, sky selection/focus, coral CTA, semantic light border/text
- Admin: near-black canvas, translucent dark panel, moonlight signal, compact HUD radius
- Screen: Midnight Garden 유지, overlay card와 badge radius 축소
- Home: 세 launcher가 실제 Guest/Admin/Screen palette를 미리 표시
- `surface-design.test.ts`: Guest/Admin token, WebGL Screen-only, compact radius 경계 3건
- ESLint, TypeScript, Vitest 5개 파일 21개 테스트, Next/vinext build 통과

### Production smoke

- direct deployment: `a050a088-0139-451c-a856-71ea8c31a4e2`
- Home, Guest, Screen HTTP 200
- Admin anonymous 401 + Basic challenge, authenticated 200
- Guest/Admin/Screen/party-scene client chunks CDN HTTP 200
- SSE initial version event 정상
- runtime은 version `33`, `WARM UP`, 참가자 5명으로 실제 사용 중이어서 reset하지 않음

## 근성순대 projector palette 검증

- 공식 Yanolja Brand Center 기준 Yanolja Orange: `#F54B1E`, RGB `245 75 30`
- core brand: black `#050505`, orange `#F54B1E`, white `#FFFFFF`
- Guest: white/light-gray surface, black text, orange selection/focus/CTA
- Admin: black panel, white telemetry, orange active/focus/action
- Screen: black fog, orange light, white particles/copy; Stage 차이는 camera/energy로 표현
- `surface-design.test.ts`가 brand token 3개를 검증
- `stage-visuals.test.ts`가 9개 Stage의 orange/white 조명을 검증

### Projector palette production smoke

- direct deployment: `18d4ba62-d3df-4bef-9beb-b3f1c5ba1ab7`
- prod CSS에서 `--pm-brand-orange:#f54b1e` 확인
- Screen client가 `party-scene-DO3cVAts.js`를 동적 참조하고 CDN HTTP 200
- Home, Guest, Screen HTTP 200
- Admin anonymous 401 + Basic challenge, authenticated 200
- Screen view와 SSE 정상
- runtime version `56`, `WARM UP`, 참가자 5명은 실제 사용 상태로 보존

## Bundled content pack 검증

- Stage 9개, Cue 37개, Mission 10개, Interaction 12개
- 모든 Stage에 최소 3개 Cue와 설명 존재
- 모든 Cue가 정확히 한 Stage에 속하고 중복 ID 없음
- Mission cue와 mission ID 양방향 참조 검증
- Interaction cue, option ID, correct answer, scoring 참조 검증
- 미완성 placeholder copy 검사
- 게임 Stage가 draft interaction/locked mission이 아닌 announcement Cue로 시작

## 결과 공개 gate 회귀 검증

- 원인: Screen selector가 `closed`부터 aggregate를 내려줌
- 수정: `after-close` 계약을 `after-reveal`로 교체
- open: Screen results 없음
- closed: Screen results 없음, `RESULTS LOCKED` 공개 대기 UI
- revealed: aggregate·정답 공개
- `live` visibility는 기존 동작 유지
- reducer selector 회귀 테스트가 close/reveal 경계를 검증

## Admin recovery와 content CRUD 검증

- closed interaction 재열기: 기존 응답 유지, reveal 직접 실행 거부
- revealed interaction 개별 초기화: response와 awarded score 제거, draft 복귀
- announcement create/update/delete
- mission create/update/cascade delete
- interaction create/update/publish/respond/close/reveal/cascade delete
- active Cue 삭제 시 deleted Cue가 runtime/history에 남지 않고 fallback Cue 활성화
- Admin `투표 다시 열기`, `이 투표 초기화`, `콘텐츠 관리` command 배선 검사
- 콘텐츠 편집은 고정 overlay modal이라 기존 Admin grid 높이를 변경하지 않음
