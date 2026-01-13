import React, { useEffect } from 'react';

export const RippleProvider: React.FC = () => {
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const button = target.closest('button') as HTMLElement | null;
      if (!button) return;

      // create ripple
      const circle = document.createElement('span');
      const rect = button.getBoundingClientRect();
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      const left = e.clientX - rect.left - radius;
      const top = e.clientY - rect.top - radius;
      circle.style.left = `${left}px`;
      circle.style.top = `${top}px`;
      circle.className = 'ripple';

      // remove existing ripple(s)
      const existing = button.getElementsByClassName('ripple');
      if (existing.length > 0) {
        // remove all
        Array.from(existing).forEach((el) => el.remove());
      }

      button.appendChild(circle);

      // cleanup after animation ends
      window.setTimeout(() => {
        circle.remove();
      }, 800);
    };

    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }, []);

  return null;
};

