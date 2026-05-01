import Link from "next/link";

export function Footer() {
  return (
    <footer
      className="flex items-center justify-end gap-x-4 text-xs px-6 py-4"
      style={{ color: "var(--fg-faint)" }}
    >
      <a
        href="mailto:hello@spinereads.com"
        className="hover:text-fg-muted transition-colors"
      >
        contact
      </a>
      <Link href="/terms" className="hover:text-fg-muted transition-colors">
        terms
      </Link>
      <Link href="/privacy" className="hover:text-fg-muted transition-colors">
        privacy
      </Link>
      <span>&copy; 2026 spine</span>
    </footer>
  );
}
