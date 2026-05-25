import { useEffect, useRef, useState, type ReactNode } from "react";

interface LazyVisibleProps {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number | string;
  className?: string;
}

export function LazyVisible({ children, rootMargin = "200px", minHeight, className }: LazyVisibleProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (visible) return;
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible, rootMargin]);

  return (
    <div ref={ref} className={className} style={!visible && minHeight ? { minHeight } : undefined}>
      {visible ? children : null}
    </div>
  );
}
