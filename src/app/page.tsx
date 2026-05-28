"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getDashboardForRole, type Role } from "@/components/layout/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else router.replace(getDashboardForRole(user.role as Role));
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
    </div>
  );
}
