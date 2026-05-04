"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// Day detail page replaced by inline editing in the habit tracker.
export default function DayLogRedirect() {
  const { year } = useParams<{ year: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${year}/habits`);
  }, [year, router]);
  return null;
}
