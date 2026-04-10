// Deterministic gradient book cover based on title
const GRADIENTS = [
  ["#2D1B2E", "#4A2B5A"],
  ["#C97B5A", "#8B4513"],
  ["#7B9E87", "#2E7D32"],
  ["#C4B5D4", "#6A1B9A"],
  ["#D4A843", "#B8860B"],
  ["#1C3A5E", "#2563EB"],
  ["#3D2B1F", "#6B3A2A"],
  ["#1A3A2A", "#065F46"],
  ["#3B1F2B", "#831843"],
  ["#1F2937", "#374151"],
];

function hashTitle(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) {
    h = Math.imul(31, h) + title.charCodeAt(i) | 0;
  }
  return Math.abs(h);
}

interface Props {
  title: string;
  width?: number | string;
  height?: number | string;
  className?: string;
}

export function BookCover({ title, width = 56, height = 80, className = "" }: Props) {
  const [from, to] = GRADIENTS[hashTitle(title) % GRADIENTS.length];
  const initial = title.trim()[0]?.toUpperCase() ?? "·";

  return (
    <div
      className={`flex items-end justify-start shrink-0 rounded-sm overflow-hidden ${className}`}
      style={{
        width,
        height,
        background: `linear-gradient(160deg, ${from}, ${to})`,
      }}
    >
      <span
        className="font-[family-name:var(--font-playfair)] text-white/30 font-bold leading-none select-none"
        style={{ fontSize: typeof width === "number" ? Math.max(width * 0.5, 14) : 14, padding: "4px 5px" }}
      >
        {initial}
      </span>
    </div>
  );
}
