'use client';

import { useEffect, useRef } from 'react';

export default function CursorEffects() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf = 0;

    // Spotlight follows mouse
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (spotRef.current) {
          spotRef.current.style.transform =
            `translate(${e.clientX - 300}px, ${e.clientY - 300}px)`;
        }
      });
    };

    // EMP pulse ring on click
    const onClick = (e: MouseEvent) => {
      for (let i = 0; i < 2; i++) {
        const ring = document.createElement('div');
        ring.className = 'emp-ring';
        ring.style.left = `${e.clientX}px`;
        ring.style.top = `${e.clientY}px`;
        ring.style.animationDelay = `${i * 0.12}s`;
        document.body.appendChild(ring);
        const cleanup = () => ring.remove();
        ring.addEventListener('animationend', cleanup, { once: true });
        // Fallback: remove after 1s in case animationend never fires (e.g. prefers-reduced-motion)
        setTimeout(cleanup, 1000);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={spotRef} className="cursor-spotlight" aria-hidden="true" />;
}
