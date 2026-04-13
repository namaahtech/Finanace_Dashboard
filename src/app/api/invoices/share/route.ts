import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, message, invoice } = body;

    if (!to || !invoice) {
      return NextResponse.json({ error: "Recipient email and invoice are required" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST   || "smtp.gmail.com",
      port:   Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const items: any[] = invoice.items || [];

    const itemRows = items.map((item: any) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 12px;font-size:13px;color:#374151;">${item.description}${item.hsn_sac ? `<br/><span style="font-size:11px;color:#9ca3af;">HSN/SAC: ${item.hsn_sac}</span>` : ""}</td>
        <td style="padding:10px 12px;text-align:center;font-size:13px;color:#374151;">${item.quantity}</td>
        <td style="padding:10px 12px;text-align:right;font-size:13px;color:#374151;">₹${Number(item.rate).toLocaleString("en-IN")}</td>
        <td style="padding:10px 12px;text-align:center;font-size:13px;color:#374151;">${item.gst_rate}%</td>
        <td style="padding:10px 12px;text-align:right;font-size:13px;font-weight:700;color:#111827;">₹${Number(item.total).toLocaleString("en-IN")}</td>
      </tr>
    `).join("");

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);border:1px solid #e5e7eb;">

    <!-- Header -->
    <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:32px 40px;color:white;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;">
        <div>
          <h1 style="margin:0;font-size:28px;font-weight:900;letter-spacing:-0.5px;">TAX INVOICE</h1>
          <p style="margin:6px 0 0;font-size:14px;opacity:0.85;">GST Compliant Invoice</p>
        </div>
        <div style="text-align:right;">
          <p style="margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;">${invoice.invoiceNumber}</p>
          <p style="margin:4px 0 0;font-size:12px;opacity:0.8;">Issued: ${invoice.issuedDate || "—"}</p>
          <p style="margin:2px 0 0;font-size:12px;opacity:0.8;">Due: ${invoice.dueDate || "—"}</p>
        </div>
      </div>
    </div>

    <!-- From / To -->
    <div style="display:flex;gap:0;border-bottom:1px solid #e5e7eb;">
      <div style="flex:1;padding:24px 40px;border-right:1px solid #e5e7eb;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">From</p>
        <p style="margin:0;font-size:15px;font-weight:800;color:#111827;">${invoice.companyName || "Namaah Technologies"}</p>
        ${invoice.companyGstin ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">GSTIN: ${invoice.companyGstin}</p>` : ""}
        ${invoice.companyAddress ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${invoice.companyAddress}</p>` : ""}
      </div>
      <div style="flex:1;padding:24px 40px;">
        <p style="margin:0 0 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Bill To</p>
        <p style="margin:0;font-size:15px;font-weight:800;color:#111827;">${invoice.clientName || "—"}</p>
        ${invoice.clientGstin ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">GSTIN: ${invoice.clientGstin}</p>` : ""}
        ${invoice.billingAddress ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${invoice.billingAddress}</p>` : ""}
        ${invoice.projectName ? `<p style="margin:4px 0 0;font-size:12px;color:#6b7280;">Project: ${invoice.projectName}</p>` : ""}
      </div>
    </div>

    <!-- Items Table -->
    <div style="padding:24px 40px;">
      <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th style="padding:10px 12px;text-align:left;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Description</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Rate</th>
            <th style="padding:10px 12px;text-align:center;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">GST</th>
            <th style="padding:10px 12px;text-align:right;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#6b7280;">Total</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <!-- Totals -->
      <div style="display:flex;justify-content:flex-end;margin-top:16px;">
        <table style="width:260px;">
          <tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">Subtotal</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#374151;font-weight:600;">₹${Number(invoice.subtotal).toLocaleString("en-IN")}</td></tr>
          ${Number(invoice.cgst) > 0 ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">CGST</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#374151;">₹${Number(invoice.cgst).toLocaleString("en-IN")}</td></tr>` : ""}
          ${Number(invoice.sgst) > 0 ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">SGST</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#374151;">₹${Number(invoice.sgst).toLocaleString("en-IN")}</td></tr>` : ""}
          ${Number(invoice.igst) > 0 ? `<tr><td style="padding:5px 0;font-size:13px;color:#6b7280;">IGST</td><td style="padding:5px 0;text-align:right;font-size:13px;color:#374151;">₹${Number(invoice.igst).toLocaleString("en-IN")}</td></tr>` : ""}
          <tr style="border-top:2px solid #e5e7eb;">
            <td style="padding:10px 0 5px;font-size:15px;font-weight:800;color:#111827;">Total</td>
            <td style="padding:10px 0 5px;text-align:right;font-size:15px;font-weight:800;color:#1e40af;">₹${Number(invoice.total).toLocaleString("en-IN")}</td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Bank Details -->
    ${invoice.bankDetails ? `
    <div style="padding:0 40px 24px;">
      <div style="background:#f8fafc;border-radius:8px;padding:16px;border:1px solid #e5e7eb;">
        <p style="margin:0 0 6px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;">Bank Details</p>
        <p style="margin:0;font-size:13px;color:#374151;white-space:pre-line;">${invoice.bankDetails}</p>
      </div>
    </div>` : ""}

    <!-- Notes & Message -->
    ${message ? `
    <div style="padding:0 40px 24px;">
      <div style="background:#eff6ff;border-radius:8px;padding:16px;border-left:4px solid #3b82f6;">
        <p style="margin:0;font-size:13px;color:#1e40af;">${message}</p>
      </div>
    </div>` : ""}

    <!-- Footer -->
    <div style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e5e7eb;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">This is a computer-generated invoice. Thank you for your business.</p>
    </div>
  </div>
</body>
</html>`;

    await transporter.sendMail({
      from: `"${process.env.SMTP_FROM_NAME || "Namaah Panel"}" <${process.env.SMTP_USER}>`,
      to,
      subject: subject || `Invoice ${invoice.invoiceNumber} from Namaah Technologies`,
      html,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
