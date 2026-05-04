"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function LogRedirect() {
  const { year } = useParams<{ year: string }>();
  const router = useRouter();
  useEffect(() => {
    router.replace(`/${year}/habits`);
  }, [year, router]);
  return null;
}
