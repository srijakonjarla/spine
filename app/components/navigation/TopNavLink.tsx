import Link from "next/link";
import { usePathname } from "next/navigation";

export default function TopNavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`text-[13px] font-medium transition-colors ${active ? "text-white" : "text-white/60 hover:text-white"}`}
    >
      {label}
    </Link>
  );
}
