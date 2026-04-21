import { MiniCover } from "./MiniCover";

const SHELF_BOOKS = [
  {
    title: "on earth...",
    author: "ocean vuong",
    bg: "#5d3a42",
    accent: "#f5ece0",
  },
  {
    title: "hungerstone",
    author: "kat dunn",
    bg: "#8a5c60",
    accent: "#d4a843",
  },
  {
    title: "the compound",
    author: "aisling rawle",
    bg: "#c97b5a",
    accent: "#faf6f0",
  },
];

export function CoverPanel() {
  return (
    <div
      className="relative hidden lg:flex flex-col justify-between overflow-hidden"
      style={{
        background:
          "radial-gradient(at 30% 20%, #3d2a3f 0%, #1c0e1f 60%, #120810 100%)",
        padding: "72px 80px",
        color: "#faf6f0",
      }}
    >
      {/* subtle horizontal threads */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0 3px, rgba(250,246,240,0.02) 3px 4px)",
        }}
      />

      {/* est. line */}
      <div
        className="relative font-mono uppercase"
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          color: "rgba(250,246,240,0.55)",
        }}
      >
        a quiet home for your reading &nbsp;&middot;&nbsp; est. 2024
      </div>

      {/* title lockup */}
      <div className="relative">
        <div
          className="font-serif font-bold lowercase"
          style={{
            fontSize: "clamp(72px, 9vw, 116px)",
            lineHeight: 0.94,
            letterSpacing: "-0.05em",
          }}
        >
          the
          <br />
          <span className="italic font-normal">reading</span>
          <br />
          journal<span className="text-terra">.</span>
        </div>
        <div
          className="font-hand inline-block"
          style={{
            marginTop: 32,
            fontSize: 28,
            color: "var(--gold)",
            transform: "rotate(-2deg)",
          }}
        >
          — yours, one entry at a time.
        </div>
      </div>

      {/* bottom shelf strip */}
      <div className="relative flex items-end gap-3.5">
        {SHELF_BOOKS.map((book) => (
          <MiniCover key={book.title} {...book} />
        ))}
        <div
          className="font-mono uppercase"
          style={{
            color: "rgba(250,246,240,0.4)",
            fontSize: 10,
            marginLeft: 12,
            paddingBottom: 4,
            letterSpacing: "0.08em",
          }}
        >
          shelves&nbsp;&middot;&nbsp;marginalia&nbsp;&middot;&nbsp;moods
        </div>
      </div>
    </div>
  );
}
