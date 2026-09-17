# PartyMaker Knowledge Base

이 폴더는 새 에이전트가 대화 기록 없이도 PartyMaker 작업을 이어받기 위한
저장소 내부 인수인계 문서다. 구현과 문서가 충돌하면 실행 가능한 코드와 테스트가
우선이며, 차이를 발견한 에이전트는 같은 작업에서 이 폴더도 갱신한다.

## 새 에이전트 시작 순서

1. 이 문서를 읽는다.
2. [product-context.md](product-context.md)에서 제품 목표와 금지 사항을 읽는다.
3. [current-state.md](current-state.md)에서 현재 완료 범위와 배포 상태를 확인한다.
4. [architecture.md](architecture.md)에서 상태 모델과 요청 흐름을 파악한다.
5. [roadmap.md](roadmap.md)에서 다음 우선순위를 고른다.
6. Cloudflare 작업이면 [cloudflare.md](cloudflare.md)를 먼저 읽는다.
7. 변경 전 `git status --short`와 `git log --oneline -5`를 확인한다.
8. 코드 변경 후 [verification.md](verification.md)의 자동 검사를 실행한다.

## 현재 한 줄 상태

MVP 0의 Guest/Admin/Screen 전체 루프와 Cloudflare Workers용 SQLite Durable
Object 어댑터까지 구현됐다. 2026-09-17에 만든 임시 Cloudflare 배포는 Claim
시간 만료로 사라졌으며, 개인 Cloudflare 계정으로의 무료 재배포는 의도적으로
후속 작업으로 남겨 두었다.

## 문서 지도

- [product-context.md](product-context.md): 원본 빌드 브리프의 제품 원칙과 MVP 범위
- [current-state.md](current-state.md): 지금까지 구현한 것, Git 이력, 현재 제약
- [architecture.md](architecture.md): 도메인, API, 로컬/Cloudflare 실행 구조
- [decisions.md](decisions.md): 이미 내린 주요 결정과 이유
- [verification.md](verification.md): 완료된 검증과 다음 검증 절차
- [cloudflare.md](cloudflare.md): 무료 배포 구조, 현재 인증 상태, 개인 계정 재배포 절차
- [roadmap.md](roadmap.md): 앞으로 할 일과 완료 조건

## 절대 바꾸지 말아야 할 제품 원칙

- PartyMaker는 미니게임 모음이 아니라 결혼식 뒤풀이의 라이브 운영체제다.
- 고정 시간표가 아니라 MC가 조작하는 `Stage → Cue` 런타임을 중심으로 한다.
- Guest는 QR에서 참여까지 약 10초, 계정·비밀번호·이메일 없이 진입한다.
- Admin은 마이크를 든 MC가 한눈에 이해하고 한 손으로 조작할 수 있어야 한다.
- Screen은 대시보드가 아니라 멀리서 읽히는 쇼의 무대 화면이다.
- 휴대폰은 컨트롤러일 뿐이다. 사람들이 실제로 대화하고 웃는 것이 제품 목표다.
- Kubernetes, 마이크로서비스, Kafka, Redis 클러스터 같은 인프라는 도입하지 않는다.
- 개인 저장소의 GitHub 작업은 항상 `PrrrStar` 개인 계정으로만 한다.
- Cloudflare는 사용자가 별도로 승인하기 전까지 무료 플랜 안에서만 사용한다.

## 문서 유지 규칙

- 기능을 완료하면 `current-state.md`와 `verification.md`를 갱신한다.
- 되돌리기 어려운 설계 결정을 내리면 `decisions.md`에 이유와 영향을 적는다.
- 배포 주소, 인증 상태, 바인딩이 바뀌면 `cloudflare.md`를 갱신한다.
- 할 일이 완료되거나 우선순위가 바뀌면 `roadmap.md`를 갱신한다.
- 토큰, Claim URL, API 키, admin secret은 어떤 문서에도 기록하지 않는다.

