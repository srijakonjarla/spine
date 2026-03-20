import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import Nav from "./components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "spine",
  description: "your reading journal",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          <Nav />
          <header className="lg:hidden fixed top-0 left-0 right-0 z-20 bg-[#faf8f5] border-b border-stone-100 px-6 py-4 font-mono">
            <Link href="/" className="text-sm font-semibold text-stone-900 hover:opacity-60 transition-opacity">
              spine
            </Link>
          </header>
          <div className="lg:pl-40 lg:pt-0 pt-14">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
