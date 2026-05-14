import type { Metadata } from "next";
import {
  DM_Sans,
  Playfair_Display,
  Caveat,
  Geist_Mono,
} from "next/font/google";
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

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
