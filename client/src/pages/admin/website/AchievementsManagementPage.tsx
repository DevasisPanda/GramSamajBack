import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Award, Plus, Trash2, Edit, Trophy } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";

interface AchievementFormData {
  id?: number;
  title: string;
  imageUrl: string;
  description: string;
}

export default function AchievementsManagementPage() {
  const utils = trpc.useUtils();
  
  // State
  const [isOpen, setIsOpen] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState<AchievementFormData | null>(null);
  const [formData, setFormData] = useState<AchievementFormData>({
    title: "",
    imageUrl: "",
    description: "",
  });

  // Queries
  const { data: achievements, isLoading } = trpc.website.getAchievements.useQuery();

  // Mutations
  const createMutation = trpc.website.createAchievement.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsOpen(false);
      resetForm();
      utils.website.getAchievements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add achievement");
    },
  });

  const updateMutation = trpc.website.updateAchievement.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setIsOpen(false);
      resetForm();
      utils.website.getAchievements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update achievement");
    },
  });

  const deleteMutation = trpc.website.deleteAchievement.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.website.getAchievements.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete achievement");
    },
  });

  const resetForm = () => {
    setFormData({ title: "", imageUrl: "", description: "" });
    setEditingAchievement(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsOpen(true);
  };

  const handleOpenEdit = (achievement: any) => {
    setEditingAchievement(achievement);
    setFormData({
      title: achievement.title,
      imageUrl: achievement.imageUrl || "",
      description: achievement.description || "",
    });
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) {
      toast.error("Please provide an achievement title");
      return;
    }

    if (editingAchievement?.id) {
      updateMutation.mutate({
        id: editingAchievement.id,
        title: formData.title,
        imageUrl: formData.imageUrl || null,
        description: formData.description || null,
      });
    } else {
      createMutation.mutate({
        title: formData.title,
        imageUrl: formData.imageUrl || null,
        description: formData.description || null,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this achievement? It will be removed from the public website immediately.")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Achievements Management</h1>
            <p className="text-gray-500 text-sm">Upload and manage organization achievements, milestones, and awards displayed on the public website.</p>
          </div>
        </div>
        <Button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white font-semibold flex gap-2">
          <Plus className="w-5 h-5" /> Add Achievement
        </Button>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-gray-500">Loading achievements...</div>
      ) : !achievements || achievements.length === 0 ? (
        <div className="py-20 text-center text-gray-500 border-2 border-dashed rounded-xl flex flex-col items-center justify-center bg-white">
          <Trophy className="w-16 h-16 text-gray-300 mb-4" />
          <p className="font-semibold text-lg text-gray-700">No Achievements Recorded Yet</p>
          <p className="text-sm text-gray-400 mb-6 max-w-sm">Share and showcase the trust's successes, awards, certificates, and landmark completions.</p>
          <Button onClick={handleOpenAdd} className="bg-amber-500 hover:bg-amber-600 text-white">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Achievement
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {achievements.map((achievement) => (
            <div 
              key={achievement.id} 
              className="rounded-xl border border-gray-200 overflow-hidden flex flex-col bg-white shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
              style={{ minHeight: '380px' }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-amber-500 to-slate-800 p-4 text-center text-white font-bold text-lg">
                {achievement.title}
              </div>
              
              {/* Body image preview */}
              <div className="flex-1 p-4 flex flex-col items-center justify-center bg-slate-50 border-b relative group">
                {achievement.imageUrl ? (
                  <img 
                    src={achievement.imageUrl} 
                    alt={achievement.title} 
                    className="max-h-[200px] object-contain w-full rounded"
                  />
                ) : (
                  <div className="text-gray-400 italic">No Photo Available</div>
                )}
                {achievement.description && (
                  <div className="absolute inset-0 bg-slate-900/90 text-white p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center text-center text-sm leading-relaxed overflow-y-auto">
                    {achievement.description}
                  </div>
                )}
              </div>

              {/* Card Footer displaying description statically if not hover */}
              {achievement.description && (
                <div className="p-4 bg-gray-50/50 text-xs text-gray-600 border-b line-clamp-2">
                  {achievement.description}
                </div>
              )}

              {/* Actions Footer */}
              <div className="p-4 bg-white flex justify-end gap-2 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleOpenEdit(achievement)}
                  className="text-slate-700 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Edit className="w-4 h-4" /> Edit
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDelete(achievement.id)}
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
            <DialogTitle>{editingAchievement ? "Edit Achievement" : "Add Achievement"}</DialogTitle>
            <DialogDescription>
              Enter a title, upload a photo, and write a 1-2 line description for the achievement card.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="achievement-title">Achievement Title *</Label>
              <Input
                id="achievement-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g. CSR Compliance Certificate Received"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="achievement-description">Description (1-2 lines)</Label>
              <Textarea
                id="achievement-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Briefly describe the significance of this milestone..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Photo / Graphic</Label>
              <ImageUpload
                value={formData.imageUrl}
                defaultAspectRatio="video"
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
              />
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingAchievement ? "Save Changes" : "Create Achievement"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
