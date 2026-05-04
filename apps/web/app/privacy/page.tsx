import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "privacy · spine",
  description: "how spine handles your reading data",
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-stone-100 pb-10 mb-10 last:border-0 last:mb-0 last:pb-0">
      <p className="section-label mb-6">{title}</p>
      <div className="space-y-4 text-sm text-fg-muted leading-relaxed max-w-prose">
        {children}
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="page">
      <div className="page-content page-content-sm">
        <div className="mb-10 pb-8 border-b border-stone-200">
          <h1 className="font-serif text-3xl font-semibold text-fg-heading tracking-tight">
            privacy policy
          </h1>
          <p
            className="text-fg-faint mt-2"
            style={{
              fontFamily: "var(--font-caveat), cursive",
              fontSize: "1.05rem",
            }}
          >
            last updated April 22, 2026
          </p>
        </div>

        <Section title="the short version">
          <p>
            spine is a private reading journal. we collect what you need to sign
            in and what you choose to log about your reading — nothing more. we
            do not sell your data, and we do not show you ads.
          </p>
        </Section>

        <Section title="what we collect">
          <p>
            <span className="text-fg-heading font-medium">account.</span> your
            email address, a display name, a username, and a password hash.
            these are stored by our authentication provider, Supabase.
          </p>
          <p>
            <span className="text-fg-heading font-medium">
              your reading data.
            </span>{" "}
            the books, entries, quotes, ratings, moods, notes, reflections, and
            re-reads you create. this is your journal — it belongs to you.
          </p>
          <p>
            <span className="text-fg-heading font-medium">book metadata.</span>{" "}
            when you add a book, we fetch its cover, page count, ISBN, and
            genres from the Hardcover API. we do not send Hardcover any
            information about you.
          </p>
          <p>
            <span className="text-fg-heading font-medium">imports.</span> if you
            import your library from Goodreads, we parse the CSV you upload and
            store the resulting entries in your account. the original file is
            not retained.
          </p>
        </Section>

        <Section title="how we use it">
          <p>
            we use your data to run spine — to show you your library, your
            calendar, your streaks, and your year in review. that is the extent
            of it.
          </p>
          <p>
            we do not use your reading journal to train models, build profiles,
            or share insights with third parties.
          </p>
        </Section>

        <Section title="who processes your data">
          <p>spine relies on a small number of trusted services to operate:</p>
          <ul className="space-y-2 pl-4">
            <li>
              <span className="text-fg-heading font-medium">Supabase</span> —
              authentication and database.
            </li>
            <li>
              <span className="text-fg-heading font-medium">Vercel</span> —
              hosting.
            </li>
            <li>
              <span className="text-fg-heading font-medium">Hardcover</span> —
              book metadata (no personal data sent).
            </li>
          </ul>
          <p>
            each operates under its own privacy policy. we do not share your
            data with anyone else.
          </p>
        </Section>

        <Section title="cookies and local storage">
          <p>
            spine uses a session cookie to keep you signed in, and local storage
            to remember your theme preference. we do not use analytics or
            advertising cookies.
          </p>
        </Section>

        <Section title="your data, your rights">
          <p>
            you can edit or delete any entry, quote, or book at any time from
            within spine. if you would like to export everything you have
            logged, or delete your account entirely, send us a note at the
            address below and we will take care of it.
          </p>
        </Section>

        <Section title="changes to this policy">
          <p>
            if we change how spine handles your data, we will update this page
            and adjust the date at the top. material changes will also be
            surfaced to signed-in readers.
          </p>
        </Section>

        <Section title="contact">
          <p>
            questions, requests, or concerns —{" "}
            <a
              href="mailto:hello@spinereads.com"
              className="text-fg-heading underline underline-offset-2 decoration-stone-300 hover:decoration-stone-500 transition-colors"
            >
              hello@spinereads.com
            </a>
            .
          </p>
          <p className="pt-4">
            <Link
              href="/"
              className="text-fg-faint hover:text-fg-muted transition-colors"
            >
              ← back to spine
            </Link>
          </p>
        </Section>
      </div>
    </div>
  );
}
