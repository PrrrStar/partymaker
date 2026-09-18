# Bundled Party Content Pack

## 목적

실제 커플 정보를 받기 전에도 PartyMaker의 전체 운영 흐름을 리허설할 수 있도록
실행 가능한 범용 피로연 콘텐츠를 제공한다. 개인 이름·내부 TMI·커플의 실제 답은
추정하지 않는다.

## 구성

- Stage: 9
- Cue: 37
- Mission: 10
- Interaction: 12
- Module instance: 13 (Timer 12, Team Score 1)
- Module catalog: 6
- Table: 4
- Sample Guest: 4

## Run of show

1. `CHECK IN`
   - QR 입장과 3D avatar 선택
   - 휴대폰 virtual joystick으로 Main Screen avatar 직접 이동
   - 인사·박수·하트 emote와 ready tutorial
   - 휴대폰보다 사람을 먼저 본다는 운영 규칙
   - 8초 현재 파티 온도 poll
2. `WARM UP`
   - Stage 안내
   - 처음 만난 사람과 첫 건배
   - 테이블 이름 릴레이
   - 테이블 텐션 poll과 함성
3. `TELEPATHY`
   - Stage 안내
   - 첫 답 일치 여부, 먼저 연락하는 사람, 완벽한 주말 prediction
   - 커플 실제 답을 MC가 말로 공개하는 마무리
4. `BEAT THE GROOM`
   - 도전자 현장 소개
   - 신랑/도전자 승자 prediction
   - 테이블 응원 구호 mission
5. `TABLE BATTLE`
   - Stage 안내
   - Bouquet, 금혼식, 부토니에 객관식 quiz
   - 5초 단체 포즈 mission
   - Table leaderboard
6. `RELATIONSHIP`
   - 등록된 인연으로 주인공 찾기
   - 가장 많이 모인 인연 poll
   - 다른 테이블 사람과 공통점 찾기 mission
7. `SECRET MISSION`
   - Stage 안내
   - 반대편 하객과 건배
   - 구체적인 칭찬
   - 다른 테이블과 단체 사진
   - 서로 모르는 하객 두 명 소개
8. `FINALE`
   - Stage 안내
   - 오늘의 MVP 테이블 poll
   - 최종 leaderboard
   - 감사 인사
9. `AFTER PARTY`
   - 공식 진행 종료 안내
   - 다음 음악 분위기 poll
   - 새로 알게 된 사람과 마지막 사진 mission

## 실제 행사 전 교체할 내용

- Event title/subtitle와 신랑·신부 이름
- Telepathy 문항과 두 사람의 실제 답
- Relationship 소개 문구와 공개 가능한 TMI
- Beat the Groom 실제 종목과 도전자 안내
- 테이블 이름 및 좌석 구성
- Finale 감사 문구

현재 커플 관련 prediction에는 고정 정답 점수를 두지 않는다. 객관식 정답 점수는 일반
웨딩 상식 quiz에만 있다.

## 배포 주의

`src/domain/seed.ts`를 배포해도 이미 존재하는 Durable Object 상태는 자동으로 바뀌지
않는다. 새 콘텐츠를 production에 적용하려면 Admin의 `데모 초기화` 또는
`event.reset-demo`가 필요하며, 이 작업은 현재 참가자·응답·점수를 삭제한다. 실제 행사
데이터가 있는 상태에서는 명시적 승인 없이 reset하지 않는다.

## 결과 공개 규칙

Bundled interaction 12개는 모두 `after-reveal`이다. `투표 닫기`는 응답만 막고 Main
Screen에는 결과를 보여주지 않는다. MC가 `결과 공개`를 눌러야 option count, percentage,
정답과 점수가 공개된다.

## Bundled modules

응답형 Cue 12개에는 8~15초 Timer overlay가 연결된다. interaction publish/reopen이 timer를
자동 시작하고 close/reset이 timer lifecycle을 함께 갱신한다. `TABLE BATTLE`에는 Stage 전체
Team Score overlay가 연결돼 quiz와 mission 진행 중에도 순위를 함께 볼 수 있다.

Admin `게임·도구 조립`에서 다음 사전 등록 module을 Stage 전체 또는 특정 Cue에 추가한다.

- 카운트다운 타이머
- 팀별 점수판
- 토너먼트
- 리그
- 초성·제시어 퀴즈
- AI 가위바위보

한 scope에는 primary game 1개만 enabled 상태로 둘 수 있고 Timer·Team Score overlay는 함께
사용한다. 현재 MVP에서 Timer와 Team Score는 완전 동작하며 나머지 primary module은 조립,
활성/비활성, 순서, Screen/Guest presentation까지 제공한다. 대진·라운드별 gameplay state는
각 definition의 후속 확장 범위다.
