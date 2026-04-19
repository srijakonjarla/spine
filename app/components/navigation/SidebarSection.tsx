export default function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <p className="text-detail font-bold uppercase tracking-label mb-2.5 px-2.5 text-fg-muted">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}
