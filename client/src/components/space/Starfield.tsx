/**
 * 캔버스 별 필드 — 우주 유영 연출의 기반 레이어.
 *
 * - 3겹 패럴랙스: 깊이가 얕은 별일수록 천천히 흐른다.
 * - speed prop은 목표값이고 내부에서 lerp로 따라가므로
 *   열차 출발/정차 시 별 흐름이 자연스럽게 가감속된다.
 * - prefers-reduced-motion이면 정적인 별만 1회 그린다.
 * - 탭이 숨겨지면 rAF를 멈춰 배터리를 아낀다.
 */
import { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  depth: number; // 0..1, 클수록 가깝고 빠르고 밝다
  radius: number;
  baseAlpha: number;
  twinklePhase: number;
  twinkleSpeed: number;
}

interface ShootingStar {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 0..1 남은 수명
}

export interface StarfieldProps {
  /** 별이 흐르는 속도 배율. 0이면 제자리 반짝임만. 기본 0.3 */
  speed?: number;
  /** 1000px²당 별 개수. 기본 0.16 */
  density?: number;
  /** 가끔 별똥별을 흘려보낼지. 기본 false */
  shootingStars?: boolean;
  className?: string;
}

const DRIFT_PX_PER_SEC = 26; // speed=1, depth=1일 때 흐르는 속도

export default function Starfield({
  speed = 0.3,
  density = 0.16,
  shootingStars = false,
  className,
}: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetSpeedRef = useRef(speed);

  useEffect(() => {
    targetSpeedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let stars: Star[] = [];
    let shooting: ShootingStar[] = [];
    let width = 0;
    let height = 0;
    let rafId = 0;
    let lastTime = 0;
    let currentSpeed = targetSpeedRef.current;
    let nextShootingAt = performance.now() + 4000 + Math.random() * 8000;

    const seedStars = () => {
      const count = Math.round(((width * height) / 1000) * density);
      stars = Array.from({ length: count }, () => {
        const depth = 0.25 + Math.random() * 0.75;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          depth,
          radius: (0.4 + Math.random() * 1.0) * (0.5 + depth * 0.7),
          baseAlpha: 0.25 + depth * 0.55 * Math.random() + 0.15,
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0.6 + Math.random() * 1.8,
        };
      });
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedStars();
      if (reducedMotion) drawFrame(0, 0);
    };

    const drawFrame = (time: number, dt: number) => {
      ctx.clearRect(0, 0, width, height);

      // 출발/정차 시 별 흐름이 부드럽게 가감속되도록 보간
      currentSpeed += (targetSpeedRef.current - currentSpeed) * Math.min(1, dt * 2.2);

      for (const star of stars) {
        if (!reducedMotion) {
          star.x -= DRIFT_PX_PER_SEC * currentSpeed * star.depth * dt;
          if (star.x < -2) {
            star.x = width + 2;
            star.y = Math.random() * height;
          }
        }
        const twinkle = reducedMotion
          ? 1
          : 0.65 + 0.35 * Math.sin(time * 0.001 * star.twinkleSpeed + star.twinklePhase);
        ctx.globalAlpha = Math.min(1, star.baseAlpha * twinkle);
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (shootingStars && !reducedMotion) {
        if (time > nextShootingAt && shooting.length < 2) {
          shooting.push({
            x: width * (0.3 + Math.random() * 0.7),
            y: height * Math.random() * 0.4,
            vx: -(120 + Math.random() * 160),
            vy: 40 + Math.random() * 60,
            life: 1,
          });
          nextShootingAt = time + 6000 + Math.random() * 10000;
        }
        shooting = shooting.filter(s => s.life > 0);
        for (const s of shooting) {
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          s.life -= dt * 1.4;
          const tailX = s.x - s.vx * 0.12;
          const tailY = s.y - s.vy * 0.12;
          const gradient = ctx.createLinearGradient(s.x, s.y, tailX, tailY);
          gradient.addColorStop(0, `rgba(255,255,255,${0.85 * s.life})`);
          gradient.addColorStop(1, "rgba(255,255,255,0)");
          ctx.globalAlpha = 1;
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(s.x, s.y);
          ctx.lineTo(tailX, tailY);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 1;
    };

    const tick = (time: number) => {
      const dt = lastTime ? Math.min(0.05, (time - lastTime) / 1000) : 0.016;
      lastTime = time;
      drawFrame(time, dt);
      rafId = requestAnimationFrame(tick);
    };

    const start = () => {
      if (reducedMotion || rafId) return;
      lastTime = 0;
      rafId = requestAnimationFrame(tick);
    };
    const stop = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const handleVisibility = () => {
      if (document.hidden) stop();
      else start();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    start();
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [density, shootingStars]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`}
      aria-hidden
    />
  );
}
