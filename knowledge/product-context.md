# Product Context

## 제품 정의

PartyMaker는 결혼식 뒤풀이의 Guest 휴대폰, MC Admin, 메인 Screen을 하나의
서버 권위 상태로 연결하는 라이브 인터랙션 앱이다. 목표는 화면 체류 시간이 아니라
서로 일부만 아는 사람들이 자연스럽게 섞이고, 웃고, 관계를 이해하는 것이다.

예상 환경:

- 비공개 대관 장소
- 수십 명에서 낮은 수백 명 규모
- 약 1~2시간의 공식 진행 후 자유 음주·대화
- 진행자와 운영자가 같은 사람
- 늦은 20대에서 늦은 30대가 중심인 혼합 연령대

## 런타임 원칙

고정 시각표로 진행하지 않는다. 기본 순서는 아래와 같지만 현장에서 바뀔 수 있다.

`CHECK IN → WARM UP → TELEPATHY → BEAT THE GROOM → TABLE BATTLE → RELATIONSHIP → SECRET MISSION → FINALE → AFTER PARTY`

MC는 코드 수정 없이 다음 동작을 할 수 있어야 한다.

- 다음/이전/일시정지
- Stage 또는 Cue 직접 선택
- 미션 공개
- 투표·퀴즈 공개, 종료, 결과 공개
- 즉석 질문 삽입
- 점수 조정
- Screen 상태 전환

## 세 화면

### Guest

- 모바일 우선, 엄지손가락으로 명확하게 조작
- QR → 이름/관계/테이블/표시 동의 → 참여
- 계정, 비밀번호, 이메일, 전화번호 없음
- 브라우저 로컬 저장소에 guest ID를 저장해 새로고침 후 복구
- 현재 Stage에 맞춰 미션, 투표, 결과, 점수를 보여 줌

### Admin

- 가장 중요한 운영 화면
- 현재 Stage/Cue, 다음 흐름, 참가자, 활성 상호작용, 점수를 한눈에 표시
- 주요 제어는 크고 분명하게, 위험 동작은 확인 후 실행
- 기업용 CMS처럼 조밀하게 만들지 않음

### Screen

- TV/프로젝터와 먼 거리 가독성 우선
- CHECK IN QR, 현재 Stage, 미션, 질문, 결과, 리더보드 등을 쇼처럼 표현
- 일반 운영 대시보드처럼 보이면 안 됨

## MVP 0 성공 조건

1. Guest가 참여한다.
2. Admin에서 새 Guest를 확인한다.
3. Admin이 Stage를 변경하면 Guest와 Screen이 즉시 갱신된다.
4. Admin이 미션을 공개하면 Guest가 보고 완료한다.
5. Admin이 투표/질문을 공개하고 Guest가 응답한다.
6. Admin이 투표를 닫고 결과를 공개한다.
7. Screen이 집계 결과를 표시하고 점수가 한 번만 반영된다.
8. 새로고침, 재연결, 중복 클릭에도 최종 상태가 일치한다.

현재 이 수직 루프는 구현 및 검증됐다.

## 제품 확장 방향

- Telepathy: 일부 문항만 Guest 예측과 연결하고, 현장에서 생긴 TMI를 후속 질문으로 재사용
- Beat the Groom: 지원자 모집, MC 선택, 승자 예측을 일반화된 라운드 원시 기능으로 구현
- Table Battle: 테이블 점수는 경쟁적으로 보여 주되 개인 경쟁은 과열시키지 않음
- Relationship Map: 등록 관계 정보를 MC 프롬프터와 Screen 소개에 활용
- Secret Mission: 실제로 존재하고 아직 만나지 않은 사람을 연결하는 미션
- Finale: 테이블 우승, 완료 미션, 새 연결 수, 추첨을 한 번에 마무리
- After Party: 송 리퀘스트, 랜덤 대화 상대, 사진 프롬프트 등 가벼운 도구

## 명시적 비목표

- 범용 이벤트 관리 SaaS
- 완성된 다중 이벤트/다중 테넌트 운영 화면
- 엔터프라이즈 인증 시스템
- 부정행위를 막기 위한 복잡한 검증
- 게임마다 별도 엔진을 만드는 것
- 최종 행사 콘텐츠를 코드에 깊게 하드코딩하는 것

## 현재 시각 언어

현재 구현의 기준은 웨딩 초대장 스타일이 아니라 어두운 라이브 쇼/게임 쇼 톤이다.

- 배경: ink 계열의 짙은 남색/검정
- 강조: lime, coral, violet, cyan
- 본문: Noto Sans KR Variable
- display: Bricolage Grotesque Variable
- 큰 블록, 높은 대비, 명확한 focus, 44px 안팎의 touch target
- motion은 reveal, Stage 전환, 점수 변화처럼 상태 의미가 있을 때만 사용

정확한 token은 `src/app/globals.css`가 기준이다. 현재
`design-system/partymaker/MASTER.md`의 rose/Great Vibes 웨딩 초대장 방향은 실제
구현 및 원본 제품 브리프와 충돌하는 오래된 생성 산출물이므로 그대로 적용하지 않는다.
