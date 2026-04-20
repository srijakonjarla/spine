import { YearProvider } from "@/providers/YearContext";

export default async function YearLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ year: string }>;
}) {
  const { year } = await params;
  return <YearProvider year={Number(year)}>{children}</YearProvider>;
}
