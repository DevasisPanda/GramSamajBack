import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Users, Plus, Pencil, Trash2, Eye, EyeOff, ShieldCheck, ArrowUp, ArrowDown } from "lucide-react";

const getAdminMemberImage = (m: any) => {
  if (!m.image) return `/assets/CEO${m.displayOrder || 1}.jpeg`;
  if (m.image.startsWith('/assets/') || m.image.startsWith('http') || m.image.startsWith('data:')) {
    return m.image;
  }
  return `/assets/CEO${m.displayOrder || 1}.jpeg`;
};

export default function ManagementBodyAdminPage() {
  const utils = trpc.useUtils();
  const { data: members, isLoading } = trpc.managementBody.adminGetAll.useQuery();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    image: "",
    quote: "",
    bio: "",
    tag: "",
    displayOrder: 1,
    status: "active" as "active" | "hidden",
    points: [] as { icon: string; title: string; description: string }[],
  });

  const [pointInput, setPointInput] = useState({
    icon: "verified",
    title: "",
    description: "",
  });

  // Mutations
  const createMutation = trpc.managementBody.create.useMutation({
    onSuccess: () => {
      toast.success("Management member added successfully!");
      setIsModalOpen(false);
      resetForm();
      utils.managementBody.adminGetAll.invalidate();
      utils.managementBody.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add member");
    },
  });

  const updateMutation = trpc.managementBody.update.useMutation({
    onSuccess: () => {
      toast.success("Management member updated successfully!");
      setIsModalOpen(false);
      resetForm();
      utils.managementBody.adminGetAll.invalidate();
      utils.managementBody.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update member");
    },
  });

  const deleteMutation = trpc.managementBody.delete.useMutation({
    onSuccess: () => {
      toast.success("Management member deleted successfully!");
      utils.managementBody.adminGetAll.invalidate();
      utils.managementBody.getAll.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete member");
    },
  });

  const resetForm = () => {
    setEditingMember(null);
    setFormData({
      name: "",
      role: "",
      image: "",
      quote: "",
      bio: "",
      tag: "",
      displayOrder: (members?.length || 0) + 1,
      status: "active",
      points: [],
    });
    setPointInput({ icon: "verified", title: "", description: "" });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (member: any) => {
    setEditingMember(member);
    setFormData({
      name: member.name || "",
      role: member.role || "",
      image: member.image || "",
      quote: member.quote || "",
      bio: member.bio || "",
      tag: member.tag || member.role || "",
      displayOrder: member.displayOrder || 1,
      status: member.status || "active",
      points: Array.isArray(member.points) ? member.points : [],
    });
    setIsModalOpen(true);
  };

  const handleAddPoint = () => {
    if (!pointInput.title) {
      toast.error("Please enter a point title");
      return;
    }
    setFormData({
      ...formData,
      points: [...formData.points, { ...pointInput }],
    });
    setPointInput({ icon: "verified", title: "", description: "" });
  };

  const handleRemovePoint = (index: number) => {
    const updated = [...formData.points];
    updated.splice(index, 1);
    setFormData({ ...formData, points: updated });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.role || !formData.image) {
      toast.error("Please fill in Name, Role, and upload a Photo");
      return;
    }

    if (editingMember) {
      updateMutation.mutate({
        id: editingMember.id,
        ...formData,
      });
    } else {
      createMutation.mutate({
        ...formData,
      });
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}" from the Management Team?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#061941] flex items-center gap-2">
            <Users className="w-7 h-7 text-[#fed813] fill-[#061941]" />
            Management Team Module
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage the 12 Trustees & Executive Leaders rendered on the public website. Add, edit, reorder, or remove team members dynamically.
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="bg-[#061941] hover:bg-[#0a255c] text-white font-extrabold gap-2">
          <Plus className="w-4 h-4 text-[#fed813]" /> Add New Leader
        </Button>
      </div>

      {/* Members Grid / Table */}
      <Card>
        <CardHeader>
          <CardTitle>Management Team Members ({members?.length || 0})</CardTitle>
          <CardDescription>Drag or adjust display order to re-arrange hierarchy on public pages.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-gray-500 font-semibold">Loading management team...</div>
          ) : members && members.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {members.map((m) => (
                <div key={m.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative">
                  <div className="flex items-start gap-4">
                    <img 
                      src={getAdminMemberImage(m)} 
                      alt={m.name} 
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=061941&color=fed813&size=256`;
                      }}
                      className="w-16 h-16 rounded-xl object-cover border border-gray-300 shrink-0" 
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                        Order #{m.displayOrder}
                      </span>
                      <h3 className="font-extrabold text-[#061941] text-base leading-tight mt-1">{m.name}</h3>
                      <p className="text-xs font-semibold text-amber-700 mt-0.5">{m.role}</p>
                      <p className="text-[11px] text-gray-500 mt-1 line-clamp-2">{m.quote}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-200">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${m.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-200 text-gray-700"}`}>
                      {m.status === "active" ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {m.status}
                    </span>

                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1" onClick={() => handleOpenEditModal(m)}>
                        <Pencil className="w-3.5 h-3.5 text-blue-600" /> Edit
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 px-2 text-xs gap-1 text-red-600 hover:bg-red-50" onClick={() => handleDelete(m.id, m.name)}>
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-gray-500 font-semibold">No management members found. Click "Add New Leader" to get started!</div>
          )}
        </CardContent>
      </Card>

      {/* Edit / Add Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#061941]">
              <Users className="w-5 h-5 text-amber-500" />
              {editingMember ? "Edit Management Leader" : "Add New Management Leader"}
            </DialogTitle>
            <DialogDescription>
              Fill out the details below. Supports rich quotes, multiline bio, and key highlight bullet points.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 py-2">
            {/* Photo Upload */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <ImageUpload
                label="Leader Photograph *"
                value={formData.image}
                onChange={(url) => setFormData({ ...formData, image: url })}
                defaultAspectRatio="portrait"
              />
              <p className="text-xs text-gray-500 mt-1">Upload official passport photo or portrait.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="font-bold">Full Name *</Label>
                <Input placeholder="e.g. Solanki Dashrathbhai Narsinhbhai" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div>
                <Label className="font-bold">Role / Designation *</Label>
                <Input placeholder="e.g. President & Trustee" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="font-bold">Badge Tag</Label>
                <Input placeholder="e.g. President & Founder" value={formData.tag} onChange={(e) => setFormData({ ...formData, tag: e.target.value })} />
              </div>
              <div>
                <Label className="font-bold">Display Order</Label>
                <Input type="number" min={1} value={formData.displayOrder} onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 1 })} required />
              </div>
              <div>
                <Label className="font-bold">Visibility Status</Label>
                <select className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm" value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}>
                  <option value="active">Active (Visible on Web)</option>
                  <option value="hidden">Hidden (Draft)</option>
                </select>
              </div>
            </div>

            <div>
              <Label className="font-bold">Key Statement / Quote</Label>
              <Textarea placeholder='e.g. "True social service requires complete selflessness..."' rows={2} value={formData.quote} onChange={(e) => setFormData({ ...formData, quote: e.target.value })} />
            </div>

            <div>
              <Label className="font-bold">Detailed Biography (Unlimited text & paragraphs)</Label>
              <Textarea placeholder="Enter full biography, career journey, accomplishments, education, and background details..." rows={10} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} />
            </div>

            {/* Key Points / Highlights Builder */}
            <div className="space-y-3 pt-3 border-t">
              <Label className="font-bold text-[#061941] block">Key Highlights & Accomplishments</Label>
              {formData.points.map((pt, idx) => (
                <div key={idx} className="flex items-center justify-between bg-slate-100 p-3 rounded-lg text-xs border">
                  <div>
                    <span className="font-bold text-[#061941]">• [{pt.icon}] {pt.title}:</span> {pt.description}
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => handleRemovePoint(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border">
                <Input placeholder="Icon (e.g. visibility, school, badge)" value={pointInput.icon} onChange={(e) => setPointInput({ ...pointInput, icon: e.target.value })} />
                <Input placeholder="Point Title (e.g. Visionary Leadership)" value={pointInput.title} onChange={(e) => setPointInput({ ...pointInput, title: e.target.value })} />
                <Input placeholder="Description" value={pointInput.description} onChange={(e) => setPointInput({ ...pointInput, description: e.target.value })} />
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleAddPoint} className="w-full text-xs font-bold gap-1">
                <Plus className="w-3.5 h-3.5" /> Add Highlight Point
              </Button>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#061941] hover:bg-[#0a255c] text-white font-extrabold" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingMember ? "Save Changes" : "Create Leader"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
