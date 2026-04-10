"use client";

import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

export default function HabitsRedirect() {
  const router = useRouter();
  const { year } = useParams<{ year: string }>();
  useEffect(() => { router.replace(`/${year}/spread`); }, [router, year]);
  return null;
}
