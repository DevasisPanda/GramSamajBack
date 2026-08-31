import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Trash2, ChevronLeft, ChevronRight, ChevronsUpDown, Eye, FileText, Edit } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { PhoneInput, AadharInput, PincodeInput, DOBInput } from "@/components/ui/form-inputs";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ImageUpload } from "@/components/ui/ImageUpload";

const formatDateForInput = (dateVal: any) => {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split('T')[0];
};

export default function ActiveUsersPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    email: "",
    phone: "",
    fatherName: "",
    dob: "",
    aadharNumber: "",
    gender: "male" as "male" | "female" | "other",
    maritalStatus: "single" as "single" | "married" | "divorced" | "widowed",
    category: "General" as "General" | "OBC" | "SC" | "ST" | "Other",
    bloodGroup: "",
    occupation: "",
    address: "",
    pinCode: "",
    state: "",
    city: "",
    designation: "",
    profileImage: "",
    role: "user" as "user" | "admin" | "staff" | "volunteer",
    status: "active" as "active" | "inactive" | "blocked" | "pending",
  });

  const updateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => {
      toast.success("User updated successfully");
      setIsEditDialogOpen(false);
      utils.admin.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleEditClick = (user: any) => {
    setEditingUserId(user.id);
    setEditFormData({
      name: user.name || "",
      email: user.email || "",
      phone: user.phone || "",
      fatherName: user.fatherName || "",
      dob: formatDateForInput(user.dob),
      aadharNumber: user.aadharNumber || "",
      gender: (user.gender || "male") as any,
      maritalStatus: (user.maritalStatus || "single") as any,
      category: (user.category || "General") as any,
      bloodGroup: user.bloodGroup || "",
      occupation: user.occupation || "",
      address: user.address || "",
      pinCode: user.pinCode || "",
      state: user.state || "",
      city: user.city || "",
      designation: user.designation || "",
      profileImage: user.profileImage || "",
      role: (user.role || "user") as any,
      status: (user.status || "active") as any,
    });
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;
    updateMutation.mutate({
      userId: editingUserId,
      ...editFormData,
      dob: editFormData.dob ? new Date(editFormData.dob) : null,
      fatherName: editFormData.fatherName || null,
      aadharNumber: editFormData.aadharNumber || null,
      bloodGroup: editFormData.bloodGroup || null,
      occupation: editFormData.occupation || null,
      address: editFormData.address || null,
      pinCode: editFormData.pinCode || null,
      state: editFormData.state || null,
      city: editFormData.city || null,
      designation: editFormData.designation || null,
      profileImage: editFormData.profileImage || null,
    });
  };

  // Fetch all users
  const { data, isLoading, isError } = trpc.admin.getAllUsers.useQuery({ page: 1, pageSize: 1000 });

  const blockMutation = trpc.admin.blockUser.useMutation({
    onSuccess: () => {
      toast.success("User has been blocked.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const unblockMutation = trpc.admin.unblockUser.useMutation({
    onSuccess: () => {
      toast.success("User has been unblocked.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const approveMutation = trpc.admin.approveUser.useMutation({
    onSuccess: () => {
      toast.success("User has been approved.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User has been deleted.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const promoteMutation = trpc.admin.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("User promoted to Admin.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load users. <button className="underline ml-1" onClick={() => window.location.reload()}>Retry</button></div>;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Spinner className="size-6 text-gray-400" /></div>;
  }

  const allUsers = data?.items || [];
  
  const filteredUsers = allUsers.filter((user) => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntries = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + entriesPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntriesPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const TableHeader = ({ title, width = "auto" }: { title: string, width?: string }) => (
    <th className={`px-2 py-3 border-r border-gray-200 align-middle ${width !== "auto" ? width : ""}`}>
      <div className="flex items-center justify-between text-gray-500 font-bold">
        <span>{title}</span>
        <ChevronsUpDown className="w-3 h-3 opacity-50" />
      </div>
    </th>
  );

  return (
    <div className="p-6 max-w-[100vw] overflow-x-hidden">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900 mb-6">User Management</h1>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="destructive" className="bg-red-500 hover:bg-red-600" onClick={() => {
          if (selectedIds.size === 0) { toast.error("No users selected"); return; }
          const adminUsers = allUsers.filter(u => selectedIds.has(u.id) && u.role === "admin");
          if (adminUsers.length > 0) {
            toast.error("Cannot delete Admin users in bulk. Please deselect Admins first.");
            return;
          }
          if (window.confirm(`Permanently delete ${selectedIds.size} selected user(s)? This removes the users and all associated data. Cannot be undone.`)) {
            selectedIds.forEach((id) => deleteMutation.mutate({ userId: id }));
            setSelectedIds(new Set());
          }
        }}>
          Delete Selected
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm bg-white">
        <CardContent className="p-0">
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 border-b border-gray-100 gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <select 
                className="border border-gray-300 rounded px-2 py-1 bg-white outline-none focus:border-blue-500"
                value={entriesPerPage}
                onChange={handleEntriesChange}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries</span>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Search:</span>
              <Input 
                className="w-64 h-9 bg-white border-gray-300" 
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left border-collapse whitespace-nowrap">
              <thead className="text-gray-700 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-2 py-3 border-r border-gray-200 w-12 align-middle">
                    <div className="flex flex-col items-center justify-center text-gray-500 font-bold gap-1">
                      <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      <span>Sr.No.</span>
                    </div>
                  </th>
                  <th className="px-2 py-3 border-r border-gray-200 w-16 align-middle">
                    <div className="flex flex-col items-center justify-center text-gray-500 font-bold gap-1">
                      <input type="checkbox" className="rounded border-gray-300"
                        checked={selectedIds.size === paginatedUsers.length && paginatedUsers.length > 0}
                        onChange={() => {
                          if (selectedIds.size === paginatedUsers.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(paginatedUsers.map(u => u.id)));
                          }
                        }} />
                      <div className="flex items-center gap-1">
                        <span>Select All</span>
                        <ChevronsUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </div>
                  </th>
                  <TableHeader title="Reg.No / Name / Email / Mobile" width="min-w-[280px]" />
                  <TableHeader title="Reg. Date" />
                  <TableHeader title="Detail" />
                  <TableHeader title="Receipt" />
                  <TableHeader title="Action" />
                  <TableHeader title="Ref Member" />
                  <TableHeader title="Ref Donation" />
                  <TableHeader title="Action" />
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">No users found.</td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id} className={`bg-white border-b border-gray-200 hover:bg-gray-50 ${user.status === "blocked" ? "opacity-60 bg-gray-50/50" : ""}`}>
                      <td className="px-2 py-2 border-r border-gray-200 text-center text-gray-600 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <input type="checkbox" className="rounded border-gray-300"
                          checked={selectedIds.has(user.id)}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            if (next.has(user.id)) next.delete(user.id);
                            else next.add(user.id);
                            setSelectedIds(next);
                          }} />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-800 leading-snug whitespace-normal">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-center">
                            {user.profileImage ? (
                              <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{user.name?.slice(0, 2) || "U"}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold">{user.membershipNumber || "No Reg"}</span> / {user.name || "N/A"}
                              {user.role === "admin" && (
                                <StatusBadge status="admin" isSystemAdmin={user.isSystemAdmin} />
                              )}
                              {user.paymentStatus === "paid" ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] h-4 py-0 px-1.5 font-bold">
                                  Paid (₹{user.amountPaid || "500"})
                                </Badge>
                              ) : user.paymentStatus === "exempted" ? (
                                <Badge className="bg-blue-600 text-white text-[10px] h-4 py-0 px-1.5 font-bold">
                                  Exempted
                                </Badge>
                              ) : user.membershipStatus ? (
                                <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-[10px] h-4 py-0 px-1.5 font-bold">
                                  Unpaid Signup
                                </Badge>
                              ) : null}
                            </div>
                            <span className="text-gray-500 text-xs">{user.email || "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-600">
                        {user.createdAt ? format(new Date(user.createdAt), "dd-MM-yyyy") : "N/A"}
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex gap-1 mx-auto"
                          onClick={() => setLocation(`/admin/users/detail/${user.id}`)}
                        >
                          <Eye className="w-3 h-3" /> View
                        </Button>
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex gap-1 mx-auto">
                          <FileText className="w-3 h-3" /> Receipt
                        </Button>
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <div className="flex justify-center gap-1">
                          {user.status === "pending" ? (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" onClick={() => {
                              const name = user.name || user.email || "this user";
                              if (window.confirm(`Approve ${name}?`)) {
                                approveMutation.mutate({ userId: user.id });
                              }
                            }}>
                              Approve
                            </Button>
                          ) : user.status === "blocked" ? (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100" onClick={() => {
                              const name = user.name || user.email || "this user";
                              if (window.confirm(`Unblock ${name}? They will regain access.`)) {
                                unblockMutation.mutate({ userId: user.id });
                              }
                            }}>
                              Unblock
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" onClick={() => {
                              const name = user.name || user.email || "this user";
                              if (window.confirm(`Block ${name}? They will lose access until an admin unblocks them.`)) {
                                blockMutation.mutate({ userId: user.id });
                              }
                            }} disabled={user.role === "admin"}>
                              Block
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold">0</Badge>
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold">â‚¹ 0.00</Badge>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button 
                            size="icon" 
                            variant="outline" 
                            className="h-7 w-7 text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                            onClick={() => handleEditClick(user)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 bg-red-50 border-red-200 hover:bg-red-100" onClick={() => {
                            const name = user.name || user.email || "this user";
                            if (window.confirm(`Permanently delete ${name}? This removes the user and all associated data. Cannot be undone.`)) {
                              deleteMutation.mutate({ userId: user.id });
                            }
                          }} disabled={user.role === "admin"}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 text-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-600">
            <div>
              Showing {totalEntries > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + entriesPerPage, totalEntries)} of {totalEntries} entries
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Prev
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1;
                  if (totalPages > 5 && currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                  }
                  return (
                    <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="h-8 w-8 p-0" onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Member Details Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Member Details</DialogTitle>
            <DialogDescription>
              Modify the user details below. Changes will be saved to the database immediately.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-6 py-4">
            <div className="flex justify-center">
              <ImageUpload
                label="Profile Image"
                value={editFormData.profileImage}
                onChange={(url) => setEditFormData({ ...editFormData, profileImage: url })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Full Name</Label>
                <Input
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-phone">Phone Number</Label>
                <PhoneInput
                  id="edit-phone"
                  value={editFormData.phone}
                  onChange={(phone) => setEditFormData({ ...editFormData, phone })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-fatherName">Father's Name</Label>
                <Input
                  id="edit-fatherName"
                  value={editFormData.fatherName}
                  onChange={(e) => setEditFormData({ ...editFormData, fatherName: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-dob">Date of Birth</Label>
                <DOBInput
                  id="edit-dob"
                  value={editFormData.dob}
                  onChange={(dob) => setEditFormData({ ...editFormData, dob })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-aadhar">Aadhar Number</Label>
                <AadharInput
                  id="edit-aadhar"
                  value={editFormData.aadharNumber}
                  onChange={(aadharNumber) => setEditFormData({ ...editFormData, aadharNumber })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-gender">Gender</Label>
                <Select
                  value={editFormData.gender}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, gender: val })}
                >
                  <SelectTrigger id="edit-gender">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-marital">Marital Status</Label>
                <Select
                  value={editFormData.maritalStatus}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, maritalStatus: val })}
                >
                  <SelectTrigger id="edit-marital">
                    <SelectValue placeholder="Select marital status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editFormData.category}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, category: val })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="OBC">OBC</SelectItem>
                    <SelectItem value="SC">SC</SelectItem>
                    <SelectItem value="ST">ST</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-bloodGroup">Blood Group</Label>
                <Input
                  id="edit-bloodGroup"
                  placeholder="e.g. A+, O-"
                  value={editFormData.bloodGroup}
                  onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-occupation">Occupation</Label>
                <Input
                  id="edit-occupation"
                  value={editFormData.occupation}
                  onChange={(e) => setEditFormData({ ...editFormData, occupation: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-designation">Designation</Label>
                <Input
                  id="edit-designation"
                  value={editFormData.designation}
                  onChange={(e) => setEditFormData({ ...editFormData, designation: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-city">City</Label>
                <Input
                  id="edit-city"
                  value={editFormData.city}
                  onChange={(e) => setEditFormData({ ...editFormData, city: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-state">State</Label>
                <Input
                  id="edit-state"
                  value={editFormData.state}
                  onChange={(e) => setEditFormData({ ...editFormData, state: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-pincode">Pin Code</Label>
                <PincodeInput
                  id="edit-pincode"
                  value={editFormData.pinCode}
                  onChange={(pinCode) => setEditFormData({ ...editFormData, pinCode })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-role">System Role</Label>
                <Select
                  value={editFormData.role}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, role: val })}
                >
                  <SelectTrigger id="edit-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User / Member</SelectItem>
                    <SelectItem value="volunteer">Volunteer</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-status">Account Status</Label>
                <Select
                  value={editFormData.status}
                  onValueChange={(val: any) => setEditFormData({ ...editFormData, status: val })}
                >
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">Full Address</Label>
              <Textarea
                id="edit-address"
                rows={3}
                value={editFormData.address}
                onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              />
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

