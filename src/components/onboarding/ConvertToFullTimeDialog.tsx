"use client";

import { useEffect, useState } from "react";
import { Briefcase, Loader2, CheckCircle2, AlertTriangle, Mail } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";

export interface ConvertTarget {
  packetId: string;
  candidateName: string;
  candidateEmail: string;
  designation?: string | null;
  department?: string | null;
}

// Converts an intern who has finished their onboarding into a full-time employee.
// HR fills in the new role/CTC/start date; the candidate receives a professional
// offer email sent from the acting user's own mailbox.
export function ConvertToFullTimeDialog({
  target,
  onClose,
  onConverted,
}: {
  target: ConvertTarget | null;
  onClose: () => void;
  onConverted?: () => void;
}) {
  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [annualCtc, setAnnualCtc] = useState("");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warn, setWarn] = useState<string | null>(null);

  // Prefill from the candidate's current record each time the dialog opens.
  useEffect(() => {
    if (!target) return;
    setDesignation(target.designation || "");
    setDepartment(target.department || "");
    setEffectiveDate(new Date().toISOString().slice(0, 10));
    setAnnualCtc("");
    setMessage("");
    setNotify(true);
    setErr(null);
    setWarn(null);
  }, [target]);

  async function submit() {
    if (!target) return;
    setErr(null);
    setWarn(null);
    setSaving(true);
    try {
      const res = await fetch("/api/onboarding/convert-fulltime", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packet_id: target.packetId,
          designation: designation.trim() || null,
          department: department.trim() || null,
          effective_date: effectiveDate || null,
          annual_ctc: annualCtc ? Number(annualCtc) : null,
          message: message.trim() || null,
          notify,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Conversion failed.");

      // The conversion succeeded even if the email didn't — say so rather than
      // showing a blanket success and leaving HR to discover it later.
      if (notify && json.emailed === false) {
        setWarn(json.emailError || "Converted, but the offer email could not be sent.");
        onConverted?.();
        setSaving(false);
        return;
      }
      onConverted?.();
      onClose();
    } catch (e: any) {
      setErr(e.message || "Conversion failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase size={16} className="text-primary" />
            Convert to Full-Time
          </DialogTitle>
          <DialogDescription>
            {target
              ? `${target.candidateName} will be moved from intern to full-time employment.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <p className="text-xs font-medium text-foreground">{target?.candidateName}</p>
            <p className="text-[11px] text-muted-foreground">{target?.candidateEmail}</p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Designation</Label>
              <Input
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Software Engineer"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Engineering"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Effective from</Label>
              <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Annual CTC (₹)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={annualCtc}
                onChange={(e) => setAnnualCtc(e.target.value)}
                placeholder="e.g. 600000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Personal note (optional)</Label>
            <Textarea
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Anything you'd like to add to the offer email…"
              className="resize-none"
            />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <Checkbox checked={notify} onCheckedChange={(v) => setNotify(!!v)} className="mt-0.5" />
            <span className="text-xs leading-relaxed text-muted-foreground">
              Email the full-time offer to the candidate. It is sent from{" "}
              <strong className="text-foreground">your own mailbox</strong>, so replies come back to you.
            </span>
          </label>

          {err && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/5 px-3 py-2.5 text-xs text-rose-600 dark:text-rose-400">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" />
              <span>{err}</span>
            </div>
          )}
          {warn && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-400">
              <Mail size={13} className="mt-0.5 shrink-0" />
              <span>{warn} The employee record was updated successfully.</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {warn ? (
            <Button onClick={onClose}>Close</Button>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={saving}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Convert to Full-Time
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
