import { jsPDF } from "jspdf";
import fs from "fs";
import path from "path";
import QRCode from "qrcode";
import { sendWhatsAppMedia } from "./whatsapp";
import { sendDonationReceiptEmail } from "./email";

interface FieldSpec {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  weight: "normal" | "bold";
  align: "left" | "center" | "right";
}

export const DEFAULT_FIELDS: FieldSpec[] = [
  { id: "receiptNumber", label: "Receipt No.", text: "", x: 208, y: 224, size: 18, color: "#1e293b", weight: "bold", align: "left" },
  { id: "date", label: "Date", text: "", x: 706, y: 224, size: 18, color: "#1e293b", weight: "bold", align: "right" },
  { id: "donorName", label: "Donor Name", text: "", x: 217, y: 384, size: 22, color: "#1e293b", weight: "bold", align: "left" },
  { id: "amount", label: "Amount", text: "", x: 217, y: 563, size: 24, color: "#115e59", weight: "bold", align: "left" },
  { id: "purpose", label: "Purpose", text: "", x: 217, y: 723, size: 20, color: "#1e293b", weight: "bold", align: "left" },
  { id: "paymentMethod", label: "Payment Method", text: "", x: 217, y: 795, size: 18, color: "#1e293b", weight: "bold", align: "left" },
  { id: "transactionId", label: "Transaction ID", text: "", x: 217, y: 865, size: 18, color: "#1e293b", weight: "bold", align: "left" },
];

function numberToWords(num: number): string {
  if (num === 0) return "Zero";
  
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  
  let str = '';
  str += (Number(n[1]) != 0) ? (a[Number(n[1])] || b[n[1][0] as any] + ' ' + a[n[1][1] as any]) + 'Crore ' : '';
  str += (Number(n[2]) != 0) ? (a[Number(n[2])] || b[n[2][0] as any] + ' ' + a[n[2][1] as any]) + 'Lakh ' : '';
  str += (Number(n[3]) != 0) ? (a[Number(n[3])] || b[n[3][0] as any] + ' ' + a[n[3][1] as any]) + 'Thousand ' : '';
  str += (Number(n[4]) != 0) ? (a[Number(n[4])] || b[n[4][0] as any] + ' ' + a[n[4][1] as any]) + 'Hundred ' : '';
  str += (Number(n[5]) != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0] as any] + ' ' + a[n[5][1] as any]) : '';
  
  return str.trim() + " Rupees Only";
}

export function drawRupeeText(pdf: jsPDF, text: string, x: number, y: number, fontSize: number = 12) {
  pdf.setFontSize(fontSize);
  if (text.includes("₹")) {
    const parts = text.split("₹");
    let curX = x;
    for (let i = 0; i < parts.length; i++) {
      if (i > 0) {
        // Draw the crisp Indian Rupee (₹) vector glyph
        const scale = fontSize / 12;
        const glyphW = 3.6 * scale;
        const topY = y - 3.6 * scale;
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.48 * scale);
        // Top horizontal bar
        pdf.line(curX, topY, curX + glyphW, topY);
        // Second horizontal bar (crossbar)
        pdf.line(curX, topY + 1.2 * scale, curX + glyphW, topY + 1.2 * scale);
        // Vertical stem
        pdf.line(curX + 0.6 * scale, topY, curX + 0.6 * scale, topY + 2.3 * scale);
        // Upper loop
        pdf.line(curX + 0.6 * scale, topY + 2.3 * scale, curX + 2.4 * scale, topY + 2.3 * scale);
        pdf.line(curX + 2.4 * scale, topY, curX + 2.4 * scale, topY + 2.3 * scale);
        // Slanted leg
        pdf.line(curX + 1.2 * scale, topY + 2.3 * scale, curX + 3.4 * scale, y + 0.2 * scale);
        curX += glyphW + 1.5 * scale;
      }
      if (parts[i]) {
        pdf.text(parts[i], curX, y);
        curX += pdf.getTextWidth(parts[i]);
      }
    }
  } else {
    pdf.text(text, x, y);
  }
}

export async function generateReceiptPDF(fieldValues: Record<string, string>): Promise<Buffer> {
  const pdf = new jsPDF("p", "mm", "a4");

  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN_X = 5;
  const MARGIN_Y = 5;
  const CONTENT_W = PAGE_W - (2 * MARGIN_X);
  const CONTENT_H = PAGE_H - (2 * MARGIN_Y);

  // Outer 5px Orange Frame (Matches HTML)
  pdf.setDrawColor(230, 92, 0); // #e65c00
  pdf.setLineWidth(1.8);
  pdf.rect(MARGIN_X, MARGIN_Y, CONTENT_W, CONTENT_H);

  let currentY = MARGIN_Y;

  // 1. TOP BAR (Height: 12mm)
  const topBarH = 12;
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, currentY + topBarH, MARGIN_X + CONTENT_W, currentY + topBarH);

  // PAN text (Blue #000080)
  pdf.setTextColor(0, 0, 128);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("PAN - AADTV2345L", MARGIN_X + 5, currentY + 8);

  // Title (DONATION RECEIPT - Black Bold Underlined)
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  const titleText = "DONATION RECEIPT";
  pdf.text(titleText, PAGE_W / 2, currentY + 8, { align: "center" });
  const titleWidth = pdf.getTextWidth(titleText);
  pdf.setLineWidth(0.6);
  pdf.line(PAGE_W / 2 - titleWidth / 2, currentY + 9.6, PAGE_W / 2 + titleWidth / 2, currentY + 9.6);

  // TAN / PAN text (Blue #000080)
  pdf.setTextColor(0, 0, 128);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("PAN: AAHTA8244M", MARGIN_X + CONTENT_W - 5, currentY + 8, { align: "right" });

  currentY += topBarH;

  // 2. HEADER AREA (Height: 52mm)
  const headerH = 52;
  // Trust Logo
  try {
    const possibleLogoPaths = [
      path.join(process.cwd(), "public/logo.jpg"),
      path.join(process.cwd(), "../Frontend/public/logo.png"),
      path.join(process.cwd(), "../Frontend/public/logo.jpg"),
    ];
    for (const logoPath of possibleLogoPaths) {
      if (fs.existsSync(logoPath)) {
        const logoBuffer = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/jpeg;base64,${logoBuffer.toString("base64")}`;
        pdf.addImage(logoBase64, "JPEG", MARGIN_X + 4, currentY + 4, 28, 28);
        break;
      }
    }
  } catch (err) {
    console.error("Logo embedding error:", err);
  }

  // QR Code
  try {
    const qrDataUrl = await QRCode.toDataURL("https://airdup.com", {
      margin: 1,
      width: 280,
    });
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.rect(MARGIN_X + CONTENT_W - 30, currentY + 3.5, 26, 26);
    pdf.addImage(qrDataUrl, "PNG", MARGIN_X + CONTENT_W - 29.5, currentY + 4, 25, 25);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(0, 0, 0);
    pdf.text("Scan to Verify", MARGIN_X + CONTENT_W - 17, currentY + 33, { align: "center" });
  } catch (err) {
    console.error("QR embedding error:", err);
  }

  // Trust Name (Large Dark Red #D03B0D)
  pdf.setTextColor(208, 59, 13);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("Appropriate Institute of Rural Development", PAGE_W / 2, currentY + 8.5, { align: "center" });

  // Registration & Est Dt (Black bold)
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("AIRD Trust | Reg. No. 9002139 IV-66/2020", PAGE_W / 2, currentY + 15, { align: "center" });

  // Website (Black bold)
  pdf.setFontSize(11);
  pdf.text("Website: https://airdup.com", PAGE_W / 2, currentY + 21, { align: "center" });

  // Managing Trustee Contact
  pdf.setTextColor(185, 28, 28);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.text("Managing Trustee: K. C. Tripathi | Contact: +91 94150 12543", PAGE_W / 2, currentY + 27, { align: "center" });

  // Email (Black bold)
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.text("aird.up.india@gmail.com", PAGE_W / 2, currentY + 33, { align: "center" });

  // Address line (Black bold)
  pdf.setFontSize(10.5);
  pdf.text("46-A, Nai Basti Babu Ganj, Lucknow, Uttar Pradesh – 226020", PAGE_W / 2, currentY + 41, { align: "center" });

  // Bank line
  pdf.setTextColor(192, 38, 211);
  pdf.setFontSize(10.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("AIRD Trust • Rural Development & Gram Swaraj Initiative", PAGE_W / 2, currentY + 47.5, { align: "center" });

  currentY += headerH;

  // Header bottom border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.line(MARGIN_X, currentY, MARGIN_X + CONTENT_W, currentY);

  // 3. REGISTRATION 2-COLUMN SECTION (Height: 26mm)
  const regHeight = 26;
  pdf.line(MARGIN_X + CONTENT_W / 2, currentY, MARGIN_X + CONTENT_W / 2, currentY + regHeight);
  pdf.line(MARGIN_X, currentY + regHeight, MARGIN_X + CONTENT_W, currentY + regHeight);

  // Left Box (12AB)
  pdf.setTextColor(30, 64, 175); // Blue
  pdf.setFontSize(12.5);
  pdf.setFont("helvetica", "bold");
  pdf.text("12AB (1) (b)  U R N", MARGIN_X + CONTENT_W / 4, currentY + 6, { align: "center" });
  pdf.setTextColor(220, 38, 38); // Red
  pdf.text("AADTV2345L24AD01", MARGIN_X + CONTENT_W / 4, currentY + 11.5, { align: "center" });
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11);
  pdf.text("21/05/2025 From", MARGIN_X + CONTENT_W / 4, currentY + 17.5, { align: "center" });
  pdf.text("AY 2024-25 to AY 2028-29", MARGIN_X + CONTENT_W / 4, currentY + 23, { align: "center" });

  // Right Box (80G)
  pdf.setTextColor(30, 64, 175);
  pdf.setFontSize(12);
  pdf.text("80G U R N", MARGIN_X + (CONTENT_W * 3) / 4 - 38, currentY + 6);
  pdf.setTextColor(220, 38, 38);
  pdf.text("AADTV2345L25AD01", MARGIN_X + (CONTENT_W * 3) / 4 - 10, currentY + 6);
  pdf.setTextColor(0, 0, 0);
  pdf.text("17/02/2026", MARGIN_X + (CONTENT_W * 3) / 4 + 28, currentY + 6);
  pdf.setFontSize(11);
  pdf.text("From AY 2026 - 2027 To AY 2030 - 2031", MARGIN_X + (CONTENT_W * 3) / 4, currentY + 11.5, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.text("Clause (ii) of 2nd Proviso to", MARGIN_X + (CONTENT_W * 3) / 4, currentY + 17.5, { align: "center" });
  pdf.setFont("helvetica", "bold");
  pdf.text("section 80 G (5) of the Income Tax Act,1961", MARGIN_X + (CONTENT_W * 3) / 4, currentY + 23, { align: "center" });

  currentY += regHeight;

  // 4. CSR BANNER (Height: 9mm)
  const csrHeight = 9;
  pdf.line(MARGIN_X, currentY + csrHeight, MARGIN_X + CONTENT_W, currentY + csrHeight);
  pdf.setFontSize(11.5);
  pdf.setTextColor(234, 88, 12); // Orange/Red #EA580C
  pdf.setFont("helvetica", "bold");
  pdf.text("CORPORATE SOCIAL RESPONSIBILITY", MARGIN_X + 15, currentY + 6.2);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.text("activities and Registration Number", MARGIN_X + 96, currentY + 6.2);
  pdf.setTextColor(234, 88, 12);
  pdf.setFont("helvetica", "bold");
  pdf.text("CSR00072060", MARGIN_X + 160, currentY + 6.2);

  currentY += csrHeight;

  // 5. NGO DARPAN LINE (Height: 9mm)
  const darpanHeight = 9;
  pdf.line(MARGIN_X, currentY + darpanHeight, MARGIN_X + CONTENT_W, currentY + darpanHeight);
  pdf.setFontSize(13);
  pdf.setTextColor(185, 28, 28); // #B91C1C
  pdf.setFont("helvetica", "bold");
  pdf.text("NGO Darpan  (Niti Aayog)  ID:  UP / 2022 / 0303967", PAGE_W / 2, currentY + 6.5, { align: "center" });

  currentY += darpanHeight;

  // 6. MAIN TABLE FORM
  const rowH = 11.5;
  const labelColW = 58;

  const drawRow = (h: number = rowH) => {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN_X, currentY + h, MARGIN_X + CONTENT_W, currentY + h);
  };

  // Row 1: Date | Receipt Number
  pdf.line(MARGIN_X + CONTENT_W / 2, currentY, MARGIN_X + CONTENT_W / 2, currentY + rowH);
  pdf.setFontSize(11.5);
  pdf.setTextColor(0, 0, 0);
  pdf.setFont("helvetica", "normal");
  pdf.text("Donation Receipt Date :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.date || "", MARGIN_X + 54, currentY + 7.8);

  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Receipt Number :", MARGIN_X + CONTENT_W / 2 + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.receiptNumber || "", MARGIN_X + CONTENT_W / 2 + 42, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 2: UNIQUE IDENTIFICATION NUMBER OF DONOR
  pdf.setTextColor(234, 88, 12);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("UNIQUE IDENTIFICATION NUMBER OF DONOR", PAGE_W / 2, currentY + 7.8, { align: "center" });
  drawRow(rowH);
  currentY += rowH;

  // Row 3: PAN | Mobile
  pdf.line(MARGIN_X + CONTENT_W / 2, currentY, MARGIN_X + CONTENT_W / 2, currentY + rowH);
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("PAN :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.donorPan || "", MARGIN_X + 24, currentY + 7.8);

  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Mobile +91 :", MARGIN_X + CONTENT_W / 2 + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.donorPhone?.replace('+91', '').trim() || "", MARGIN_X + CONTENT_W / 2 + 32, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 4: Name of Donor
  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Name of Donor :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.donorName || "", MARGIN_X + labelColW, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 5: Address of Donor
  const addrH = 15;
  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Address of Donor :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  const splitAddr = pdf.splitTextToSize(fieldValues.donorAddress || "", CONTENT_W - labelColW - 6);
  pdf.text(splitAddr, MARGIN_X + labelColW, currentY + 7.8);
  drawRow(addrH);
  currentY += addrH;

  // Row 6: Pin Code (Boxes)
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "bold");
  pdf.text("Pin Code :", MARGIN_X + CONTENT_W - 68, currentY + 8);
  const pin = (fieldValues.pinCode || "      ").padEnd(6, ' ').slice(0, 6);
  const pinStartX = MARGIN_X + CONTENT_W - 44;
  for (let i = 0; i < 6; i++) {
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.4);
    pdf.rect(pinStartX + (i * 7.2), currentY + 2.2, 6.8, 6.8);
    pdf.setFontSize(13);
    pdf.text(pin[i] === ' ' ? '' : pin[i], pinStartX + (i * 7.2) + 2.2, currentY + 7.4);
  }
  drawRow(rowH);
  currentY += rowH;

  // Row 7: E-Mail Id
  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("E-Mail Id :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.donorEmail || "", MARGIN_X + labelColW, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 8: Amount of Donation (Using Rs. format)
  pdf.setFontSize(12);
  pdf.setFont("helvetica", "normal");
  pdf.text("Amount of Donation :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  const formattedAmount = (fieldValues.amount || "").replace(/₹/g, "Rs. ");
  pdf.text(formattedAmount, MARGIN_X + labelColW, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 9: Mode of Donation
  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Mode of Donation :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12.5);
  pdf.text(fieldValues.modeOfDonation || "", MARGIN_X + labelColW, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 10: Amount Donation in Words
  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Amount Donation in Words :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(fieldValues.amountInWords || "", MARGIN_X + labelColW + 16, currentY + 7.8);
  drawRow(rowH);
  currentY += rowH;

  // Row 11: Purpose & Signature (Height: 28mm)
  const sigRowH = 28;
  pdf.line(MARGIN_X + CONTENT_W * 0.58, currentY, MARGIN_X + CONTENT_W * 0.58, currentY + sigRowH);

  pdf.setFontSize(11.5);
  pdf.setFont("helvetica", "normal");
  pdf.text("Purpose of Donation :", MARGIN_X + 4, currentY + 7.8);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  const splitPurpose = pdf.splitTextToSize(fieldValues.purpose || "", CONTENT_W * 0.58 - 8);
  pdf.text(splitPurpose, MARGIN_X + 4, currentY + 15);

  // Signature side
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(30, 58, 138); // Blue signature text
  pdf.setFontSize(18);
  pdf.text("Narayan Rathod", MARGIN_X + (CONTENT_W * 0.79), currentY + 15, { align: "center" });

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(11.5);
  pdf.setTextColor(185, 28, 28); // #b91c1c
  pdf.text("President/Founder(Narayan Rathod)", MARGIN_X + (CONTENT_W * 0.79), currentY + 23, { align: "center" });

  drawRow(sigRowH);
  currentY += sigRowH;

  // 7. FOOTER SECTION
  currentY += 4;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10.5);

  // Line 1
  pdf.setTextColor(30, 64, 175);
  pdf.text(">", MARGIN_X + 4, currentY + 4);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Your Donation is Tax Exempted Under Section 80G (5) which Donation is eligible for Deduction.", MARGIN_X + 9, currentY + 4);

  // Line 2
  currentY += 7;
  pdf.setTextColor(30, 64, 175);
  pdf.text(">", MARGIN_X + 4, currentY + 4);
  pdf.setTextColor(0, 0, 0);
  pdf.text("All Disputes Regarding Donation Receipts Subject to Mosasa, State Gujrat Jurisdiction only.", MARGIN_X + 9, currentY + 4);

  // Line 3
  currentY += 7;
  pdf.setTextColor(30, 64, 175);
  pdf.text(">", MARGIN_X + 4, currentY + 4);
  pdf.setTextColor(0, 0, 0);
  pdf.text("Cheque or DD is Subject to Realisation. ", MARGIN_X + 9, currentY + 4);
  const offsetW = pdf.getTextWidth("Cheque or DD is Subject to Realisation. ");
  pdf.setTextColor(30, 64, 175);
  pdf.text("Thank you so much for your Generous Support.", MARGIN_X + 9 + offsetW, currentY + 4);

  return Buffer.from(pdf.output("arraybuffer"));
}

export interface DonationReceiptData {
  donationId: number;
  receiptNumber: string;
  donorName: string;
  donorEmail: string;
  donorPhone: string;
  donorPan?: string;
  donorAddress?: string;
  pinCode?: string;
  amount: string;
  purpose: string;
  paymentMethod: string;
  transactionId: string;
  createdAt: Date | string;
}

export function buildReceiptFieldValues(data: DonationReceiptData): Record<string, string> {
  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");

  const amountNum = parseFloat(data.amount) || 0;
  
  let mode = "Online";
  if (data.paymentMethod) {
    const pm = data.paymentMethod.toLowerCase();
    if (pm === "cash") mode = "Cash";
    else if (pm === "cheque") mode = "Cheque";
    else if (pm === "dd") mode = "DD";
  }

  return {
    receiptNumber: data.receiptNumber || "N/A",
    date,
    donorName: data.donorName || "Anonymous Donor",
    donorEmail: data.donorEmail || "",
    donorPhone: data.donorPhone || "",
    donorPan: data.donorPan || "",
    donorAddress: data.donorAddress || "",
    pinCode: data.pinCode || "",
    amount: `Rs. ${amountNum.toFixed(2)}`,
    amountInWords: numberToWords(Math.floor(amountNum)),
    purpose: data.purpose || "General Donation",
    modeOfDonation: mode,
    transactionId: data.transactionId || data.receiptNumber,
  };
}

export async function deliverReceiptViaWhatsApp(
  data: DonationReceiptData,
  pdfUrl: string
): Promise<{ success: boolean; error?: string }> {
  if (!data.donorPhone || data.donorPhone.length < 10) {
    console.log(`[Receipt] Skipping WhatsApp: no valid phone for donation ${data.receiptNumber}`);
    return { success: false, error: "no_phone" };
  }

  const caption =
    `*Appropriate Institute of Rural Development (AIRD Trust)*\n` +
    `*OFFICIAL DONATION RECEIPT*\n\n` +
    `Dear *${data.donorName || "Donor"}*,\n` +
    `Thank you for your generous contribution of *Rs. ${parseFloat(data.amount).toFixed(2)}* to AIRD Trust for Gram Swaraj initiatives!\n\n` +
    `📄 *Receipt No*: ${data.receiptNumber}\n` +
    `💳 *Payment ID*: ${data.transactionId || "N/A"}\n` +
    `💰 *Amount*: Rs. ${parseFloat(data.amount).toFixed(2)}\n` +
    `📌 *Purpose*: ${data.purpose || "General Donation"}\n` +
    `📅 *Date*: ${new Date(data.createdAt).toLocaleDateString("en-GB")}\n` +
    `🏛 *AIRD Trust Reg. No*: 9002139 IV-66/2020\n\n` +
    `Your official donation receipt is attached below.`;

  try {
    return await sendWhatsAppMedia(
      data.donorPhone,
      caption,
      pdfUrl,
      `Donation_Receipt_${data.receiptNumber}.pdf`
    );
  } catch (err: any) {
    console.error(`[Receipt] WhatsApp delivery failed:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function deliverReceiptViaEmail(
  data: DonationReceiptData,
  pdfUrl?: string
): Promise<{ success: boolean; error?: string }> {
  if (!data.donorEmail || !data.donorEmail.includes("@")) {
    console.log(`[Receipt] Skipping Email: no valid email for donation ${data.receiptNumber}`);
    return { success: false, error: "no_email" };
  }

  try {
    let pdfBuffer: Buffer | undefined;
    try {
      const fieldValues = buildReceiptFieldValues(data);
      pdfBuffer = await generateReceiptPDF(fieldValues);
    } catch (pdfErr) {
      console.warn(`[Receipt] Direct PDF buffer generation failed, falling back to pdfUrl:`, pdfErr);
    }

    return await sendDonationReceiptEmail(data, pdfBuffer || pdfUrl);
  } catch (err: any) {
    console.error(`[Receipt] Email delivery failed:`, err.message);
    return { success: false, error: err.message };
  }
}
