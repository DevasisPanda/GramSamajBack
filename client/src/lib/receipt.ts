import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface ReceiptData {
  receiptNumber: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  donationType: string;
  purpose?: string;
  date: Date;
  paymentStatus: string;
}

export async function generateDonationReceiptPDF(data: ReceiptData): Promise<void> {
  try {
    // Directly trigger the server's vector PDF download
    const url = `/api/receipts/download/${data.receiptNumber}.pdf`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `Donation_Receipt_${data.receiptNumber}.pdf`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Error downloading PDF receipt:", error);
    throw error;
  }
}

export async function generateReceiptFromHTML(elementId: string, filename: string): Promise<void> {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id ${elementId} not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? "landscape" : "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = pdf.internal.pageSize.getWidth();
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    pdf.save(filename);
  } catch (error) {
    console.error("Error generating PDF from HTML:", error);
    throw error;
  }
}
