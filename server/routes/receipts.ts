import { Router, Request, Response } from "express";
import { getDb } from "../db";
import { donations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { generateReceiptPDF, buildReceiptFieldValues } from "../services/receipt";

export const receiptRouter = Router();

receiptRouter.get("/download/:receiptNumber.pdf", async (req: Request, res: Response): Promise<void> => {
  try {
    const { receiptNumber } = req.params;
    if (!receiptNumber) {
      res.status(400).send("Receipt number is required");
      return;
    }

    const db = await getDb();
    if (!db) {
      res.status(500).send("Database unavailable");
      return;
    }

    const [donation] = await db
      .select()
      .from(donations)
      .where(eq(donations.receiptNumber, receiptNumber))
      .limit(1);

    if (!donation) {
      res.status(404).send("Receipt not found");
      return;
    }

    const fieldValues = buildReceiptFieldValues({
      donationId: donation.id,
      receiptNumber: donation.receiptNumber || "",
      donorName: donation.donorName || "Anonymous",
      donorEmail: donation.donorEmail || "",
      donorPhone: donation.donorPhone || "",
      amount: donation.amount.toString(),
      purpose: donation.purpose || "General Donation",
      paymentMethod: donation.paymentMethod || donation.donationType || "ONLINE",
      transactionId: donation.transactionId || donation.receiptNumber || "",
      createdAt: donation.createdAt,
    });

    const pdfBuffer = await generateReceiptPDF(fieldValues);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="Donation_Receipt_${receiptNumber}.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error("[Receipt Download] Error:", error.message);
    res.status(500).send("Failed to generate receipt PDF");
  }
});
