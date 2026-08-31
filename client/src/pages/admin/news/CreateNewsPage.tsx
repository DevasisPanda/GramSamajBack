import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Newspaper, Plus, Trash2, Calendar, Link as LinkIcon, Check, Loader2, Eye, EyeOff, Edit, X } from "lucide-react";
import { format } from "date-fns";

export default function CreateNewsPage() {
  const utils = trpc.useUtils();

  // State
  const [formData, setFormData] = useState({
    text: "",
    link: "",
  });
  const [editingItem, setEditingItem] = useState<{ id: number; text: string; link: string } | null>(null);

  // Queries
  const { data: newsItems, isLoading } = trpc.news.adminList.useQuery();

  // Mutations
  const createMutation = trpc.news.create.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setFormData({ text: "", link: "" });
      utils.news.adminList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to publish announcement");
    },
  });

  const updateMutation = trpc.news.update.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setFormData({ text: "", link: "" });
      setEditingItem(null);
      utils.news.adminList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update announcement");
    },
  });

  const deleteMutation = trpc.news.delete.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      if (editingItem?.id === res.deletedId) {
        setEditingItem(null);
        setFormData({ text: "", link: "" });
      }
      utils.news.adminList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete announcement");
    },
  });

  const toggleMutation = trpc.news.toggleActive.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.news.adminList.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) {
      toast.error("Please enter the announcement text");
      return;
    }

    if (editingItem) {
      updateMutation.mutate({
        id: editingItem.id,
        text: formData.text,
        link: formData.link.trim() || undefined,
      });
    } else {
      createMutation.mutate({
        text: formData.text,
        link: formData.link.trim() || undefined,
      });
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this announcement? It will be removed immediately.")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleToggle = (id: number, currentActive: boolean) => {
    toggleMutation.mutate({
      id,
      isActive: !currentActive,
    });
  };

  const startEdit = (item: any) => {
    setEditingItem(item);
    setFormData({
      text: item.text,
      link: item.link || "",
    });
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setFormData({ text: "", link: "" });
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Newspaper className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Header News Ticker</h1>
          <p className="text-gray-500 text-sm">Add and manage scrolling one-liner announcements displayed on the public site header.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation/Edit Form */}
        <div className="lg:col-span-1">
          <Card className="bg-white border-gray-200 shadow-md sticky top-6">
            <CardHeader>
              <CardTitle className="text-gray-800 text-xl font-bold">
                {editingItem ? "Edit Announcement" : "New Announcement"}
              </CardTitle>
              <CardDescription>
                {editingItem ? "Modify this news ticker item details." : "Compose a scrolling news item and optional page redirect link."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="news-text" className="text-gray-700 font-medium">One-liner News Text *</Label>
                  <Input
                    id="news-text"
                    placeholder="e.g. Admissions open for computer education class!"
                    value={formData.text}
                    onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                    required
                    maxLength={500}
                    className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-right text-xs text-gray-400">
                    {formData.text.length}/500 chars
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="news-link" className="text-gray-700 font-medium">Redirect Page Link (Optional)</Label>
                  <Input
                    id="news-link"
                    placeholder="e.g. /internship or /donate"
                    value={formData.link}
                    onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                    className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-400">
                    Use relative paths (e.g. <code className="bg-gray-100 px-1 py-0.5 rounded text-red-600">/donate</code>) to redirect clicking users to that page.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <Button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center justify-center gap-2"
                  >
                    {createMutation.isPending || updateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : editingItem ? (
                      <>
                        <Check className="w-4 h-4" />
                        Save Changes
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        Publish Announcement
                      </>
                    )}
                  </Button>

                  {editingItem && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={cancelEdit}
                      className="w-full border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold flex items-center justify-center gap-2 mt-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Announcements List */}
        <div className="lg:col-span-2">
          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader>
              <CardTitle className="text-gray-800 text-xl font-bold">Manage Announcements</CardTitle>
              <CardDescription>List of announcements. Items set to "Active" will rotate in the public header.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="py-12 text-center text-gray-500">Loading announcement records...</div>
              ) : !newsItems || newsItems.length === 0 ? (
                <div className="py-20 text-center text-gray-400 italic">
                  No announcements recorded yet. Create one on the left panel!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <th className="p-4 font-bold">News Announcement Text</th>
                        <th className="p-4 font-bold">Redirect Link</th>
                        <th className="p-4 font-bold whitespace-nowrap">Date Published</th>
                        <th className="p-4 font-bold text-center">Status</th>
                        <th className="p-4 font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {newsItems.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4 font-medium text-gray-800 break-words max-w-[280px]">
                            {item.text}
                          </td>
                          <td className="p-4 text-gray-600">
                            {item.link ? (
                              <div className="flex items-center gap-1.5 text-blue-600 font-semibold text-xs">
                                <LinkIcon className="w-3.5 h-3.5" />
                                {item.link}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">None</span>
                            )}
                          </td>
                          <td className="p-4 text-gray-500 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              {format(new Date(item.createdAt), "dd-MM-yyyy")}
                            </div>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <button
                              onClick={() => handleToggle(item.id, item.isActive)}
                              disabled={toggleMutation.isPending}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all shadow-sm ${
                                item.isActive
                                  ? "bg-green-100 hover:bg-green-200 text-green-700"
                                  : "bg-gray-100 hover:bg-gray-200 text-gray-500"
                              }`}
                              title={item.isActive ? "Click to Deactivate" : "Click to Activate"}
                            >
                              {item.isActive ? (
                                <>
                                  <Eye className="w-3.5 h-3.5" /> Active
                                </>
                              ) : (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" /> Inactive
                                </>
                              )}
                            </button>
                          </td>
                          <td className="p-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(item)}
                                className="text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                disabled={deleteMutation.isPending}
                                title="Delete"
                              >
                                <Trash2 className="w-4.5 h-4.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
