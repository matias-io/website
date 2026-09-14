'use client';
import { useEffect, useRef } from 'react';

/** Original wave study inspired by the slow motion of console start screens. */
export function RibbonScene({ active = true }: { active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    const context = node?.getContext('2d');
    if (!node || !context) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    function draw(time: number) {
      if (!node || !context) return;
      const w = node.clientWidth,
        h = node.clientHeight,
        dpr = Math.min(devicePixelRatio || 1, 2);
      if (!w || !h) return;
      if (node.width !== w * dpr || node.height !== h * dpr) {
        node.width = w * dpr;
        node.height = h * dpr;
      }
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, w, h);
      const phase = active && !reduced.matches ? time * 0.00018 : 0;
      // A translucent ribbon rather than an opaque gradient: keep the light in motion.
      const glow = context.createLinearGradient(0, h * 0.35, 0, h * 0.72);
      glow.addColorStop(0, 'rgba(132,177,245,0)');
      glow.addColorStop(0.48, 'rgba(145,191,255,0.06)');
      glow.addColorStop(1, 'rgba(89,137,212,0)');
      context.beginPath();
      for (let edge = 0; edge < 2; edge++) {
        for (let step = 0; step <= 100; step++) {
          const p = edge ? 1 - step / 100 : step / 100;
          const x = p * w;
          const y =
            h * 0.57 +
            Math.sin(p * 5 + phase) * h * 0.11 +
            Math.sin(p * 3 - phase) * h * 0.07 +
            (edge ? 1 : -1) * Math.sin(p * Math.PI) * h * 0.08;
          if (!edge && !step) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
      }
      context.closePath();
      context.fillStyle = glow;
      context.fill();
      for (let i = 0; i < 16; i++) {
        const spread = i / 15;
        context.beginPath();
        for (let x = -10; x <= w + 10; x += 4) {
          const p = x / w;
          const wave = Math.sin(p * 5 + phase + spread * 0.45);
          const y =
            h * 0.57 +
            wave * h * 0.11 +
            Math.sin(p * 3 - phase) * h * 0.07 +
            (spread - 0.5) * h * 0.12 * Math.sin(p * Math.PI);
          if (x === -10) context.moveTo(x, y);
          else context.lineTo(x, y);
        }
        context.strokeStyle = `rgba(156,182,219,${0.025 + Math.sin(spread * Math.PI) * 0.12})`;
        context.lineWidth = 0.7;
        context.stroke();
      }
      for (let i = 0; i < 26; i++) {
        const x = ((i * 0.6180339 + phase * 0.006) % 1) * w;
        const y = ((i * 0.381966 + Math.sin(phase + i) * 0.013) % 1) * h;
        const alpha = 0.06 + (Math.sin(phase * 1.3 + i * 2) + 1) * 0.045;
        context.fillStyle = `rgba(208,225,255,${alpha})`;
        context.beginPath();
        context.arc(x, y, i % 4 ? 0.6 : 1.1, 0, Math.PI * 2);
        context.fill();
      }
    }
    function tick(time: number) {
      draw(time);
      frame = requestAnimationFrame(tick);
    }
    function update() {
      cancelAnimationFrame(frame);
      draw(performance.now());
      if (active && !reduced.matches && document.visibilityState === 'visible')
        frame = requestAnimationFrame(tick);
    }
    const resize = new ResizeObserver(update);
    resize.observe(node);
    document.addEventListener('visibilitychange', update);
    reduced.addEventListener('change', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      document.removeEventListener('visibilitychange', update);
      reduced.removeEventListener('change', update);
    };
  }, [active]);
  return <canvas className="ribbon-scene" ref={canvas} aria-hidden="true" />;
}
