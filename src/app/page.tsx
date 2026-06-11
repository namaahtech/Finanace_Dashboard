"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, getDashboardForRole, type Role } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }

    // Check onboarding status
    supabase
      .from("user_onboarding")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data || data.status !== "completed") {
          router.replace("/onboarding");
        } else {
          router.replace(getDashboardForRole(user.role as Role));
        }
      });
  }, [user, loading, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-600 border-t-transparent" />
    </div>
  );
}
