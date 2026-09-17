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
- Vitest 4개 파일, 18개 테스트 통과
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
- Vitest 4개 파일, 18개 테스트 통과
- ESLint, TypeScript, Next production build, vinext 5단계 build 통과
- Worker dry-run: assets 163개, 총 gzip 613.23 KiB
- `/screen` 전용 dynamic `party-scene` chunk CDN HTTP 200, 972,897 bytes
- `/`, `/guest`, `/screen`: HTTP 200, 익명 `/admin`: 401, 인증 `/admin`: 200
- Admin command로 Screen `WARM UP → FINALE` view 전환 확인
- SSE initial version 수신 확인
- 최종 demo reset: version `18`, 참가자 4명, `CHECK IN`
- 시각 캡처는 사용자 지시에 따라 실행하지 않고 사용자가 실제 Screen에서 확인
