import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Receipt, Search, Plus, Trash2, Calendar, FileText, Image, IndianRupee, Download } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { jsPDF } from "jspdf";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ExpensesDataPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [previewExpenseName, setPreviewExpenseName] = useState<string>("");

  // Queries
  const { data: expenses, isLoading } = trpc.expense.getExpenses.useQuery();

  // Mutations
  const deleteMutation = trpc.expense.deleteExpense.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.expense.getExpenses.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete expense");
    },
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this expense record? This action cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  };

  // Extract unique categories for dropdown
  const categories = Array.from(new Set(expenses?.map((exp) => exp.expenseType) || []));

  // Filter calculations
  const filteredExpenses = expenses?.filter((exp) => {
    const matchSearch = exp.expenseType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        exp.reason.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchSearch) return false;

    if (selectedCategory && selectedCategory !== "all" && exp.expenseType !== selectedCategory) {
      return false;
    }
    
    const date = new Date(exp.createdAt);
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

  // Calculate totals
  const totalExpensesAllTime = expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) ?? 0;
  const totalExpensesFiltered = filteredExpenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) ?? 0;

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const handleOpenReceipt = (url: string, name: string) => {
    setPreviewImageUrl(url);
    setPreviewExpenseName(name);
  };

  const handleExportCSV = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      toast.error("No data to export");
      return;
    }
    const headers = ["ID", "Date", "Expense Type", "Reason", "Amount (INR)", "Receipt URL"];
    const rows = filteredExpenses.map((exp) => [
      exp.id,
      format(new Date(exp.createdAt), "yyyy-MM-dd"),
      exp.expenseType,
      exp.reason,
      exp.amount,
      exp.imageUrl || "None"
    ]);
    
    const csvContent = [headers, ...rows]
      .map((e) => e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","))
      .join("\n");
      
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${format(new Date(), "yyyy-MM-dd")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expenses report exported successfully");
  };

  const handleExportExcel = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      toast.error("No data to export");
      return;
    }
    
    const headers = ["ID", "Date", "Expense Type", "Reason", "Amount (INR)", "Receipt URL"];
    const rows = filteredExpenses.map((exp) => [
      exp.id,
      format(new Date(exp.createdAt), "yyyy-MM-dd"),
      exp.expenseType,
      exp.reason,
      exp.amount,
      exp.imageUrl || "None"
    ]);

    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Expenses Report</x:Name>
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
          th { background-color: #3b82f6; color: white; font-weight: bold; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr>${r.map(val => `<td>${val}</td>`).join("")}</tr>`).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `expenses_report_${format(new Date(), "yyyy-MM-dd")}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Expenses report exported to Excel successfully");
  };

  const handleExportPDF = () => {
    if (!filteredExpenses || filteredExpenses.length === 0) {
      toast.error("No data to export");
      return;
    }
    const doc = new jsPDF();
    
    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text("Valmiki Samaj Charitable Trust", 14, 20);
    
    doc.setFontSize(14);
    doc.text("Expenses Report", 14, 28);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`Generated on: ${format(new Date(), "dd-MM-yyyy HH:mm")}`, 14, 34);
    doc.text(`Total Records: ${filteredExpenses.length}`, 14, 39);
    doc.text(`Total Amount: INR ${filteredExpenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0).toFixed(2)}`, 14, 44);
    
    // Draw table
    let y = 52;
    doc.setFillColor(59, 130, 246); // blue-500
    doc.rect(14, y, 182, 8, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("Date", 16, y + 5.5);
    doc.text("Expense Type", 45, y + 5.5);
    doc.text("Reason", 95, y + 5.5);
    doc.text("Amount (INR)", 165, y + 5.5);
    
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85); // slate-700
    
    filteredExpenses.forEach((exp) => {
      if (y > 275) {
        doc.addPage();
        y = 20;
        // Page header on new page
        doc.setFillColor(59, 130, 246);
        doc.rect(14, y, 182, 8, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(255, 255, 255);
        doc.text("Date", 16, y + 5.5);
        doc.text("Expense Type", 45, y + 5.5);
        doc.text("Reason", 95, y + 5.5);
        doc.text("Amount (INR)", 165, y + 5.5);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
      }
      
      // Draw thin border line
      doc.setDrawColor(241, 245, 249);
      doc.line(14, y + 8, 196, y + 8);
      
      const dateStr = format(new Date(exp.createdAt), "dd-MM-yyyy");
      const typeStr = exp.expenseType.substring(0, 22);
      const reasonStr = exp.reason.substring(0, 30);
      const amountStr = parseFloat(exp.amount).toFixed(2);
      
      doc.text(dateStr, 16, y + 5);
      doc.text(typeStr, 45, y + 5);
      doc.text(reasonStr, 95, y + 5);
      doc.text(amountStr, 165, y + 5);
      
      y += 8;
    });
    
    doc.save(`expenses_report_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast.success("Expenses report exported to PDF successfully");
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Expense Logs & Analysis</h1>
            <p className="text-gray-500 text-sm">Monitor all administrative outflows, verify receipts, and view total expenditures.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50 flex gap-2">
                <Download className="w-5 h-5" /> Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-white border border-gray-200 shadow-md">
              <DropdownMenuItem onClick={handleExportCSV} className="cursor-pointer hover:bg-slate-100 px-3 py-2 text-sm">
                Export to CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="cursor-pointer hover:bg-slate-100 px-3 py-2 text-sm">
                Export to Excel (.xls)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPDF} className="cursor-pointer hover:bg-slate-100 px-3 py-2 text-sm">
                Export to PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => setLocation("/admin/expenses/add")} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex gap-2 shadow-sm">
            <Plus className="w-5 h-5" /> Record Expense
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading expense management database...</div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-r from-blue-600 to-slate-900 text-white border-0 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <IndianRupee className="w-24 h-24" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-100 font-medium tracking-wide text-xs uppercase">Total Expenses (All Time)</CardDescription>
                <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                  {formatCurrency(totalExpensesAllTime)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-blue-200">
                  Aggregated sum of all recorded expenses in the database.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-r from-emerald-600 to-teal-900 text-white border-0 shadow-lg relative overflow-hidden">
              <div className="absolute right-0 bottom-0 opacity-10 translate-x-4 translate-y-4">
                <IndianRupee className="w-24 h-24" />
              </div>
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-100 font-medium tracking-wide text-xs uppercase">Range Expenses (Filtered)</CardDescription>
                <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight mt-1">
                  {formatCurrency(totalExpensesFiltered)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-emerald-200">
                  Total of expenses matching the active date/category/search filters.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 shadow-md flex flex-col justify-between">
              <CardHeader className="pb-2">
                <CardDescription className="text-gray-400 font-medium text-xs uppercase">Filtered Entries</CardDescription>
                <CardTitle className="text-3xl font-extrabold text-gray-800 mt-1">
                  {filteredExpenses?.length ?? 0}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500">
                  Count of expense records matching the active filters.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search & Filter */}
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by expense description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 border-gray-300 focus:ring-blue-500 focus:border-blue-500 w-full"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="flex items-center gap-1.5 w-full md:w-auto min-w-[150px]">
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="border-gray-300 text-xs focus:ring-blue-500 focus:border-blue-500 h-9 w-full md:w-[180px] bg-white">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-md">
                      <SelectItem value="all" className="cursor-pointer hover:bg-slate-100">All Categories</SelectItem>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat} className="cursor-pointer hover:bg-slate-100">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-1.5 w-full md:w-auto">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">From:</span>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="border-gray-300 text-xs focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                <div className="flex items-center gap-1.5 w-full md:w-auto">
                  <span className="text-xs text-gray-500 font-medium whitespace-nowrap">To:</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="border-gray-300 text-xs focus:ring-blue-500 focus:border-blue-500 bg-white"
                  />
                </div>
                {(startDate || endDate || searchQuery || selectedCategory !== "all") && (
                  <Button
                    variant="ghost"
                    onClick={() => { setStartDate(""); setEndDate(""); setSearchQuery(""); setSelectedCategory("all"); }}
                    className="text-xs text-red-500 hover:text-red-700 font-semibold"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Data Table */}
          <Card className="bg-white border-gray-200 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="p-4 font-bold">Date</th>
                    <th className="p-4 font-bold">Expense Type</th>
                    <th className="p-4 font-bold">Reason</th>
                    <th className="p-4 font-bold text-right">Amount</th>
                    <th className="p-4 font-bold text-center">Receipt</th>
                    <th className="p-4 font-bold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {!filteredExpenses || filteredExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-400 italic">
                        No expense records found matching the criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredExpenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-gray-500 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {format(new Date(exp.createdAt), "dd-MM-yyyy")}
                          </div>
                        </td>
                        <td className="p-4 font-semibold text-gray-800">{exp.expenseType}</td>
                        <td className="p-4 text-gray-600 max-w-xs truncate" title={exp.reason}>
                          {exp.reason}
                        </td>
                        <td className="p-4 font-bold text-right text-gray-900 whitespace-nowrap">
                          {formatCurrency(parseFloat(exp.amount))}
                        </td>
                        <td className="p-4 text-center">
                          {exp.imageUrl ? (
                            <button
                              onClick={() => handleOpenReceipt(exp.imageUrl!, exp.expenseType)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold"
                            >
                              <Image className="w-4 h-4" /> View Photo
                            </button>
                          ) : (
                            <span className="text-xs text-gray-400 italic">No Upload</span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(exp.id)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700"
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Receipt Image Preview Dialog */}
      <Dialog open={!!previewImageUrl} onOpenChange={(open) => !open && setPreviewImageUrl(null)}>
        <DialogContent className="max-w-xl bg-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2 text-xl font-bold">
              <FileText className="w-6 h-6 text-blue-600" />
              Receipt Copy
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Receipt document for: <span className="font-semibold text-gray-700">{previewExpenseName}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 border rounded bg-slate-50 flex items-center justify-center p-4">
            {previewImageUrl && (
              <img
                src={previewImageUrl}
                alt="Receipt Proof"
                className="max-h-[70vh] max-w-full object-contain rounded shadow"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
