import { SEMRUSH_DATABASES } from "@/lib/semrush-constants";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  id?: string;
}

export function CountrySelect({ value, onChange, disabled, id }: Props) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      aria-label="Country database"
    >
      {SEMRUSH_DATABASES.map((d) => (
        <option key={d.value} value={d.value}>
          {d.label}
        </option>
      ))}
    </select>
  );
}
