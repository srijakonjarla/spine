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
  return (
    <ReadingLogProvider year={Number(year)}>
      <YearProvider year={Number(year)}>{children}</YearProvider>
    </ReadingLogProvider>
  );
}
