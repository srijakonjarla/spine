import {
  Bullet,
  LegalPage,
  P,
  Section,
} from "@/components/legal/LegalPage";

export default function TermsScreen() {
  return (
    <LegalPage
      title="terms of service"
      lastUpdated="last updated April 22, 2026"
    >
      <Section title="the short version">
        <P>
          spine is a personal reading journal. by creating an account, you
          agree to these terms. they are short on purpose — use spine
          thoughtfully, and we will do the same in running it.
        </P>
      </Section>

      <Section title="your account">
        <P>
          you are responsible for the credentials you use to access spine.
          please keep your password private. you must be at least 13 years old
          to create an account.
        </P>
      </Section>

      <Section title="your content">
        <P>
          everything you write in spine — entries, reflections, quotes, notes,
          moods, ratings — belongs to you. by storing it here, you grant spine
          a limited license to hold and display it back to you as part of
          running the service. we will never publish or share your journal
          without your permission.
        </P>
        <P>
          please only transcribe quotes and excerpts for your own personal
          journaling. do not use spine to redistribute copyrighted material.
        </P>
      </Section>

      <Section title="acceptable use">
        <P>please do not:</P>
        <Bullet>attempt to access other readers&rsquo; accounts or data.</Bullet>
        <Bullet>interfere with the service, scrape it, or overload it.</Bullet>
        <Bullet>
          upload content that is unlawful or infringes on someone else&rsquo;s
          rights.
        </Bullet>
        <P>
          we may suspend accounts that violate these terms, usually after
          reaching out first.
        </P>
      </Section>

      <Section title="book metadata">
        <P>
          book covers, descriptions, and related metadata are provided by the
          Hardcover API and remain the property of their respective
          rightsholders. spine displays this information under Hardcover&rsquo;s
          terms.
        </P>
      </Section>

      <Section title="availability">
        <P>
          spine is provided as-is. we do our best to keep it running and to
          protect your data, but we cannot guarantee uninterrupted service.
          please keep your own backups of anything you would hate to lose.
        </P>
      </Section>

      <Section title="changes">
        <P>
          we may update these terms as spine evolves. the date at the top of
          the page will always reflect the latest version. material changes
          will be surfaced to signed-in readers.
        </P>
      </Section>

      <Section title="closing your account" last>
        <P>
          you can leave spine at any time. send us a note and we will delete
          your account and all associated data.
        </P>
      </Section>
    </LegalPage>
  );
}
