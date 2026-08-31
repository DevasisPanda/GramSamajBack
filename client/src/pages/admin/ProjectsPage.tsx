import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function ProjectsPage() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.project.adminGetAll.useQuery({ page: 1, pageSize: 100 });
  const projects = data?.items || [];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active" as "active" | "completed" | "draft",
    image: "",
  });

  const resetForm = () => {
    setFormData({ title: "", description: "", status: "active", image: "" });
    setEditingId(null);
  };

  const createMutation = trpc.project.create.useMutation({
    onSuccess: () => {
      toast.success("Project created successfully");
      setIsDialogOpen(false);
      resetForm();
      utils.project.adminGetAll.invalidate();
      utils.project.getAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const updateMutation = trpc.project.update.useMutation({
    onSuccess: () => {
      toast.success("Project updated successfully");
      setIsDialogOpen(false);
      resetForm();
      utils.project.adminGetAll.invalidate();
      utils.project.getAll.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.project.delete.useMutation({
    onSuccess: () => {
      toast.success("Project deleted successfully");
      utils.project.adminGetAll.invalidate();
      utils.project.getAll.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this project?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleEdit = (project: any) => {
    setFormData({
      title: project.title,
      description: project.description || "",
      status: project.status,
      image: project.image || "",
    });
    setEditingId(project.id);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateMutation.mutate({ id: editingId, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Projects Management</h1>
          <p className="text-gray-500 mt-1">Manage the NGO's projects displayed on the frontend.</p>
        </div>
        <Button 
          className="bg-teal-600 hover:bg-teal-700" 
          onClick={() => { resetForm(); setIsDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Project
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Project" : "Create New Project"}</DialogTitle>
            <DialogDescription>
              Fill in the details below to {editingId ? "update the" : "create a"} project.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <ImageUpload 
              label="Project Cover Image" 
              value={formData.image} 
              defaultAspectRatio="video"
              onChange={(url) => setFormData(prev => ({ ...prev, image: url }))} 
            />

            <div className="space-y-2">
              <Label>Project Title</Label>
              <Input 
                value={formData.title} 
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required 
                placeholder="E.g., Clean Water Initiative"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={formData.description} 
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required 
                placeholder="Detailed description of the project..."
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(val: any) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Update Project" : "Create Project"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>All Projects</CardTitle>
          <CardDescription>View and manage all your projects.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-4 text-center">Loading projects...</div>
          ) : projects.length === 0 ? (
            <div className="p-8 text-center text-gray-500 border rounded-lg">
              No projects found. Create your first project above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div key={project.id} className="border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col">
                  <div className="w-full aspect-video bg-slate-100 border-b overflow-hidden relative">
                    {project.image ? (
                      <img 
                        src={project.image} 
                        alt={project.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm font-medium">
                        No Image
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg">{project.title}</h3>
                      <Badge variant={project.status === "active" ? "default" : "secondary"}>
                        {project.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-3 mb-4 flex-1">
                      {project.description}
                    </p>
                    <div className="flex justify-between items-center mt-auto pt-4 border-t">
                      <span className="text-xs text-gray-400">
                        {format(new Date(project.createdAt), "MMM d, yyyy")}
                      </span>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600"
                          onClick={() => handleEdit(project)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(project.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
