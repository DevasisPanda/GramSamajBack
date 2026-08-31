import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Check, Trash2, Mail } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { PageLoader } from "@/components/ui/page-loader";

export default function EnquiriesPage() {
  const [location] = useLocation();
  const isResolvedView = location.includes("/resolved");
  const [selectedEnquiry, setSelectedEnquiry] = useState<any>(null);
  const [deleteEnquiryId, setDeleteEnquiryId] = useState<number | null>(null);

  const utils = trpc.useContext();
  const { data: enquiries, isLoading } = trpc.enquiry.list.useQuery();

  const markAsReadMutation = trpc.enquiry.markAsRead.useMutation({
    onSuccess: () => {
      toast.success("Enquiry marked as read");
      utils.enquiry.list.invalidate();
      setSelectedEnquiry((prev: any) => prev ? { ...prev, isRead: true } : null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.enquiry.delete.useMutation({
    onSuccess: () => {
      toast.success("Enquiry deleted successfully");
      utils.enquiry.list.invalidate();
      setSelectedEnquiry(null);
      setDeleteEnquiryId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  if (isLoading) {
    return <PageLoader label="Loading enquiries..." fullScreen />;
  }

  const filteredEnquiries = enquiries?.filter(e => isResolvedView ? e.isRead : !e.isRead) || [];

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Enquiries"
        description="Manage messages received from the Contact Us page."
      />

      <Card>
        <CardHeader>
          <CardTitle>{isResolvedView ? "Resolved Enquiries" : "New Enquiries"}</CardTitle>
          <CardDescription>
            {isResolvedView 
              ? "View previously read and resolved enquiries." 
              : "Review incoming enquiries from the public."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    <EmptyState
                      icon={Mail}
                      title="No enquiries found"
                      description="There are no contact messages matching your selection."
                    />
                  </TableCell>
                </TableRow>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell>{new Date(enquiry.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{enquiry.name}</TableCell>
                    <TableCell>{enquiry.subject}</TableCell>
                    <TableCell>
                      {enquiry.isRead ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700">Read</Badge>
                      ) : (
                        <Badge variant="default" className="bg-blue-600">New</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedEnquiry(enquiry)}>
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>
                      {!enquiry.isRead && (
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          onClick={() => markAsReadMutation.mutate({ id: enquiry.id })}
                          disabled={markAsReadMutation.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" /> Resolve
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={() => setDeleteEnquiryId(enquiry.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedEnquiry} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
        {selectedEnquiry && (
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enquiry Details</DialogTitle>
              <DialogDescription>
                Received on {new Date(selectedEnquiry.createdAt).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4">
              <div className="grid grid-cols-4 gap-2 items-center">
                <span className="font-semibold text-sm">From:</span>
                <span className="col-span-3 text-sm">{selectedEnquiry.name} ({selectedEnquiry.email})</span>
              </div>
              {selectedEnquiry.phone && (
                <div className="grid grid-cols-4 gap-2 items-center">
                  <span className="font-semibold text-sm">Phone:</span>
                  <span className="col-span-3 text-sm">{selectedEnquiry.phone}</span>
                </div>
              )}
              <div className="grid grid-cols-4 gap-2 items-start">
                <span className="font-semibold text-sm">Subject:</span>
                <span className="col-span-3 text-sm font-medium">{selectedEnquiry.subject}</span>
              </div>
              <div className="mt-4 border p-3 rounded-md bg-muted/20 whitespace-pre-wrap text-sm">
                {selectedEnquiry.message}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              {!selectedEnquiry.isRead && (
                <Button 
                  onClick={() => markAsReadMutation.mutate({ id: selectedEnquiry.id })}
                  disabled={markAsReadMutation.isPending}
                >
                  Mark as Read
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedEnquiry(null)}>Close</Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
      <ConfirmDialog
        isOpen={deleteEnquiryId !== null}
        onClose={() => setDeleteEnquiryId(null)}
        onConfirm={() => {
          if (deleteEnquiryId !== null) {
            deleteMutation.mutate({ id: deleteEnquiryId });
          }
        }}
        title="Delete Enquiry"
        description="Are you sure you want to delete this enquiry message? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
