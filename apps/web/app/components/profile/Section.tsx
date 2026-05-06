export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-stone-100 pb-10 mb-10 last:border-0 last:mb-0 last:pb-0">
      <p className="section-label mb-6">{title}</p>
      {children}
    </section>
  );
}
