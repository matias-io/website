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
