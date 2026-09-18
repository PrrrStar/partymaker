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
      <div className="grid aspect-square w-[clamp(8rem,13vw,13rem)] place-items-center rounded-[clamp(.75rem,1.2vw,1.1rem)] bg-[var(--pm-ivory,#ffffff)] p-[clamp(.55rem,.9vw,.8rem)] shadow-[0_16px_48px_rgba(0,0,0,.35)]">
        {guestUrl ? (
          <QRCodeSVG
            className="h-auto w-full"
            bgColor="#ffffff"
            fgColor="#050505"
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
        <p className="text-[clamp(.85rem,1.2vw,1.2rem)] font-black tracking-[0.12em] text-[var(--pm-brand-orange,#f54b1e)]">
          QR로 입장하기
        </p>
        <p className="mt-1 max-w-[24rem] text-[clamp(.75rem,.85vw,.85rem)] text-white/65">
          {guestUrl ? "휴대폰 카메라로 QR을 스캔해 주세요." : "입장 주소 준비 중…"}
        </p>
      </div>
    </div>
  );
}
