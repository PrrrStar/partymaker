# Current State

- 마지막 확인: 2026-09-17 15:48 KST
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
- 서버 권위 상태 + SSE 무효화 알림 + snapshot 재조회
- `commandId` 기반 중복 명령 방지
- `expectedVersion` 기반 낙관적 충돌 감지
- 로컬 `MemoryEventStore`
- Cloudflare SQLite Durable Object 저장소
- vinext 기반 Cloudflare Worker 빌드
- Wrangler 자동 생성 바인딩 타입과 config drift 검사
- CHECK IN 화면의 실제 origin 기반 Guest QR
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

- 2026-09-17에 임시 계정 `Bold Jellyfish`로 배포하고 공개 환경을 검증했다.
- 당시 주소는 `partymaker.bold-jellyfish.workers.dev`였다.
- Claim 제한 시간이 지나 현재 주소는 DNS가 해제됐고 더 이상 서비스되지 않는다.
- 사용자는 개인 Cloudflare 계정을 만들고 브라우저에는 로그인했다.
- 로컬 Wrangler CLI는 현재 `You are not authenticated` 상태다.
- 개인 계정 무료 재배포는 사용자의 요청대로 나중에 진행한다.
- Claim 토큰이나 인증정보는 저장소에 남기지 않았다.

## 알려진 제약

- 현재 Worker는 `demo` 이벤트 하나만 허용한다.
- 이벤트 생성/복제/삭제 UI가 없다.
- Cloudflare 운영 데이터 export/import/backup 경로가 없다.
- `PARTYMAKER_ADMIN_SECRET`을 설정하면 API는 보호되지만 Admin UI는 secret을 전송하지 않는다.
  따라서 UI 인증 흐름을 추가하기 전에는 실제 행사 배포에서 secret만 먼저 켜면 안 된다.
- 운영자 계정, 권한, 감사 로그가 없다.
- SSE는 최신 version을 알리는 용도이며 전체 이벤트 로그가 아니다.
- 로컬 `pnpm dev` 상태는 프로세스 재시작 시 초기화된다.
- 실제 행사장 Wi-Fi, 프로젝터, 물리 휴대폰 다중 접속 리허설은 아직 하지 않았다.
- vinext는 현재 beta 패키지를 사용한다. 업그레이드 전 호환성 검증이 필요하다.
- `design-system/partymaker/MASTER.md`는 rose/Great Vibes 방향이라 현재 dark live-show
  UI 및 원본 브리프와 충돌한다. 실제 시각 기준은 `src/app/globals.css`다.

## 저장소와 계정 경계

- GitHub 저장소: `https://github.com/PrrrStar/partymaker.git`
- 개인 저장소 commit/push는 `PrrrStar <42401897+PrrrStar@users.noreply.github.com>`만 사용
- 회사 GitHub/AWS/Kubernetes 계정은 이 프로젝트에 사용하지 않음
- Cloudflare도 개인 계정 + 무료 플랜을 기본 경계로 사용
