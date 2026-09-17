# Decisions

## D1. 고정 시간표 대신 Stage/Cue 런타임

결정: 이벤트를 시각별 일정으로 하드코딩하지 않고 Stage와 Cue의 현재 활성 상태로 표현한다.

이유: MC가 웃긴 장면을 연장하거나 재미없는 순서를 즉시 건너뛰어야 한다.

영향: 모든 화면은 현재 runtime을 기준으로 그리며 Admin 명령으로 흐름을 바꾼다.

## D2. 서버 권위 단일 상태

결정: 브라우저 localStorage를 이벤트 상태 원본으로 사용하지 않는다.

이유: Guest/Admin/Screen이 서로 다른 기기에서도 같은 결과를 봐야 하고, 새로고침과
중복 요청이 상태를 갈라놓으면 안 된다.

영향: localStorage는 Guest ID 복구에만 사용한다.

## D3. SSE에는 snapshot이 아니라 version 알림만 전달

결정: 상태 변경 시 `{eventId, version}`을 보내고 클라이언트가 view를 재조회한다.

이유: 재접속 후 누락된 메시지를 재생하지 않아도 최종 상태로 수렴한다.

영향: SSE는 이벤트 히스토리나 메시지 큐가 아니다.

## D4. reducer와 selector는 실행 환경에서 분리

결정: 동일한 순수 도메인 로직을 로컬 Memory store와 Cloudflare Durable Object가 공유한다.

이유: 외부 인프라 없이 MVP를 빠르게 만들면서 배포 환경에서도 동일한 규칙을 보장한다.

## D5. Cloudflare에서 event별 SQLite Durable Object 사용

결정: `idFromName/get` 조합 대신 `getByName(eventId)`로 event별 object에 라우팅한다.

이유: 한 이벤트 안의 명령 순서를 직렬화하면서 Worker isolate가 달라도 상태와 receipt를
공유해야 한다. SQLite backend는 Workers Free에서 지원된다.

영향: 한 event가 하나의 coordination atom이다. 모든 이벤트를 하나의 전역 object에 넣지 않는다.

## D6. 현재는 `demo` 이벤트만 허용

결정: Worker 진입점에서 다른 event ID를 Durable Object 생성 전에 404 처리한다.

이유: 아직 이벤트 관리 기능이 없으며 임의 ID 요청이 무료 사용량과 namespace를 낭비하면 안 된다.

## D7. Admin은 단순 HTTP Basic Auth로 보호

결정: `/admin`은 ID `admin`과 Cloudflare secret 비밀번호를 사용하는 브라우저 HTTP
Basic Auth로 보호한다. Guest와 Screen은 인증 없이 공개한다.

이유: 일회성 파티 운영 화면에는 계정 시스템, OAuth, cookie session보다 브라우저 기본
ID/PW challenge가 운영과 구현 모두 단순하다.

영향: `PARTYMAKER_ADMIN_SECRET`은 Basic Auth password이며 Cloudflare secret에만 저장한다.
Admin view와 non-guest command도 같은 인증을 요구하고, 기존 API client용 secret/bearer
header는 호환 유지한다.

## D8. Cloudflare는 개인 계정 무료 플랜만 사용

결정: 결제나 유료 업그레이드를 자동으로 하지 않는다.

이유: 현재 예상 규모는 무료 한도 내이며 사용자가 무료 사용을 명시했다.

영향: 한도 초과 시 유료 전환보다 요청 실패를 우선 허용하고, 실제 행사 전 최신 한도를 확인한다.

## D9. 개인 GitHub identity 고정

결정: 이 저장소의 author, committer, push credential은 `PrrrStar`만 사용한다.

이유: 회사 계정과 개인 프로젝트 기록을 분리한다.

## D10. 역할별 surface가 하나의 semantic system을 공유

결정: Guest는 민엠따에서 가져온 밝은 controller 구조, Admin은 devops-brain에서
가져온 dark HUD 구조, Screen은 3D show 구조를 사용하되, 세 화면의 브랜드 색은
검정·Yanolja Orange `#F54B1E`·흰색으로 통일한다.

이유: 하객 휴대폰은 친근하고 즉시 이해돼야 하고, 진행자 콘솔은 정보 밀도와 상태 대비가
중요하며, 빔 화면은 행사 몰입을 담당한다. 세 역할을 같은 dark card UI로 통일하면 각자의
사용 맥락을 약화시킨다.

영향: `pm-guest-shell`과 `pm-admin-shell`이 같은 semantic token 이름을 surface별로
재정의한다. 공통 radius·focus·motion 계약은 공유하고 palette·density만 역할별로 다르게
적용한다. Home의 세 launcher card는 실제 surface palette를 미리 보여준다.

## D11. 3D는 Main Screen의 웨딩 나이트 가든에 집중

결정: Three.js/R3F/GSAP 3D scene은 `/screen`에만 적용한다. Guest는 QR 입력폼과 게임
리모컨, Admin은 HTML 운영 콘솔을 유지한다.

이유: 빔프로젝터 화면은 장면 전환과 AI 동반감이 행사 몰입을 높이지만, 하객 휴대폰과
MC 콘솔의 WebGL은 배터리·GPU·조작 안정성 비용이 가치보다 크다.

영향: Screen은 Stage/Cue/참가자/Reveal 상태에 반응하는 procedural Midnight Garden을
표현한다. 핵심 palette는 black `#050505`, Yanolja Orange `#F54B1E`, white `#FFFFFF`다.
Stage 차이는 색을 늘리지 않고 camera path와 energy로 표현한다. QR과 핵심 문자는
Canvas가 아니라 white/orange HTML overlay로 유지한다.

## D12. 범용 콘텐츠 팩은 실행 가능하게, 실제 커플 정보는 추정하지 않음

결정: bundled demo에 9 Stage, 37 Cue, 10 Mission, 12 Interaction의 범용 피로연
콘텐츠를 제공한다. 실제 신랑·신부 이름, 개인 TMI, 커플 정답은 입력받기 전까지
지어내지 않는다.

이유: 빈 Stage는 리허설이 불가능하지만, 가짜 개인 정보나 정답을 넣으면 실제 행사에서
더 큰 운영 사고가 난다.

영향: Table Battle은 부케·금혼식·부토니에처럼 객관식 정답이 있는 일반 퀴즈를 사용하고,
커플 관련 문항은 정답 점수 없는 poll/prediction으로 둔다. 각 게임 Stage는 announcement로
진입한 뒤 MC가 질문이나 미션을 공개한다.

## D13. 투표 마감과 결과 공개는 분리

결정: `interaction.close`는 추가 응답만 막고, Screen aggregate와 정답은
`interaction.reveal` 이후에만 공개한다.

이유: MC가 결과를 설명하거나 현장 반응을 만든 뒤 원하는 순간에 공개해야 한다. 마감과
동시에 결과가 보이면 Admin의 `결과 공개` 버튼이 의미가 없어지고 진행 타이밍이 깨진다.

영향: visibility 계약은 `after-reveal`이다. closed Screen은 참여 인원과 공개 대기 상태만
표시하고 option count/percentage/correct answer를 받지 않는다. `live` interaction만 예외로
진행 중 aggregate를 공개할 수 있다.
