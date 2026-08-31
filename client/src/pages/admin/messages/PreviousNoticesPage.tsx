import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Mail, Megaphone, Clock, CheckCircle2, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function PreviousNoticesPage() {
  const { data: messages, isLoading } = trpc.message.getPreviousNotices.useQuery();
  const utils = trpc.useUtils();

  const [currentPage, setCurrentPage] = useState(1);
  const entriesPerPage = 5;

  const deleteMutation = trpc.message.deleteMessage.useMutation({
    onSuccess: () => {
      toast.success("Message deleted successfully");
      utils.message.getPreviousNotices.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete message");
    }
  });

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading previous notices...</div>;
  }

  const notices = messages || [];
  const totalEntries = notices.length;
  const totalPages = Math.max(1, Math.ceil(totalEntries / entriesPerPage));
  const startIndex = (currentPage - 1) * entriesPerPage;
  const paginatedNotices = notices.slice(startIndex, startIndex + entriesPerPage);

  const handleDelete = (id: number, subject: string) => {
    if (window.confirm(`Permanently delete the notice "${subject}"? This cannot be undone.`)) {
      deleteMutation.mutate({ id });
      // If we delete the last item on the page, go to the previous page
      if (paginatedNotices.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Communication Log</h1>
          <p className="text-gray-500 mt-1">Review all historical messages and broadcasts sent by the system.</p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-1">
          {notices.length} Total Records
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message History</CardTitle>
          <CardDescription>Comprehensive list of all past direct messages and bulk notices.</CardDescription>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500 mt-4">
              <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-900">No messages sent yet</p>
              <p>Your communication history will appear here once you send a message.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-4">
                {paginatedNotices.map((notice) => (
                  <div key={notice.id} className="border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white hover:bg-gray-50 transition-colors shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {notice.messageType === "bulk" ? (
                          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-md">
                            <Megaphone className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-2 bg-blue-100 text-blue-700 rounded-md">
                            <Mail className="w-4 h-4" />
                          </div>
                        )}
                        <h3 className="font-semibold text-lg">{notice.subject}</h3>
                        <Badge variant={notice.messageType === "bulk" ? "default" : "secondary"} className="capitalize">
                          {notice.messageType}
                        </Badge>
                      </div>
                      <p className="text-gray-700 mb-3 text-sm">{notice.content}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          Sent {notice.sentAt ? format(new Date(notice.sentAt), "MMM d, yyyy 'at' h:mm a") : "Unknown date"}
                        </div>
                        <div className="flex items-center gap-1.5 text-green-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Status: <span className="capitalize">{notice.status}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 self-end md:self-center">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 text-red-600 bg-red-50 border-red-200 hover:bg-red-100"
                        onClick={() => handleDelete(notice.id, notice.subject || "Untitled Notice")}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Footer */}
              <div className="p-4 border-t border-gray-100 text-sm flex flex-col sm:flex-row justify-between items-center gap-4 text-gray-600 mt-6">
                <div>
                  Showing {totalEntries > 0 ? startIndex + 1 : 0} to {Math.min(startIndex + entriesPerPage, totalEntries)} of {totalEntries} entries
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" className="h-8 px-2 bg-white" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                  </Button>
                  <div className="flex gap-1">
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button key={pageNum} variant={currentPage === pageNum ? "default" : "outline"} size="sm" className="h-8 w-8 p-0 bg-white text-gray-700 border-gray-300" onClick={() => setCurrentPage(pageNum)}>
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" className="h-8 px-2 bg-white" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Next <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
