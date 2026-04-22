interface PageHeaderProps {
  title: string;
  /** Small uppercase line above the title, e.g. "reading journal · 2026" */
  eyebrow?: string;
  /** Small line below the title, e.g. "12 saved" */
  subtitle?: string;
}

export function PageHeader({ title, eyebrow, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-8 sm:mb-10 pb-6 sm:pb-8 border-b border-line">
      {eyebrow && (
        <p className="text-xs mb-2 tracking-widest uppercase text-fg-faint">
          {eyebrow}
        </p>
      )}
      <h1 className="font-serif text-2xl sm:text-3xl font-semibold page-title tracking-tight">
        {title}
      </h1>
      {subtitle && <p className="text-xs mt-3 text-fg-faint">{subtitle}</p>}
    </div>
  );
}
