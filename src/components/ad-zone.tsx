interface Props {
  id: string;
  size: string; // e.g. "728x90"
}

export function AdZone({ id, size }: Props) {
  const [w, h] = size.split("x").map(Number);
  return (
    /* ADSENSE_ZONE: {id} {size} */
    <div
      data-ad-zone={id}
      data-ad-size={size}
      className="mx-auto my-8 flex items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40 text-xs text-muted-foreground"
      style={{ width: "100%", maxWidth: w, height: h, minHeight: 90 }}
    >
      Ad space · {id} · {size}
    </div>
  );
}
