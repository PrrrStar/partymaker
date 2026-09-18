"use client";

import { Hand, Heart, PartyPopper, Radio, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { LobbyConnectionState } from "@/client/use-lobby-room";
import type { LobbyEmote } from "@/lobby/protocol";

const KEY_VECTORS: Record<string, { x: number; z: number }> = {
  ArrowUp: { x: 0, z: -1 },
  w: { x: 0, z: -1 },
  W: { x: 0, z: -1 },
  ArrowDown: { x: 0, z: 1 },
  s: { x: 0, z: 1 },
  S: { x: 0, z: 1 },
  ArrowLeft: { x: -1, z: 0 },
  a: { x: -1, z: 0 },
  A: { x: -1, z: 0 },
  ArrowRight: { x: 1, z: 0 },
  d: { x: 1, z: 0 },
  D: { x: 1, z: 0 },
};

export function LobbyJoystick({
  status,
  ready,
  onMove,
  onEmote,
  onReady,
}: {
  status: LobbyConnectionState;
  ready: boolean;
  onMove: (x: number, z: number) => boolean;
  onEmote: (emote: LobbyEmote) => boolean;
  onReady: (ready: boolean) => boolean;
}) {
  const [vector, setVector] = useState({ x: 0, z: 0 });
  const vectorRef = useRef(vector);
  const activeKeys = useRef(new Set<string>());

  const updateVector = useCallback((next: { x: number; z: number }) => {
    vectorRef.current = next;
    setVector(next);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const current = vectorRef.current;
      if (Math.abs(current.x) + Math.abs(current.z) > 0.02) {
        onMove(current.x, current.z);
      }
    }, 80);
    return () => window.clearInterval(interval);
  }, [onMove]);

  const vectorFromKeys = useCallback(() => {
    let x = 0;
    let z = 0;
    for (const key of activeKeys.current) {
      const value = KEY_VECTORS[key];
      if (value) {
        x += value.x;
        z += value.z;
      }
    }
    const magnitude = Math.hypot(x, z) || 1;
    updateVector({ x: x / magnitude, z: z / magnitude });
  }, [updateVector]);

  const updatePointer = (element: HTMLButtonElement, clientX: number, clientY: number) => {
    const rect = element.getBoundingClientRect();
    const radius = rect.width / 2;
    const x = (clientX - (rect.left + radius)) / radius;
    const z = (clientY - (rect.top + radius)) / radius;
    const magnitude = Math.max(1, Math.hypot(x, z));
    updateVector({ x: x / magnitude, z: z / magnitude });
  };

  const connected = status === "live";

  return (
    <section className="grid gap-5 rounded-[var(--pm-radius-xl)] border border-[var(--pm-border)] bg-white p-5 shadow-[var(--pm-shadow-card)]" aria-labelledby="lobby-controller-title">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black tracking-[0.12em] text-[var(--pm-brand-orange)]">3D 대기방</p>
          <h2 className="mt-1 text-xl font-black" id="lobby-controller-title">내 캐릭터 움직이기</h2>
          <p className="mt-1 text-sm text-[var(--pm-muted)]">메인 화면을 보면서 조이스틱을 움직여 보세요.</p>
        </div>
        <span className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold ${connected ? "bg-black text-white" : "bg-[var(--pm-surface-soft)] text-[var(--pm-muted)]"}`}>
          {connected ? <Radio aria-hidden="true" size={14} /> : <WifiOff aria-hidden="true" size={14} />}
          {connected ? "연결됨" : "연결 중…"}
        </span>
      </div>

      <div className="grid grid-cols-[minmax(9rem,12rem)_1fr] items-center gap-5">
        <button
          className="relative aspect-square w-full touch-none rounded-full border-2 border-black/15 bg-[var(--pm-surface-soft)] shadow-inner disabled:opacity-45"
          type="button"
          aria-label="아바타 이동 조이스틱. 방향키 또는 WASD로도 움직일 수 있습니다."
          disabled={!connected}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            updatePointer(event.currentTarget, event.clientX, event.clientY);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              updatePointer(event.currentTarget, event.clientX, event.clientY);
            }
          }}
          onPointerUp={(event) => {
            event.currentTarget.releasePointerCapture(event.pointerId);
            updateVector({ x: 0, z: 0 });
            onMove(0, 0);
          }}
          onPointerCancel={() => {
            updateVector({ x: 0, z: 0 });
            onMove(0, 0);
          }}
          onKeyDown={(event) => {
            if (!KEY_VECTORS[event.key]) return;
            event.preventDefault();
            activeKeys.current.add(event.key);
            vectorFromKeys();
          }}
          onKeyUp={(event) => {
            if (!KEY_VECTORS[event.key]) return;
            event.preventDefault();
            activeKeys.current.delete(event.key);
            vectorFromKeys();
          }}
        >
          <span
            className="absolute left-1/2 top-1/2 grid size-[42%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[var(--pm-brand-orange)] text-[var(--pm-brand-black)] shadow-lg transition-transform"
            style={{ transform: `translate(calc(-50% + ${vector.x * 62}px), calc(-50% + ${vector.z * 62}px))` }}
            aria-hidden="true"
          >
            <span className="size-2 rounded-full bg-current" />
          </span>
        </button>

        <div className="grid gap-3">
          <p className="text-sm font-bold">친구를 만나면 인사해 보세요.</p>
          <div className="grid grid-cols-3 gap-2">
            <button className="grid min-h-16 place-items-center gap-1 rounded-[var(--pm-radius-md)] border border-black/15 bg-white text-xs font-bold transition-colors hover:border-[var(--pm-brand-orange)] disabled:opacity-45" type="button" disabled={!connected} onClick={() => onEmote("hello")}><Hand aria-hidden="true" size={22} />인사</button>
            <button className="grid min-h-16 place-items-center gap-1 rounded-[var(--pm-radius-md)] border border-black/15 bg-white text-xs font-bold transition-colors hover:border-[var(--pm-brand-orange)] disabled:opacity-45" type="button" disabled={!connected} onClick={() => onEmote("clap")}><PartyPopper aria-hidden="true" size={22} />박수</button>
            <button className="grid min-h-16 place-items-center gap-1 rounded-[var(--pm-radius-md)] border border-black/15 bg-white text-xs font-bold transition-colors hover:border-[var(--pm-brand-orange)] disabled:opacity-45" type="button" disabled={!connected} onClick={() => onEmote("heart")}><Heart aria-hidden="true" size={22} />하트</button>
          </div>
          <button
            className={`min-h-12 rounded-[var(--pm-radius-md)] border px-4 text-sm font-black transition-colors ${ready ? "border-black bg-black text-white" : "border-[var(--pm-brand-orange)] bg-[var(--pm-brand-orange)] text-[var(--pm-brand-black)]"}`}
            type="button"
            disabled={!connected}
            aria-pressed={ready}
            onClick={() => onReady(!ready)}
          >
            {ready ? "준비 완료 · 다시 둘러보기" : "대기방 준비 완료"}
          </button>
        </div>
      </div>
    </section>
  );
}
