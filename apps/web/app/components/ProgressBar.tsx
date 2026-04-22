interface ProgressBarProps {
  /** 0–1 fraction, or 0–100 if percent=true */
  value: number;
  percent?: boolean;
  color?: "sage" | "plum" | "terra" | "gradient" | string;
  size?: "xs" | "sm";
  className?: string;
}

const COLOR_CLASS: Record<string, string> = {
  sage: "bg-sage",
  plum: "bg-plum",
  terra: "bg-terra",
  gradient: "bg-[linear-gradient(to_right,var(--plum),var(--terra))]",
};

export function ProgressBar({
  value,
  percent = false,
  color = "sage",
  size = "sm",
  className = "",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.round(percent ? value : value * 100));
  const h = size === "xs" ? "h-1" : "h-1.5";
  const fill = COLOR_CLASS[color] ?? color;

  return (
    <div className={`${h} rounded-full overflow-hidden bg-edge ${className}`}>
      <div
        style={{ width: `${pct}%` }}
        className={`h-full rounded-full transition-all duration-500 ${fill}`}
      />
    </div>
  );
}
