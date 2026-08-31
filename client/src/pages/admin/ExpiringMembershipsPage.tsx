import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, addDays } from "date-fns";
import { Filter, Trash2, Edit, Eye, FileText, ChevronsUpDown, ChevronLeft, ChevronRight, Clock, RefreshCw, Send, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function ExpiringMembershipsPage() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = trpc.membership.getActiveWithDetails.useQuery({ page: 1, pageSize: 1000 });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"expiring30" | "expired" | "allSubscription">("expiring30");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const utils = trpc.useUtils();

  const renewMutation = trpc.membership.renewByAdmin.useMutation({
    onSuccess: () => {
      toast.success("Membership successfully renewed for 1 year (+365 days)!");
      utils.membership.getActiveWithDetails.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to renew membership");
    }
  });

  const deleteMembershipMutation = trpc.membership.delete.useMutation({
    onSuccess: () => {
      toast.success("Membership deleted successfully");
      utils.membership.getActiveWithDetails.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading expiring memberships...</div>;
  }

  const today = new Date();
  const thirtyDaysFromNow = addDays(today, 30);

  // Filter out lifetime members (since lifetime members pay ₹5,100 once and never expire)
  const subscriptionMembers = (data?.items || []).filter((m) => m.membershipType !== "lifetime");

  const expiring30List = subscriptionMembers.filter((m) => {
    const rawDate = m.renewalDate || m.expiryDate;
    if (!rawDate) return false;
    const expiry = new Date(rawDate);
    return expiry.getTime() <= thirtyDaysFromNow.getTime() && expiry.getTime() >= today.getTime();
  });

  const expiredList = subscriptionMembers.filter((m) => {
    const rawDate = m.renewalDate || m.expiryDate;
    if (!rawDate) return false;
    const expiry = new Date(rawDate);
    return expiry.getTime() < today.getTime();
  });

  const currentModeList = filterMode === "expiring30"
    ? expiring30List
    : filterMode === "expired"
      ? expiredList
      : subscriptionMembers;

  const filteredMembers = currentModeList.filter((m) => 
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expiring Memberships</h1>
          <p className="text-gray-500 mt-1">Manage annual ₹500 subscription renewals and expiry tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-100 text-amber-800 font-bold border-amber-300 px-3 py-1 text-sm">
            {expiring30List.length} Expiring in 30 Days
          </Badge>
          <Badge className="bg-red-100 text-red-800 font-bold border-red-300 px-3 py-1 text-sm">
            {expiredList.length} Overdue / Expired
          </Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          size="sm"
          variant={filterMode === "expiring30" ? "default" : "outline"}
          onClick={() => { setFilterMode("expiring30"); setCurrentPage(1); }}
          className={filterMode === "expiring30" ? "bg-amber-600 hover:bg-amber-700 font-bold text-white" : "border-amber-500 text-amber-700 hover:bg-amber-50 font-bold"}
        >
          🕒 Expiring Soon ({expiring30List.length})
        </Button>
        <Button
          size="sm"
          variant={filterMode === "expired" ? "default" : "outline"}
          onClick={() => { setFilterMode("expired"); setCurrentPage(1); }}
          className={filterMode === "expired" ? "bg-red-600 hover:bg-red-700 font-bold text-white" : "border-red-500 text-red-700 hover:bg-red-50 font-bold"}
        >
          ⚠️ Overdue / Expired ({expiredList.length})
        </Button>
        <Button
          size="sm"
          variant={filterMode === "allSubscription" ? "default" : "outline"}
          onClick={() => { setFilterMode("allSubscription"); setCurrentPage(1); }}
          className="font-bold"
        >
          📋 All Yearly Subscribers ({subscriptionMembers.length})
        </Button>

        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" className="ml-auto bg-red-500 hover:bg-red-600 font-bold" onClick={() => {
            if (window.confirm(`Permanently delete ${selectedIds.size} selected membership(s)?`)) {
              selectedIds.forEach((id) => deleteMembershipMutation.mutate({ membershipId: id }));
              setSelectedIds(new Set());
            }
          }}>
            Delete Selected ({selectedIds.size})
          </Button>
        )}
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
            
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Search:</span>
              <Input 
                className="w-64 h-9 bg-white border-gray-300" 
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
                      <span>All</span>
                    </div>
                  </th>
                  <TableHeader title="Reg.No / Name / Email / Mobile" width="min-w-[280px]" />
                  <TableHeader title="Renewal Date & Status" />
                  <TableHeader title="Detail" />
                  <TableHeader title="Renewal Action" />
                  <TableHeader title="Action" />
                </tr>
              </thead>
              <tbody>
                {paginatedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500 text-sm">
                      No members match the selected filter.
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((member, index) => {
                    const rawDate = member.renewalDate || member.expiryDate;
                    const expiryDateObj = rawDate ? new Date(rawDate) : null;
                    const daysUntilExpiry = expiryDateObj 
                      ? Math.ceil((expiryDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24))
                      : 0;

                    const isPast = daysUntilExpiry < 0;

                    return (
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
                          <div className="flex items-center gap-2">
                            <div>
                              <span className="font-semibold text-gray-900">{member.membershipNumber}</span> / {member.name || "N/A"} <br />
                              <span className="text-gray-500 text-xs">{member.email || "N/A"}</span> • <span className="text-gray-500 text-xs">{member.phone || "N/A"}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 border-r border-gray-200">
                          {expiryDateObj ? (
                            <div>
                              <div className="font-medium text-gray-900">{format(expiryDateObj, "dd-MM-yyyy")}</div>
                              {isPast ? (
                                <Badge variant="destructive" className="text-[10px] h-4 py-0 px-1 font-bold flex items-center gap-1 w-fit mt-0.5">
                                  <AlertTriangle className="w-3 h-3" /> Expired {Math.abs(daysUntilExpiry)} days ago
                                </Badge>
                              ) : (
                                <Badge className="bg-amber-500 text-white text-[10px] h-4 py-0 px-1 font-bold flex items-center gap-1 w-fit mt-0.5">
                                  <Clock className="w-3 h-3" /> Expires in {daysUntilExpiry} days
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
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
                          <div className="flex justify-center gap-1.5 flex-wrap">
                            <Button 
                              size="sm" 
                              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1"
                              onClick={() => {
                                if (window.confirm(`Renew membership for ${member.name || 'this member'} for 1 year (+365 days)?`)) {
                                  renewMutation.mutate({ membershipId: member.id });
                                }
                              }}
                              disabled={renewMutation.isPending}
                            >
                              <RefreshCw className="w-3 h-3" /> Renew (+1 Year)
                            </Button>
                            {member.phone && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-7 px-2 text-xs bg-green-50 text-green-700 border-green-300 hover:bg-green-100 font-bold flex items-center gap-1"
                                onClick={() => {
                                  const phoneClean = (member.phone || '').replace(/\D/g, '');
                                  const text = `Hello ${member.name || 'Member'},\nYour AIRD Trust membership renewal is due on ${expiryDateObj ? format(expiryDateObj, "dd-MM-yyyy") : 'soon'}.\nPlease renew your membership at ${window.location.origin}/member/membership`;
                                  window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(text)}`, '_blank');
                                }}
                              >
                                <Send className="w-3 h-3" /> WhatsApp
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 bg-red-50 border-red-200 hover:bg-red-100" onClick={() => {
                            const name = member.name || member.email || `membership #${member.id}`;
                            if (window.confirm(`Delete membership for ${name}? This removes the membership record. Cannot be undone.`)) {
                              deleteMembershipMutation.mutate({ membershipId: member.id });
                            }
                          }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })
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
