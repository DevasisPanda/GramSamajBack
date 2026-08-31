import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Filter, Trash2, Eye, ChevronsUpDown, ChevronLeft, ChevronRight, Award } from "lucide-react";
import { CaptureActions } from "@/components/CaptureActions";
import { Button } from "@/components/ui/button";
import { VerifiableDocument } from "@/components/VerifiableDocument";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ActiveCertificatesPage() {
  const { data: certificates, isLoading: isCertsLoading } = trpc.document.getCertificates.useQuery();
  const { data: idCardsData, isLoading: isIDCardsLoading } = trpc.document.getIDCards.useQuery();
  const { data: appointmentLettersData, isLoading: isApptsLoading } = trpc.document.getAppointmentLetters.useQuery();
  const { data: dbTemplates } = trpc.document.getTemplateConfigs.useQuery();
  const [searchTerm, setSearchTerm] = useState("");
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();

  const deleteMutation = trpc.document.deleteCertificate.useMutation({
    onSuccess: () => {
      toast.success("Certificate deleted successfully");
      utils.document.getCertificates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const deleteIDCardMutation = trpc.document.deleteIDCard.useMutation({
    onSuccess: () => {
      toast.success("ID Card deleted successfully");
      utils.document.getIDCards.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const deleteAppointmentMutation = trpc.document.deleteAppointmentLetter.useMutation({
    onSuccess: () => {
      toast.success("Appointment Letter deleted successfully");
      utils.document.getAppointmentLetters.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  // Modal State
  const [selectedPreviewCert, setSelectedPreviewCert] = useState<any>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  const isLoading = isCertsLoading || isIDCardsLoading || isApptsLoading;

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading documents...</div>;
  }

  const activeCertsRaw = certificates?.filter(c => c.certificateType !== "visitor") || [];
  const idCardsRaw = idCardsData || [];
  const apptLettersRaw = appointmentLettersData || [];

  const mergedItems = [
    ...activeCertsRaw.map(c => ({
      id: `cert:${c.id}`,
      dbId: c.id,
      type: "certificate",
      certificateNumber: c.certificateNumber,
      recipientName: c.recipientName || "N/A",
      recipientEmail: c.recipientEmail || "N/A",
      certificateType: c.certificateType,
      title: c.title,
      description: c.description || "",
      issueDate: c.issueDate,
      expiryDate: c.expiryDate,
      status: c.status,
      profileImage: null,
    })),
    ...idCardsRaw.map(card => ({
      id: `id_card:${card.id}`,
      dbId: card.id,
      type: "id_card",
      certificateNumber: card.cardNumber,
      recipientName: card.memberName || "N/A",
      recipientEmail: card.memberEmail || "N/A",
      certificateType: "id_card",
      title: "Digital ID Card",
      description: card.memberDesignation || "Trust Member",
      issueDate: card.issueDate,
      expiryDate: card.expiryDate,
      status: card.status,
      profileImage: card.memberProfileImage,
      memberCity: card.memberCity,
      memberPhone: card.memberPhone,
    })),
    ...apptLettersRaw.map(appt => ({
      id: `appointment:${appt.id}`,
      dbId: appt.id,
      type: "appointment",
      certificateNumber: appt.letterNumber,
      recipientName: appt.recipientName || "N/A",
      recipientEmail: appt.recipientEmail || "N/A",
      certificateType: "appointment",
      title: "Appointment Letter",
      description: appt.position || "Official Appointee",
      issueDate: appt.appointmentDate,
      expiryDate: null,
      status: "active",
      profileImage: null,
      memberPhone: appt.recipientPhone,
    }))
  ];

  const filteredItems = mergedItems.filter((item) => 
    item.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.certificateType.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalEntries = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedItems = filteredItems.slice(startIndex, startIndex + entriesPerPage);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleEntriesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEntriesPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const TableHeader = ({ title, width = "auto" }: { title: string, width?: string }) => (
    <th className={`px-4 py-3 border-r border-gray-200 align-middle ${width !== "auto" ? width : ""}`}>
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
          <h1 className="text-3xl font-bold text-gray-900">Active Certificates & ID Cards</h1>
          <p className="text-gray-500 mt-1">Review and manage all issued activity certificates, memberships, appointment letters, and digital ID cards.</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Button variant="outline" className="flex gap-2 items-center text-gray-700 bg-white">
          <Filter className="w-4 h-4" /> Filter
        </Button>
        <Button variant="destructive" className="bg-red-500 hover:bg-red-600" onClick={() => {
          if (selectedIds.size === 0) { toast.error("No documents selected"); return; }
          if (window.confirm(`Permanently delete ${selectedIds.size} selected document(s)? This cannot be undone.`)) {
            selectedIds.forEach((key) => {
              const [type, dbId] = key.split(":");
              if (type === "id_card") {
                deleteIDCardMutation.mutate({ cardId: parseInt(dbId) });
              } else if (type === "appointment") {
                deleteAppointmentMutation.mutate({ letterId: parseInt(dbId) });
              } else {
                deleteMutation.mutate({ certificateId: parseInt(dbId) });
              }
            });
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
                  <th className="px-3 py-3 border-r border-gray-200 w-12 align-middle text-center text-gray-500 font-bold">
                    Sr.No.
                  </th>
                  <th className="px-3 py-3 border-r border-gray-200 w-16 align-middle text-center">
                    <input type="checkbox" className="rounded border-gray-300"
                      checked={selectedIds.size === paginatedItems.length && paginatedItems.length > 0}
                      onChange={() => {
                        if (selectedIds.size === paginatedItems.length) {
                          setSelectedIds(new Set());
                        } else {
                          setSelectedIds(new Set(paginatedItems.map(item => item.id)));
                        }
                      }} />
                  </th>
                  <TableHeader title="Document No. / Recipient Details" width="min-w-[320px]" />
                  <TableHeader title="Document Type / Title" />
                  <TableHeader title="Issue Date" />
                  <TableHeader title="Expiry Date" />
                  <TableHeader title="Preview" />
                  <th className="px-4 py-3 border-r border-gray-200 align-middle text-center text-gray-500 font-bold">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">No issued documents found.</td>
                  </tr>
                ) : (
                  paginatedItems.map((item: any, index) => (
                    <tr key={item.id} className="bg-white border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-3 py-3 border-r border-gray-200 text-center text-gray-600 font-medium">
                        {startIndex + index + 1}
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200 text-center">
                        <input type="checkbox" className="rounded border-gray-300"
                          checked={selectedIds.has(item.id)}
                          onChange={() => {
                            const next = new Set(selectedIds);
                            if (next.has(item.id)) next.delete(item.id);
                            else next.add(item.id);
                            setSelectedIds(next);
                          }} />
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-gray-800 leading-snug whitespace-normal">
                        <span className="font-semibold">{item.certificateNumber}</span> <br />
                        <span className="text-gray-900 font-medium">{item.recipientName}</span> <br />
                        <span className="text-gray-500 text-xs">{item.recipientEmail}</span>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-gray-600">
                        <Badge className={`${item.type === 'id_card' ? 'bg-blue-100 text-blue-800' : item.type === 'appointment' ? 'bg-indigo-100 text-indigo-800' : 'bg-purple-100 text-purple-800'} border-0 capitalize mb-1`}>
                          {item.certificateType === 'id_card' ? 'ID Card' : item.certificateType}
                        </Badge>
                        <div className="text-gray-900 text-xs font-semibold">{item.title}</div>
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-gray-600">
                        {item.issueDate ? format(new Date(item.issueDate), "dd-MM-yyyy") : "N/A"}
                      </td>
                      <td className="px-4 py-3 border-r border-gray-200 text-gray-600">
                        {item.expiryDate ? format(new Date(item.expiryDate), "dd-MM-yyyy") : "Lifetime"}
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200 text-center">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-7 px-2 text-xs bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100 flex gap-1 mx-auto"
                          onClick={() => {
                            setSelectedPreviewCert(item);
                            setIsPreviewModalOpen(true);
                          }}
                        >
                          <Eye className="w-3 h-3" /> View
                        </Button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button size="icon" variant="outline" className="h-7 w-7 text-red-600 bg-red-50 border-red-200 hover:bg-red-100" onClick={() => {
                          const name = item.recipientName || item.certificateNumber || "this item";
                          const displayType = item.type === "id_card" ? "ID Card" : item.type === "appointment" ? "Appointment Letter" : "certificate";
                          if (window.confirm(`Permanently delete ${displayType} for ${name}? This cannot be undone.`)) {
                            if (item.type === "id_card") {
                              deleteIDCardMutation.mutate({ cardId: item.dbId });
                            } else if (item.type === "appointment") {
                              deleteAppointmentMutation.mutate({ letterId: item.dbId });
                            } else {
                              deleteMutation.mutate({ certificateId: item.dbId });
                            }
                          }
                        }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
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

      {/* ==================== PREVIEW CERTIFICATE DIALOG ==================== */}
      <Dialog open={isPreviewModalOpen} onOpenChange={setIsPreviewModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800 font-bold text-xl">
              <Award className="w-5 h-5 text-purple-600" />
              {selectedPreviewCert?.type === "id_card" ? "ID Card Preview" : selectedPreviewCert?.type === "appointment" ? "Appointment Letter Preview" : "Certificate Preview"}
            </DialogTitle>
            <DialogDescription className="text-gray-400 text-xs">
              Verify layout before printing or exporting.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex justify-center">
            {selectedPreviewCert && (
              selectedPreviewCert.type === 'id_card' ? (
                <VerifiableDocument
                  templateId="id_card"
                  fieldValues={{
                    photo: selectedPreviewCert.profileImage || "",
                    fullName: selectedPreviewCert.recipientName || "",
                    cardNumber: selectedPreviewCert.certificateNumber,
                    mobile: selectedPreviewCert.memberPhone || "N/A",
                    email: selectedPreviewCert.recipientEmail || "N/A",
                    city: selectedPreviewCert.memberCity || "N/A",
                    issueDate: selectedPreviewCert.issueDate ? format(new Date(selectedPreviewCert.issueDate), "dd-MM-yyyy") : "",
                    expiryDate: selectedPreviewCert.expiryDate ? format(new Date(selectedPreviewCert.expiryDate), "dd-MM-yyyy") : "Lifetime",
                  }}
                  dbTemplates={dbTemplates}
                  cardRef={previewRef}
                  className="max-w-[320px] mx-auto rounded-2xl"
                />
              ) : selectedPreviewCert.type === 'appointment' ? (
                <VerifiableDocument
                  templateId="appointment"
                  fieldValues={{
                    letterNumber: selectedPreviewCert.certificateNumber,
                    name1: selectedPreviewCert.recipientName || "",
                    name2: selectedPreviewCert.recipientName || "",
                    post: selectedPreviewCert.description || "",
                    mobile: selectedPreviewCert.memberPhone || "",
                    fromDate: selectedPreviewCert.issueDate ? format(new Date(selectedPreviewCert.issueDate), "dd/MM/yyyy") : "",
                    toDate: "Ongoing",
                  }}
                  dbTemplates={dbTemplates}
                  cardRef={previewRef}
                  className="max-w-lg mx-auto rounded-lg"
                />
              ) : (
                <VerifiableDocument
                  templateId={selectedPreviewCert.certificateType}
                  fieldValues={
                    selectedPreviewCert.certificateType === 'achievement'
                      ? {
                          fullName: selectedPreviewCert.recipientName || "Registered Recipient",
                          description: selectedPreviewCert.description || "",
                          issueDate: selectedPreviewCert.issueDate ? format(new Date(selectedPreviewCert.issueDate), "dd/MM/yyyy") : "",
                          certificateNumber: selectedPreviewCert.certificateNumber,
                        }
                      : {
                          fullName: selectedPreviewCert.recipientName || "Registered Recipient",
                          membershipNumber: selectedPreviewCert.certificateNumber,
                          joinDate: selectedPreviewCert.issueDate ? format(new Date(selectedPreviewCert.issueDate), "dd/MM/yyyy") : "",
                          expiryDate: selectedPreviewCert.expiryDate ? format(new Date(selectedPreviewCert.expiryDate), "dd/MM/yyyy") : "Lifetime",
                        }
                  }
                  dbTemplates={dbTemplates}
                  cardRef={previewRef}
                  className="max-w-lg mx-auto rounded-lg"
                />
              )
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex gap-2 justify-end">
            <CaptureActions cardRef={previewRef} filename={selectedPreviewCert?.type === "id_card" ? "ID_Card" : selectedPreviewCert?.type === "appointment" ? "Appointment_Letter" : "Certificate"} />
            <Button variant="outline" className="text-gray-700 bg-white" onClick={() => setIsPreviewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
