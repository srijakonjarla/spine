export function MiniCover({
  title,
  author,
  bg,
  accent,
}: {
  title: string;
  author: string;
  bg: string;
  accent: string;
}) {
  return (
    <div
      className="flex flex-col rounded-[1.5px]"
      style={{
        width: 58,
        height: 88,
        background: bg,
        padding: "10px 9px",
        boxShadow: "2px 2px 0 rgba(45,27,46,0.18), 0 6px 14px rgba(0,0,0,0.1)",
      }}
    >
      <div
        className="font-serif font-bold lowercase"
        style={{
          fontSize: 7,
          lineHeight: 1.08,
          letterSpacing: "-0.02em",
          color: accent,
        }}
      >
        {title}
      </div>
      <div
        className="mt-auto font-sans uppercase"
        style={{
          fontSize: 8,
          color: "rgba(250,246,240,0.65)",
          letterSpacing: "0.08em",
        }}
      >
        {author}
      </div>
    </div>
  );
}
