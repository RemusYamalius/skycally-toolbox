import * as React from "react";
import { cn } from "@/lib/utils";

type Dir = "up" | "down" | "left" | "right";

/**
 * Mobile-first game controls.
 * - Uses pointer events so taps, mouse, and stylus all work.
 * - `touch-none` + `e.preventDefault()` stops page scroll while playing.
 * - Optional hold-to-repeat for buttons like "left/right" or "fire".
 * - Min 56px tap targets.
 */

interface HoldOptions {
  /** ms between repeats while held. 0 disables repeat (single fire on press). */
  repeatMs?: number;
  /** ms before the first repeat kicks in. Defaults to repeatMs. */
  initialDelayMs?: number;
}

function useHoldRepeat(onTick: () => void, opts: HoldOptions = {}) {
  const { repeatMs = 0, initialDelayMs } = opts;
  const tickRef = React.useRef(onTick);
  tickRef.current = onTick;
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = React.useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const start = React.useCallback(() => {
    stop();
    tickRef.current();
    if (!repeatMs) return;
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => tickRef.current(), repeatMs);
    }, initialDelayMs ?? repeatMs);
  }, [repeatMs, initialDelayMs, stop]);

  React.useEffect(() => stop, [stop]);
  return { start, stop };
}

export interface PadButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onPress: () => void;
  onRelease?: () => void;
  repeatMs?: number;
  initialDelayMs?: number;
}

export const PadButton = React.forwardRef<HTMLButtonElement, PadButtonProps>(
  ({ onPress, onRelease, repeatMs, initialDelayMs, className, children, ...rest }, ref) => {
    const { start, stop } = useHoldRepeat(onPress, { repeatMs, initialDelayMs });

    const release = React.useCallback(() => { stop(); onRelease?.(); }, [stop, onRelease]);

    return (
      <button
        ref={ref}
        type="button"
        {...rest}
        onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId); start(); }}
        onPointerUp={(e) => { e.preventDefault(); release(); }}
        onPointerCancel={() => release()}
        onPointerLeave={() => release()}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          "min-w-14 min-h-14 select-none touch-none rounded-xl border border-border bg-card text-foreground font-bold text-xl flex items-center justify-center active:scale-95 active:bg-secondary transition-transform",
          className,
        )}
      >
        {children}
      </button>
    );
  },
);
PadButton.displayName = "PadButton";

export interface DPadProps {
  onDirection: (dir: Dir) => void;
  onRelease?: (dir: Dir) => void;
  /** Which arrows are enabled. Default: all four. */
  enabled?: { up?: boolean; down?: boolean; left?: boolean; right?: boolean };
  repeatMs?: number;
  initialDelayMs?: number;
  className?: string;
}

export function DPad({ onDirection, onRelease, enabled, repeatMs, initialDelayMs, className }: DPadProps) {
  const en = { up: true, down: true, left: true, right: true, ...(enabled || {}) };
  const make = (dir: Dir, label: string, aria: string) => (
    en[dir] ? (
      <PadButton
        onPress={() => onDirection(dir)}
        onRelease={onRelease ? () => onRelease(dir) : undefined}
        repeatMs={repeatMs}
        initialDelayMs={initialDelayMs}
        aria-label={aria}
        className="w-16 h-16 text-2xl"
      >{label}</PadButton>
    ) : <div className="w-16 h-16" />
  );

  return (
    <div className={cn("grid grid-cols-3 gap-2 w-fit mx-auto select-none", className)}>
      <div className="w-16 h-16" />
      {make("up", "▲", "Up")}
      <div className="w-16 h-16" />
      {make("left", "◄", "Left")}
      <div className="w-16 h-16" />
      {make("right", "►", "Right")}
      <div className="w-16 h-16" />
      {make("down", "▼", "Down")}
      <div className="w-16 h-16" />
    </div>
  );
}

export interface FlipperZoneProps {
  side: "left" | "right";
  onPress: () => void;
  onRelease: () => void;
  label?: string;
  className?: string;
}

/** A large half-width tap zone — ideal for pinball flippers. */
export function FlipperZone({ side, onPress, onRelease, label, className }: FlipperZoneProps) {
  return (
    <button
      type="button"
      aria-label={label ?? (side === "left" ? "Left flipper" : "Right flipper")}
      onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLButtonElement).setPointerCapture?.(e.pointerId); onPress(); }}
      onPointerUp={(e) => { e.preventDefault(); onRelease(); }}
      onPointerCancel={onRelease}
      onPointerLeave={onRelease}
      onContextMenu={(e) => e.preventDefault()}
      className={cn(
        "h-20 select-none touch-none rounded-xl border border-border bg-secondary font-black text-foreground text-base active:bg-secondary/70 active:scale-[0.98] transition-transform",
        className,
      )}
    >
      {label ?? (side === "left" ? "◄ LEFT" : "RIGHT ►")}
    </button>
  );
}
