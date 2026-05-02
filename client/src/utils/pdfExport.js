import jsPDF from 'jspdf';

/**
 * HealthAssist — Professional PDF Cost Report
 * Clean A4 layout with proper sections, tables, and hospital cards.
 * Uses "Rs." prefix (jsPDF built-in helvetica does not support ₹ U+20B9).
 */
export async function generateCostReport({ costData, hospitals, searchQuery, searchLocation }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297, M = 14, CW = W - M * 2;
  let y = 0;

  // ── Colors ──────────────────────────────────────────────────────────────────
  const C = {
    blue:   [23, 103, 189],
    navy:   [18, 36, 60],
    teal:   [0, 151, 136],
    green:  [22, 163, 74],
    amber:  [180, 100, 0],
    red:    [185, 28, 28],
    muted:  [95, 115, 135],
    border: [210, 225, 240],
    light:  [246, 249, 252],
    white:  [255, 255, 255],
    warn:   [254, 243, 199],
    warnBorder: [245, 158, 11],
    pmjay:  [224, 245, 243],
  };

  // ── Utilities ────────────────────────────────────────────────────────────────
  const nl  = (n = 6)  => { y += n; };
  const chk = (n = 30) => { if (y + n > H - 22) { doc.addPage(); y = 22; } };
  const fill   = (x, yy, w, h, c) => { doc.setFillColor(...c); doc.rect(x, yy, w, h, 'F'); };
  const stroke = (x, yy, w, h, c, lw = 0.25) => {
    doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, yy, w, h, 'S');
  };
  const hline  = (yy, c = C.border) => {
    doc.setDrawColor(...c); doc.setLineWidth(0.25); doc.line(M, yy, W - M, yy);
  };
  const txt = (text, x, yy, opts = {}) => {
    const { size = 8.5, color = C.navy, bold = false, align = 'left' } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...color);
    doc.text(String(text ?? ''), x, yy, { align });
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const reportId = 'HA-' + Math.random().toString(36).substr(2, 9).toUpperCase();

  // ══════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════
  fill(0, 0, W, 46, C.navy);

  // Left: Logo + tagline
  txt('HealthAssist', M, 14, { size: 20, color: C.white, bold: true });
  txt('AI-Powered Healthcare Navigator  |  Cost & Hospital Intelligence', M, 22, { size: 8, color: [150, 190, 230] });

  // Right: Report type + date
  txt('TREATMENT COST ESTIMATE REPORT', W - M, 12, { size: 10, color: C.white, bold: true, align: 'right' });
  txt(`Generated: ${dateStr}  ${timeStr}`, W - M, 20, { size: 7.5, color: [160, 200, 240], align: 'right' });
  txt(`Report ID: ${reportId}`, W - M, 27, { size: 7.5, color: [160, 200, 240], align: 'right' });

  // Blue accent bar under header
  fill(0, 46, W, 3, C.blue);
  y = 58;

  // ══════════════════════════════════════════════════════════════════
  // SECTION HEADING HELPER
  // ══════════════════════════════════════════════════════════════════
  let secNum = 0;
  const section = (title) => {
    chk(20);
    secNum++;
    fill(M, y - 1, 5, 11, C.blue);
    txt(`${secNum}.  ${title}`, M + 8, y + 7, { size: 10, color: C.navy, bold: true });
    y += 14;
    hline(y - 3, C.blue);
    nl(5);
  };

  // ══════════════════════════════════════════════════════════════════
  // 1. SEARCH SUMMARY
  // ══════════════════════════════════════════════════════════════════
  section('SEARCH SUMMARY');

  fill(M, y - 2, CW, 32, C.light);
  stroke(M, y - 2, CW, 32, C.border);

  const kv = (label, value, yy) => {
    txt(label, M + 4, yy, { size: 8, color: C.muted });
    txt(value || 'Not specified', M + 52, yy, { size: 8.5, bold: true });
  };

  kv('Search Query:',  searchQuery || 'Healthcare Search', y + 7);
  kv('Location:',      searchLocation || 'All India',       y + 16);
  kv('Confidence:',    `${Math.round((costData?.confidence || 0) * 100)}%`, y + 25);
  y += 38;

  // ══════════════════════════════════════════════════════════════════
  // 2. COST OVERVIEW (big range callout)
  // ══════════════════════════════════════════════════════════════════
  section('ESTIMATED COST RANGE');

  const totalMin = costData?.totalMin ?? 0;
  const totalMax = costData?.totalMax ?? 0;
  const conf     = costData?.confidence || 0;
  const confPct  = Math.round(conf * 100);
  const confColor = conf >= 0.7 ? C.green : conf >= 0.4 ? C.amber : C.red;
  const confLabel = conf >= 0.7 ? 'HIGH CONFIDENCE' : conf >= 0.4 ? 'MODERATE' : 'LOW CONFIDENCE';

  // Left: cost range panel
  fill(M, y - 2, CW * 0.62, 40, [235, 245, 255]);
  stroke(M, y - 2, CW * 0.62, 40, C.blue, 0.5);
  txt('ESTIMATED TREATMENT RANGE', M + 4, y + 7, { size: 7.5, color: C.muted, bold: true });
  txt(fmtINR(totalMin), M + 4, y + 22, { size: 16, color: C.blue, bold: true });
  txt(`to  ${fmtINR(totalMax)}`, M + 4, y + 32, { size: 11, color: C.navy, bold: true });

  // Right: confidence panel
  const cx = M + CW * 0.65;
  fill(cx, y - 2, CW * 0.35, 40, C.light);
  stroke(cx, y - 2, CW * 0.35, 40, C.border);
  txt('DATA CONFIDENCE', cx + 4, y + 7, { size: 7.5, color: C.muted, bold: true });
  txt(`${confPct}%`, cx + 4, y + 22, { size: 18, color: confColor, bold: true });
  txt(confLabel, cx + 4, y + 32, { size: 7, color: confColor, bold: true });
  y += 46;

  // Sources
  const sources = (costData?.dataSources || []).join(' | ') || 'NHA package rates, CGHS 2022';
  txt(`Data Sources: ${sources}`, M, y, { size: 7, color: C.muted });
  y += 10;

  // ══════════════════════════════════════════════════════════════════
  // 3. COMPONENT-LEVEL COST BREAKDOWN
  // ══════════════════════════════════════════════════════════════════
  const components = costData?.components || [];
  if (components.length) {
    chk(60);
    section('COMPONENT-LEVEL COST BREAKDOWN');

    // Table header
    fill(M, y - 1, CW, 10, C.navy);
    txt('Cost Component',      M + 4,   y + 7, { size: 8, color: C.white, bold: true });
    txt('Min Estimate',        M + 103, y + 7, { size: 8, color: C.white, bold: true });
    txt('Max Estimate',        M + 148, y + 7, { size: 8, color: C.white, bold: true });
    y += 12;

    components.forEach((item, idx) => {
      chk(20);
      const rowH = item.notes ? 18 : 13;
      fill(M, y - 1, CW, rowH, idx % 2 === 0 ? C.white : C.light);
      stroke(M, y - 1, CW, rowH, C.border, 0.15);

      const nm = (item.name || '').length > 40 ? item.name.slice(0, 38) + '…' : (item.name || '');
      txt(nm, M + 4, y + 7, { size: 8.5, bold: true });
      txt(fmtINR(item.min), M + 103, y + 7, { size: 8.5, color: C.muted });
      txt(fmtINR(item.max), M + 148, y + 7, { size: 8.5, bold: true });
      if (item.notes) {
        txt(item.notes.length > 70 ? item.notes.slice(0, 68) + '…' : item.notes,
            M + 4, y + 14, { size: 6.5, color: C.muted });
      }
      y += rowH + 1;
    });

    // Total row
    chk(16);
    fill(M, y - 1, CW, 13, C.blue);
    txt('TOTAL ESTIMATE', M + 4, y + 8, { size: 9, color: C.white, bold: true });
    txt(fmtINR(totalMin), M + 103, y + 8, { size: 9, color: C.white });
    txt(fmtINR(totalMax), M + 148, y + 8, { size: 9, color: C.white, bold: true });
    y += 16;
  }

  // ══════════════════════════════════════════════════════════════════
  // 4. RISK FLAGS
  // ══════════════════════════════════════════════════════════════════
  const risks = costData?.riskFlags || [];
  if (risks.length) {
    chk(50);
    section('RISK FLAGS & COST MODIFIERS');
    const rh = risks.length * 12 + 10;
    fill(M, y - 2, CW, rh, C.warn);
    stroke(M, y - 2, CW, rh, C.warnBorder, 0.4);
    risks.forEach(flag => {
      txt(`⚠  ${flag}`, M + 5, y + 7, { size: 8, color: [146, 64, 14], bold: true });
      y += 12;
    });
    y += 8;
  }

  // ══════════════════════════════════════════════════════════════════
  // 5. PMJAY SECTION
  // ══════════════════════════════════════════════════════════════════
  if (costData?.pmjayEligible) {
    chk(42);
    section('PMJAY / AYUSHMAN BHARAT COVERAGE');
    fill(M, y - 2, CW, 32, C.pmjay);
    stroke(M, y - 2, CW, 32, C.teal, 0.5);
    txt('You may be eligible for PMJAY coverage up to Rs. 5,00,000 per year.',
        M + 5, y + 8,  { size: 9, color: [0, 105, 95], bold: true });
    txt('Check eligibility at  pmjay.gov.in  |  Helpline: 14555 (toll-free)',
        M + 5, y + 17, { size: 8, color: C.muted });
    txt('Carry Aadhaar + Ration Card to the hospital PMJAY desk.',
        M + 5, y + 25, { size: 8, color: C.muted });
    y += 38;
  }

  // ══════════════════════════════════════════════════════════════════
  // 6. RECOMMENDED HOSPITALS
  // ══════════════════════════════════════════════════════════════════
  if (hospitals?.length) {
    chk(80);
    section('RECOMMENDED HOSPITALS');

    // Table header
    fill(M, y - 1, CW, 10, C.navy);
    txt('Rank',         M + 3,   y + 7, { size: 7.5, color: C.white, bold: true });
    txt('Hospital',     M + 18,  y + 7, { size: 7.5, color: C.white, bold: true });
    txt('City',         M + 100, y + 7, { size: 7.5, color: C.white, bold: true });
    txt('Type',         M + 126, y + 7, { size: 7.5, color: C.white, bold: true });
    txt('Score',        M + 148, y + 7, { size: 7.5, color: C.white, bold: true });
    txt('Rating',       M + 163, y + 7, { size: 7.5, color: C.white, bold: true });
    y += 12;

    hospitals.slice(0, 8).forEach((h, idx) => {
      chk(22);
      const rowH = 18;
      fill(M, y - 1, CW, rowH, idx % 2 === 0 ? C.white : C.light);
      stroke(M, y - 1, CW, rowH, C.border, 0.15);

      // Rank badge
      const rankBg = h.rank === 1 ? [245,158,11] : h.rank === 2 ? [148,163,184] : h.rank === 3 ? [180,83,9] : C.muted;
      fill(M + 1.5, y + 2, 12, 12, rankBg);
      txt(`#${h.rank}`, M + 3, y + 10, { size: 7, color: C.white, bold: true });

      // Name & accreditation
      const hName = (h.name || '').length > 32 ? h.name.slice(0, 30) + '…' : h.name;
      txt(hName, M + 18, y + 7, { size: 8, bold: true });
      const accs = (h.accreditations || []).slice(0, 2).join(', ');
      if (accs) txt(accs, M + 18, y + 14, { size: 6.5, color: C.muted });

      // City
      txt(h.city || '', M + 100, y + 7, { size: 7.5 });

      // Hospital type
      txt(h.type ? h.type.charAt(0).toUpperCase() + h.type.slice(1) : '', M + 126, y + 7, { size: 7.5 });

      // Score
      if (h.scoreBreakdown?.overall) {
        const s = Math.round(h.scoreBreakdown.overall);
        const sc = s >= 75 ? C.green : s >= 50 ? C.amber : C.red;
        txt(`${s}/100`, M + 148, y + 7, { size: 8, color: sc, bold: true });
      }

      // Rating
      txt(`${(h.rating || 0).toFixed(1)} ★`, M + 163, y + 7, { size: 8, color: [180, 120, 0], bold: true });

      // PMJAY badge
      if (h.acceptsPMJAY) {
        fill(M + 163, y + 10, 22, 7, C.teal);
        txt('PMJAY', M + 165, y + 15, { size: 6, color: C.white, bold: true });
      }

      // Cost range if available
      if (h.costRange?.min || h.costRange?.max) {
        const cr = `${fmtINR(h.costRange.min)} – ${fmtINR(h.costRange.max)}`;
        txt(cr, M + 100, y + 14, { size: 6.5, color: C.muted });
      }

      y += rowH + 1;
    });
    y += 6;
  }

  // ══════════════════════════════════════════════════════════════════
  // 7. NEXT STEPS GUIDE
  // ══════════════════════════════════════════════════════════════════
  chk(70);
  section('YOUR NEXT STEPS');

  const steps = [
    'Call the hospital billing desk and request a procedure-specific tariff card.',
    'Ask about: surgeon fees, OT charges, room rent/day, ICU charges, and implant costs.',
    'Confirm your health insurance coverage and co-payment/deductible amount.',
    'If PMJAY eligible, visit the hospital PMJAY desk with Aadhaar + Ration Card.',
    'Ask your doctor about generic medicine alternatives to save 60–80% on medicines.',
    'Get written estimates from at least 2–3 hospitals before deciding.',
  ];

  steps.forEach((text, i) => {
    chk(18);
    fill(M, y - 1, 9, 10, C.blue);
    txt(String(i + 1), M + 2.5, y + 7, { size: 7.5, color: C.white, bold: true });
    const lines = doc.splitTextToSize(text, CW - 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...C.navy);
    doc.text(lines, M + 13, y + 7);
    y += lines.length * 5.5 + 7;
  });

  // ══════════════════════════════════════════════════════════════════
  // DISCLAIMER BOX
  // ══════════════════════════════════════════════════════════════════
  chk(32);
  nl(4);
  fill(M, y - 2, CW, 26, C.warn);
  stroke(M, y - 2, CW, 26, C.warnBorder, 0.5);
  txt('IMPORTANT DISCLAIMER', M + 5, y + 7, { size: 8, color: [146, 64, 14], bold: true });
  const disc = 'This report is for planning purposes only and is NOT a financial guarantee or medical advice. ' +
    'Actual costs may vary based on your condition, complications, and hospital policies. ' +
    'Always verify costs directly with the hospital. In any emergency, call 112 immediately.';
  const discLines = doc.splitTextToSize(disc, CW - 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(146, 64, 14);
  doc.text(discLines, M + 5, y + 14);
  y += 30;

  // ══════════════════════════════════════════════════════════════════
  // FOOTER (every page)
  // ══════════════════════════════════════════════════════════════════
  const totalPages = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    fill(0, H - 14, W, 14, C.navy);
    txt('HealthAssist Healthcare Navigator', M, H - 5.5, { size: 7, color: C.white, bold: true });
    txt(`Page ${pg} of ${totalPages}`, W / 2, H - 5.5, { size: 7, color: [150, 175, 205], align: 'center' });
    txt(`${dateStr}  |  Report ID: ${reportId}`, W - M, H - 5.5, { size: 7, color: [150, 175, 205], align: 'right' });
  }

  const fname = `HealthAssist_Report_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.pdf`;
  doc.save(fname);
  return fname;
}

/** Format amount as Indian currency string. */
function fmtINR(amount) {
  if (amount == null || isNaN(amount) || amount === 0) return '—';
  if (amount >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000)    return `Rs. ${(amount / 100_000).toFixed(2)} L`;
  if (amount >= 1_000)      return `Rs. ${(amount / 1_000).toFixed(1)} K`;
  return `Rs. ${amount}`;
}
