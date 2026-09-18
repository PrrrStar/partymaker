"use client";

import { AdaptiveDpr, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { gsap } from "gsap";
import {
  Component,
  type ErrorInfo,
  type ReactNode,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import {
  Color,
  Group,
  MathUtils,
  Mesh,
  MeshStandardMaterial,
  Vector3,
} from "three";

import {
  resolveStageVisual,
  type SceneCueKind,
  type SceneInteractionPhase,
  type StageVisual,
} from "./stage-visuals";
import type { LobbyAvatar } from "@/lobby/protocol";

interface PartySceneCanvasProps {
  stageId?: string | null;
  cueKind?: SceneCueKind;
  interactionPhase?: SceneInteractionPhase;
  participantCount?: number;
  lobbyAvatars?: LobbyAvatar[];
  reducedMotion?: boolean;
  className?: string;
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("PartyMaker WebGL scene disabled", error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function Branch({
  position,
  rotation,
  length,
  radius,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  length: number;
  radius: number;
  color: string;
}) {
  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius * 0.64, radius, length, 8]} />
      <meshStandardMaterial color={color} roughness={0.78} metalness={0.12} />
    </mesh>
  );
}

function Garden({ visual, reducedMotion }: { visual: StageVisual; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const crown = useRef<Group>(null);
  const core = useRef<Mesh>(null);
  const coreMaterial = useRef<MeshStandardMaterial>(null);
  const accent = useMemo(() => new Color(visual.accent), [visual.accent]);
  const secondary = useMemo(() => new Color(visual.secondary), [visual.secondary]);

  useLayoutEffect(() => {
    if (!group.current || !crown.current || !coreMaterial.current) return;
    const duration = reducedMotion ? 0 : 1.25;
    const context = gsap.context(() => {
      gsap.to(group.current!.scale, {
        x: 0.88 + visual.growth * 0.22,
        y: 0.88 + visual.growth * 0.3,
        z: 0.88 + visual.growth * 0.22,
        duration,
        ease: "power3.out",
      });
      gsap.to(crown.current!.rotation, {
        y: visual.energy * Math.PI * 0.18,
        duration,
        ease: "power2.inOut",
      });
      gsap.to(coreMaterial.current!.color, {
        r: accent.r,
        g: accent.g,
        b: accent.b,
        duration,
      });
      gsap.to(coreMaterial.current!.emissive, {
        r: accent.r,
        g: accent.g,
        b: accent.b,
        duration,
      });
    });
    return () => context.revert();
  }, [accent, reducedMotion, visual.energy, visual.growth]);

  useFrame((state, delta) => {
    if (!group.current || reducedMotion) return;
    group.current.rotation.y += delta * (0.028 + visual.energy * 0.02);
    if (core.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.045 * visual.energy;
      core.current.scale.setScalar(pulse);
    }
  });

  const orbPositions: [number, number, number][] = [
    [-1.8, 2.8, 0.4],
    [1.55, 3.1, -0.2],
    [-0.3, 4.1, 0.1],
    [2.25, 2.15, 0.45],
    [-2.35, 1.9, -0.15],
    [0.75, 2.4, 1.2],
  ];

  return (
    <group ref={group} position={[0, -2.4, 0]}>
      <Branch position={[0, 2.1, 0]} rotation={[0, 0, -0.04]} length={4.2} radius={0.38} color="#493039" />
      <group ref={crown}>
        <Branch position={[-0.82, 3.15, 0]} rotation={[0.1, 0.1, 0.78]} length={2.35} radius={0.2} color="#6f454b" />
        <Branch position={[0.9, 3.25, -0.15]} rotation={[-0.1, 0.2, -0.82]} length={2.5} radius={0.2} color="#6f454b" />
        <Branch position={[-1.1, 2.25, 0.15]} rotation={[0, -0.2, 1.02]} length={2.1} radius={0.16} color="#5a3944" />
        <Branch position={[1.25, 2.35, 0.2]} rotation={[0.1, 0.15, -1.06]} length={2.2} radius={0.16} color="#5a3944" />
        {orbPositions.map((position, index) => (
          <mesh key={position.join(":")} position={position} scale={0.25 + index * 0.018}>
            <icosahedronGeometry args={[1, 2]} />
            <meshStandardMaterial
              color={index % 2 ? secondary : accent}
              emissive={index % 2 ? secondary : accent}
              emissiveIntensity={1.8 + visual.energy * 2}
              roughness={0.16}
            />
          </mesh>
        ))}
      </group>
      <mesh ref={core} position={[0, 2.2, 0.45]}>
        <icosahedronGeometry args={[0.42, 3]} />
        <meshStandardMaterial
          ref={coreMaterial}
          color={visual.accent}
          emissive={visual.accent}
          emissiveIntensity={2.4}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.8, 64]} />
        <meshStandardMaterial color="#100e14" roughness={1} transparent opacity={0.72} />
      </mesh>
    </group>
  );
}

function LobbyFigure({ avatar, reducedMotion }: { avatar: LobbyAvatar; reducedMotion: boolean }) {
  const group = useRef<Group>(null);
  const emote = useRef<Mesh>(null);
  const target = useMemo(() => new Vector3(avatar.x, -2.05, avatar.z), [avatar.x, avatar.z]);

  useFrame((state, delta) => {
    if (!group.current) return;
    const distance = group.current.position.distanceTo(target);
    group.current.position.lerp(target, MathUtils.clamp(delta * 8, 0, 1));
    group.current.rotation.y = MathUtils.lerp(
      group.current.rotation.y,
      avatar.heading,
      MathUtils.clamp(delta * 9, 0, 1),
    );
    if (!reducedMotion && distance > 0.025) {
      group.current.position.y = -2.05 + Math.abs(Math.sin(state.clock.elapsedTime * 9)) * 0.08;
    }
    if (emote.current) {
      emote.current.visible = Boolean(avatar.emoteAt && Date.now() - avatar.emoteAt < 2_400);
      if (emote.current.visible && !reducedMotion) {
        emote.current.position.y = 1.75 + Math.sin(state.clock.elapsedTime * 5) * 0.1;
      }
    }
  });

  const bodyScale = avatar.style === "tall" ? [0.7, 1.25, 0.7] : avatar.style === "star" ? [1.05, 0.85, 1.05] : [0.9, 0.95, 0.9];

  return (
    <group ref={group} position={[avatar.x, -2.05, avatar.z]}>
      <mesh position={[0, 0.78, 0]} scale={bodyScale as [number, number, number]} castShadow>
        <capsuleGeometry args={[0.24, 0.55, 5, 10]} />
        <meshStandardMaterial color={avatar.color} roughness={0.48} metalness={0.08} />
      </mesh>
      <mesh position={[0, 1.42, 0]} castShadow>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.62} />
      </mesh>
      <mesh position={[-0.1, 1.48, 0.25]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
      <mesh position={[0.1, 1.48, 0.25]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color="#050505" />
      </mesh>
      <mesh ref={emote} position={[0, 1.75, 0]} visible={false}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshStandardMaterial color="#f54b1e" emissive="#f54b1e" emissiveIntensity={2} />
      </mesh>
      {avatar.ready ? (
        <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.34, 0.43, 24]} />
          <meshBasicMaterial color="#f54b1e" transparent opacity={0.8} />
        </mesh>
      ) : null}
    </group>
  );
}

function LobbyCrowd({ avatars, reducedMotion }: { avatars: LobbyAvatar[]; reducedMotion: boolean }) {
  return (
    <group>
      {avatars.slice(0, 80).map((avatar) => (
        <LobbyFigure key={avatar.guestId} avatar={avatar} reducedMotion={reducedMotion} />
      ))}
    </group>
  );
}

function CameraRig({ visual, reducedMotion }: { visual: StageVisual; reducedMotion: boolean }) {
  const { camera } = useThree();
  const target = useRef(new Vector3(...visual.target));

  useLayoutEffect(() => {
    const duration = reducedMotion ? 0 : 1.45;
    const nextTarget = new Vector3(...visual.target);
    const context = gsap.context(() => {
      gsap.to(camera.position, {
        x: visual.camera[0],
        y: visual.camera[1],
        z: visual.camera[2],
        duration,
        ease: "power3.inOut",
      });
      gsap.to(target.current, {
        x: nextTarget.x,
        y: nextTarget.y,
        z: nextTarget.z,
        duration,
        ease: "power3.inOut",
      });
    });
    return () => context.revert();
  }, [camera, reducedMotion, visual.camera, visual.target]);

  useFrame(() => camera.lookAt(target.current));
  return null;
}

function Scene({
  visual,
  reducedMotion,
  lobbyAvatars,
}: {
  visual: StageVisual;
  reducedMotion: boolean;
  lobbyAvatars: LobbyAvatar[];
}) {
  const { scene } = useThree();

  useFrame((state, delta) => {
    const nextFog = new Color(visual.fog);
    if (scene.fog) {
      scene.fog.color.lerp(nextFog, MathUtils.clamp(delta * 1.8, 0, 1));
    }
    state.gl.setClearColor(0x000000, 0);
  });

  return (
    <>
      <fog attach="fog" args={[visual.fog, 7, 18]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[0, 4, 4]} color={visual.accent} intensity={4 + visual.energy * 5} distance={16} />
      <pointLight position={[-4, 1, 2]} color={visual.secondary} intensity={3.2} distance={14} />
      <Garden visual={visual} reducedMotion={reducedMotion} />
      <LobbyCrowd avatars={lobbyAvatars} reducedMotion={reducedMotion} />
      <Sparkles
        count={92}
        scale={[12, 8, 8]}
        size={2.2}
        speed={reducedMotion ? 0 : 0.28 + visual.energy * 0.22}
        color={visual.secondary}
        opacity={0.52}
        noise={0.9}
      />
      <CameraRig visual={visual} reducedMotion={reducedMotion} />
      <AdaptiveDpr pixelated />
    </>
  );
}

export function PartySceneCanvas({
  stageId,
  cueKind = "standby",
  interactionPhase,
  participantCount = 0,
  lobbyAvatars = [],
  reducedMotion = false,
  className,
}: PartySceneCanvasProps) {
  const visual = useMemo(
    () => resolveStageVisual(stageId, cueKind, interactionPhase, participantCount),
    [cueKind, interactionPhase, participantCount, stageId],
  );

  return (
    <SceneBoundary
      fallback={<div className={`${className ?? ""} pm-scene-fallback`} aria-hidden="true" />}
    >
      <div className={className} aria-hidden="true">
        <Canvas
          camera={{ position: [...visual.camera], fov: 42, near: 0.1, far: 40 }}
          dpr={[1, 1.5]}
          frameloop={reducedMotion ? "demand" : "always"}
          gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        >
          <Scene visual={visual} reducedMotion={reducedMotion} lobbyAvatars={lobbyAvatars} />
        </Canvas>
      </div>
    </SceneBoundary>
  );
}
