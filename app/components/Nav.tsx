"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { signOut } from "../lib/auth";

const CURRENT_YEAR = new Date().getFullYear();

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`block text-xs transition-colors ${
        active ? "text-stone-900 font-semibold" : "text-stone-400 hover:text-stone-700"
      }`}
    >
      {label}
    </Link>
  );
}

export default function Nav() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <nav className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-40 border-r border-stone-100 bg-[#faf8f5] px-5 py-10 font-mono z-20">
      <Link href="/" className="text-sm font-semibold text-stone-900 mb-8 block hover:opacity-60 transition-opacity">
        spine
      </Link>

      <div className="space-y-2">
        <NavLink href="/" label="home" />
        <NavLink href="/shelf" label="shelf" />
      </div>

      <div className="border-t border-stone-100 mt-5 pt-4">
        <p className="text-xs text-stone-300 mb-2.5">{CURRENT_YEAR}</p>
        <div className="space-y-2 ml-2">
          <NavLink href={`/${CURRENT_YEAR}/books`} label="log" />
          <NavLink href={`/${CURRENT_YEAR}/lists`} label="lists" />
          <NavLink href={`/${CURRENT_YEAR}/habits`} label="habits" />
          <NavLink href={`/${CURRENT_YEAR}/stats`} label="year in review" />
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={() => signOut()}
          className="text-xs text-stone-300 hover:text-stone-600 transition-colors"
        >
          sign out
        </button>
      </div>
    </nav>
  );
}
