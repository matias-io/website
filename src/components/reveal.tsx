'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const element = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = element.current;
    if (!target) return;
    const readyFrame = requestAnimationFrame(() => setReady(true));

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const visibleFrame = requestAnimationFrame(() => setVisible(true));
      return () => {
        cancelAnimationFrame(readyFrame);
        cancelAnimationFrame(visibleFrame);
      };
    }

    if (!('IntersectionObserver' in window)) {
      const visibleFrame = requestAnimationFrame(() => setVisible(true));
      return () => {
        cancelAnimationFrame(readyFrame);
        cancelAnimationFrame(visibleFrame);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible(true);
        observer.unobserve(target);
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    observer.observe(target);
    return () => {
      cancelAnimationFrame(readyFrame);
      observer.disconnect();
    };
  }, []);

  const style = { '--reveal-delay': `${Math.max(0, delay)}ms` } as CSSProperties;
  const classes = [
    'reveal',
    ready ? 'reveal-pending' : '',
    visible ? 'reveal-visible' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={element} className={classes} style={style}>
      {children}
    </div>
  );
}
