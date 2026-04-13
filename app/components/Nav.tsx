"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "./ThemeToggle";
import type { Icon } from "@phosphor-icons/react";
import {
  HouseIcon,
  ListBulletsIcon,
  CalendarBlankIcon,
  QuotesIcon,
  BookOpenIcon,
  BookBookmarkIcon,
  BookmarkSimpleIcon,
  StackIcon,
  StarIcon,
  TargetIcon,
  ChartBarIcon,
  GearIcon,
  BookmarkIcon,
} from "@phosphor-icons/react";

const MONTH_ABBRS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = MONTH_ABBRS[new Date().getMonth()];
const CURRENT_MONTH_LABEL = new Date().toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});

interface TabItem {
  id: string;
  title: string;
  href: string;
}

interface ShelfCounts {
  reading: number;
  finished: number;
  wantToRead: number;
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

function SidebarLink({
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
    : href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-2.5 py-[7px] rounded-[10px] text-[13px] transition-colors ${
        active ? "font-semibold" : "font-medium hover:bg-[rgba(45,27,46,0.08)]"
      }`}
      style={{
        background: active ? "var(--bg-hover)" : undefined,
        color: active ? "var(--fg-heading)" : "var(--fg)",
      }}
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

function SidebarSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <p
        className="text-[10px] font-bold uppercase tracking-[0.12em] mb-2.5 px-2.5"
        style={{ color: "var(--fg-muted)" }}
      >
        {label}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

export default function Nav() {
  const { user } = useAuth();
  const [tabs, setTabs] = useState<TabItem[]>([]);
  const [shelfCounts, setShelfCounts] = useState<ShelfCounts>({ reading: 0, finished: 0, wantToRead: 0 });

  useEffect(() => {
    if (!user) return;
    async function loadNav() {
      const [booksRes, listsRes, readingRes, finishedRes, wantRes] = await Promise.all([
        supabase
          .from("books")
          .select("id, title")
          .eq("bookmarked", true)
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase
          .from("lists")
          .select("id, title, year")
          .eq("bookmarked", true)
          .order("updated_at", { ascending: false })
          .limit(8),
        supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "reading"),
        supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "finished"),
        supabase.from("books").select("id", { count: "exact", head: true }).eq("status", "want-to-read"),
      ]);

      const bookTabs: TabItem[] = (booksRes.data ?? []).map((b: any) => ({
        id: b.id,
        title: b.title ?? "untitled",
        href: `/book/${b.id}`,
      }));
      const listTabs: TabItem[] = (listsRes.data ?? []).map((l: any) => ({
        id: l.id,
        title: l.title,
        href: `/${l.year}/lists/${l.id}`,
      }));

      setTabs([...bookTabs, ...listTabs]);
      setShelfCounts({
        reading: readingRes.count ?? 0,
        finished: finishedRes.count ?? 0,
        wantToRead: wantRes.count ?? 0,
      });
    }
    loadNav().catch(console.error);
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

        <div className="flex items-center gap-4">
          {user && (
            <>
              <nav className="hidden lg:flex items-center gap-6">
                <TopNavLink href="/" label="journal" />
                <TopNavLink href="/library" label="library" />
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
          {user && (
            <button
              onClick={() => signOut()}
              className="hidden lg:block text-[12px] text-white/40 hover:text-white/80 transition-colors"
            >
              sign out
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Desktop sidebar */}
      {user && (
        <nav
          className="hidden lg:flex flex-col fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-[220px] px-4 py-6 overflow-y-auto z-20 border-r transition-colors"
          style={{ background: "var(--bg-page)", borderColor: "var(--border-light)" }}
        >
          <SidebarSection label={CURRENT_MONTH_LABEL}>
            <SidebarLink href={`/${CURRENT_YEAR}`} label="index" exact icon={HouseIcon} />
            <SidebarLink href={`/${CURRENT_YEAR}/lists`} label="lists" icon={ListBulletsIcon} />
            <SidebarLink href={`/${CURRENT_YEAR}/${CURRENT_MONTH}`} label="monthly spread" icon={CalendarBlankIcon} />
            <SidebarLink href={`/${CURRENT_YEAR}/quotes`} label="quote collection" icon={QuotesIcon} />
          </SidebarSection>

          <SidebarSection label="my shelves">
            <SidebarLink
              href="/library/reading"
              label={`reading${shelfCounts.reading > 0 ? ` · ${shelfCounts.reading}` : ""}`}
              icon={BookOpenIcon}
            />
            <SidebarLink
              href="/library/finished"
              label={`read${shelfCounts.finished > 0 ? ` · ${shelfCounts.finished}` : ""}`}
              icon={BookBookmarkIcon}
            />
            <SidebarLink
              href="/library/want-to-read"
              label={`want to read${shelfCounts.wantToRead > 0 ? ` · ${shelfCounts.wantToRead}` : ""}`}
              icon={BookmarkSimpleIcon}
            />
            <SidebarLink href="/library/series" label="series tracker" icon={StackIcon} />
            <SidebarLink href="/library/recommendations" label="recommendations" icon={StarIcon} />
          </SidebarSection>

          <SidebarSection label="milestones">
            <SidebarLink href={`/${CURRENT_YEAR}/goal`} label={`${CURRENT_YEAR} goals`} icon={TargetIcon} />
            <SidebarLink href={`/${CURRENT_YEAR}/stats`} label="year in review" icon={ChartBarIcon} />
          </SidebarSection>

          {tabs.length > 0 && (
            <SidebarSection label="tabs">
              {tabs.map((t) => (
                <Link
                  key={t.id}
                  href={t.href}
                  className="flex items-center gap-2 px-2.5 py-[7px] rounded-[10px] text-[12px] font-medium transition-colors truncate hover:bg-[rgba(45,27,46,0.08)]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  <BookmarkIcon size={13} className="shrink-0 opacity-60" />
                  <span className="truncate">{t.title}</span>
                </Link>
              ))}
            </SidebarSection>
          )}

          <div className="mt-auto px-2.5 space-y-2">
            <SidebarLink href="/profile" label="profile & settings" icon={GearIcon} />
          </div>
        </nav>
      )}
    </>
  );
}
