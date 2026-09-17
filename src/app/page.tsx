import Link from "next/link";
import {
  ArrowUpRight,
  Clock3,
  MonitorUp,
  Route,
  SlidersHorizontal,
  Smartphone,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  BrandMark,
  LiveStatus,
  MetricPill,
  MotionReveal,
  StageBadge,
  SurfaceCard,
} from "@/components/ui";

type Launcher = {
  href: string;
  number: string;
  label: string;
  title: string;
  description: string;
  meta: string;
  tone: "lime" | "coral" | "cyan";
  icon: LucideIcon;
};

const launchers: Launcher[] = [
  {
    href: "/guest",
    number: "01",
    label: "Guest",
    title: "하객으로 참여",
    description: "QR로 입장하고, 지금 열린 미션과 투표에 바로 참여합니다.",
    meta: "10초 체크인",
    tone: "lime",
    icon: Smartphone,
  },
  {
    href: "/admin",
    number: "02",
    label: "MC Control",
    title: "쇼를 운영하기",
    description: "현재 큐를 한눈에 보고 다음 장면, 질문, 점수를 즉시 제어합니다.",
    meta: "라이브 콘솔",
    tone: "coral",
    icon: SlidersHorizontal,
  },
  {
    href: "/screen",
    number: "03",
    label: "Main Screen",
    title: "메인 화면 열기",
    description: "프로젝터와 TV에 연결할 큰 글자 중심의 라이브 쇼 화면입니다.",
    meta: "프로젝터 모드",
    tone: "cyan",
    icon: MonitorUp,
  },
];

export default function Home() {
  return (
    <main className="pm-home" aria-labelledby="home-title">
      <header className="pm-home__header">
        <BrandMark />
        <LiveStatus label="Show system ready" status="ready" />
      </header>

      <section className="pm-home__hero" aria-labelledby="home-title">
        <div className="pm-home__copy">
          <StageBadge eyebrow="Wedding after-party" tone="violet">
            Cue-driven live OS
          </StageBadge>
          <h1 className="pm-home__title" id="home-title">
            휴대폰은 리모컨.
            <span className="pm-home__title-accent">파티가 메인.</span>
          </h1>
          <p className="pm-home__description">
            하객, MC, 메인 스크린이 같은 순간을 봅니다. 고정된 시간표 대신
            분위기에 맞춰 큐를 열고, 닫고, 다음 장면으로 넘어가세요.
          </p>

          <div className="pm-home__metrics" aria-label="PartyMaker 핵심 특징">
            <MetricPill
              icon={<UsersRound aria-hidden="true" />}
              label="연결된 화면"
              tone="lime"
              value="03"
            />
            <MetricPill
              icon={<Clock3 aria-hidden="true" />}
              label="목표 체크인"
              tone="coral"
              value="10 SEC"
            />
            <MetricPill
              icon={<Route aria-hidden="true" />}
              label="진행 방식"
              tone="cyan"
              value="LIVE CUES"
            />
          </div>
        </div>

        <SurfaceCard className="pm-now-card" tone="violet">
          <div className="pm-now-card__topline">
            <BrandMark compact />
            <LiveStatus label="Live preview" status="live" />
          </div>
          <div className="pm-now-card__cue">
            <p className="pm-now-card__label">Now / Warm up</p>
            <h2 className="pm-now-card__title">첫 번째 미션이 곧 공개됩니다.</h2>
            <p className="pm-now-card__note">
              화면보다 서로를 먼저 봐주세요. 휴대폰은 필요한 순간에만 켜집니다.
            </p>
          </div>
          <div className="pm-now-card__footer">
            <span>CHECKED IN</span>
            <span className="pm-now-card__count">37 GUESTS</span>
          </div>
        </SurfaceCard>
      </section>

      <section className="pm-launch" aria-labelledby="launch-title">
        <div className="pm-launch__heading-row">
          <div>
            <p className="pm-launch__kicker">Choose your view</p>
            <h2 className="pm-launch__title" id="launch-title">
              어디에서 시작할까요?
            </h2>
          </div>
          <p className="pm-launch__hint">
            세 화면은 같은 라이브 상태를 각자의 역할에 맞게 보여줍니다.
          </p>
        </div>

        <div className="pm-launch__grid">
          {launchers.map((launcher, index) => {
            const Icon = launcher.icon;

            return (
              <MotionReveal delay={index * 0.06} key={launcher.href}>
                <Link
                  className={`pm-launch-card pm-launch-card--${launcher.tone}`}
                  href={launcher.href}
                >
                  <span className="pm-launch-card__top">
                    <span className="pm-launch-card__icon" aria-hidden="true">
                      <Icon />
                    </span>
                    <span className="pm-launch-card__number">/{launcher.number}</span>
                  </span>

                  <span className="pm-launch-card__content">
                    <span className="pm-launch-card__label">{launcher.label}</span>
                    <span className="pm-launch-card__title">{launcher.title}</span>
                    <span className="pm-launch-card__description">
                      {launcher.description}
                    </span>
                  </span>

                  <span className="pm-launch-card__footer">
                    <span>{launcher.meta}</span>
                    <span className="pm-launch-card__arrow" aria-hidden="true">
                      <ArrowUpRight />
                    </span>
                  </span>
                </Link>
              </MotionReveal>
            );
          })}
        </div>
      </section>

      <footer className="pm-home__footer">
        <div className="pm-home__stages" aria-label="기본 파티 흐름">
          <StageBadge tone="lime">Check in</StageBadge>
          <StageBadge>Warm up</StageBadge>
          <StageBadge>Live play</StageBadge>
          <StageBadge tone="coral">Finale</StageBadge>
        </div>
        <p className="pm-home__footer-note">The room is the product</p>
      </footer>
    </main>
  );
}
