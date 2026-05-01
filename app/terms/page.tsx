import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "terms · spine",
  description: "terms of service for spine",
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

export default function TermsPage() {
  return (
    <div className="page">
      <div className="page-content page-content-sm">
        <div className="mb-10 pb-8 border-b border-stone-200">
          <h1 className="font-serif text-3xl font-semibold text-fg-heading tracking-tight">
            terms of service
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
            spine is a personal reading journal. by creating an account, you
            agree to these terms. they are short on purpose — use spine
            thoughtfully, and we will do the same in running it.
          </p>
        </Section>

        <Section title="your account">
          <p>
            you are responsible for the credentials you use to access spine.
            please keep your password private. you must be at least 13 years old
            to create an account.
          </p>
        </Section>

        <Section title="your content">
          <p>
            everything you write in spine — entries, reflections, quotes, notes,
            moods, ratings — belongs to you. by storing it here, you grant spine
            a limited license to hold and display it back to you as part of
            running the service. we will never publish or share your journal
            without your permission.
          </p>
          <p>
            please only transcribe quotes and excerpts for your own personal
            journaling. do not use spine to redistribute copyrighted material.
          </p>
        </Section>

        <Section title="acceptable use">
          <p>please do not:</p>
          <ul className="space-y-2 pl-4">
            <li>— attempt to access other readers&rsquo; accounts or data.</li>
            <li>— interfere with the service, scrape it, or overload it.</li>
            <li>
              — upload content that is unlawful or infringes on someone
              else&rsquo;s rights.
            </li>
          </ul>
          <p>
            we may suspend accounts that violate these terms, usually after
            reaching out first.
          </p>
        </Section>

        <Section title="book metadata">
          <p>
            book covers, descriptions, and related metadata are provided by the
            Hardcover API and remain the property of their respective
            rightsholders. spine displays this information under
            Hardcover&rsquo;s terms.
          </p>
        </Section>

        <Section title="availability">
          <p>
            spine is provided as-is. we do our best to keep it running and to
            protect your data, but we cannot guarantee uninterrupted service.
            please keep your own backups of anything you would hate to lose.
          </p>
        </Section>

        <Section title="changes">
          <p>
            we may update these terms as spine evolves. the date at the top of
            the page will always reflect the latest version. material changes
            will be surfaced to signed-in readers.
          </p>
        </Section>

        <Section title="closing your account">
          <p>
            you can leave spine at any time. send us a note and we will delete
            your account and all associated data.
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
