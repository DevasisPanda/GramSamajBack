import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Filter, Trash2, Edit, Eye, FileText, ChevronsUpDown, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function ActiveMembershipsPage() {
  const { data, isLoading, isError } = trpc.membership.getActiveWithDetails.useQuery({ page: 1, pageSize: 1000 });
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const blockMutation = trpc.admin.blockUser.useMutation({
    onSuccess: () => { toast.success("User blocked"); utils.membership.getActiveWithDetails.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deactivateMutation = trpc.admin.updateUser.useMutation({
    onSuccess: () => { toast.success("Membership deactivated"); utils.membership.getActiveWithDetails.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const deleteMembershipMutation = trpc.membership.delete.useMutation({
    onSuccess: () => { toast.success("Membership deleted"); utils.membership.getActiveWithDetails.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  if (isError) {
    return <div className="p-8 text-center text-red-500">Failed to load memberships. <button className="underline ml-1" onClick={() => window.location.reload()}>Retry</button></div>;
  }
  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Spinner className="size-6 text-gray-400" /></div>;
  }

  const activeMembers = data?.items || [];
  
  const filteredMembers = activeMembers.filter((m) => 
    m.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.membershipNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntries = filteredMembers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedMembers = filteredMembers.slice(startIndex, startIndex + entriesPerPage);

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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Verify Members Database</h1>
          <p className="text-gray-500 mt-1">Review and manage all currently active memberships.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" className="flex gap-2 items-center text-gray-700 bg-white">
          <Filter className="w-4 h-4" /> Filter
        </Button>
        <Button variant="destructive" className="bg-red-500 hover:bg-red-600" onClick={() => {
          if (selectedIds.size === 0) { toast.error("No members selected"); return; }
          if (window.confirm(`Delete ${selectedIds.size} selected membership(s)? This cannot be undone.`)) {
            selectedIds.forEach((id) => deleteMembershipMutation.mutate({ membershipId: id }));
            setSelectedIds(new Set());
          }
        }}>
          Delete Selected
        </Button>
      </div>

      <Card className="border-gray-200 shadow-sm bg-white">
        <CardContent className="p-0">
          {/* Table Controls */}
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
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600 font-medium">Search:</span>
              <Input 
                className="h-8 w-64 border-gray-300" 
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>

          {/* Data Table */}
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
                        checked={selectedIds.size === paginatedMembers.length && paginatedMembers.length > 0}
                        onChange={() => {
                          if (selectedIds.size === paginatedMembers.length) {
                            setSelectedIds(new Set());
                          } else {
                            setSelectedIds(new Set(paginatedMembers.map(m => m.id)));
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
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">No active memberships found.</td>
                  </tr>
                ) : (
                  paginatedMembers.map((member, index) => (
                    <tr key={member.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-2 py-2 border-r border-gray-200 text-center text-gray-600 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <input type="checkbox" className="rounded border-gray-300"
                          checked={selectedIds.has(member.id)}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            if (next.has(member.id)) next.delete(member.id);
                            else next.add(member.id);
                            setSelectedIds(next);
                          }} />
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-800 leading-snug whitespace-normal">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 bg-gray-50 flex-shrink-0 flex items-center justify-center">
                            {member.profileImage ? (
                              <img src={member.profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-gray-400 font-bold uppercase">{member.name?.slice(0, 2) || "M"}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-semibold">{member.membershipNumber}</span> / {member.name || "N/A"}
                              {member.paymentStatus === "paid" ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] h-4 py-0 px-1.5 font-bold">
                                  Paid (₹{member.amountPaid || (member.membershipType === "lifetime" ? "5100" : "500")})
                                </Badge>
                              ) : member.paymentStatus === "exempted" ? (
                                <Badge className="bg-blue-600 text-white text-[10px] h-4 py-0 px-1.5 font-bold">
                                  Exempted
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 text-[10px] h-4 py-0 px-1.5 font-bold">
                                  Unpaid
                                </Badge>
                              )}
                            </div>
                            <span className="text-gray-500 text-xs">{member.email || "N/A"}</span> • <span className="text-gray-500 text-xs">{member.phone || "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-600">
                        {member.joinDate ? format(new Date(member.joinDate), "dd-MM-yyyy") : "N/A"}
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex gap-1 mx-auto"
                          onClick={() => setLocation(`/admin/users/detail/${member.userId}`)}
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
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100" onClick={() => {
                            const name = member.name || member.email || "this user";
                            if (window.confirm(`Deactivate ${name}? The user will be marked inactive.`)) {
                              deactivateMutation.mutate({ userId: member.userId, status: "inactive" });
                            }
                          }}>
                            Deactivate
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-600 bg-red-50 border-red-200 hover:bg-red-100" onClick={() => {
                            const name = member.name || member.email || "this user";
                            if (window.confirm(`Block ${name}? They will lose access until unblocked.`)) {
                              blockMutation.mutate({ userId: member.userId });
                            }
                          }}>
                            Block
                          </Button>
                        </div>
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold">0</Badge>
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-bold">₹ 0.00</Badge>
                      </td>
                      <td className="px-2 py-2 text-center">
                        <div className="flex justify-center gap-1">
                          <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100" onClick={() => setLocation(`/admin/users/detail/${member.userId}`)}>
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 bg-red-50 border-red-200 hover:bg-red-100" onClick={() => {
                            const name = member.name || member.email || `membership #${member.id}`;
                            if (window.confirm(`Delete membership for ${name}? This removes the membership record. Cannot be undone.`)) {
                              deleteMembershipMutation.mutate({ membershipId: member.id });
                            }
                          }}>
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
              <Button variant="outline" size="sm" className="h-8 px-2 border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
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
                    <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className={`h-8 w-8 p-0 ${currentPage === pageNum ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`} onClick={() => setCurrentPage(pageNum)}>
                      {pageNum}
                    </Button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" className="h-8 px-2 border-gray-300 text-gray-700 hover:bg-gray-50" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
