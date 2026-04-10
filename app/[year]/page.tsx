"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Year overview was a table-of-contents page; home page covers this now.
export default function YearRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace("/"); }, [router]);
  return null;
}
