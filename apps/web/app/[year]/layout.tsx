import { notFound } from "next/navigation";
import { YearProvider } from "@/providers/YearContext";
import { ReadingLogProvider } from "@/providers/ReadingLogProvider";

export default async function YearLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  if (!/^\d{4}$/.test(year)) notFound();
  const yearNum = Number(year);
  return (
    <ReadingLogProvider year={yearNum}>
      <YearProvider year={yearNum}>{children}</YearProvider>
    </ReadingLogProvider>
  );
}
