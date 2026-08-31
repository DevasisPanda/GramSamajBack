import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Award, Plus, Trash2, Edit, Check } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface OrgCertFormData {
  id?: number;
  name: string;
  imageUrl: string;
  description: string;
}

export default function OrganizationCertificatesPage() {
  const utils = trpc.useUtils();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<OrgCertFormData | null>(null);
  const [formData, setFormData] = useState<OrgCertFormData>({
    name: "",
    imageUrl: "",
    description: "",
  });

  // Queries
  const { data: certificates, isLoading } = trpc.document.getOrgCertificates.useQuery();

  // Mutations
  const createMutation = trpc.document.createOrgCertificate.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsOpen(false);
      resetForm();
      utils.document.getOrgCertificates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create certificate");
    },
  });

  const updateMutation = trpc.document.updateOrgCertificate.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsOpen(false);
      resetForm();
      utils.document.getOrgCertificates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update certificate");
    },
  });

  const deleteMutation = trpc.document.deleteOrgCertificate.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.document.getOrgCertificates.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete certificate");
    },
  });

  const resetForm = () => {
    setFormData({ name: "", imageUrl: "", description: "" });
    setEditingCert(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (cert: any) => {
    setEditingCert(cert);
    setFormData({
      name: cert.name,
      imageUrl: cert.imageUrl,
      description: cert.description || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.imageUrl) {
      toast.error("Please provide a name and upload an image");
      return;
    }

    if (editingCert?.id) {
      updateMutation.mutate({
        id: editingCert.id,
        name: formData.name,
        imageUrl: formData.imageUrl,
        description: formData.description,
      });
    } else {
      createMutation.mutate({
        name: formData.name,
        imageUrl: formData.imageUrl,
        description: formData.description,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this organization certificate? It will be removed from the public page immediately.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Award className="w-8 h-8 text-orange-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Organization Certificates</h1>
            <p className="text-gray-500 text-sm">Upload and manage official certifications (Registration, 80G, 12A, CSR, etc.) displayed on the public website.</p>
          </div>
        </div>
        <Button onClick={handleOpenAdd} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold flex gap-2">
          <Plus className="w-5 h-5" /> Add Certificate
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading organization certificates...</div>
      ) : !certificates || certificates.length === 0 ? (
        <div className="py-20 text-center text-gray-500 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-white">
          <Award className="w-16 h-16 text-gray-300 mb-4" />
          <p className="font-semibold text-lg text-gray-700">No Certificates Added Yet</p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">Add official NGO registration letters, tax certificates, and compliance documents.</p>
          <Button onClick={handleOpenAdd} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Certificate
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {certificates.map((cert) => (
            <div 
              key={cert.id} 
              className="rounded-xl border border-gray-200 overflow-hidden flex flex-col bg-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
              style={{ minHeight: '380px' }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-orange-500 to-slate-800 p-4 text-center text-white font-bold text-lg">
                {cert.name}
              </div>
              
              {/* Body image preview */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-50 border-b relative group">
                <img 
                  src={cert.imageUrl} 
                  alt={cert.name} 
                  className="max-h-[220px] object-contain w-full rounded"
                />
                {cert.description && (
                  <div className="absolute inset-0 bg-slate-900/90 text-white p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-center text-sm leading-relaxed overflow-y-auto">
                    {cert.description}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="p-4 bg-white flex justify-end gap-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenEdit(cert)}
                  className="text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Edit className="w-4 h-4" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleDelete(cert.id)}
                  className="text-red-600 border-red-100 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg bg-white">
          <DialogHeader>
            <DialogTitle className="text-slate-900 flex items-center gap-2 text-xl font-bold">
              <Award className="w-6 h-6 text-orange-600" />
              {editingCert ? "Edit Certificate" : "Add Organization Certificate"}
            </DialogTitle>
            <DialogDescription>
              {editingCert ? "Modify existing certificate settings and details." : "Upload new official certificate details for public viewing."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cert-name">Certificate Name *</Label>
              <Input
                id="cert-name"
                placeholder="e.g. 80G Certificate, NGO Darpan ID"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-image">Certificate Image *</Label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cert-description">Short Description (Optional)</Label>
              <Textarea
                id="cert-description"
                placeholder="Provide compliance registration code or validation details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : (
                  <span className="flex items-center gap-1.5"><Check className="w-4 h-4" /> Save Certificate</span>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
