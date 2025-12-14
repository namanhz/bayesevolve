import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    katex: {
      render: (tex: string, element: HTMLElement, options?: object) => void;
    };
  }
}

interface MathProps {
  tex: string;
  display?: boolean;
  className?: string;
}

const Math: React.FC<MathProps> = ({ tex, display = false, className = '' }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current && window.katex) {
      try {
        window.katex.render(tex, containerRef.current, {
          displayMode: display,
          throwOnError: false,
          trust: true,
        });
      } catch (e) {
        console.error('KaTeX error:', e);
        if (containerRef.current) {
          containerRef.current.textContent = tex;
        }
      }
    }
  }, [tex, display]);

  return <span ref={containerRef} className={className} />;
};

export default Math;
