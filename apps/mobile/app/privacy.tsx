import {
  Bullet,
  Em,
  LegalPage,
  P,
  Section,
} from "@/components/legal/LegalPage";

export default function PrivacyScreen() {
  return (
    <LegalPage
      title="privacy policy"
      lastUpdated="last updated April 22, 2026"
    >
      <Section title="the short version">
        <P>
          spine is a private reading journal. we collect what you need to sign
          in and what you choose to log about your reading — nothing more. we
          do not sell your data, and we do not show you ads.
        </P>
      </Section>

      <Section title="what we collect">
        <P>
          <Em>account.</Em> your email address, a display name, a username, and
          a password hash. these are stored by our authentication provider,
          Supabase.
        </P>
        <P>
          <Em>your reading data.</Em> the books, entries, quotes, ratings,
          moods, notes, reflections, and re-reads you create. this is your
          journal — it belongs to you.
        </P>
        <P>
          <Em>book metadata.</Em> when you add a book, we fetch its cover, page
          count, ISBN, and genres from the Hardcover API. we do not send
          Hardcover any information about you.
        </P>
        <P>
          <Em>imports.</Em> if you import your library from Goodreads, we parse
          the CSV you upload and store the resulting entries in your account.
          the original file is not retained.
        </P>
      </Section>

      <Section title="how we use it">
        <P>
          we use your data to run spine — to show you your library, your
          calendar, your streaks, and your year in review. that is the extent
          of it.
        </P>
        <P>
          we do not use your reading journal to train models, build profiles,
          or share insights with third parties.
        </P>
      </Section>

      <Section title="who processes your data">
        <P>spine relies on a small number of trusted services to operate:</P>
        <Bullet>
          <Em>Supabase</Em> — authentication and database.
        </Bullet>
        <Bullet>
          <Em>Vercel</Em> — hosting.
        </Bullet>
        <Bullet>
          <Em>Hardcover</Em> — book metadata (no personal data sent).
        </Bullet>
        <P>
          each operates under its own privacy policy. we do not share your
          data with anyone else.
        </P>
      </Section>

      <Section title="cookies and local storage">
        <P>
          spine uses a session cookie to keep you signed in, and local storage
          to remember your theme preference. we do not use analytics or
          advertising cookies.
        </P>
      </Section>

      <Section title="your data, your rights">
        <P>
          you can edit or delete any entry, quote, or book at any time from
          within spine. if you would like to export everything you have logged,
          or delete your account entirely, send us a note and we will take care
          of it.
        </P>
      </Section>

      <Section title="changes to this policy" last>
        <P>
          if we change how spine handles your data, we will update this page
          and adjust the date at the top. material changes will also be
          surfaced to signed-in readers.
        </P>
      </Section>
    </LegalPage>
  );
}
