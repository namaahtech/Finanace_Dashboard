"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { supabase } from "@/lib/supabase";
import { ArrowLeft, LogOut, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Offboarding workspace for a single employee. This is intentionally a scaffold:
// the full offboarding flow (checklist, asset return, exit steps, final access
// revocation) will be specced and built here next. It is a distinct concept from
// candidate "revoke" (offer withdrawn before joining) and from permanent Delete.
export default function OffboardEmployeePage() {
  const { id } = useParams<{ id: string }>();
  const [emp, setEmp] = useState<{ name: string; email: string; status: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("employees")
        .select("name, email, status")
        .eq("id", id)
        .maybeSingle();
      setEmp(data as any);
      setLoading(false);
    })();
  }, [id]);

  return (
    <DashboardShell>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">
        <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={15} /> Back to Employees
        </Link>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600">
            <LogOut size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Offboard Employee</h1>
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading…" : emp ? `${emp.name} · ${emp.email}` : "Employee not found"}
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="p-6 space-y-3">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Loading employee…</div>
            ) : (
              <>
                <p className="text-sm font-semibold text-foreground">Offboarding module — coming next</p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This is the dedicated offboarding workspace. The full exit workflow will be built
                  here. Offboarding is separate from <span className="font-medium text-foreground">Revoke</span> (a
                  candidate who never joined) and from <span className="font-medium text-foreground">Permanent Delete</span>.
                </p>
                <p className="text-xs text-muted-foreground">Current status: {emp?.status || "—"}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
