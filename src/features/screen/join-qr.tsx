"use client";

import { QRCodeSVG } from "qrcode.react";
import { useSyncExternalStore } from "react";

const subscribeToOrigin = () => () => {};

function getGuestUrl() {
  return new URL("/guest", window.location.origin).toString();
}

export function JoinQr() {
  const guestUrl = useSyncExternalStore(
    subscribeToOrigin,
    getGuestUrl,
    () => "",
  );

  return (
    <div className="grid justify-items-center gap-[clamp(.75rem,1.5vh,1.25rem)]">
      <div className="grid aspect-square w-[clamp(11rem,19vw,18rem)] place-items-center rounded-[clamp(1rem,1.8vw,1.75rem)] bg-[var(--pm-ivory,#f7f3e8)] p-[clamp(.8rem,1.4vw,1.35rem)] shadow-[0_24px_80px_rgba(0,0,0,.35)]">
        {guestUrl ? (
          <QRCodeSVG
            className="h-auto w-full"
            bgColor="#f7f3e8"
            fgColor="#0b0b14"
            level="M"
            marginSize={1}
            size={256}
            title="PartyMaker 게스트 입장 QR"
            value={guestUrl}
          />
        ) : (
          <span className="size-full animate-pulse rounded-xl bg-black/10" aria-hidden="true" />
        )}
      </div>
      <div className="text-center">
        <p className="text-[clamp(.85rem,1.2vw,1.2rem)] font-black tracking-[0.16em] text-[var(--pm-lime,#d7ff3f)]">
          SCAN TO JOIN
        </p>
        <p className="mt-1 max-w-[24rem] truncate text-[clamp(.65rem,.85vw,.85rem)] text-white/35">
          {guestUrl || "게스트 주소 준비 중"}
        </p>
      </div>
    </div>
  );
}
