/** Pre-built Tailwind width/height percent classes (JIT sees full strings). */
export const TW_WIDTH_PCT: Record<number, string> = Object.fromEntries(
  Array.from({ length: 101 }, (_, i) => [i, `w-[${i}%]`]),
) as Record<number, string>;

export const TW_HEIGHT_PCT: Record<number, string> = Object.fromEntries(
  Array.from({ length: 101 }, (_, i) => [i, `h-[${i}%]`]),
) as Record<number, string>;
