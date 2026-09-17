# Current State

- 마지막 확인: 2026-09-17 20:17 KST
- 기준 브랜치: `main`
- 문서 작성 직전 코드 HEAD: `cd45839`

## 완료된 구현

- Next.js 16, React 19, TypeScript, Tailwind 기반 앱
- `/guest`, `/admin`, `/screen` 세 화면
- Stage/Cue 중심의 공통 도메인 모델과 순수 reducer
- Guest 등록과 로컬 guest ID 유지
- Stage 전환, 일시정지, 직접 선택
- 미션 공개/완료/점수 반영
- 투표·퀴즈 공개/응답/종료/결과 공개
- 즉석 질문 생성
- 테이블 및 Guest 점수 이벤트
- Screen override와 리더보드 표현
- `/screen` 전용 Three.js/R3F procedural Midnight Garden
- Stage/Cue/참가자/Reveal 상태에 반응하는 GSAP camera·조명·입자 전환
- 3D scene client-only lazy loading, DPR 제한, reduced-motion, WebGL fallback
- 서버 권위 상태 + SSE 무효화 알림 + snapshot 재조회
- `commandId` 기반 중복 명령 방지
- `expectedVersion` 기반 낙관적 충돌 감지
- 로컬 `MemoryEventStore`
- Cloudflare SQLite Durable Object 저장소
- vinext 기반 Cloudflare Worker 빌드
- Wrangler 자동 생성 바인딩 타입과 config drift 검사
- CHECK IN 화면의 실제 origin 기반 Guest QR
- `/admin`과 Admin API의 shared-password HTTP Basic Auth
- Cloudflare Git의 `pnpm build → npx wrangler deploy` clean build 경로
- 관리자 데스크톱 하단 고정 제어가 초기화 버튼을 가리던 문제 수정

## Seed 데이터

- 이벤트 1개: `demo`
- Stage 9개
- 테이블 4개
- 샘플 Guest 4명
- 미션 2개
- 상호작용 2개
- 첫 Stage: `CHECK IN`

정확한 데이터는 `src/domain/seed.ts`가 기준이다.

## Git 이력

- `6f096e4 feat: build PartyMaker live MVP`
  - 앱 부트스트랩, 도메인, 세 화면, 로컬 실시간 루프, 테스트와 문서
- `95c7247 feat: deploy PartyMaker on Cloudflare Workers`
  - vinext, Worker, SQLite Durable Object, 배포 설정
- `cd45839 fix: harden Cloudflare deployment`
  - Wrangler 생성 타입, `getByName`, 지원하지 않는 event ID 조기 차단, Admin 하단 여백 수정

## Cloudflare 현재 상태

- 2026-09-17 개인 Cloudflare 계정에 Worker `partymaker`를 배포했다.
- 공개 주소는 `https://partymaker.jmeef0802.workers.dev`다.
- 로컬 Wrangler CLI는 개인 계정 OAuth에 인증돼 있다.
- `/`, `/guest`, `/admin`, `/screen`, API, SSE가 공개 환경에서 정상 응답한다.
- Guest 참여부터 미션·투표·마감·공개까지 전체 루프를 검증했다.
- 동일 command ID 재시도는 version을 증가시키지 않았다.
- Worker 재배포 전후 Durable Object version `11`과 smoke Guest가 유지됐다.
- Basic Auth 배포 후 익명 `/admin`, Admin view, non-guest command는 HTTP 401을 반환한다.
- ID `admin`과 Cloudflare secret 비밀번호로 `/admin`, Admin view, command가 HTTP 200임을 확인했다.
- Guest와 Screen은 인증 없이 HTTP 200을 유지한다.
- Main Screen 3D deployment `26cfe8d5-c7bb-4da6-b80f-ef4bdf6286d9`를 약 60분 soak 검증했다.
  문서-only merge도 새 deployment version을 만들므로 현재 활성 ID는 Wrangler로 조회한다.
- 최종 `event.reset-demo`로 version `18`, 참가자 4명, `CHECK IN` 상태로 정리했다.
- `PARTYMAKER_ADMIN_SECRET`은 Cloudflare secret으로 설정했고 실제 값은 저장소에 남기지 않았다.
- 토큰이나 인증정보는 저장소에 남기지 않았다.

## 알려진 제약

- 현재 Worker는 `demo` 이벤트 하나만 허용한다.
- 이벤트 생성/복제/삭제 UI가 없다.
- Cloudflare 운영 데이터 export/import/backup 경로가 없다.
- Admin 인증은 단일 shared password의 HTTP Basic Auth이며 운영자별 계정, 권한,
  감사 로그는 없다.
- SSE는 최신 version을 알리는 용도이며 전체 이벤트 로그가 아니다.
- 로컬 `pnpm dev` 상태는 프로세스 재시작 시 초기화된다.
- 실제 행사장 Wi-Fi, 프로젝터, 물리 휴대폰 다중 접속 리허설은 아직 하지 않았다.
- vinext는 현재 beta 패키지를 사용한다. 업그레이드 전 호환성 검증이 필요하다.
- Main Screen 3D scene은 코드·build·CDN asset·Stage 전환까지 검증했지만 실제
  프로젝터의 GPU 성능과 행사 거리 가독성은 아직 리허설이 필요하다.

## 저장소와 계정 경계

- GitHub 저장소: `https://github.com/PrrrStar/partymaker.git`
- 개인 저장소 commit/push는 `PrrrStar <42401897+PrrrStar@users.noreply.github.com>`만 사용
- 회사 GitHub/AWS/Kubernetes 계정은 이 프로젝트에 사용하지 않음
- Cloudflare도 개인 계정 + 무료 플랜을 기본 경계로 사용
