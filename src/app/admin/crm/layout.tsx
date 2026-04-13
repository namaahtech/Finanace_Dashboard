"use client";

import { CRMProvider } from "@/store/crmStore";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <CRMProvider>
      {children}
    </CRMProvider>
  );
}
