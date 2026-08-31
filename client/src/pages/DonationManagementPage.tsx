import { useRef, useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import { CaptureActions } from "@/components/CaptureActions";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileText, QrCode, Trash2, Edit, Download, Image as ImageIcon, Calendar, Search, Check, Loader2, XCircle, PlusCircle, Info, Send, Mail } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VerifiableDocument } from "@/components/VerifiableDocument";
import { DonationReceiptHTML } from "@/components/DonationReceiptHTML";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLocation } from "wouter";

export default function DonationManagementPage() {
  const { user } = useAuth();
  const receiptRef = useRef<HTMLDivElement>(null);

  const { initiatePayment, isProcessing } = useRazorpayPayment();
  const utils = trpc.useUtils();

  // Create Donation Form State
  const [amount, setAmount] = useState("");
  const [donationType, setDonationType] = useState("online");
  const [purpose, setPurpose] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentProof, setPaymentProof] = useState("");
  const [createdAt, setCreatedAt] = useState("");

  // Admin Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");


  // Edit Donation Dialog State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDonation, setEditingDonation] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    amount: "",
    donationType: "online",
    paymentStatus: "pending",
    purpose: "",
    notes: "",
    paymentProof: "",
    transactionId: "",
    createdAt: "",
  });

  // Preview Modals State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptDonation, setSelectedReceiptDonation] = useState<any>(null);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Queries
  const { data: myDonationsData } = trpc.donation.getMyDonations.useQuery({ page: 1, pageSize: 1000 });
  const { data: allDonationsData, isLoading: isAllLoading } = trpc.donation.getAll.useQuery({ page: 1, pageSize: 1000 }, { enabled: user?.role === "admin" });
  const { data: stats } = trpc.donation.getStats.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: dbTemplates } = trpc.document.getTemplateConfigs.useQuery();
  const { data: receiptDetails, isLoading: isReceiptLoading } = trpc.donation.getDonationReceiptDetails.useQuery(
    { donationId: selectedReceiptDonation?.id },
    { enabled: !!selectedReceiptDonation?.id }
  );

  // Mutations
  const createDonationMutation = trpc.donation.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Donation recorded! Receipt: ${data.receiptNumber}`);
      setAmount("");
      setPurpose("");
      setDonationType("online");
      setDonorName("");
      setDonorEmail("");
      setDonorPhone("");
      setTransactionId("");
      setNotes("");
      setPaymentProof("");
      setCreatedAt("");
      utils.donation.getMyDonations.invalidate();
      if (user?.role === "admin") {
        utils.donation.getAll.invalidate();
        utils.donation.getStats.invalidate();
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateDonationMutation = trpc.donation.update.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsEditOpen(false);
      setEditingDonation(null);
      utils.donation.getAll.invalidate();
      utils.donation.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update donation");
    },
  });

  const deleteDonationMutation = trpc.donation.delete.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.donation.getAll.invalidate();
      utils.donation.getStats.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete donation");
    },
  });

  const resendReceiptMutation = trpc.donation.resendReceiptNotification.useMutation({
    onSuccess: (data: any) => {
      const wStatus = data.results?.whatsapp?.success ? "✓ WhatsApp sent" : "WhatsApp skipped";
      const eStatus = data.results?.email?.success ? "✓ Email sent" : "Email skipped";
      toast.success(`Receipt resent! ${wStatus}, ${eStatus}`);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to resend receipt");
    },
  });



  const handleDonate = () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (donationType === "check") {
      if (!transactionId.trim()) {
        toast.error("Cheque Number is required for cheque payments");
        return;
      }
      if (!paymentProof) {
        toast.error("Cheque Photo is required for cheque payments");
        return;
      }
    }

    // Member online donations go through Razorpay
    if (user?.role !== "admin" && donationType === "online") {
      initiatePayment({
        amount: parseFloat(amount),
        donorName: donorName || user?.name || "Member",
        donorEmail: donorEmail || user?.email || "",
        donorPhone: donorPhone || undefined,
        purpose: purpose || undefined,
        onSuccess: () => {
          utils.donation.getMyDonations.invalidate();
        },
      });
      return;
    }

    createDonationMutation.mutate({
      amount: parseFloat(amount),
      donationType: donationType as "online" | "cash" | "check" | "transfer",
      purpose: purpose || undefined,
      donorName: donorName || undefined,
      donorEmail: donorEmail || undefined,
      donorPhone: donorPhone || undefined,
      transactionId: transactionId || undefined,
      notes: notes || undefined,
      paymentProof: paymentProof || undefined,
      createdAt: createdAt ? new Date(createdAt).toISOString() : undefined,
    });
  };

  const handleStartEdit = (donation: any) => {
    setEditingDonation(donation);
    setEditForm({
      donorName: donation.donorName || "",
      donorEmail: donation.donorEmail || "",
      donorPhone: donation.donorPhone || "",
      amount: donation.amount,
      donationType: donation.donationType,
      paymentStatus: donation.paymentStatus,
      purpose: donation.purpose || "",
      notes: donation.notes || "",
      paymentProof: donation.paymentProof || "",
      transactionId: donation.transactionId || "",
      createdAt: donation.createdAt ? format(new Date(donation.createdAt), "yyyy-MM-dd") : "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    updateDonationMutation.mutate({
      id: editingDonation.id,
      donorName: editForm.donorName || undefined,
      donorEmail: editForm.donorEmail || undefined,
      donorPhone: editForm.donorPhone || undefined,
      amount: parseFloat(editForm.amount),
      donationType: editForm.donationType as any,
      paymentStatus: editForm.paymentStatus as any,
      purpose: editForm.purpose || undefined,
      notes: editForm.notes || undefined,
      paymentProof: editForm.paymentProof || undefined,
      transactionId: editForm.transactionId || undefined,
      createdAt: editForm.createdAt ? new Date(editForm.createdAt).toISOString() : undefined,
    });
  };

  const handleDeleteDonation = (id: number) => {
    if (window.confirm("Are you sure you want to delete this donation entry? This will remove the receipt immediately.")) {
      deleteDonationMutation.mutate({ id });
    }
  };

  // Filter calculations for admin list
  const filteredDonations = allDonationsData?.items?.filter((donation) => {
    const searchString = `${donation.donorName || ""} ${donation.donorEmail || ""} ${donation.receiptNumber || ""} ${donation.purpose || ""}`.toLowerCase();
    const matchSearch = searchString.includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    const date = new Date(donation.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (date < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
    return true;
  });

  const totalFilteredAmount = filteredDonations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) ?? 0;



  const handleExportCSV = () => {
    if (!filteredDonations || filteredDonations.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "ID", "Date", "Receipt Number", "Donor Name", "Donor Email", "Donor Phone",
      "Amount (INR)", "Payment Mode", "Status", "Purpose", "Cheque/Trans ID", "Notes", "Proof Link"
    ];
    const rows = filteredDonations.map((d) => [
      d.id,
      format(new Date(d.createdAt), "yyyy-MM-dd"),
      d.receiptNumber || "N/A",
      d.donorName || "Anonymous",
      d.donorEmail || "N/A",
      d.donorPhone || "N/A",
      d.amount,
      d.donationType,
      d.paymentStatus,
      d.purpose || "None",
      d.transactionId || "None",
      d.notes || "None",
      d.paymentProof || "None"
    ]);

    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `donations_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Donations report exported successfully");
  };

  const handleExportExcel = () => {
    if (!filteredDonations || filteredDonations.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = [
      "ID", "Date", "Receipt Number", "Donor Name", "Donor Email", "Donor Phone",
      "Amount (INR)", "Payment Mode", "Status", "Purpose", "Cheque/Trans ID", "Notes"
    ];
    const rows = filteredDonations.map((d) => [
      d.id,
      format(new Date(d.createdAt), "yyyy-MM-dd"),
      d.receiptNumber || "N/A",
      d.donorName || "Anonymous",
      d.donorEmail || "N/A",
      d.donorPhone || "N/A",
      d.amount,
      d.donationType,
      d.paymentStatus,
      d.purpose || "None",
      d.transactionId || "None",
      d.notes || "None"
    ]);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Donations Report</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          table { border-collapse: collapse; }
          th { background-color: #0d9488; color: white; font-weight: bold; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              \${headers.map(h => \`<th>\${h}</th>\`).join("")}
            </tr>
          </thead>
          <tbody>
            \${rows.map(r => \`<tr>\${r.map(val => \`<td>\${val}</td>\`).join("")}</tr>\`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `donations_report_${format(new Date(), "yyyy-MM-dd")}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Donations report exported to Excel successfully");
  };

  const handleExportPDF = () => {
    if (!filteredDonations || filteredDonations.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(21, 128, 61); // forest-700
    doc.text("Appropriate Institute of Rural Development", 14, 20);
    
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text("Donations Report", 14, 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: \${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 34);
    doc.text(`Total Records: \${filteredDonations.length}`, 14, 39);
    doc.text(`Total Amount: INR \${filteredDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0).toLocaleString("en-IN")}`, 14, 44);
    
    // Draw table
    let y = 52;
    doc.setFillColor(13, 148, 136); // teal-600
    doc.rect(14, y, 182, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Date", 16, y + 5.5);
    doc.text("Donor", 45, y + 5.5);
    doc.text("Mode", 95, y + 5.5);
    doc.text("Receipt No", 125, y + 5.5);
    doc.text("Amount (INR)", 165, y + 5.5);
    
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // slate-700
    
    filteredDonations.forEach((d) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        // Page header on new page
        doc.setFillColor(13, 148, 136);
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("Date", 16, y + 5.5);
        doc.text("Donor", 45, y + 5.5);
        doc.text("Mode", 95, y + 5.5);
        doc.text("Receipt No", 125, y + 5.5);
        doc.text("Amount (INR)", 165, y + 5.5);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
      }
      
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 8, 196, y + 8);
      
      const dateStr = format(new Date(d.createdAt), "dd-MM-yyyy");
      const donorStr = (d.donorName || "Anonymous").substring(0, 22);
      const modeStr = d.donationType.substring(0, 15);
      const receiptStr = (d.receiptNumber || "N/A").substring(0, 15);
      const amountStr = parseFloat(d.amount).toFixed(2);
      
      doc.text(dateStr, 16, y + 5);
      doc.text(donorStr, 45, y + 5);
      doc.text(modeStr, 95, y + 5);
      doc.text(receiptStr, 125, y + 5);
      doc.text(amountStr, 165, y + 5);
      
      y += 8;
    });
    
    doc.save(`donations_report_\${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Donations report exported to PDF successfully");
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Record/Make Donation Card */}
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg font-bold">
              {user?.role === "admin" ? "Record Donation" : "Make a Donation"}
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              {user?.role === "admin" ? "Log new online or offline (cash/cheque) donations." : "Contribute funds to AIRD Trust cause."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="donation-amount" className="text-xs font-semibold text-gray-700">Amount (INR ₹) *</Label>
              <Input
                id="donation-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g., 500"
                className="border-gray-300"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donation Mode</Label>
              <Select value={donationType} onValueChange={setDonationType}>
                <SelectTrigger className="border-gray-300 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="online">Online</SelectItem>
                  {user?.role === "admin" && (
                    <>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="check">Cheque</SelectItem>
                      <SelectItem value="transfer">Bank Transfer</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="donation-purpose" className="text-xs font-semibold text-gray-700">Purpose / Cause</Label>
              <Input
                id="donation-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., education support"
                className="border-gray-300"
              />
            </div>

            

            {/* Offline / Manual Admin Fields */}
            {user?.role === "admin" && (
              <div className="space-y-4 border-t pt-4 mt-2">
                <p className="text-xs font-bold text-blue-600">
                  {donationType === "online" ? "Online Transaction Details" : "Offline Payment Details"}
                </p>
                <div className="space-y-1">
                  <Label htmlFor="donor-name" className="text-xs font-semibold text-gray-700">Donor Name</Label>
                  <Input
                    id="donor-name"
                    value={donorName}
                    onChange={(e) => setDonorName(e.target.value)}
                    placeholder="e.g. Devashish Panda"
                    className="border-gray-300 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="donor-email" className="text-xs font-semibold text-gray-700">Donor Email</Label>
                  <Input
                    id="donor-email"
                    type="email"
                    value={donorEmail}
                    onChange={(e) => setDonorEmail(e.target.value)}
                    placeholder="e.g. donor@email.com"
                    className="border-gray-300 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="donor-phone" className="text-xs font-semibold text-gray-700">Donor Phone</Label>
                  <Input
                    id="donor-phone"
                    value={donorPhone}
                    onChange={(e) => setDonorPhone(e.target.value)}
                    placeholder="e.g. +91 9988776655"
                    className="border-gray-300 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="trans-id" className="text-xs font-semibold text-gray-700">
                    {donationType === "check" 
                      ? "Cheque Number *" 
                      : donationType === "online" 
                      ? "Online Transaction ID / Reference *" 
                      : "Transaction ID / Bank Ref"}
                  </Label>
                  <Input
                    id="trans-id"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder={donationType === "check" ? "Enter cheque no" : "Enter reference number"}
                    className="border-gray-300 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="offline-date" className="text-xs font-semibold text-gray-700">Payment Date (Optional)</Label>
                  <Input
                    id="offline-date"
                    type="date"
                    value={createdAt}
                    onChange={(e) => setCreatedAt(e.target.value)}
                    className="border-gray-300 text-xs bg-white text-gray-700"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-xs font-semibold text-gray-700">Notes / Remarks</Label>
                  <Input
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter payment notes"
                    className="border-gray-300 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">
                    {donationType === "check" 
                      ? "Cheque Photo *" 
                      : donationType === "online" 
                      ? "Payment Receipt / Screenshot (Optional)" 
                      : "Deposit Slip / Receipt Photo"}
                  </Label>
                  <ImageUpload
                    value={paymentProof}
                    onChange={(url) => setPaymentProof(url)}
                    label=""
                  />
                </div>
              </div>
            )}

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2 mt-2 shadow-sm"
              onClick={handleDonate}
              disabled={createDonationMutation.isPending}
            >
              {createDonationMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Recording...
                </>
              ) : (
                "Record Donation"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Stats for Admins */}
        {user?.role === "admin" && stats && (
          <Card className="col-span-2 bg-white border-gray-200 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-gray-800 text-lg font-bold">Donation System Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-emerald-50 rounded-xl text-emerald-800 shadow-sm border border-emerald-100">
                <p className="text-xs font-semibold tracking-wide uppercase text-emerald-600">Total Donations</p>
                <p className="text-2xl font-black mt-1">₹{(stats.totalAmount || 0).toLocaleString("en-IN")}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-xl text-blue-800 shadow-sm border border-blue-100">
                <p className="text-xs font-semibold tracking-wide uppercase text-blue-600">Transactions Count</p>
                <p className="text-2xl font-black mt-1">{stats.totalCount}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl text-amber-800 shadow-sm border border-amber-100">
                <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">Pending Clearings</p>
                <p className="text-2xl font-black mt-1">{stats.pendingCount}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* User Dashboard: My Donations History */}
      {user?.role !== "admin" && (
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader>
            <CardTitle className="text-gray-800 text-lg font-bold">My Donation History</CardTitle>
          </CardHeader>
          <CardContent>
            {myDonationsData?.items && myDonationsData.items.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {myDonationsData.items.map((donation) => (
                  <div key={donation.id} className="border border-gray-200 p-4 rounded-xl flex flex-col justify-between gap-3 bg-slate-50 hover:shadow-sm transition-shadow">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-lg font-extrabold text-slate-800">₹{parseFloat(donation.amount).toLocaleString("en-IN")}</p>
                        <p className="text-xs text-gray-500 capitalize font-medium">{donation.donationType} payment</p>
                        {donation.purpose && <p className="text-xs text-slate-600 mt-1 font-semibold">For: {donation.purpose}</p>}
                        <p className="text-[10px] text-gray-400 mt-0.5">Date: {format(new Date(donation.createdAt), "dd-MM-yyyy")}</p>
                      </div>
                      <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold capitalize shadow-sm ${
                        donation.paymentStatus === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {donation.paymentStatus}
                      </span>
                    </div>
                    {donation.receiptNumber && (
                      <div className="flex justify-between items-center border-t border-gray-200/60 pt-2 mt-1">
                        <p className="text-xs text-gray-500 font-mono">Receipt: {donation.receiptNumber}</p>
                        {donation.paymentStatus === "completed" && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-6 text-[10px] text-teal-700 border-teal-200 hover:bg-teal-50"
                            onClick={() => {
                              setSelectedReceiptDonation(donation);
                              setIsReceiptModalOpen(true);
                            }}
                          >
                            View Receipt
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic py-4">No donations recorded yet.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin Panel: All Donations Management */}
      {user?.role === "admin" && (
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader className="pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-gray-800 text-xl font-bold">Manage Donations</CardTitle>
              <CardDescription className="text-xs text-gray-400">Search, filter, update status, and manage all public and offline donations.</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Search donor or receipt..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-4 h-9 border-gray-300 focus:ring-blue-500 focus:border-blue-500 w-full text-xs"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>From:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-gray-300 h-9 text-xs py-1 px-2 w-[115px] bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <span>To:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gray-300 h-9 text-xs py-1 px-2 w-[115px] bg-white text-gray-700 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="border-gray-300 hover:bg-gray-50 h-9 text-xs gap-1">
                      <Download className="w-3.5 h-3.5" /> Export
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-white border border-gray-200 shadow-md">
                    <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer hover:bg-slate-100 px-3 py-2 text-xs">
                      Export to CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer hover:bg-slate-100 px-3 py-2 text-xs">
                      Export to Excel (.xls)
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer hover:bg-slate-100 px-3 py-2 text-xs">
                      Export to PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {(startDate || endDate || searchQuery) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setStartDate(""); setEndDate(""); setSearchQuery(""); }}
                    className="text-xs text-red-500 hover:text-red-700 font-bold ml-1 h-9"
                  >
                    Reset
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isAllLoading ? (
              <div className="py-12 text-center text-gray-500">Loading donation list...</div>
            ) : !filteredDonations || filteredDonations.length === 0 ? (
              <div className="py-20 text-center text-gray-400 italic">No donations match your selected filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="p-4 font-bold pl-6">Date</th>
                      <th className="p-4 font-bold">Donor Details</th>
                      <th className="p-4 font-bold">Mode & Ref No</th>
                      <th className="p-4 font-bold text-right">Amount</th>
                      <th className="p-4 font-bold text-center">Status</th>
                      <th className="p-4 font-bold text-center">Documents</th>
                      <th className="p-4 font-bold text-center pr-6">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 text-sm">
                    {filteredDonations.map((donation) => (
                      <tr key={donation.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 pl-6 text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(donation.createdAt), "dd-MM-yyyy")}
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-800">{donation.donorName || "Anonymous"}</div>
                          <div className="text-[10px] text-gray-400">{donation.donorEmail || "No Email"}</div>
                        </td>
                        <td className="p-4">
                          <div className="capitalize text-xs font-bold text-slate-700">{donation.donationType}</div>
                          {donation.transactionId ? (
                            <div className="text-[10px] font-mono text-blue-600 font-semibold" title={donationType === "check" ? "Cheque Number" : "Transaction ID"}>
                              Ref: {donation.transactionId}
                            </div>
                          ) : (
                            <div className="text-[10px] text-gray-400 italic">No Ref</div>
                          )}
                        </td>
                        <td className="p-4 font-bold text-right text-gray-900 whitespace-nowrap">
                          ₹{parseFloat(donation.amount).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize shadow-sm ${
                            donation.paymentStatus === "completed" 
                              ? "bg-green-100 text-green-700" 
                              : donation.paymentStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}>
                            {donation.paymentStatus}
                          </span>
                        </td>
                        <td className="p-4 text-center whitespace-nowrap">
                          <div className="flex flex-col items-center gap-1">
                            {donation.paymentStatus === "completed" && (
                              <button
                                onClick={() => {
                                  setSelectedReceiptDonation(donation);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 text-[10px] text-teal-600 hover:text-teal-800 hover:underline font-bold"
                              >
                                <FileText className="w-3.5 h-3.5" /> View Receipt
                              </button>
                            )}
                            {donation.paymentProof ? (
                              <button
                                onClick={() => setPreviewProofUrl(donation.paymentProof)}
                                className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline font-bold"
                              >
                                <ImageIcon className="w-3.5 h-3.5" /> View Proof
                              </button>
                            ) : (
                              donation.donationType !== "online" && (
                                <span className="text-[9px] text-gray-400 italic">No Image</span>
                              )
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center pr-6 whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            {donation.paymentStatus === "completed" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReceiptDonation(donation);
                                  setIsReceiptModalOpen(true);
                                }}
                                className="text-teal-600 hover:bg-teal-50 hover:text-teal-700 h-8 w-8 p-0"
                                title="View Receipt"
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            )}
                            {donation.paymentStatus === "completed" && (donation.donorPhone || donation.donorEmail) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendReceiptMutation.mutate({ donationId: donation.id, channel: "whatsapp" })}
                                  className="text-green-600 hover:bg-green-50 hover:text-green-700 h-8 w-8 p-0"
                                  disabled={resendReceiptMutation.isPending}
                                  title="Resend WhatsApp"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resendReceiptMutation.mutate({ donationId: donation.id, channel: "email" })}
                                  className="text-blue-600 hover:bg-blue-50 hover:text-blue-700 h-8 w-8 p-0"
                                  disabled={resendReceiptMutation.isPending}
                                  title="Resend Email"
                                >
                                  <Mail className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEdit(donation)}
                              className="text-slate-600 hover:bg-slate-100 hover:text-slate-800 h-8 w-8 p-0"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteDonation(donation.id)}
                              className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                              disabled={deleteDonationMutation.isPending}
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ==================== DONATION RECEIPT DIALOG ==================== */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800 font-bold text-xl">
              <FileText className="h-5 w-5 text-orange-600" />
              Donation Receipt Preview
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Official receipt issued by Appropriate Institute of Rural Development.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex justify-center min-h-[220px] items-center overflow-x-auto">
            {isReceiptLoading ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <span className="material-symbols-outlined animate-spin text-4xl text-teal-700">sync</span>
                <span className="text-sm text-gray-500 font-medium">Fetching verified billing details...</span>
              </div>
            ) : receiptDetails ? (
              <DonationReceiptHTML
                fieldValues={{
                  receiptNumber: receiptDetails.receiptNumber || "N/A",
                  date: receiptDetails.createdAt ? format(new Date(receiptDetails.createdAt), "dd-MM-yyyy") : "",
                  donorName: receiptDetails.donorName || "Valued Donor",
                  donorEmail: receiptDetails.donorEmail || "",
                  donorPhone: receiptDetails.donorPhone || "",
                  amount: `₹${parseFloat(receiptDetails.amount).toLocaleString("en-IN")}`,
                  purpose: receiptDetails.purpose || "General NGO Fund",
                  modeOfDonation: receiptDetails.paymentMethod || "ONLINE",
                }}
                cardRef={receiptRef}
                className="mx-auto"
              />
            ) : selectedReceiptDonation ? (
              <DonationReceiptHTML
                fieldValues={{
                  receiptNumber: selectedReceiptDonation.receiptNumber,
                  date: selectedReceiptDonation.createdAt ? format(new Date(selectedReceiptDonation.createdAt), "dd-MM-yyyy") : "",
                  donorName: selectedReceiptDonation.donorName || "Valued Donor",
                  donorEmail: selectedReceiptDonation.donorEmail || "",
                  donorPhone: selectedReceiptDonation.donorPhone || "",
                  amount: `Rs. ${parseFloat(selectedReceiptDonation.amount).toLocaleString("en-IN")}/-`,
                  purpose: selectedReceiptDonation.purpose || "General NGO Fund",
                  modeOfDonation: selectedReceiptDonation.donationType?.toUpperCase() || "ONLINE",
                }}
                cardRef={receiptRef}
                className="mx-auto"
              />
            ) : null}
          </div>

          <DialogFooter className="pt-2 border-t flex gap-2 w-full">
            <CaptureActions cardRef={receiptRef} filename={`Donation_Receipt_${selectedReceiptDonation?.receiptNumber || "receipt"}`} />
            {selectedReceiptDonation?.paymentStatus === "completed" && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => {
                    resendReceiptMutation.mutate({ donationId: selectedReceiptDonation.id, channel: "whatsapp" });
                  }}
                  disabled={resendReceiptMutation.isPending}
                >
                  <Send className="w-3.5 h-3.5 mr-1" /> WhatsApp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => {
                    resendReceiptMutation.mutate({ donationId: selectedReceiptDonation.id, channel: "email" });
                  }}
                  disabled={resendReceiptMutation.isPending}
                >
                  <Mail className="w-3.5 h-3.5 mr-1" /> Email
                </Button>
              </>
            )}
            <Button variant="outline" className="text-gray-700 bg-white" onClick={() => setIsReceiptModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== PAYMENT PROOF PREVIEW DIALOG ==================== */}
      <Dialog open={!!previewProofUrl} onOpenChange={(open) => !open && setPreviewProofUrl(null)}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2 text-xl font-bold">
              <ImageIcon className="w-6 h-6 text-blue-600" />
              Cheque / Slip Image Proof
            </DialogTitle>
            <DialogDescription className="text-gray-500 text-xs">
              Cheque scan or payment receipt image recorded in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded-xl bg-slate-50 flex items-center justify-center p-4">
            {previewProofUrl && (
              <img
                src={previewProofUrl}
                alt="Cheque Proof Copy"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-sm"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT DONATION DIALOG (CRUD) ==================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700 font-bold text-xl">
              <Edit className="h-5 w-5 text-blue-600" />
              Edit Donation Entry
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Modify the donor name, amount, payment status, or receipt upload of this donation record.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Name</Label>
              <Input
                value={editForm.donorName}
                onChange={(e) => setEditForm({ ...editForm, donorName: e.target.value })}
                placeholder="Donor Name"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Email</Label>
              <Input
                value={editForm.donorEmail}
                onChange={(e) => setEditForm({ ...editForm, donorEmail: e.target.value })}
                placeholder="donor@email.com"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Phone</Label>
              <Input
                value={editForm.donorPhone}
                onChange={(e) => setEditForm({ ...editForm, donorPhone: e.target.value })}
                placeholder="Phone number"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Amount (INR ₹) *</Label>
              <Input
                type="number"
                value={editForm.amount}
                onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                placeholder="Amount"
                className="border-gray-300 text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Payment Status</Label>
              <Select value={editForm.paymentStatus} onValueChange={(val) => setEditForm({ ...editForm, paymentStatus: val })}>
                <SelectTrigger className="border-gray-300 bg-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donation Mode</Label>
              <Select value={editForm.donationType} onValueChange={(val) => setEditForm({ ...editForm, donationType: val })}>
                <SelectTrigger className="border-gray-300 bg-white text-xs h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="transfer">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Purpose</Label>
              <Input
                value={editForm.purpose}
                onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                placeholder="e.g. general fund"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Cheque No / Trans ID</Label>
              <Input
                value={editForm.transactionId}
                onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })}
                placeholder="Cheque / transaction reference"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Payment Date</Label>
              <Input
                type="date"
                value={editForm.createdAt}
                onChange={(e) => setEditForm({ ...editForm, createdAt: e.target.value })}
                className="border-gray-300 text-xs bg-white text-gray-700"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Notes</Label>
              <Input
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                placeholder="Notes"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Cheque/Slip Image</Label>
              <ImageUpload
                value={editForm.paymentProof}
                onChange={(url) => setEditForm({ ...editForm, paymentProof: url })}
                label=""
              />
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9"
                disabled={updateDonationMutation.isPending}
              >
                {updateDonationMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <footer className="w-full py-4 text-center mt-8">
        <p className="text-gray-600 text-xs mb-1">
          &copy; 2026 NGO Management System. All rights reserved.
        </p>
        <p className="text-gray-400 text-[10px]">Create by Star Marketing</p>
      </footer>
    </div>
  );
}
