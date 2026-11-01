'use client';

import { useEffect, useRef } from 'react';

/**
 * "Node network" canvas behind the hero (successor of the legacy particles.js background):
 * nodes in the brand colours drift, link to neighbours within 150px, link to the pointer on
 * hover, and gain 4 more nodes on click. Dependency-free; a static frame under reduced motion.
 */
const CONFIG = {
  density: 45 / 800,
  maxRadius: 1.8,
  opacity: 0.75,
  speed: 0.9,
  linkDistance: 150,
  linkOpacity: 0.16,
  grabDistance: 170,
  pushCount: 4,
};

/** lime, aqua, violet, white — weighted towards the quieter colours. */
const COLORS = ['198,242,78', '82,227,207', '143,124,255', '143,124,255', '238,240,246', '238,240,246'];

type Particle = { x: number; y: number; vx: number; vy: number; r: number; c: string };

function makeParticle(w: number, h: number, x = Math.random() * w, y = Math.random() * h): Particle {
  return {
    x,
    y,
    vx: Math.random() - 0.5,
    vy: Math.random() - 0.5,
    r: Math.max(0.6, Math.random() * CONFIG.maxRadius),
    c: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

export function ParticlesBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let particles: Particle[] = [];
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;

    function resize() {
      const ratio = window.devicePixelRatio || 1;
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * ratio;
      canvas!.height = height * ratio;
      ctx!.setTransform(ratio, 0, 0, ratio, 0, 0);
      const count = Math.round(((width * height) / 1000) * CONFIG.density);
      particles = Array.from({ length: count }, () => makeParticle(width, height));
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height);
      const step = CONFIG.speed / 2;
      for (const p of particles) {
        if (!reduceMotion) {
          p.x += p.vx * step;
          p.y += p.vy * step;
          if (p.x < -p.r) p.x = width + p.r;
          else if (p.x > width + p.r) p.x = -p.r;
          if (p.y < -p.r) p.y = height + p.r;
          else if (p.y > height + p.r) p.y = -p.r;
        }
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.c},${CONFIG.opacity})`;
        ctx!.fill();
      }

      ctx!.lineWidth = 1;
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d > CONFIG.linkDistance) continue;
          ctx!.strokeStyle = `rgba(170,180,255,${CONFIG.linkOpacity * (1 - d / CONFIG.linkDistance)})`;
          ctx!.beginPath();
          ctx!.moveTo(a.x, a.y);
          ctx!.lineTo(b.x, b.y);
          ctx!.stroke();
        }
        if (pointer) {
          const d = Math.hypot(a.x - pointer.x, a.y - pointer.y);
          if (d <= CONFIG.grabDistance) {
            ctx!.strokeStyle = `rgba(198,242,78,${0.55 * (1 - d / CONFIG.grabDistance)})`;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(pointer.x, pointer.y);
            ctx!.stroke();
          }
        }
      }
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    }

    function toLocal(e: PointerEvent) {
      const rect = canvas!.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    const onMove = (e: PointerEvent) => {
      pointer = toLocal(e);
    };
    const onLeave = () => {
      pointer = null;
    };
    const onClick = (e: PointerEvent) => {
      // Clicks on the search controls shouldn't spawn particles.
      if ((e.target as Element).closest('a, button, input, select, textarea, form, [role="listbox"]')) return;
      const { x, y } = toLocal(e);
      for (let i = 0; i < CONFIG.pushCount; i++) particles.push(makeParticle(width, height, x, y));
      if (reduceMotion) draw();
    };

    const onResize = () => {
      resize();
      if (reduceMotion) draw();
    };

    resize();
    draw();
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('pointerdown', onClick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('pointerdown', onClick);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none absolute inset-0 size-full" />;
}
