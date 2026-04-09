"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

const CURRENT_YEAR = new Date().getFullYear();

interface TabItem {
  id: string;
  title: string;
  href: string;
}

function TopNavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`text-[13px] font-medium transition-colors ${
        active ? "text-white" : "text-white/60 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function SidebarLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active =
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center px-2.5 py-[7px] rounded-[10px] text-[13px] transition-colors ${
        active
          ? "bg-[rgba(45,27,46,0.1)] text-[#2D1B2E] font-semibold"
          : "text-[#1A1A1A] font-medium hover:bg-[rgba(45,27,46,0.08)]"
      }`}
    >
      {label}
    </Link>
  );
}

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <p className="text-[10px] font-bold text-[#5A5060] uppercase tracking-[0.12em] mb-2 px-2.5">
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
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

  return (
    <>
      {/* Topbar — always visible */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-[#1C0E1E] flex items-center justify-between px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-[22px] font-bold text-white tracking-tight leading-none"
        >
          spine<span className="text-[#D4A843] italic">.</span>
        </Link>

        {user && (
          <>
            <nav className="hidden lg:flex items-center gap-6">
              <TopNavLink href="/" label="journal" />
              <TopNavLink href="/shelf" label="library" />
              <TopNavLink href={`/${CURRENT_YEAR}/stats`} label="stats" />
            </nav>
            <Link
              href={`/${CURRENT_YEAR}/books`}
              className="hidden lg:inline-block text-[13px] font-semibold text-white bg-[#C97B5A] px-4 py-1.5 rounded-full hover:bg-[#b3694a] transition-colors"
            >
              + log
            </Link>
          </>
        )}
      </header>

      {/* Desktop sidebar */}
      {user && (
        <nav className="hidden lg:flex flex-col fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-[220px] border-r border-[rgba(45,27,46,0.08)] bg-[rgba(45,27,46,0.02)] px-4 py-6 overflow-y-auto z-20">
          <SidebarSection label={String(CURRENT_YEAR)}>
            <SidebarLink href="/" label="home" />
            <SidebarLink href={`/${CURRENT_YEAR}/books`} label="log" />
            <SidebarLink href={`/${CURRENT_YEAR}/lists`} label="lists" />
            <SidebarLink href={`/${CURRENT_YEAR}/habits`} label="habits" />
          </SidebarSection>

          <SidebarSection label="shelves">
            <SidebarLink href="/shelf" label="all books" />
            <SidebarLink href="/shelf/reading" label="reading" />
            <SidebarLink href="/shelf/finished" label="finished" />
            <SidebarLink href="/shelf/want-to-read" label="want to read" />
          </SidebarSection>

          <SidebarSection label="milestones">
            <SidebarLink href={`/${CURRENT_YEAR}/stats`} label="year in review" />
          </SidebarSection>

          {tabs.length > 0 && (
            <SidebarSection label="tabs">
              {tabs.map((t) => (
                <Link
                  key={t.id}
                  href={t.href}
                  className="flex items-center px-2.5 py-[7px] rounded-[10px] text-[12px] text-[#5A5060] hover:bg-[rgba(45,27,46,0.08)] hover:text-[#1A1A1A] transition-colors truncate"
                >
                  {t.title}
                </Link>
              ))}
            </SidebarSection>
          )}

          <div className="mt-auto">
            <button
              onClick={() => signOut()}
              className="text-[11px] text-[rgba(90,80,96,0.45)] hover:text-[#5A5060] transition-colors px-2.5"
            >
              sign out
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
