"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";
import { signOut } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
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
  ListIcon,
  XIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { MONTH_ABBRS } from "@/lib/constants";
import { toast } from "@/lib/toast";
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
  const pathname = usePathname();
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [shelfCounts, setShelfCounts] = useState<ShelfCounts>({
    reading: 0,
    finished: 0,
    wantToRead: 0,
  });

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    apiFetch("/api/nav")
      .then((res) => res.json())
      .then(({ bookmarks, shelfCounts }) => {
        setBookmarks(bookmarks);
        setShelfCounts(shelfCounts);
      })
      .catch(() => toast("Failed to load data. Please refresh."));
  }, [userId]);

  // Hide nav on auth pages, login page, and when not authenticated
  if (pathname.startsWith("/auth/") || pathname === "/login" || !userId)
    return null;

  return (
    <>
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 z-30 h-14 bg-plum-dark flex items-center justify-between px-3 sm:px-6">
        <Link
          href="/"
          className="font-serif text-title font-bold text-white tracking-tight leading-none"
        >
          spine<span className="text-gold italic">.</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <>
              <nav className="hidden lg:flex items-center gap-6">
                <TopNavLink href="/" label="home" />
                <TopNavLink href="/library" label="library" />
                <TopNavLink href={`/${CURRENT_YEAR}/review`} label="review" />
              </nav>
              <Link
                href={`/${CURRENT_YEAR}/books`}
                className="hidden lg:inline-block text-note font-semibold text-white bg-terra px-4 py-1.5 rounded-full hover:bg-terra-light transition-colors"
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
          {/* Mobile menu button */}
          {user && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 -mr-2 text-white/70 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <XIcon size={22} /> : <ListIcon size={22} />}
            </button>
          )}
        </div>
      </header>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 top-14 z-[28] bg-overlay lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile slide-out menu */}
      <div
        className={`fixed top-14 right-0 h-[calc(100dvh-var(--nav-height))] w-72 z-[29] bg-page border-l border-line shadow-xl overflow-y-auto transition-transform duration-300 lg:hidden ${
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
        onClick={closeMobileMenu}
      >
        <div className="p-4">
          <Link
            href={`/${CURRENT_YEAR}/books`}
            className="flex items-center justify-center gap-2 text-note font-semibold text-white bg-terra px-4 py-2.5 rounded-full hover:bg-terra-light transition-colors mb-4 w-full"
          >
            <PlusIcon size={16} weight="bold" /> log a book
          </Link>

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
              href={`/${CURRENT_YEAR}/goal`}
              label={`${CURRENT_YEAR} goals`}
              icon={TargetIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/review`}
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

          <div className="mt-4 space-y-2 border-t border-line pt-4">
            <SidebarLink
              href="/profile"
              label="profile & settings"
              icon={GearIcon}
            />
            <button
              onClick={() => signOut()}
              className="text-xs text-fg-faint hover:text-fg-muted transition-colors px-3 py-2"
            >
              sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      {user && (
        <nav className="hidden lg:flex flex-col fixed top-14 left-0 h-[calc(100dvh-var(--nav-height))] w-55 px-4 py-6 overflow-y-auto z-20 border-r transition-colors bg-page border-line">
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
              href={`/${CURRENT_YEAR}/goal`}
              label={`${CURRENT_YEAR} goals`}
              icon={TargetIcon}
            />
            <SidebarLink
              href={`/${CURRENT_YEAR}/review`}
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
