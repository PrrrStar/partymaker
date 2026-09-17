import type { HTMLAttributes, ReactNode } from "react";
import { LoaderCircle, Wifi, WifiOff } from "lucide-react";
import { cx } from "./utils";

export type ConnectionState = "connected" | "connecting" | "offline";

export type ConnectionBannerProps = HTMLAttributes<HTMLDivElement> & {
  action?: ReactNode;
  message?: string;
  status: ConnectionState;
  title?: string;
};

const copy: Record<ConnectionState, { message: string; title: string }> = {
  connected: {
    title: "라이브에 연결됨",
    message: "새로운 큐가 열리면 이 화면에 바로 표시됩니다.",
  },
  connecting: {
    title: "다시 연결하는 중",
    message: "선택한 내용은 이 기기에 안전하게 보관하고 있어요.",
  },
  offline: {
    title: "연결이 잠시 끊겼어요",
    message: "네트워크를 확인하면 자동으로 다시 연결합니다.",
  },
};

export function ConnectionBanner({
  action,
  className,
  message,
  status,
  title,
  ...props
}: ConnectionBannerProps) {
  const Icon =
    status === "connected" ? Wifi : status === "connecting" ? LoaderCircle : WifiOff;

  return (
    <div
      aria-live={status === "offline" ? "assertive" : "polite"}
      className={cx(
        "pm-connection-banner",
        `pm-connection-banner--${status}`,
        className,
      )}
      role={status === "offline" ? "alert" : "status"}
      {...props}
    >
      <span className="pm-connection-banner__icon" aria-hidden="true">
        <Icon className={status === "connecting" ? "pm-loading-state__icon" : undefined} />
      </span>
      <span className="pm-connection-banner__content">
        <span className="pm-connection-banner__title">{title ?? copy[status].title}</span>
        <span className="pm-connection-banner__message">
          {message ?? copy[status].message}
        </span>
      </span>
      {action ? <span className="pm-connection-banner__action">{action}</span> : null}
    </div>
  );
}
