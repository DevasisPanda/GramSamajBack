import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Check, Mail, ChevronsUpDown, ChevronLeft, ChevronRight, Eye, FileText, Trash2, Edit } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function BlockedUsersPage() {
  const utils = trpc.useUtils();
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Fetch all users
  const { data, isLoading } = trpc.admin.getAllUsers.useQuery({ page: 1, pageSize: 1000 });

  // Filter only blocked users
  const blockedUsersRaw = data?.items?.filter(user => user.status === "blocked") || [];

  const unblockMutation = trpc.admin.unblockUser.useMutation({
    onSuccess: () => {
      toast.success("The user has been unblocked and is now active.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("User has been permanently deleted.");
      utils.admin.getAllUsers.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading blocked users...</div>;
  }

  const blockedUsers = blockedUsersRaw.filter((user) => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntries = blockedUsers.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedUsers = blockedUsers.slice(startIndex, startIndex + entriesPerPage);

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
          <h1 className="text-3xl font-bold">Blocked Users</h1>
          <p className="text-gray-500 mt-1">Manage users who have been restricted from accessing the system.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="destructive" className="bg-red-500 hover:bg-red-600" onClick={() => {
          if (selectedIds.size === 0) { toast.error("No users selected"); return; }
          const adminUsers = blockedUsers.filter(u => selectedIds.has(u.id) && u.role === "admin");
          if (adminUsers.length > 0) {
            toast.error("Cannot delete Admin users in bulk. Please deselect Admins first.");
            return;
          }
          if (window.confirm(`Permanently delete ${selectedIds.size} selected blocked user(s)? This removes the users and all associated data. Cannot be undone.`)) {
            selectedIds.forEach((id) => deleteMutation.mutate({ userId: id }));
            setSelectedIds(new Set());
          }
        }}>
          Delete Selected
        </Button>
      </div>

      <Card className="border-gray-200 shadow-sm bg-white">
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
                    <td colSpan={10} className="text-center py-8 text-gray-500">No blocked users found.</td>
                  </tr>
                ) : (
                  paginatedUsers.map((user, index) => (
                    <tr key={user.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
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
                            <span className="font-semibold">N/A</span> / {user.name || "N/A"} <br />
                            <span className="text-gray-500 text-xs">{user.email || "N/A"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 border-r border-gray-200 text-gray-600">
                        {user.createdAt ? format(new Date(user.createdAt), "dd-MM-yyyy") : "N/A"}
                      </td>
                      <td className="px-2 py-2 border-r border-gray-200 text-center">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex gap-1 mx-auto">
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
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 px-2 text-xs text-green-600 bg-green-50 border-green-200 hover:bg-green-100 flex items-center gap-1" 
                            onClick={() => {
                              if (window.confirm("Are you sure you want to unblock this user?")) {
                                unblockMutation.mutate({ userId: user.id });
                              }
                            }}
                            disabled={unblockMutation.isPending}
                          >
                            <Check className="w-3 h-3" /> Unblock
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
                          <Button size="icon" variant="outline" className="h-7 w-7 text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100">
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
    </div>
  );
}
