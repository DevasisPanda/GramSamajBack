import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Receipt, Plus, Trash2, Edit, FileText } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface AuditFormData {
  id?: number;
  name: string;
  imageUrl: string;
}

export default function AuditManagementPage() {
  const utils = trpc.useUtils();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [editingAudit, setEditingAudit] = useState<AuditFormData | null>(null);
  const [formData, setFormData] = useState<AuditFormData>({
    name: "",
    imageUrl: "",
  });

  // Queries
  const { data: audits, isLoading } = trpc.website.getAudits.useQuery();

  // Mutations
  const createMutation = trpc.website.createAudit.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsOpen(false);
      resetForm();
      utils.website.getAudits.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add audit report");
    },
  });

  const updateMutation = trpc.website.updateAudit.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsOpen(false);
      resetForm();
      utils.website.getAudits.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update audit report");
    },
  });

  const deleteMutation = trpc.website.deleteAudit.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.website.getAudits.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete audit report");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", imageUrl: "" });
    setEditingAudit(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (audit: any) => {
    setEditingAudit(audit);
    setFormData({
      name: audit.name,
      imageUrl: audit.imageUrl || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error("Please provide the audit year/title");
      return;
    }

    if (editingAudit?.id) {
      updateMutation.mutate({
        id: editingAudit.id,
        name: formData.name,
        imageUrl: formData.imageUrl || null,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        imageUrl: formData.imageUrl || null,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this audit report? It will be removed from the public website immediately.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Receipt className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Reports Management</h1>
            <p className="text-gray-500 text-sm">Upload, edit, and manage dynamic annual Audit Report documents displayed on the website.</p>
          </div>
        </div>
        <Button onClick={handleOpenAdd} className="bg-teal-600 hover:bg-teal-700 text-white font-semibold flex gap-2">
          <Plus className="w-5 h-5" /> Add Audit Report
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading audit reports...</div>
      ) : !audits || audits.length === 0 ? (
        <div className="py-20 text-center text-gray-500 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-white">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <p className="font-semibold text-lg text-gray-700">No Audits Uploaded Yet</p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">Provide audit documents and year labels for legal compliance and public transparency.</p>
          <Button onClick={handleOpenAdd} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Audit
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {audits.map((audit) => (
            <div 
              key={audit.id} 
              className="rounded-xl border border-gray-200 overflow-hidden flex flex-col bg-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
              style={{ minHeight: '350px' }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-teal-600 to-slate-800 p-4 text-center text-white font-bold text-lg">
                {audit.name}
              </div>
              
              {/* Body image preview */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-50 border-b relative group">
                {audit.imageUrl ? (
                  <img 
                    src={audit.imageUrl} 
                    alt={audit.name} 
                    className="max-h-[200px] object-contain w-full rounded"
                  />
                ) : (
                  <div className="text-gray-400 italic">Report document image not available</div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-white flex justify-end gap-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenEdit(audit)}
                  className="text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Edit className="w-4 h-4" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDelete(audit.id)}
                  disabled={deleteMutation.isPending}
                  className="text-white bg-red-600 hover:bg-red-700 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-white max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAudit ? "Edit Audit Report" : "Add Audit Report"}</DialogTitle>
            <DialogDescription>
              Provide the financial year name and upload a graphic screenshot page of the audit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="audit-name">Financial Year / Name *</Label>
              <Input
                id="audit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Audit Report 2024-2025"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Report Image (Optional)</Label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              />
              <p className="text-[10px] text-gray-400">If no image is uploaded, it will render with a document-placeholder text on the website.</p>
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-teal-600 hover:bg-teal-700 text-white font-bold"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingAudit ? "Save Changes" : "Create Audit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
