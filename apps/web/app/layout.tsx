import type { Metadata } from "next";
import localFont from "next/font/local";
import "@/globals.css";
import AuthProvider from "@/providers/AuthProvider";
import { BooksProvider } from "@/providers/BooksProvider";
import { ListBookmarksProvider } from "@/providers/ListBookmarksProvider";
import { QuotesProvider } from "@/providers/QuotesProvider";
import { SWRProvider } from "@/providers/SWRProvider";
import Nav from "@/components/navigation/Nav";
import { Toaster } from "@/components/Toaster";
import { Footer } from "@/components/Footer";
import { NavigationProvider } from "@/providers/NavigationProvider";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { TimeZoneSync } from "@/components/TimeZoneSync";

// All fonts are self-hosted Latin variable files from Google Fonts:
// next/font/google started failing at build time — first Playfair on Vercel
// ("next/font/google queries have exactly one entry"), then DM Sans in local
// dev ("Module not found" in the generated font CSS).
const dmSans = localFont({
  variable: "--font-dm-sans",
  src: [
    { path: "./fonts/DMSans-latin.woff2", weight: "300 600", style: "normal" },
    {
      path: "./fonts/DMSans-Italic-latin.woff2",
      weight: "300 600",
      style: "italic",
    },
  ],
  display: "swap",
  fallback: ["system-ui", "sans-serif"],
});

const playfair = localFont({
  variable: "--font-playfair",
  src: [
    {
      path: "./fonts/PlayfairDisplay-latin.woff2",
      weight: "400 900",
      style: "normal",
    },
    {
      path: "./fonts/PlayfairDisplay-Italic-latin.woff2",
      weight: "400 900",
      style: "italic",
    },
  ],
  display: "swap",
  fallback: ["Georgia", "serif"],
});

const caveat = localFont({
  variable: "--font-caveat",
  src: [{ path: "./fonts/Caveat-latin.woff2", weight: "400 600" }],
  display: "swap",
  fallback: ["cursive"],
});

const geistMono = localFont({
  variable: "--font-geist-mono",
  src: [{ path: "./fonts/GeistMono-latin.woff2", weight: "100 900" }],
  display: "swap",
  fallback: ["ui-monospace", "monospace"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://spinereads.com",
  ),
  title: "spine",
  description: "your reading journal",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "spine",
    description: "your reading journal",
    url: "/",
    siteName: "spine",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "spine — your reading journal",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "spine",
    description: "your reading journal",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.setAttribute('data-theme',t||(d?'dark':'light'));})()`,
          }}
        />
      </head>
      <body
        className={`${dmSans.variable} ${playfair.variable} ${caveat.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <TimeZoneSync />
          <SWRProvider>
            <AuthProvider>
              <BooksProvider>
                <ListBookmarksProvider>
                  <QuotesProvider>
                    <NavigationProvider>
                      <Nav />
                      <div className="pt-14 lg:pl-55">
                        {children}
                        <Footer />
                      </div>
                      <Toaster />
                    </NavigationProvider>
                  </QuotesProvider>
                </ListBookmarksProvider>
              </BooksProvider>
            </AuthProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
