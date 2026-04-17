"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { signOut } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { ThemeToggle } from "@/components/ThemeToggle";
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
  ArrowsClockwiseIcon,
  BooksIcon,
} from "@phosphor-icons/react";
import { MONTH_ABBRS } from "@/lib/constants";
import {
  SidebarLink,
  SidebarSection,
  TopNavLink,
} from "@/components/navigation";
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = MONTH_ABBRS[new Date().getMonth()];
const CURRENT_MONTH_LABEL = new Date().toLocaleDateString("en-US", {
  month: "long",
  year: "numeric",
});

interface BookmarkItem {
  id: string;
  title: string;
  href: string;
}
interface ShelfCounts {
  reading: number;
  finished: number;
  wantToRead: number;
}

export default function Nav() {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [shelfCounts, setShelfCounts] = useState<ShelfCounts>({
    reading: 0,
    finished: 0,
    wantToRead: 0,
  });

  useEffect(() => {
    if (!user) return;
    async function loadNav() {
      const [booksRes, listsRes, readingRes, finishedRes, wantRes] =
        await Promise.all([
          supabase
            .from("user_books")
            .select("id, title_override, catalog_books(title)")
            .eq("user_id", user!.id)
            .eq("bookmarked", true)
            .order("updated_at", { ascending: false })
            .limit(8),
          supabase
            .from("lists")
            .select("id, title, year")
            .eq("user_id", user!.id)
            .eq("bookmarked", true)
            .order("updated_at", { ascending: false })
            .limit(8),
          supabase
            .from("user_books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("status", "reading"),
          supabase
            .from("user_books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("status", "finished"),
          supabase
            .from("user_books")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user!.id)
            .eq("status", "want-to-read"),
        ]);

      setBookmarks([
        ...(booksRes.data ?? []).map(
          (b: {
            id: string;
            title_override: string | null;
            catalog_books: { title: string } | { title: string }[] | null;
          }) => {
            const cb = Array.isArray(b.catalog_books)
              ? b.catalog_books[0]
              : b.catalog_books;
            return {
              id: b.id,
              title: b.title_override ?? cb?.title ?? "untitled",
              href: `/book/${b.id}`,
            };
          },
        ),
        ...(listsRes.data ?? []).map(
          (l: { id: string; title: string; year: number }) => ({
            id: l.id,
            title: l.title,
            href: `/${l.year}/lists/${l.id}`,
          }),
        ),
      ]);
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
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-plum-dark flex items-center justify-between px-6">
        <Link
          href="/"
          className="font-[family-name:var(--font-playfair)] text-[22px] font-bold text-white tracking-tight leading-none"
        >
          spine<span className="text-gold italic">.</span>
        </Link>
        <div className="flex items-center gap-4">
          {user && (
            <>
              <nav className="hidden lg:flex items-center gap-6">
                <TopNavLink href="/" label="home" />
                <TopNavLink href="/library" label="library" />
                <TopNavLink href={`/${CURRENT_YEAR}/stats`} label="stats" />
              </nav>
              <Link
                href={`/${CURRENT_YEAR}/books`}
                className="hidden lg:inline-block text-[13px] font-semibold text-white bg-terra px-4 py-1.5 rounded-full hover:bg-terra-light transition-colors"
              >
                + log
              </Link>
            </>
          )}
          {user && (
            <button
              onClick={() => signOut()}
              className="hidden lg:block text-xs text-white/40 hover:text-white/80 transition-colors"
            >
              sign out
            </button>
          )}
          <ThemeToggle />
        </div>
      </header>

      {/* Desktop sidebar */}
      {user && (
        <nav className="hidden lg:flex flex-col fixed top-14 left-0 h-[calc(100vh-3.5rem)] w-[220px] px-4 py-6 overflow-y-auto z-20 border-r transition-colors bg-[var(--bg-page)] border-[var(--border-light)]">
          <SidebarSection label={CURRENT_MONTH_LABEL}>
            <SidebarLink
              href={`/${CURRENT_YEAR}`}
              label="index"
              exact
              icon={HouseIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/lists`}
              label="lists"
              icon={ListBulletsIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/${CURRENT_MONTH}`}
              label="monthly spread"
              icon={CalendarBlankIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/quotes`}
              label="quote collection"
              icon={QuotesIcon}
            />
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
              icon={BooksIcon}
            />
            <SidebarLink
              href="/library/rereads"
              label="re-reads"
              icon={ArrowsClockwiseIcon}
            />
            <SidebarLink
              href="/library/series"
              label="series tracker"
              icon={StackIcon}
            />
            <SidebarLink
              href="/library/recommendations"
              label="recommendations"
              icon={StarIcon}
            />
          </SidebarSection>

          <SidebarSection label="milestones">
            <SidebarLink
              href={`/${CURRENT_YEAR}/read`}
              label={`${CURRENT_YEAR} reads`}
              icon={BookBookmarkIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/goal`}
              label={`${CURRENT_YEAR} goals`}
              icon={TargetIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/stats`}
              label="year in review"
              icon={ChartBarIcon}
            />
          </SidebarSection>

          {bookmarks.length > 0 && (
            <SidebarSection label="bookmarks">
              {bookmarks.map((t) => (
                <SidebarLink
                  key={t.id}
                  href={t.href}
                  label={t.title}
                  icon={BookmarkSimpleIcon}
                />
              ))}
            </SidebarSection>
          )}

          <div className="mt-auto space-y-2">
            <SidebarLink
              href="/profile"
              label="profile & settings"
              icon={GearIcon}
            />
          </div>
        </nav>
      )}
    </>
  );
}
