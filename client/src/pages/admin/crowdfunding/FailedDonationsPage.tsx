import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { FileText, Trash2, Edit, Calendar, Search, XCircle, PlusCircle, Info, HelpCircle, AlertOctagon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

export default function FailedDonationsPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [activeTab, setActiveTab] = useState<"initiated" | "failed">("initiated");

  // Edit State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAttempt, setEditingAttempt] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    amount: "",
    status: "initiated" as "initiated" | "completed" | "failed",
    purpose: "",
    transactionId: "",
    paymentMethod: "razorpay",
    razorpayOrderId: "",
    razorpayPaymentId: "",
  });

  // Create State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    donorName: "",
    donorEmail: "",
    donorPhone: "",
    amount: "",
    status: "initiated" as "initiated" | "completed" | "failed",
    purpose: "",
    transactionId: "",
    paymentMethod: "manual",
    razorpayOrderId: "",
    razorpayPaymentId: "",
  });

  // Details State
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any | null>(null);

  // Queries
  const { data: transactionsData, isLoading } = trpc.payment.getAll.useQuery(
    { page: 1, pageSize: 1000 },
    { enabled: user?.role === "admin" }
  );

  // Mutations
  const createMutation = trpc.payment.adminCreate.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsCreateOpen(false);
      setCreateForm({
        donorName: "",
        donorEmail: "",
        donorPhone: "",
        amount: "",
        status: "initiated",
        purpose: "",
        transactionId: "",
        paymentMethod: "manual",
        razorpayOrderId: "",
        razorpayPaymentId: "",
      });
      utils.payment.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create record");
    },
  });

  const updateMutation = trpc.payment.adminUpdate.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsEditOpen(false);
      setEditingAttempt(null);
      utils.payment.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update details");
    },
  });

  const deleteMutation = trpc.payment.adminDelete.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.payment.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete record");
    },
  });

  // Filtering Logic
  const allAttempts = transactionsData?.items ?? [];
  const filteredAttempts = allAttempts.filter((txn) => {
    // Show only the ones matching current failure category tab
    if (txn.status !== activeTab) return false;

    const searchString = `${txn.donorName || ""} ${txn.donorEmail || ""} ${txn.donorPhone || ""} ${txn.purpose || ""} ${txn.transactionId || ""}`.toLowerCase();
    const matchSearch = searchString.includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;

    const date = new Date(txn.createdAt);
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

  const totalAbandonedCount = allAttempts.filter(txn => txn.status === "initiated").length;
  const totalTechnicalFailedCount = allAttempts.filter(txn => txn.status === "failed").length;

  const handleStartEdit = (txn: any) => {
    setEditingAttempt(txn);
    setEditForm({
      donorName: txn.donorName || "",
      donorEmail: txn.donorEmail || "",
      donorPhone: txn.donorPhone || "",
      amount: txn.amount,
      status: txn.status as any,
      purpose: txn.purpose || "",
      transactionId: txn.transactionId || "",
      paymentMethod: txn.paymentMethod || "razorpay",
      razorpayOrderId: txn.razorpayOrderId || "",
      razorpayPaymentId: txn.razorpayPaymentId || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.amount || parseFloat(editForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    updateMutation.mutate({
      id: editingAttempt.id,
      donorName: editForm.donorName,
      donorEmail: editForm.donorEmail,
      donorPhone: editForm.donorPhone || undefined,
      amount: parseFloat(editForm.amount),
      status: editForm.status,
      purpose: editForm.purpose || undefined,
      transactionId: editForm.transactionId || undefined,
      paymentMethod: editForm.paymentMethod,
      razorpayOrderId: editForm.razorpayOrderId || undefined,
      razorpayPaymentId: editForm.razorpayPaymentId || undefined,
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.amount || parseFloat(createForm.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    createMutation.mutate({
      amount: parseFloat(createForm.amount),
      donorName: createForm.donorName,
      donorEmail: createForm.donorEmail,
      donorPhone: createForm.donorPhone || undefined,
      status: createForm.status,
      purpose: createForm.purpose || undefined,
      transactionId: createForm.transactionId || undefined,
      paymentMethod: createForm.paymentMethod,
      razorpayOrderId: createForm.razorpayOrderId || undefined,
      razorpayPaymentId: createForm.razorpayPaymentId || undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this record?")) {
      deleteMutation.mutate({ id });
    }
  };

  if (user?.role !== "admin") {
    return <div className="p-8 text-center text-red-500 font-bold">Access Denied.</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Failed Donations & CRM Leads</h1>
          <p className="text-sm text-gray-500 mt-1">
            Follow up with users who had checkout errors or cancelled payment after initiating.
          </p>
        </div>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs h-10 gap-1.5 self-start md:self-auto shadow-sm"
        >
          <PlusCircle className="w-4 h-4" /> Add Manual Attempt
        </Button>
      </div>

      {/* CRM Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 bg-amber-50 rounded-xl text-amber-800 shadow-sm border border-amber-100 flex items-center gap-4">
          <div className="p-3 bg-amber-100 rounded-lg">
            <HelpCircle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-amber-600">Abandoned Checkouts</p>
            <p className="text-2xl font-black mt-0.5">{totalAbandonedCount} attempts</p>
          </div>
        </div>
        <div className="p-4 bg-red-50 rounded-xl text-red-800 shadow-sm border border-red-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg">
            <AlertOctagon className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide uppercase text-red-600">Technical Failures</p>
            <p className="text-2xl font-black mt-0.5">{totalTechnicalFailedCount} errors</p>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white border-gray-200 shadow-md">
        <CardHeader className="pb-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex border-b border-gray-100 p-0.5 bg-slate-100 rounded-lg gap-1">
            <button
              onClick={() => setActiveTab("initiated")}
              className={`py-1.5 px-4 text-xs font-extrabold rounded-md transition-all ${
                activeTab === "initiated"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Abandoned / Cancelled ({totalAbandonedCount})
            </button>
            <button
              onClick={() => setActiveTab("failed")}
              className={`py-1.5 px-4 text-xs font-extrabold rounded-md transition-all ${
                activeTab === "failed"
                  ? "bg-white text-slate-800 shadow-xs"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Technical Failures ({totalTechnicalFailedCount})
            </button>
          </div>

          {/* Filters controls */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 h-9 border-gray-300 focus:ring-teal-500 focus:border-teal-500 w-full text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>From:</span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="border-gray-300 h-9 text-xs py-1 px-2 w-[115px] bg-white text-gray-700"
                />
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <span>To:</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="border-gray-300 h-9 text-xs py-1 px-2 w-[115px] bg-white text-gray-700"
                />
              </div>
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
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading attempts...</div>
          ) : filteredAttempts.length === 0 ? (
            <div className="py-20 text-center text-gray-400 italic">
              No attempts match your selected criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <th className="p-4 font-bold pl-6">Date</th>
                    <th className="p-4 font-bold">Contact Name</th>
                    <th className="p-4 font-bold">Contact Info</th>
                    <th className="p-4 font-bold">Ref / Order ID</th>
                    <th className="p-4 font-bold text-right">Amount</th>
                    <th className="p-4 font-bold text-center">Status</th>
                    <th className="p-4 font-bold text-center">Purpose</th>
                    <th className="p-4 font-bold text-center pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 text-sm">
                  {filteredAttempts.map((txn) => (
                    <tr key={txn.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 pl-6 text-gray-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {format(new Date(txn.createdAt), "dd-MM-yyyy HH:mm")}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-semibold text-gray-800">{txn.donorName || "Anonymous"}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-xs font-medium text-slate-700">{txn.donorPhone || "No Phone"}</div>
                        <div className="text-[10px] text-gray-400">{txn.donorEmail || "No Email"}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-[10px] font-mono text-gray-600 truncate max-w-[150px]" title={txn.transactionId}>
                          {txn.transactionId}
                        </div>
                      </td>
                      <td className="p-4 font-bold text-right text-gray-900 whitespace-nowrap">
                        ₹{parseFloat(txn.amount).toLocaleString("en-IN")}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize shadow-sm ${
                          txn.status === "initiated"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {txn.status === "initiated" ? "Incomplete" : "Failed"}
                        </span>
                      </td>
                      <td className="p-4 text-center text-xs text-gray-500 whitespace-nowrap capitalize">
                        {txn.purpose || "General"}
                      </td>
                      <td className="p-4 text-center pr-6 whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAttempt(txn);
                              setIsDetailsOpen(true);
                            }}
                            className="text-teal-600 hover:bg-teal-50 hover:text-teal-800 h-8 w-8 p-0"
                            title="View Details"
                          >
                            <Info className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(txn)}
                            className="text-slate-600 hover:bg-slate-100 hover:text-slate-800 h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(txn.id)}
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 h-8 w-8 p-0"
                            disabled={deleteMutation.isPending}
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

      {/* ==================== CREATE PAYMENT ATTEMPT DIALOG ==================== */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md bg-white p-6 max-h-[95vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-teal-800 font-bold text-xl flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-orange-600" />
              Add Payment Attempt / Lead
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Log a manual transaction attempt or failed payment details for CRM tracking.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Name *</Label>
              <Input
                required
                value={createForm.donorName}
                onChange={(e) => setCreateForm({ ...createForm, donorName: e.target.value })}
                placeholder="e.g. Rahul Sharma"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Email *</Label>
              <Input
                required
                type="email"
                value={createForm.donorEmail}
                onChange={(e) => setCreateForm({ ...createForm, donorEmail: e.target.value })}
                placeholder="e.g. rahul@example.com"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Phone (10 digits)</Label>
              <Input
                value={createForm.donorPhone}
                onChange={(e) => setCreateForm({ ...createForm, donorPhone: e.target.value })}
                placeholder="e.g. 9876543210"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Amount (₹) *</Label>
                <Input
                  required
                  type="number"
                  value={createForm.amount}
                  onChange={(e) => setCreateForm({ ...createForm, amount: e.target.value })}
                  placeholder="e.g. 500"
                  className="border-gray-300 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Status</Label>
                <Select
                  value={createForm.status}
                  onValueChange={(val: any) => setCreateForm({ ...createForm, status: val })}
                >
                  <SelectTrigger className="border-gray-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border text-xs">
                    <SelectItem value="initiated">Incomplete</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Purpose</Label>
              <Input
                value={createForm.purpose}
                onChange={(e) => setCreateForm({ ...createForm, purpose: e.target.value })}
                placeholder="e.g. General Donation"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Transaction / Reference ID</Label>
              <Input
                value={createForm.transactionId}
                onChange={(e) => setCreateForm({ ...createForm, transactionId: e.target.value })}
                placeholder="Manual reference, phonepe or razorpay order id"
                className="border-gray-300 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Razorpay Order ID</Label>
                <Input
                  value={createForm.razorpayOrderId}
                  onChange={(e) => setCreateForm({ ...createForm, razorpayOrderId: e.target.value })}
                  placeholder="order_xyz"
                  className="border-gray-300 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Razorpay Payment ID</Label>
                <Input
                  value={createForm.razorpayPaymentId}
                  onChange={(e) => setCreateForm({ ...createForm, razorpayPaymentId: e.target.value })}
                  placeholder="pay_xyz"
                  className="border-gray-300 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding..." : "Add Attempt"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== EDIT PAYMENT ATTEMPT DIALOG ==================== */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md bg-white p-6 max-h-[95vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-teal-800 font-bold text-xl flex items-center gap-2">
              <Edit className="h-5 w-5 text-orange-600" />
              Edit Payment Attempt / Lead
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Modify details of the payment attempt or resolve status.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3 pt-3">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Name *</Label>
              <Input
                required
                value={editForm.donorName}
                onChange={(e) => setEditForm({ ...editForm, donorName: e.target.value })}
                placeholder="Name"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Email *</Label>
              <Input
                required
                type="email"
                value={editForm.donorEmail}
                onChange={(e) => setEditForm({ ...editForm, donorEmail: e.target.value })}
                placeholder="Email"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Donor Phone (10 digits)</Label>
              <Input
                value={editForm.donorPhone}
                onChange={(e) => setEditForm({ ...editForm, donorPhone: e.target.value })}
                placeholder="Phone"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Amount (₹) *</Label>
                <Input
                  required
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  placeholder="Amount"
                  className="border-gray-300 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(val: any) => setEditForm({ ...editForm, status: val })}
                >
                  <SelectTrigger className="border-gray-300 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border text-xs">
                    <SelectItem value="initiated">Incomplete</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Purpose</Label>
              <Input
                value={editForm.purpose}
                onChange={(e) => setEditForm({ ...editForm, purpose: e.target.value })}
                placeholder="Purpose"
                className="border-gray-300 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-gray-700">Transaction / Reference ID</Label>
              <Input
                value={editForm.transactionId}
                onChange={(e) => setEditForm({ ...editForm, transactionId: e.target.value })}
                className="border-gray-300 text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Razorpay Order ID</Label>
                <Input
                  value={editForm.razorpayOrderId}
                  onChange={(e) => setEditForm({ ...editForm, razorpayOrderId: e.target.value })}
                  className="border-gray-300 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold text-gray-700">Razorpay Payment ID</Label>
                <Input
                  value={editForm.razorpayPaymentId}
                  onChange={(e) => setEditForm({ ...editForm, razorpayPaymentId: e.target.value })}
                  className="border-gray-300 text-xs font-mono"
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)} className="text-xs h-9">
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-9"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ==================== VIEW DETAILS DIALOG ==================== */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-teal-800 font-bold text-xl flex items-center gap-2">
              <Info className="h-5 w-5 text-orange-600" />
              Attempt / Lead Details
            </DialogTitle>
          </DialogHeader>

          {selectedAttempt && (
            <div className="space-y-4 pt-3 text-xs">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <p className="text-gray-400 font-medium">Attempt Date</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {format(new Date(selectedAttempt.createdAt), "dd-MM-yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 font-medium">Status</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold capitalize mt-0.5 shadow-sm ${
                    selectedAttempt.status === "initiated"
                      ? "bg-amber-100 text-amber-700"
                      : selectedAttempt.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}>
                    {selectedAttempt.status === "initiated" ? "Incomplete (Abandoned)" : selectedAttempt.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Contact Info</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 text-gray-400">Name:</div>
                  <div className="col-span-2 font-semibold text-slate-800">{selectedAttempt.donorName}</div>

                  <div className="col-span-1 text-gray-400">Phone:</div>
                  <div className="col-span-2 font-mono text-slate-800 font-bold">{selectedAttempt.donorPhone || "N/A"}</div>

                  <div className="col-span-1 text-gray-400">Email:</div>
                  <div className="col-span-2 text-slate-800">{selectedAttempt.donorEmail}</div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">Donation Details</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-1 text-gray-400">Amount:</div>
                  <div className="col-span-2 font-extrabold text-emerald-700 text-sm">
                    ₹{parseFloat(selectedAttempt.amount).toLocaleString("en-IN")}
                  </div>

                  <div className="col-span-1 text-gray-400">Purpose:</div>
                  <div className="col-span-2 text-slate-800 capitalize">{selectedAttempt.purpose || "General"}</div>

                  <div className="col-span-1 text-gray-400">Method:</div>
                  <div className="col-span-2 text-slate-800 capitalize">{selectedAttempt.paymentMethod}</div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-3 font-mono">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px] font-sans">Razorpay Reference Details</h4>
                <div className="grid grid-cols-3 gap-2 text-[10px]">
                  <div className="col-span-1 text-gray-400">Order ID:</div>
                  <div className="col-span-2 text-slate-700 break-all select-all font-semibold">{selectedAttempt.razorpayOrderId || "N/A"}</div>

                  <div className="col-span-1 text-gray-400">Payment ID:</div>
                  <div className="col-span-2 text-slate-700 break-all select-all font-semibold">{selectedAttempt.razorpayPaymentId || "N/A"}</div>

                  <div className="col-span-1 text-gray-400">Ref ID:</div>
                  <div className="col-span-2 text-slate-700 break-all select-all font-semibold">{selectedAttempt.transactionId || "N/A"}</div>
                </div>
              </div>

              <DialogFooter className="pt-3 border-t">
                <Button className="w-full bg-[#061941] hover:bg-black text-white text-xs h-9 font-semibold" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
