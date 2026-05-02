import jsPDF from 'jspdf';

/**
 * HealthAssist — PDF Cost Report
 * Uses "Rs." instead of "₹" because jsPDF's built-in helvetica font
 * does not support the Rupee Unicode glyph (₹ = U+20B9), which causes
 * corrupted/square characters in the output.
 */
export async function generateCostReport({ costData, hospitals, searchQuery, searchLocation }) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210, H = 297, M = 15, CW = W - M * 2;

  // Color palette
  const BLUE   = [10, 110, 189];
  const NAVY   = [26, 43, 60];
  const TEAL   = [0, 168, 150];
  const MUTED  = [90, 113, 132];
  const BORDER = [220, 232, 240];
  const LIGHT  = [244, 247, 251];
  const AMBER  = [180, 100, 0];
  const GREEN  = [22, 163, 74];
  const RED    = [185, 28, 28];
  const WHITE  = [255, 255, 255];
  const YELLOW = [254, 243, 199];

  let y = 0;
  const nl  = (n = 6)  => { y += n; };
  const chk = (n = 20) => { if (y + n > H - 20) { doc.addPage(); y = 20; } };
  const fill   = (x, yy, w, h, c) => { doc.setFillColor(...c);   doc.rect(x, yy, w, h, 'F'); };
  const stroke = (x, yy, w, h, c, lw = 0.3) => { doc.setDrawColor(...c); doc.setLineWidth(lw); doc.rect(x, yy, w, h, 'S'); };
  const line   = (yy) => { doc.setDrawColor(...BORDER); doc.setLineWidth(0.3); doc.line(M, yy, W - M, yy); };

  // ── Header bar ──────────────────────────────────────────────────────────────
  fill(0, 0, W, 42, BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18); doc.setTextColor(...WHITE);
  doc.text('HealthAssist', M, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);  doc.setTextColor(190, 220, 255);
  doc.text('Healthcare Navigator  |  AI-Powered Cost & Hospital Intelligence', M, 21);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10); doc.setTextColor(...WHITE);
  doc.text('TREATMENT COST ESTIMATE REPORT', W - M, 13, { align: 'right' });

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const reportId = 'HA-' + Math.random().toString(36).substr(2, 8).toUpperCase();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5); doc.setTextColor(180, 210, 255);
  doc.text(`Generated: ${dateStr}  ${timeStr}`, W - M, 21, { align: 'right' });
  doc.text(`Report ID: ${reportId}`, W - M, 27, { align: 'right' });
  y = 52;

  // ── Helper: section heading ─────────────────────────────────────────────────
  const heading = (num, title) => {
    chk(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5); doc.setTextColor(...BLUE);
    doc.text(`${num}. ${title}`, M, y);
    nl(4); line(y); nl(5);
  };

  // ── Helper: key-value row ───────────────────────────────────────────────────
  const kv = (label, value, yy) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5); doc.setTextColor(...MUTED);
    doc.text(label, M + 3, yy);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(...NAVY);
    doc.text(String(value || 'Not specified'), M + 55, yy);
  };

  // ── SECTION 1: Search Summary ───────────────────────────────────────────────
  heading('1', 'SEARCH SUMMARY');
  fill(M, y - 2, CW, 26, LIGHT); stroke(M, y - 2, CW, 26, BORDER);
  kv('Query:', searchQuery || 'Healthcare Search', y + 5);
  kv('Location:', searchLocation || 'India', y + 12);
  kv('Confidence:', `${Math.round((costData?.confidence || 0) * 100)}%`, y + 19);
  y += 32;

  // ── SECTION 2: Data Confidence ──────────────────────────────────────────────
  heading('2', 'DATA CONFIDENCE');
  const conf = costData?.confidence || 0;
  const confPct = Math.round(conf * 100);
  const confColor = conf >= 0.7 ? GREEN : conf >= 0.4 ? AMBER : RED;
  const confLabel = conf >= 0.7 ? 'HIGH CONFIDENCE' : conf >= 0.4 ? 'MODERATE CONFIDENCE' : 'LOW CONFIDENCE';
  const confDesc  = conf >= 0.7 ? 'Strong data coverage — estimates are reliable for planning.'
                  : conf >= 0.4 ? 'Moderate coverage — use as a planning range, verify with hospital.'
                  : 'Limited data — estimates may vary widely. Please verify costs directly.';

  fill(M, y - 2, CW, 24, LIGHT); stroke(M, y - 2, CW, 24, BORDER);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20); doc.setTextColor(...confColor);
  doc.text(`${confPct}%`, M + 10, y + 14);
  doc.setFontSize(9); doc.text(confLabel, M + 32, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  doc.text(confDesc, M + 32, y + 13);
  const sources = (costData?.dataSources || []).join(', ') || 'NHA package rates, CGHS 2022 benchmarks';
  doc.text(`Sources: ${sources}`, M + 32, y + 19);
  y += 32;

  // ── SECTION 3: Cost Breakdown ───────────────────────────────────────────────
  chk(80);
  heading('3', 'COMPONENT-LEVEL COST BREAKDOWN');

  // Table header
  fill(M, y - 1, CW, 9, NAVY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...WHITE);
  doc.text('Cost Component',          M + 3,   y + 6);
  doc.text('Minimum Estimate',        M + 95,  y + 6);
  doc.text('Maximum Estimate',        M + 135, y + 6);
  y += 11;

  const components = costData?.components || [];
  const totalMin   = costData?.totalMin ?? 0;
  const totalMax   = costData?.totalMax ?? 0;

  components.forEach((item, idx) => {
    chk(18);
    fill(M, y - 1, CW, 14, idx % 2 === 0 ? WHITE : LIGHT);
    stroke(M, y - 1, CW, 14, BORDER, 0.2);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
    const nm = (item.name || '').length > 38 ? (item.name || '').slice(0, 36) + '...' : (item.name || '');
    doc.text(nm, M + 3, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(...MUTED);
    doc.text(fmtINR(item.min), M + 95, y + 6);
    doc.setTextColor(...NAVY); doc.text(fmtINR(item.max), M + 135, y + 6);
    if (item.notes) {
      doc.setFontSize(6.5); doc.setTextColor(...MUTED);
      doc.text(item.notes.length > 65 ? item.notes.slice(0, 63) + '...' : item.notes, M + 3, y + 11);
    }
    y += 15;
  });

  // Total row
  chk(14);
  fill(M, y - 1, CW, 12, NAVY);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...WHITE);
  doc.text('TOTAL ESTIMATE', M + 3, y + 7);
  doc.text(fmtINR(totalMin), M + 95, y + 7);
  doc.text(fmtINR(totalMax), M + 135, y + 7);
  y += 14;

  // Range highlight box
  chk(14);
  fill(M, y - 1, CW, 12, [230, 244, 255]); stroke(M, y - 1, CW, 12, BLUE, 0.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.setTextColor(...BLUE);
  doc.text(`Estimated Total Range:  ${fmtINR(totalMin)}  to  ${fmtINR(totalMax)}`, M + 4, y + 7);
  y += 18;

  // ── SECTION 4: Risk Adjustments ─────────────────────────────────────────────
  const risks = costData?.riskFlags || [];
  if (risks.length) {
    chk(50);
    heading('4', 'RISK FLAGS & COST MODIFIERS');
    const rh = risks.length * 11 + 8;
    fill(M, y - 2, CW, rh, YELLOW); stroke(M, y - 2, CW, rh, [245, 158, 11], 0.4);
    risks.forEach(flag => {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(146, 64, 14);
      doc.text(`!  ${flag}`, M + 4, y + 5); y += 11;
    });
    y += 8;
  }

  // ── SECTION 5: PMJAY ────────────────────────────────────────────────────────
  if (costData?.pmjayEligible) {
    chk(38);
    const sec = risks.length ? '5' : '4';
    heading(sec, 'PMJAY / AYUSHMAN BHARAT COVERAGE');
    fill(M, y - 2, CW, 28, [224, 245, 243]); stroke(M, y - 2, CW, 28, TEAL, 0.5);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 122, 109);
    doc.text('You may be eligible for PMJAY coverage up to Rs. 5,00,000 per year.', M + 4, y + 7);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
    doc.text('Verify eligibility at pmjay.gov.in  |  Helpline: 14555 (toll-free)', M + 4, y + 14);
    doc.text('Carry Aadhaar + Ration Card to the hospital PMJAY desk.', M + 4, y + 20);
    y += 36;
  }

  // ── SECTION 6: Top Hospitals ─────────────────────────────────────────────────
  if (hospitals?.length) {
    chk(70);
    const secNum = 4 + (risks.length ? 1 : 0) + (costData?.pmjayEligible ? 1 : 0);
    heading(secNum, 'RECOMMENDED HOSPITALS');

    // Table header
    fill(M, y - 1, CW, 9, NAVY);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...WHITE);
    doc.text('Rank',           M + 2,   y + 6);
    doc.text('Hospital Name',  M + 16,  y + 6);
    doc.text('Type',           M + 95,  y + 6);
    doc.text('Score',          M + 120, y + 6);
    doc.text('Rating',         M + 143, y + 6);
    doc.text('PMJAY',          M + 163, y + 6);
    y += 11;

    hospitals.slice(0, 6).forEach((h, idx) => {
      chk(16);
      fill(M, y - 1, CW, 14, idx % 2 === 0 ? WHITE : LIGHT);
      stroke(M, y - 1, CW, 14, BORDER, 0.2);

      // Rank badge
      const rankColor = h.rank === 1 ? [245,158,11] : h.rank === 2 ? [148,163,184] : h.rank === 3 ? [180,83,9] : [107,114,128];
      fill(M + 1, y, 10, 11, rankColor);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...WHITE);
      doc.text(`#${h.rank}`, M + 2.5, y + 7.5);

      // Name & location
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NAVY);
      const hName = (h.name || '').length > 30 ? h.name.slice(0, 28) + '...' : h.name;
      doc.text(hName, M + 16, y + 5);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...MUTED);
      doc.text(`${h.city || ''}${h.distance != null ? '  ' + h.distance.toFixed(1) + ' km' : ''}`, M + 16, y + 11);

      // Type
      doc.setFontSize(7.5); doc.setTextColor(...NAVY);
      doc.text(h.type ? h.type.charAt(0).toUpperCase() + h.type.slice(1) : '', M + 95, y + 7);

      // Overall score
      if (h.scoreBreakdown?.overall) {
        doc.setFont('helvetica', 'bold'); doc.setTextColor(...BLUE);
        doc.text(`${Math.round(h.scoreBreakdown.overall)}/100`, M + 120, y + 7);
      }

      // Rating
      doc.setFont('helvetica', 'bold'); doc.setTextColor(180, 120, 0);
      doc.text(`${(h.rating || 0).toFixed(1)} *`, M + 143, y + 7);

      // PMJAY badge
      if (h.acceptsPMJAY) {
        fill(M + 162, y + 2, 22, 7, TEAL);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(6); doc.setTextColor(...WHITE);
        doc.text('PMJAY OK', M + 163, y + 7);
      }
      y += 15;
    });
    y += 4;
  }

  // ── SECTION: How to Use This Report ─────────────────────────────────────────
  chk(70);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...BLUE);
  doc.text('HOW TO USE THIS REPORT', M, y); nl(4); line(y); nl(5);

  const steps = [
    'Call the hospital billing department and ask for a tariff card for your specific procedure.',
    'Ask about: surgeon fees, OT charges, room rent per day, ICU charges, and implant costs.',
    'Check if your health insurance covers this procedure and confirm the co-payment amount.',
    'If PMJAY eligible, visit the hospital PMJAY desk with your Aadhaar card and ration card.',
    'Ask your doctor about generic medicine alternatives to reduce post-surgery costs by 60-80%.',
    'Get written cost estimates from at least 2-3 hospitals before making a decision.',
  ];

  steps.forEach((text, i) => {
    chk(14);
    fill(M, y - 1, 9, 9, BLUE);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
    doc.text(String(i + 1), M + 3, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(text, CW - 14);
    doc.text(lines, M + 13, y + 6);
    y += lines.length * 5.5 + 5;
  });

  // ── Important Disclaimer box ─────────────────────────────────────────────────
  chk(28);
  nl(4);
  fill(M, y - 2, CW, 22, YELLOW); stroke(M, y - 2, CW, 22, [245, 158, 11], 0.5);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(146, 64, 14);
  doc.text('IMPORTANT DISCLAIMER', M + 4, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
  const disc = 'This report is for planning purposes only and is NOT a financial guarantee or medical advice. ' +
    'Actual costs may differ based on your specific condition, complications, and hospital policies. ' +
    'Always verify costs directly with the hospital before proceeding. In emergencies, call 112.';
  const discLines = doc.splitTextToSize(disc, CW - 8);
  doc.text(discLines, M + 4, y + 11);
  y += 28;

  // ── Footer on every page ─────────────────────────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    fill(0, H - 16, W, 16, NAVY);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(...WHITE);
    doc.text('HealthAssist Healthcare Navigator', M, H - 8);
    doc.setFont('helvetica', 'normal'); doc.setTextColor(150, 175, 200);
    doc.text(`Page ${pg} of ${totalPages}`, W / 2, H - 8, { align: 'center' });
    doc.text(`Generated ${dateStr}  |  ${reportId}`, W - M, H - 8, { align: 'right' });
  }

  const fname = `HealthAssist_CostReport_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.pdf`;
  doc.save(fname);
  return fname;
}

/** Format amount as Indian currency string using "Rs." prefix (safe for jsPDF helvetica). */
function fmtINR(amount) {
  if (amount == null || isNaN(amount)) return '---';
  if (amount >= 10_000_000) return `Rs. ${(amount / 10_000_000).toFixed(2)} Cr`;
  if (amount >= 100_000)    return `Rs. ${(amount / 100_000).toFixed(2)} L`;
  if (amount >= 1_000)      return `Rs. ${(amount / 1_000).toFixed(1)} K`;
  return `Rs. ${amount}`;
}
