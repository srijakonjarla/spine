"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

const MONTH_ABBRS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export default function SpreadRedirect() {
  const router = useRouter();
  const { year } = useParams<{ year: string }>();
  useEffect(() => {
    const now = new Date();
    router.replace(`/${year}/${MONTH_ABBRS[now.getMonth()]}`);
  }, [router, year]);
  return null;
}
