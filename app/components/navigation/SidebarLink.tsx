import type { Icon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function SidebarLink({
  href,
  label,
  exact,
  icon: IconComp,
}: {
  href: string;
  label: string;
  exact?: boolean;
  icon?: Icon;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2.5 py-[7px] rounded-[10px] text-[13px] transition-colors ${
        active
          ? "font-semibold bg-[var(--bg-hover)] text-[var(--fg-heading)]"
          : "font-medium hover:bg-[var(--bg-nav-hover)] text-[var(--fg)]"
      }`}
    >
      {IconComp && (
        <IconComp
          size={15}
          weight={active ? "fill" : "regular"}
          className="shrink-0 opacity-70"
        />
      )}
      {label}
    </Link>
  );
}
