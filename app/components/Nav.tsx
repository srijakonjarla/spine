"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { signOut } from "../lib/auth";
import { supabase } from "../lib/supabase";

const CURRENT_YEAR = new Date().getFullYear();

interface TabItem {
  id: string;
  title: string;
  href: string;
}

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
  const [tabs, setTabs] = useState<TabItem[]>([]);

  useEffect(() => {
    if (!user) return;
    async function loadTabs() {
      const [booksRes, listsRes] = await Promise.all([
        supabase
          .from("books")
          .select("id, book_catalog(title)")
          .eq("bookmarked", true)
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase
          .from("lists")
          .select("id, title, year")
          .eq("bookmarked", true)
          .order("updated_at", { ascending: false })
          .limit(8),
      ]);

      const bookTabs: TabItem[] = (booksRes.data ?? []).map((b: any) => ({
        id: b.id,
        title: b.book_catalog?.title ?? "untitled",
        href: `/book/${b.id}`,
      }));
      const listTabs: TabItem[] = (listsRes.data ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        href: `/${l.year}/lists/${l.id}`,
      }));

      setTabs([...bookTabs, ...listTabs]);
    }
    loadTabs().catch(console.error);
  }, [user]);

  if (!user) return null;

  return (
    <nav className="hidden lg:flex flex-col fixed top-0 left-0 h-full w-40 border-r border-stone-100 bg-[#faf8f5] px-5 py-10 font-mono z-20 overflow-y-auto">
      <Link href="/" className="text-sm font-semibold text-stone-900 mb-8 block hover:opacity-60 transition-opacity">
        spine
      </Link>

      <div className="space-y-2">
        <NavLink href="/" label="home" />
        <NavLink href="/shelf" label="shelf" />
      </div>

      <div className="border-t border-stone-100 mt-5 pt-4">
        <NavLink href={`/${CURRENT_YEAR}`} label={String(CURRENT_YEAR)} />
        <div className="space-y-2 ml-2 mt-2">
          <NavLink href={`/${CURRENT_YEAR}/books`} label="log" />
          <NavLink href={`/${CURRENT_YEAR}/lists`} label="lists" />
          <NavLink href={`/${CURRENT_YEAR}/habits`} label="habits" />
          <NavLink href={`/${CURRENT_YEAR}/stats`} label="year in review" />
        </div>
      </div>

      {tabs.length > 0 && (
        <div className="border-t border-stone-100 mt-5 pt-4">
          <p className="text-[10px] font-semibold text-stone-300 tracking-widest uppercase mb-2">tabs</p>
          <div className="space-y-2">
            {tabs.map((t) => (
              <Link
                key={t.id}
                href={t.href}
                className="flex items-baseline gap-1.5 group"
              >
                <span className="text-[10px] text-stone-300 shrink-0">⌖</span>
                <span className="text-xs text-stone-400 group-hover:text-stone-700 transition-colors truncate">
                  {t.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="mt-auto pt-6">
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
