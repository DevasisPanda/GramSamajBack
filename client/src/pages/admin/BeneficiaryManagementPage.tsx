import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/form-inputs";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { 
  Check, 
  Trash2, 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Heart, 
  CheckCircle,
  Archive,
  RefreshCw,
  Edit,
  XCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function BeneficiaryManagementPage() {
  const [location, setLocation] = useLocation();
  const [page, setPage] = useState(1);

  const getInitialStatus = (path: string): "pending" | "active" | "inactive" | "completed" | "rejected" => {
    if (path.includes("/active")) return "active";
    if (path.includes("/inactive")) return "inactive";
    if (path.includes("/completed")) return "completed";
    if (path.includes("/rejected")) return "rejected";
    return "pending";
  };

  const [statusFilter, setStatusFilter] = useState<"pending" | "active" | "inactive" | "completed" | "rejected">(
    getInitialStatus(location)
  );

  useEffect(() => {
    setStatusFilter(getInitialStatus(location));
    setPage(1);
  }, [location]);

  const [searchQuery, setSearchQuery] = useState("");
  const pageSize = 10;

  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.beneficiary.adminGetAll.useQuery({
    page,
    pageSize,
    status: statusFilter,
  });

  const updateStatusMutation = trpc.beneficiary.adminUpdateStatus.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Beneficiary status updated!");
      utils.beneficiary.adminGetAll.invalidate();
      const targetPath = variables.status === "pending" ? "requests" : variables.status;
      setLocation(`/admin/beneficiary/${targetPath}`);
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const adminUpdateMutation = trpc.beneficiary.adminUpdate.useMutation({
    onSuccess: (_, variables) => {
      toast.success("Beneficiary details updated successfully!");
      setIsEditOpen(false);
      utils.beneficiary.adminGetAll.invalidate();
      const targetPath = variables.status === "pending" ? "requests" : variables.status;
      setLocation(`/admin/beneficiary/${targetPath}`);
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const adminCreateMutation = trpc.beneficiary.adminCreate.useMutation({
    onSuccess: () => {
      toast.success("Beneficiary registered successfully!");
      setLocation("/admin/beneficiary/active");
      utils.beneficiary.adminGetAll.invalidate();
      // Reset form
      setNewForm({
        name: "",
        email: "",
        phone: "",
        address: "",
        category: "education",
        notes: "",
        profileImage: "",
        requestedAmount: 0,
        targetEmail: "",
        executionPlan: "",
        status: "active",
      });
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const deleteMutation = trpc.beneficiary.adminDelete.useMutation({
    onSuccess: () => {
      toast.success("Beneficiary deleted successfully.");
      utils.beneficiary.adminGetAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Edit/Approval modal states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedBene, setSelectedBene] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    id: 0,
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "education" as "education" | "health" | "livelihood" | "emergency" | "other",
    notes: "",
    requestedAmount: 0,
    targetEmail: "",
    executionPlan: "",
    status: "pending" as "pending" | "active" | "inactive" | "completed" | "rejected",
  });

  // Create form state
  const [newForm, setNewForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "education" as "education" | "health" | "livelihood" | "emergency" | "other",
    notes: "",
    profileImage: "",
    requestedAmount: 0,
    targetEmail: "",
    executionPlan: "",
    status: "active" as "pending" | "active" | "inactive" | "completed" | "rejected",
  });

  const handleOpenEdit = (bene: any) => {
    setSelectedBene(bene);
    setEditForm({
      id: bene.id,
      name: bene.name || "",
      email: bene.email || "",
      phone: bene.phone || "",
      address: bene.address || "",
      category: (bene.category || "education") as any,
      notes: bene.notes || "",
      requestedAmount: parseFloat(bene.requestedAmount || "0"),
      targetEmail: bene.targetEmail || "",
      executionPlan: bene.executionPlan || "",
      status: bene.status || "pending",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    adminUpdateMutation.mutate({
      ...editForm,
      email: editForm.email || undefined,
      notes: editForm.notes || undefined,
      targetEmail: editForm.targetEmail || undefined,
      executionPlan: editForm.executionPlan || undefined,
    });
  };

  const handleStatusChange = (id: number, status: "pending" | "active" | "inactive" | "completed" | "rejected") => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to permanently delete beneficiary "${name}"?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const beneficiaries = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  const filteredBeneficiaries = beneficiaries.filter(b => 
    b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.phone && b.phone.includes(searchQuery)) ||
    (b.category && b.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Render Admin Create Form if at /admin/beneficiary/add
  if (location === "/admin/beneficiary/add") {
    const handleCreateSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      adminCreateMutation.mutate({
        ...newForm,
        email: newForm.email || undefined,
        notes: newForm.notes || undefined,
        profileImage: newForm.profileImage || undefined,
        targetEmail: newForm.targetEmail || undefined,
        executionPlan: newForm.executionPlan || undefined,
      });
    };

    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Heart className="w-8 h-8 text-red-500 fill-current" />
              Add New Beneficiary
            </h1>
            <p className="text-gray-500 mt-1">Directly register a new beneficiary case and configure support objectives.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/admin/beneficiary/active")}>
            Back to List
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Beneficiary Information Form</CardTitle>
            <CardDescription>All fields marked with an asterisk (*) are required.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              
              {/* Profile Image */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/50">
                <Label className="block mb-2 font-semibold">Beneficiary Profile Image</Label>
                <ImageUpload 
                  value={newForm.profileImage} 
                  defaultAspectRatio="portrait"
                  onChange={(url) => setNewForm({ ...newForm, profileImage: url })} 
                  label=""
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Name */}
                <div className="space-y-1">
                  <Label htmlFor="create-name">Beneficiary Name *</Label>
                  <Input 
                    id="create-name" 
                    placeholder="Enter full name"
                    value={newForm.name} 
                    onChange={(e) => setNewForm({ ...newForm, name: e.target.value })}
                    required 
                  />
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <Label htmlFor="create-phone">Phone Number *</Label>
                  <PhoneInput 
                    id="create-phone" 
                    value={newForm.phone} 
                    onChange={(phone) => setNewForm({ ...newForm, phone })}
                    required 
                  />
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <Label htmlFor="create-email">Contact Email (Optional)</Label>
                  <Input 
                    id="create-email" 
                    type="email"
                    placeholder="contact@example.com"
                    value={newForm.email} 
                    onChange={(e) => setNewForm({ ...newForm, email: e.target.value })}
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <Label htmlFor="create-category">Assistance Category *</Label>
                  <select
                    id="create-category"
                    className="w-full border border-gray-300 rounded-md p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-500/50"
                    value={newForm.category}
                    onChange={(e) => setNewForm({ ...newForm, category: e.target.value as any })}
                  >
                    <option value="education">Education Support</option>
                    <option value="health">Healthcare Assistance</option>
                    <option value="livelihood">Livelihood & Employment</option>
                    <option value="emergency">Emergency Relief</option>
                    <option value="other">Other Assistance</option>
                  </select>
                </div>

                {/* Address */}
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="create-address">Residential Address *</Label>
                  <Input 
                    id="create-address" 
                    placeholder="Enter complete address"
                    value={newForm.address} 
                    onChange={(e) => setNewForm({ ...newForm, address: e.target.value })}
                    required 
                  />
                </div>

                {/* Goal Amount */}
                <div className="space-y-1">
                  <Label htmlFor="create-requested">Fundraising Goal Amount (INR) *</Label>
                  <Input 
                    id="create-requested" 
                    type="number"
                    min="0"
                    placeholder="e.g. 50000"
                    value={newForm.requestedAmount === 0 ? "" : newForm.requestedAmount} 
                    onChange={(e) => setNewForm({ ...newForm, requestedAmount: parseFloat(e.target.value) || 0 })}
                    required 
                  />
                </div>

                {/* Target Recipient Email */}
                <div className="space-y-1">
                  <Label htmlFor="create-target-email">Target Recipient Email (For whom collecting - Optional)</Label>
                  <Input 
                    id="create-target-email" 
                    type="email"
                    placeholder="recipient@mail.com"
                    value={newForm.targetEmail} 
                    onChange={(e) => setNewForm({ ...newForm, targetEmail: e.target.value })}
                  />
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <Label htmlFor="create-status">Initial Status</Label>
                  <select
                    id="create-status"
                    className="w-full border border-gray-300 rounded-md p-2.5 bg-white text-sm focus:ring-2 focus:ring-blue-500/50"
                    value={newForm.status}
                    onChange={(e) => setNewForm({ ...newForm, status: e.target.value as any })}
                  >
                    <option value="active">Active (Visible on public site)</option>
                    <option value="pending">Pending Review</option>
                    <option value="inactive">Inactive / Paused</option>
                    <option value="completed">Completed Case</option>
                    <option value="rejected">Rejected Request</option>
                  </select>
                </div>

                {/* Notes */}
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="create-notes">Why they need assistance / Situation Description</Label>
                  <textarea 
                    id="create-notes" 
                    rows={3}
                    placeholder="Describe their situation, why they need help, and specific requirements..."
                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-white"
                    value={newForm.notes} 
                    onChange={(e) => setNewForm({ ...newForm, notes: e.target.value })}
                  />
                </div>

                {/* Execution Plan */}
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="create-execution">Execution Plan / Distribution Event details</Label>
                  <textarea 
                    id="create-execution" 
                    rows={3}
                    placeholder="Describe how the collected donations will be verified and executed (e.g. distributed during charity drive, paid directly to hospital...)"
                    className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-white"
                    value={newForm.executionPlan} 
                    onChange={(e) => setNewForm({ ...newForm, executionPlan: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-6 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setLocation("/admin/beneficiary/active")}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  disabled={adminCreateMutation.isPending}
                >
                  {adminCreateMutation.isPending ? "Creating..." : "Save Beneficiary"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Beneficiary Listing by default
  return (
    <div className="p-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="w-8 h-8 text-red-500 fill-current" />
            Beneficiary Management
          </h1>
          <p className="text-gray-500 mt-1">Review, approve, and track beneficiaries across our community programs.</p>
        </div>
        <Button 
          onClick={() => setLocation("/admin/beneficiary/add")} 
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          Add Beneficiary
        </Button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-stretch xl:items-center mb-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            className={statusFilter === "pending" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
            onClick={() => setLocation("/admin/beneficiary/requests")}
          >
            Pending Requests
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            className={statusFilter === "active" ? "bg-red-600 hover:bg-red-700 text-white" : ""}
            onClick={() => setLocation("/admin/beneficiary/active")}
          >
            Active Cases
          </Button>
          <Button
            variant={statusFilter === "completed" ? "default" : "outline"}
            className={statusFilter === "completed" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
            onClick={() => setLocation("/admin/beneficiary/completed")}
          >
            Completed Cases
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            className={statusFilter === "inactive" ? "bg-gray-600 hover:bg-gray-700 text-white" : ""}
            onClick={() => setLocation("/admin/beneficiary/inactive")}
          >
            Inactive/Paused
          </Button>
          <Button
            variant={statusFilter === "rejected" ? "default" : "outline"}
            className={statusFilter === "rejected" ? "bg-slate-600 hover:bg-slate-700 text-white" : ""}
            onClick={() => setLocation("/admin/beneficiary/rejected")}
          >
            Rejected Requests
          </Button>
        </div>
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search name, category, or phone..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">{statusFilter} Beneficiaries</CardTitle>
          <CardDescription>
            {statusFilter === "pending" && "Direct requests from members awaiting review and execution plan configuration."}
            {statusFilter === "active" && "These beneficiaries are currently receiving active assistance from our NGO."}
            {statusFilter === "completed" && "Cases where our goal has been reached and assistance is successfully completed."}
            {statusFilter === "inactive" && "Applications that have been paused or marked inactive."}
            {statusFilter === "rejected" && "Requests that have been rejected and will not be displayed on the public site."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 flex items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin" />
              Loading beneficiary records...
            </div>
          ) : filteredBeneficiaries.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed rounded-lg text-gray-500 mt-4">
              <Heart className="w-12 h-12 mx-auto text-gray-200 mb-3" />
              <p className="text-lg font-medium text-gray-900">No beneficiaries found</p>
              <p>There are no records matching your selected filter or search query.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredBeneficiaries.map((b) => (
                <div 
                  key={b.id} 
                  className="border p-6 rounded-xl flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 bg-white hover:bg-gray-50/50 transition-all shadow-sm"
                >
                  {/* Left block: Profile & core info */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                    {/* Profile image */}
                    <div className="w-16 h-16 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center text-gray-400">
                      {b.profileImage ? (
                        <img src={b.profileImage} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-8 h-8" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-grow">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="font-bold text-lg text-gray-900">{b.name}</h3>
                        <Badge className="bg-blue-50 text-blue-700 font-semibold border-blue-100 hover:bg-blue-50 capitalize">
                          {b.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          Applied {b.createdAt ? format(new Date(b.createdAt), "MMM d, yyyy") : "Recently"}
                        </Badge>
                      </div>

                      {/* Contact metadata */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-gray-500 font-medium">
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{b.phone}</span>
                        </div>
                        {b.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-4 h-4 text-gray-400" />
                            <span>{b.email}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5 sm:col-span-2 mt-1">
                          <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{b.address}</span>
                        </div>
                      </div>

                      {/* Financial details & specific goals */}
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100/50 text-xs text-gray-600">
                        <div>
                          <strong className="text-gray-500 block uppercase tracking-wider text-[10px] mb-0.5">Fundraising Goal</strong>
                          <span className="font-bold text-sm text-gray-900">₹{parseFloat(b.requestedAmount || "0").toLocaleString()}</span>
                        </div>
                        <div>
                          <strong className="text-gray-500 block uppercase tracking-wider text-[10px] mb-0.5">Direct Help Progress</strong>
                          <span className="font-bold text-sm text-emerald-600">₹{parseFloat(b.collectedAmount || "0").toLocaleString()}</span>
                        </div>
                        {b.targetEmail && (
                          <div className="sm:col-span-2 border-t pt-1.5 mt-0.5">
                            <strong className="text-gray-500 block uppercase tracking-wider text-[10px]">Recipient Email (Collecting For)</strong>
                            <span className="font-medium text-gray-800">{b.targetEmail}</span>
                          </div>
                        )}
                        {b.executionPlan && (
                          <div className="sm:col-span-2 border-t pt-1.5 mt-0.5">
                            <strong className="text-gray-500 block uppercase tracking-wider text-[10px]">Execution Plan / Events</strong>
                            <p className="text-gray-700 whitespace-pre-line mt-0.5 leading-relaxed">{b.executionPlan}</p>
                          </div>
                        )}
                      </div>

                      {/* Notes / description */}
                      {b.notes && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 border border-gray-100/50">
                          <strong className="text-gray-700 block mb-0.5">Situation/Notes:</strong>
                          <p className="line-clamp-2">{b.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right block: Action buttons */}
                  <div className="flex flex-wrap gap-2 w-full xl:w-auto shrink-0 border-t xl:border-t-0 pt-4 xl:pt-0">
                    
                    {/* Pending actions */}
                    {statusFilter === "pending" && (
                      <>
                        <Button
                          size="sm"
                          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleOpenEdit(b)}
                        >
                          <Edit className="w-4 h-4" />
                          Review & Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleStatusChange(b.id, "rejected")}
                          disabled={updateStatusMutation.isPending}
                        >
                          <XCircle className="w-4 h-4" />
                          Reject
                        </Button>
                      </>
                    )}

                    {/* Active actions */}
                    {statusFilter === "active" && (
                      <>
                        <Button
                          size="sm"
                          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleStatusChange(b.id, "completed")}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Completed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1.5 text-gray-700 hover:bg-gray-100"
                          onClick={() => handleStatusChange(b.id, "inactive")}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Archive className="w-4 h-4" />
                          Pause Case
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1.5 text-gray-700 hover:bg-gray-100"
                          onClick={() => handleOpenEdit(b)}
                        >
                          <Edit className="w-4 h-4" />
                          Edit Details
                        </Button>
                      </>
                    )}

                    {/* Completed/Inactive/Rejected actions */}
                    {["completed", "inactive", "rejected"].includes(statusFilter) && (
                      <>
                        <Button
                          size="sm"
                          className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white"
                          onClick={() => handleStatusChange(b.id, "active")}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Check className="w-4 h-4" />
                          Re-Activate
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex items-center gap-1.5 text-gray-700 hover:bg-gray-100"
                          onClick={() => handleOpenEdit(b)}
                        >
                          <Edit className="w-4 h-4" />
                          Edit Details
                        </Button>
                      </>
                    )}

                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex items-center gap-1.5 px-3"
                      onClick={() => handleDelete(b.id, b.name)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}

              {/* Pagination footer */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-4 mt-8">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="flex items-center text-sm font-medium text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review, Edit & Approval Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#061941] text-2xl font-bold">
              <Heart className="w-6 h-6 text-red-500 fill-current" />
              Review Beneficiary Application
            </DialogTitle>
            <DialogDescription>
              Modify request details, target recipient info, and plan execution events before status updates.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-5 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Applicant Name */}
              <div className="space-y-1">
                <Label htmlFor="bene-name">Beneficiary Name</Label>
                <Input 
                  id="bene-name" 
                  value={editForm.name} 
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  required 
                />
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <Label htmlFor="bene-phone">Phone Number</Label>
                <PhoneInput 
                  id="bene-phone" 
                  value={editForm.phone} 
                  onChange={(phone) => setEditForm({ ...editForm, phone })}
                  required 
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <Label htmlFor="bene-email">Contact Email (Optional)</Label>
                <Input 
                  id="bene-email" 
                  type="email" 
                  value={editForm.email} 
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <Label htmlFor="bene-category">Category</Label>
                <select
                  id="bene-category"
                  className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-2 focus:ring-blue-500/50"
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value as any })}
                >
                  <option value="education">Education Support</option>
                  <option value="health">Healthcare Assistance</option>
                  <option value="livelihood">Livelihood & Employment</option>
                  <option value="emergency">Emergency Relief</option>
                  <option value="other">Other Assistance</option>
                </select>
              </div>

              {/* Address */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="bene-address">Residential Address</Label>
                <Input 
                  id="bene-address" 
                  value={editForm.address} 
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  required 
                />
              </div>

              {/* Goal Requested Amount */}
              <div className="space-y-1">
                <Label htmlFor="bene-requested">Fundraising Goal Amount (INR)</Label>
                <Input 
                  id="bene-requested" 
                  type="number"
                  min="0"
                  value={editForm.requestedAmount} 
                  onChange={(e) => setEditForm({ ...editForm, requestedAmount: parseFloat(e.target.value) || 0 })}
                  required 
                />
              </div>

              {/* Target Recipient Email */}
              <div className="space-y-1">
                <Label htmlFor="bene-target-email">Target Recipient Email (For whom collecting)</Label>
                <Input 
                  id="bene-target-email" 
                  type="email"
                  placeholder="e.g. child_parents@mail.com"
                  value={editForm.targetEmail} 
                  onChange={(e) => setEditForm({ ...editForm, targetEmail: e.target.value })}
                />
              </div>

              {/* Status */}
              <div className="space-y-1">
                <Label htmlFor="bene-status">Application Status</Label>
                <select
                  id="bene-status"
                  className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm focus:ring-2 focus:ring-blue-500/50"
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                >
                  <option value="pending">Pending Review</option>
                  <option value="active">Active (Approved & Public)</option>
                  <option value="inactive">Inactive / Paused</option>
                  <option value="completed">Completed Case</option>
                  <option value="rejected">Rejected Request</option>
                </select>
              </div>

              {/* Notes / Situation */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="bene-notes">Why they need assistance / Situation Description</Label>
                <textarea 
                  id="bene-notes" 
                  rows={3}
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-white"
                  value={editForm.notes} 
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                />
              </div>

              {/* Execution Events / Plan */}
              <div className="md:col-span-2 space-y-1">
                <Label htmlFor="bene-execution-plan">Execution Plan / Distribution Events Details</Label>
                <textarea 
                  id="bene-execution-plan" 
                  rows={3}
                  placeholder="Describe when, where, and how the collected funds will be executed/distributed (e.g. 'Distribution event scheduled at our city community center on July 10th...')"
                  className="w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none bg-white"
                  value={editForm.executionPlan} 
                  onChange={(e) => setEditForm({ ...editForm, executionPlan: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={adminUpdateMutation.isPending}
              >
                {adminUpdateMutation.isPending ? "Saving..." : "Save & Update"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
