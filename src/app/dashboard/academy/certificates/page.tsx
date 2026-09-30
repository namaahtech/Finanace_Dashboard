"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { useAuth } from "@/components/layout/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/ButtonLegacy";
import { formatDate } from "@/lib/utils";
import { Award, ArrowLeft, Download, Loader2, GraduationCap } from "lucide-react";

interface Cert {
  id: string;
  certificate_number: string;
  issue_date: string;
  course: { title: string; category: string | null } | null;
}

// My Certificates — the employee's earned certificates (auto-issued on course
// completion). Was a dead link (/dashboard/academy/certificates) → 404; now a
// real screen. Each certificate opens a printable view (Print → Save as PDF).
export default function MyCertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("lms_certifications")
      .select("id, certificate_number, issue_date, course:course_id(title, category)")
      .eq("employee_id", user.id)
      .order("issue_date", { ascending: false });
    setCerts((data as any) || []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  function printCertificate(c: Cert) {
    const w = window.open("", "_blank", "width=1100,height=800");
    if (!w) return;
    const name = user?.name || "Employee";
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${c.certificate_number}</title>
      <style>
        *{box-sizing:border-box;margin:0;padding:0;font-family:Georgia,'Times New Roman',serif}
        body{padding:40px;background:#f4f5f7}
        .cert{max-width:900px;margin:0 auto;background:#fff;border:2px solid #0f172a;padding:56px 64px;position:relative}
        .bar{height:8px;background:linear-gradient(90deg,#0f172a,#c8a24a);margin:-56px -64px 40px}
        .co{font-size:14px;letter-spacing:.25em;text-transform:uppercase;color:#c8a24a;font-weight:bold}
        h1{font-size:34px;color:#0f172a;margin:18px 0 6px}
        .sub{color:#64748b;font-size:14px;margin-bottom:36px}
        .name{font-size:40px;color:#0f172a;border-bottom:2px solid #e2e8f0;display:inline-block;padding:0 24px 8px;margin:8px 0 28px}
        .course{font-size:20px;color:#0f172a;font-weight:bold}
        .meta{display:flex;justify-content:space-between;margin-top:56px;color:#475569;font-size:13px}
        .num{position:absolute;bottom:24px;right:64px;color:#94a3b8;font-size:11px;letter-spacing:.1em}
      </style></head><body>
      <div class="cert">
        <div class="bar"></div>
        <p class="co">Namaah Nexus · Learning &amp; Development</p>
        <h1>Certificate of Completion</h1>
        <p class="sub">This is proudly presented to</p>
        <div class="name">${name}</div>
        <p class="sub">for successfully completing the course</p>
        <p class="course">${c.course?.title || "Course"}</p>
        <div class="meta">
          <span>Issued: ${formatDate(c.issue_date)}</span>
          <span>Namaah Nexus Academy</span>
        </div>
        <div class="num">${c.certificate_number}</div>
      </div>
      <script>setTimeout(function(){window.print();},250);</script>
      </body></html>`);
    w.document.close();
  }

  return (
    <DashboardShell moduleKey={["my_academy", "training_academy"]} title="My Certificates" subtitle="Certificates you've earned across the academy.">
      <div className="space-y-5">
        <Button variant="secondary" size="sm" onClick={() => (window.location.href = "/dashboard/academy")}>
          <ArrowLeft size={13} className="mr-1.5" /> Back to Academy
        </Button>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-theme-muted"><Loader2 size={15} className="animate-spin" /> Loading certificates…</div>
        ) : certs.length === 0 ? (
          <div className="page-card flex flex-col items-center gap-2 py-16 text-center">
            <GraduationCap size={30} className="text-theme-muted" />
            <p className="text-sm font-semibold text-theme-fg">No certificates yet</p>
            <p className="text-xs text-theme-muted">Complete a course and your certificate appears here automatically.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certs.map((c) => (
              <div key={c.id} className="page-card overflow-hidden p-0">
                <div className="h-2 bg-gradient-to-r from-theme-primary to-amber-400" />
                <div className="p-5 space-y-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-theme-primary/10 text-theme-primary">
                    <Award size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-theme-fg leading-tight">{c.course?.title || "Course"}</p>
                    {c.course?.category && <p className="text-[11px] text-theme-muted mt-0.5">{c.course.category}</p>}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-theme-muted">
                    <span>Issued {formatDate(c.issue_date)}</span>
                    <span className="font-mono">{c.certificate_number}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(`/api/lms/certificates/${c.id}/pdf`, "_blank")}>
                      View
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => window.open(`/api/lms/certificates/${c.id}/pdf?download=1`, "_blank")}>
                      <Download size={13} className="mr-1.5" /> PDF
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
