import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
}

export function Card({ children, className, title, subtitle }: CardProps) {
  return (
    <div className={cn("enterprise-card", className)}>
      {(title || subtitle) && (
        <CardHeaderInternal title={title} subtitle={subtitle} />
      )}
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

function CardHeaderInternal({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/30">
      {title && <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] leading-none mb-1">{title}</h3>}
      {subtitle && <p className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{subtitle}</p>}
    </div>
  );
}

// Legacy exports for compatibility with existing pages
export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("border-b border-slate-100 px-6 py-4 bg-slate-50/30", className)}>{children}</div>;
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn("text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]", className)}>{children}</h3>;
}
