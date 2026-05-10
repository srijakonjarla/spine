import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "not found · spine",
};

export default function NotFound() {
  return (
    <div className="page">
      <div className="page-content page-content-sm">
        <p className="section-label mb-6">404</p>
        <h1 className="page-title mb-3">page not found</h1>
        <p className="text-sm text-fg-muted leading-relaxed max-w-prose mb-8">
          this page doesn't exist, or the URL is malformed. year-scoped pages
          look like <code>/2026/books</code> — year first.
        </p>
        <Link href="/" className="back-link">
          ← home
        </Link>
      </div>
    </div>
  );
}
