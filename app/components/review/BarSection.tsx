import { SectionLabel } from "./SectionLabel";
import { BarList } from "./BarList";

interface BarSectionProps {
  label: string;
  items: [string, number][];
  color: string;
}

/** Full-width section wrapping a labeled BarList (moods, tags, authors). */
export function BarSection({ label, items, color }: BarSectionProps) {
  if (!items.length) return null;
  return (
    <div className="mb-14">
      <SectionLabel>{label}</SectionLabel>
      <div className="grid sm:grid-cols-2 gap-x-10">
        <BarList items={items} max={items[0][1]} color={color} />
      </div>
    </div>
  );
}
