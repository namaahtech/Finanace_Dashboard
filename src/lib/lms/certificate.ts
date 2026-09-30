import { launchBrowser } from "@/lib/browser";

export interface CertificateData {
  name: string;
  courseTitle: string;
  certNumber: string;
  issueDate: string;      // e.g. "21 Sept 2026"
  issueTime?: string;     // e.g. "08:40 PM"
  companyName: string;
  category?: string | null;
  signatoryName?: string | null;
  signatoryTitle?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// A landscape "NAMAAH" certificate matching the brand reference: gradient wave
// motifs, side keywords, a gold laurel VERIFIED medal, signature block, a verify
// QR, and a contact footer. Rendered HD to PDF with print backgrounds.
export function renderCertificateHtml(d: CertificateData): string {
  const phone = esc(d.phone || "+91 99026 83223");
  const email = esc(d.email || "info@namaah.io");
  const website = esc(d.website || "www.namaah.io");
  const co = esc(d.companyName || "NAMAAH").toUpperCase();
  const dt = d.issueTime ? `${esc(d.issueDate)} · ${esc(d.issueTime)}` : esc(d.issueDate);

  return `<!doctype html><html><head><meta charset="utf-8"/>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Great+Vibes&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin:0; padding:0; box-sizing:border-box; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html,body { width:297mm; height:210mm; }
  body { font-family:'Montserrat',Arial,sans-serif; color:#1e293b; background:#fff; }
  .page { position:relative; width:297mm; height:210mm; overflow:hidden; background:#ffffff; }
  .grad { color:transparent; background:linear-gradient(90deg,#0f766e,#6d28d9); -webkit-background-clip:text; background-clip:text; }
  /* decorative layers */
  .waveTL { position:absolute; top:-10mm; left:-12mm; width:120mm; height:95mm; }
  .waveBL { position:absolute; bottom:24mm; left:-6mm; width:90mm; height:60mm; opacity:.5; }
  .circuit { position:absolute; bottom:6mm; right:6mm; width:70mm; height:60mm; opacity:.85; }
  .sideL { position:absolute; left:10mm; top:78mm; font-size:10px; letter-spacing:.35em; line-height:2.4; font-weight:700; color:#334155; }
  .sideR { position:absolute; right:10mm; top:88mm; text-align:right; font-size:10px; letter-spacing:.35em; line-height:2.4; font-weight:700; }
  .sideR span { background:linear-gradient(90deg,#0f766e,#6d28d9); -webkit-background-clip:text; background-clip:text; color:transparent; }
  .tag { position:absolute; top:14mm; right:16mm; text-align:right; font-size:10px; letter-spacing:.32em; line-height:2.1; font-weight:600; color:#334155; }

  .wrap { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; padding-top:16mm; }
  .brand { font-family:'Playfair Display',serif; font-weight:800; font-size:40px; letter-spacing:2px; color:#0f172a; display:flex; align-items:center; gap:10px; }
  .brand .peacock { width:34px; height:34px; }
  .brandSub { font-size:11px; letter-spacing:.42em; color:#334155; font-weight:600; margin-top:2px; }
  .rule { width:210mm; max-width:78%; height:2px; background:#1e293b; margin:6mm 0 0; position:relative; }
  .rule::before { content:""; position:absolute; left:50%; top:-3px; width:8px; height:8px; background:#1e293b; transform:translateX(-50%) rotate(45deg); }

  h1 { font-family:'Playfair Display',serif; font-weight:800; font-size:54px; margin-top:7mm; color:#0f172a; }
  .presented { margin-top:4mm; font-size:12px; letter-spacing:.34em; color:#475569; font-weight:600; }
  .name { font-family:'Playfair Display',serif; font-weight:700; font-size:56px; color:#0f172a; margin-top:4mm; padding:0 12mm 3mm; position:relative; }
  .name::after { content:""; position:absolute; left:14%; right:14%; bottom:0; height:2.5px; background:linear-gradient(90deg,#0f766e,#6d28d9); }
  .course-lead { margin-top:6mm; font-size:12px; letter-spacing:.34em; color:#475569; font-weight:600; }
  .course { font-family:'Playfair Display',serif; font-weight:700; font-size:34px; color:#1e293b; margin-top:2mm; }
  .cat { margin-top:1mm; font-size:11px; letter-spacing:.4em; color:#64748b; font-weight:600; }
  .msg { margin-top:6mm; max-width:120mm; text-align:center; font-size:13px; line-height:1.7; color:#475569; }

  .medal { position:absolute; right:36mm; bottom:44mm; width:40mm; height:40mm; }
  .sign { position:absolute; left:50%; bottom:40mm; transform:translateX(-50%); text-align:center; width:90mm; }
  .sign .sig { font-family:'Great Vibes',cursive; font-size:34px; color:#0f172a; line-height:1; }
  .sign .ln { border-top:1.5px solid #0f172a; margin-top:2mm; padding-top:2mm; }
  .sign .who { font-size:12px; font-weight:700; color:#0f172a; }
  .sign .role { font-size:10px; color:#475569; }

  .issue { position:absolute; left:16mm; bottom:36mm; font-size:10px; }
  .issue .lbl { letter-spacing:.24em; color:#94a3b8; font-weight:600; }
  .issue .val { color:#0f172a; font-weight:700; font-size:12px; margin-bottom:3mm; }
  .qr { position:absolute; left:52mm; bottom:34mm; text-align:center; }
  .qr svg { width:18mm; height:18mm; }
  .qr p { font-size:8px; font-weight:700; color:#334155; margin-top:1mm; }

  .footwrap { position:absolute; left:0; right:0; bottom:0; }
  .footline { height:2px; margin:0 14mm; background:#1e293b; position:relative; }
  .footline::after { content:""; position:absolute; right:0; top:-2px; width:60mm; height:6px; border-radius:3px; background:linear-gradient(90deg,#0f766e,#6d28d9); }
  .foot { display:flex; justify-content:space-between; align-items:center; padding:5mm 16mm 3mm; font-size:11px; color:#334155; font-weight:600; }
  .foot .i { display:flex; align-items:center; gap:6px; }
  .accel { text-align:center; font-size:11px; letter-spacing:.28em; font-weight:700; color:#0f172a; }
  .conf { text-align:center; font-size:8.5px; letter-spacing:.14em; color:#94a3b8; padding-bottom:5mm; }
</style></head>
<body>
  <div class="page">
    ${WAVE_TL}${WAVE_BL}${CIRCUIT}

    <div class="tag">SKILLING<br/>PEOPLE<br/>FOR A BRIGHTER<br/>TOMORROW</div>
    <div class="sideL">LEARN<br/>PRACTICE<br/>BUILD<br/>GROW</div>
    <div class="sideR"><span>AI<br/>DATA<br/>PEOPLE<br/>POSSIBILITIES</span></div>

    <div class="wrap">
      <div class="brand">${co}${PEACOCK}</div>
      <div class="brandSub">LEARNING &amp; DEVELOPMENT</div>
      <div class="rule"></div>

      <h1>Certificate of <span class="grad">Completion</span></h1>
      <p class="presented">THIS CERTIFICATE IS PROUDLY PRESENTED TO</p>
      <div class="name">${esc(d.name)}</div>
      <p class="course-lead">FOR SUCCESSFULLY COMPLETING THE COURSE</p>
      <p class="course grad">${esc(d.courseTitle)}</p>
      ${d.category ? `<p class="cat">${esc(String(d.category)).toUpperCase()}</p>` : ""}
      <p class="msg">We appreciate your dedication, commitment and hard work in successfully completing this program. We wish you continued success in your professional journey.</p>
    </div>

    ${MEDAL}

    <div class="sign">
      <div class="sig">${esc(d.signatoryName || "Namaah Academy")}</div>
      <div class="ln">
        <div class="who">${esc(d.signatoryName || "Namaah Academy")}</div>
        <div class="role">${esc(d.signatoryTitle || "Learning & Development")}</div>
      </div>
    </div>

    <div class="issue">
      <p class="lbl">ISSUED ON</p><p class="val">${dt}</p>
      <p class="lbl">CERTIFICATE ID</p><p class="val" style="font-family:monospace">${esc(d.certNumber)}</p>
    </div>
    <div class="qr">${QR}<p>Verify Certificate</p></div>

    <div class="footwrap">
      <div class="footline"></div>
      <div class="foot">
        <span class="i">${ICON_PHONE} ${phone}</span>
        <span class="i">${ICON_MAIL} ${email}</span>
        <span class="i">${ICON_WEB} ${website}</span>
      </div>
      <p class="accel">AI NATIVE&nbsp;&nbsp;|&nbsp;&nbsp;ACCELERATED</p>
      <p class="conf">THIS DOCUMENT IS CONFIDENTIAL AND INTENDED SOLELY FOR THE RECIPIENT.<br/>UNAUTHORIZED DISTRIBUTION OR REPRODUCTION IS PROHIBITED.</p>
    </div>
  </div>
</body></html>`;
}

// ── Inline SVG decorations ─────────────────────────────────────────────────────
const WAVE_TL = `<svg class="waveTL" viewBox="0 0 300 240" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gtl" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0ea5a4"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs>${[0,1,2,3,4,5].map(i=>`<path d="M-20 ${20+i*14} C 60 ${-20+i*14}, 140 ${60+i*14}, 300 ${-10+i*14}" stroke="url(#gtl)" stroke-width="6" fill="none" opacity="${0.9-i*0.12}"/>`).join("")}</svg>`;
const WAVE_BL = `<svg class="waveBL" viewBox="0 0 220 150" fill="none" xmlns="http://www.w3.org/2000/svg">${[0,1,2,3].map(i=>`<path d="M-10 ${120-i*10} C 60 ${150-i*10}, 130 ${70-i*10}, 230 ${110-i*10}" stroke="#c7d2fe" stroke-width="3" fill="none"/>`).join("")}</svg>`;
const CIRCUIT = `<svg class="circuit" viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg" stroke="#4338ca" stroke-width="1.4"><path d="M40 150 V110 H80 V70 H120"/><circle cx="120" cy="70" r="4" fill="#6d28d9" stroke="none"/><path d="M80 150 V130 H140 V90"/><circle cx="140" cy="90" r="4" fill="#0ea5a4" stroke="none"/><path d="M120 150 V120 H170"/><circle cx="170" cy="120" r="3.5" fill="#6d28d9" stroke="none"/><path d="M100 100 H150 V50"/><circle cx="150" cy="50" r="3.5" fill="#4338ca" stroke="none"/></svg>`;
const PEACOCK = `<svg class="peacock" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="pk" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0ea5a4"/><stop offset="1" stop-color="#6d28d9"/></linearGradient></defs><path d="M4 30 Q14 6 34 12 Q22 14 18 30 Z" fill="url(#pk)"/><circle cx="30" cy="16" r="3.4" fill="#0f172a"/><circle cx="30" cy="16" r="1.4" fill="#fbbf24"/></svg>`;
const MEDAL = `<svg class="medal" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><radialGradient id="gold" cx="38%" cy="32%" r="70%"><stop offset="0" stop-color="#fde68a"/><stop offset="55%" stop-color="#d4a636"/><stop offset="100%" stop-color="#9a7420"/></radialGradient></defs><circle cx="50" cy="48" r="34" fill="url(#gold)" stroke="#fff" stroke-width="3"/><circle cx="50" cy="48" r="28" fill="none" stroke="#8a6a1c" stroke-width="1" opacity=".6"/>${[...Array(16)].map((_,i)=>{const a=(i/16)*Math.PI*2;const x1=50+Math.cos(a)*20,y1=48+Math.sin(a)*20,x2=50+Math.cos(a)*27,y2=48+Math.sin(a)*27;return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#7a5c16" stroke-width="1.4" opacity=".5"/>`}).join("")}<text x="50" y="40" text-anchor="middle" font-size="12" fill="#3a2c07">★</text><text x="50" y="54" text-anchor="middle" font-size="8" font-weight="700" fill="#3a2c07" letter-spacing="1">VERIFIED</text><text x="50" y="62" text-anchor="middle" font-size="4.5" fill="#5a4410" letter-spacing="1">BY NAMAAH</text></svg>`;
// Decorative QR-style block (visual verify mark; not a scannable code).
const QR = (() => { let r = ""; const seed = [1,0,1,1,0,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1,0,0,1,1,0,1,1,0,1,0,1,1,0,0,1,0,1,1,1,0,1,0,1,1,0,1,0,1,0]; for (let y=0;y<7;y++) for (let x=0;x<7;x++){ if (seed[(y*7+x)%seed.length]) r+=`<rect x="${x*10}" y="${y*10}" width="10" height="10"/>`; } return `<svg viewBox="0 0 70 70" fill="#0f172a" xmlns="http://www.w3.org/2000/svg">${r}</svg>`; })();
const ICON_PHONE = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0f766e" stroke-width="2"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.6A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.4 2.1L8 9.6a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2z"/></svg>`;
const ICON_MAIL = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>`;
const ICON_WEB = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4338ca" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 9h20"/></svg>`;

/** Render the certificate to a PDF Buffer (A4 landscape, HD backgrounds). */
export async function generateCertificatePdf(d: CertificateData): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(renderCertificateHtml(d), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ printBackground: true, width: "297mm", height: "210mm", pageRanges: "1" });
    return Buffer.from(pdf);
  } finally {
    await browser.close().catch(() => {});
  }
}
