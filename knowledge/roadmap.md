# Roadmap

우선순위는 실제 행사에서 실패할 가능성과 MC 운영 부담을 기준으로 한다.

## P0 — 다음 작업

- [x] 개인 Cloudflare 계정으로 무료 재배포
  - 개인 계정 Wrangler OAuth 로그인 완료
  - 유료 플랜·결제 변경 없이 Workers 배포
  - build, dry-run, deploy, smoke, persistence 검증 완료
  - 공개 URL을 knowledge 문서에 기록
- [x] Admin 보호 구현
  - 브라우저 HTTP Basic Auth 적용
  - ID `admin` 고정, password는 Cloudflare secret에만 저장
  - `/admin`, Admin view, non-guest command 보호
  - Guest와 Screen은 공개 유지
  - 비인가 401와 정상 인증 200 공개 검증 완료
- [x] Main Screen 3D 웨딩 나이트 가든
  - Three.js/R3F/GSAP 기반 Stage-driven scene
  - Guest와 Admin은 WebGL 없이 기존 역할 유지
  - wedding palette, reduced-motion, WebGL fallback
  - Cloudflare prod 배포와 Stage 전환 smoke 완료
- [x] 민엠따·devops-brain 기반 role-aware 디자인 시스템
  - Guest bright controller / Admin dark HUD / Screen wedding show
  - compact radius, low elevation, semantic surface token
  - Home launcher에 역할별 palette 반영
  - WebGL Screen-only 회귀 테스트
- [x] 근성순대 projector brand palette
  - black `#050505`, Yanolja Orange `#F54B1E`, white `#FFFFFF`
  - Guest/Admin/Screen/Home token 통일
  - 9개 Stage camera 유지, orange/white scene 조명 고정
  - 핵심 문구와 QR의 pastel 의존 제거
- [ ] 실제 행사 콘텐츠를 코드 변경 없이 준비할 경로 결정
  - 단기: seed JSON/TS 편집 + 배포
  - 중기: Admin의 upcoming Cue 편집/재정렬 UI
- [ ] 행사장 리허설
  - 실물 폰, Wi-Fi, TV/프로젝터
  - MC 한 손 조작
  - 네트워크 끊김/복구
  - 화면 잠금 방지와 전체화면 운영 절차

## P1 — MVP 운영 완성

- [ ] event export/import 또는 최소 JSON backup
- [ ] 운영 전용 reset 외 상태 복구 지점
- [ ] upcoming Cue reorder/skip UI 완성
- [ ] Beat the Groom 지원자 신청·MC 선택·예측 primitive
- [ ] Relationship Map 소개 대상 선택과 MC 프롬프터
- [ ] 현장 EventFact/TMI 캡처 후 quick question으로 재사용
- [ ] 참가자 수십 명 load test와 SSE 재연결 soak test
- [ ] Admin command 실패/재시도 상태를 더 분명하게 표시
- [x] `design-system/partymaker/MASTER.md`를 실제 dark live-show 및 wedding scene token과 일치시키기

## P2 — 행사 경험 확장

- [ ] Guest 간 reciprocal confirmation 또는 QR pairing
- [ ] 실제 연결 수 집계와 Finale 시각화
- [ ] 개인화 Secret Mission 생성 가능성 검사
- [ ] raffle weight 모델
- [ ] After Party 도구: song request, 메시지 월, 랜덤 photo prompt

## 후순위 또는 보류

- 다중 테넌트 SaaS
- 결제
- 복잡한 역할 기반 권한
- Kubernetes/마이크로서비스
- 별도 graph database
- 게임별 전용 엔진
- 부정행위 방지 시스템

## 개인 Cloudflare 재배포 완료 조건

- [x] Wrangler `whoami`가 개인 계정을 가리킴
- [x] 유료 플랜/결제 변경 없음
- [x] 배포 URL에서 세 화면 HTTP 200
- [x] Guest join → Admin 참가자 → Stage change → Screen sync
- [x] mission 및 poll 전체 루프
- [x] 동일 command ID 중복 방지
- [x] 재배포 후 Durable Object 상태 유지
- [x] 새 URL과 검증 시각을 knowledge 문서에 반영
