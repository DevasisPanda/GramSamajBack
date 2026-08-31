/**
 * Standard Formatters Utility Module
 * Unified helpers for formatting currency, dates, phone numbers, and masking PII.
 */

/**
 * Format numbers as Indian Rupee currency string (e.g. ₹5,100)
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") return "₹0";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format Date to readable string (e.g. 26 Jul 2026)
 */
export function formatDate(dateVal: Date | string | number | null | undefined): string {
  if (!dateVal) return "N/A";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "N/A";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Format Date for HTML <input type="date"> (e.g. YYYY-MM-DD)
 */
export function formatDateForInput(dateVal: Date | string | number | null | undefined): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
}

/**
 * Format 10-digit phone number as +91 XXXXX XXXXX
 */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "N/A";
  const clean = phone.replace(/\D/g, "");
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
}

/**
 * Mask Aadhar Number for secure display (e.g. XXXX-XXXX-1234)
 */
export function maskAadhar(aadhar: string | null | undefined): string {
  if (!aadhar) return "N/A";
  const clean = aadhar.replace(/\D/g, "");
  if (clean.length === 12) {
    return `XXXX-XXXX-${clean.slice(8)}`;
  }
  return aadhar;
}
