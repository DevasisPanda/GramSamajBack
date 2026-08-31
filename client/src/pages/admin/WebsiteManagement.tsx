import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Globe, Image as ImageIcon, Trash2, Plus, Video } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function WebsiteManagement() {
  const utils = trpc.useUtils();
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "General",
    imageUrl: "",
    mediaType: "image" as "image" | "video",
    redirectUrl: "",
  });

  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // Queries
  const { data: galleryItems, isLoading } = trpc.gallery.adminGetAll.useQuery();

  // Mutations
  const createMutation = trpc.gallery.create.useMutation({
    onSuccess: () => {
      toast.success("Media added to gallery successfully!");
      setFormData({ 
        title: "", 
        description: "", 
        category: "General", 
        imageUrl: "", 
        mediaType: "image", 
        redirectUrl: "" 
      });
      utils.gallery.adminGetAll.invalidate();
      utils.gallery.getPublic.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const uploadVideoMutation = trpc.upload.image.useMutation({
    onSuccess: (data) => {
      setFormData(prev => ({ ...prev, imageUrl: data.url }));
      setIsVideoUploading(false);
      toast.success("Video uploaded successfully");
    },
    onError: (error) => {
      setIsVideoUploading(false);
      toast.error(error.message || "Video upload failed");
    }
  });

  const deleteMutation = trpc.gallery.delete.useMutation({
    onSuccess: () => {
      toast.success("Media removed from gallery.");
      utils.gallery.adminGetAll.invalidate();
      utils.gallery.getPublic.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleVideoFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file");
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast.error("File too large. Maximum video size is 20MB");
      return;
    }

    setIsVideoUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      uploadVideoMutation.mutate({
        base64,
        filename: file.name
      });
    };
    reader.onerror = () => {
      setIsVideoUploading(false);
      toast.error("Failed to read video file");
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.imageUrl) {
      toast.error("Please fill in required fields (Title and Upload Media)");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (window.confirm("Are you sure you want to delete this item from the gallery?")) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Website Management</h1>
            <p className="text-gray-500 text-sm">Manage dynamic contents displayed on the public landing website.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Form */}
        <Card className="lg:col-span-1 border-gray-200 shadow-sm bg-white self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-teal-600" />
              Add Photo / Video to Gallery
            </CardTitle>
            <CardDescription>
              Upload media to Cloudinary and link it with optional redirect URLs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Media Type Select */}
              <div className="space-y-2">
                <Label>Media Type *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input 
                      type="radio" 
                      name="mediaType" 
                      value="image" 
                      checked={formData.mediaType === "image"} 
                      onChange={() => setFormData({ ...formData, mediaType: "image", imageUrl: "" })}
                      className="accent-teal-600"
                    />
                    Photo
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                    <input 
                      type="radio" 
                      name="mediaType" 
                      value="video" 
                      checked={formData.mediaType === "video"} 
                      onChange={() => setFormData({ ...formData, mediaType: "video", imageUrl: "" })}
                      className="accent-teal-600"
                    />
                    Video
                  </label>
                </div>
              </div>

              {/* Conditional Uploader */}
              {formData.mediaType === "image" ? (
                <ImageUpload
                  label="Gallery Image *"
                  value={formData.imageUrl}
                  onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                />
              ) : (
                <div className="space-y-2">
                  <Label>Gallery Video *</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50/50 hover:bg-gray-50 transition relative">
                    {formData.imageUrl ? (
                      <div className="space-y-2">
                        <video src={formData.imageUrl} controls className="w-full max-h-40 object-contain mx-auto rounded" />
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          onClick={(e) => { e.preventDefault(); setFormData({ ...formData, imageUrl: "" }); }}
                          className="mt-2"
                        >
                          Remove Video
                        </Button>
                      </div>
                    ) : (
                      <div>
                        {isVideoUploading ? (
                          <div className="flex flex-col items-center justify-center py-4">
                            <span className="animate-spin inline-block w-8 h-8 border-4 border-t-teal-600 border-r-transparent border-b-transparent border-l-transparent rounded-full mb-2" />
                            <p className="text-sm font-medium text-gray-500">Uploading Video...</p>
                          </div>
                        ) : (
                          <label className="cursor-pointer block">
                            <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">video_file</span>
                            <span className="block text-sm font-semibold text-gray-600">Click to upload video</span>
                            <span className="block text-[11px] text-gray-400 mt-1">MP4, WebM (Max 20MB)</span>
                            <input 
                              type="file" 
                              accept="video/*" 
                              onChange={handleVideoFileChange} 
                              className="hidden" 
                            />
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Blood Donation Camp"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Redirect URL */}
              <div className="space-y-2">
                <Label htmlFor="redirectUrl">Redirect URL (Optional)</Label>
                <Input
                  id="redirectUrl"
                  placeholder="e.g. https://example.com/project-details"
                  value={formData.redirectUrl}
                  onChange={(e) => setFormData({ ...formData, redirectUrl: e.target.value })}
                />
                <p className="text-[10px] text-gray-400 mt-1 leading-normal">
                  Clicking this media item on the public site will redirect visitors to this link.
                </p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Education">Education</SelectItem>
                    <SelectItem value="Health">Health</SelectItem>
                    <SelectItem value="Spiritual">Spiritual</SelectItem>
                    <SelectItem value="Events">Events</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Short Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the activity pictured..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-[#061941] hover:bg-black text-[#fed813] font-bold"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Adding to Gallery..." : "Add to Gallery"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Gallery Items Grid */}
        <Card className="lg:col-span-2 border-gray-200 shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-teal-600" />
              Active Media Gallery ({galleryItems?.length || 0})
            </CardTitle>
            <CardDescription>
              Photos and videos currently visible to visitors on the landing website.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-gray-500">Loading gallery items...</div>
            ) : !galleryItems || galleryItems.length === 0 ? (
              <div className="py-20 text-center text-gray-500 border border-dashed rounded-lg flex flex-col items-center justify-center">
                <ImageIcon className="w-12 h-12 text-gray-300 mb-3" />
                <p className="font-semibold text-gray-700">Gallery is Empty</p>
                <p className="text-sm">Upload photos or videos to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    className="group border rounded-lg overflow-hidden bg-white shadow-sm flex flex-col relative transition-all duration-300 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] bg-gray-50 overflow-hidden flex items-center justify-center">
                      {item.mediaType === "video" ? (
                        <video 
                          src={item.imageUrl} 
                          className="w-full h-full object-cover" 
                          muted 
                          loop 
                          playsInline 
                          onMouseOver={(e) => e.currentTarget.play()}
                          onMouseOut={(e) => e.currentTarget.pause()}
                        />
                      ) : (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      )}
                      
                      {/* Media Indicator Badge */}
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 text-white text-[9px] font-bold rounded flex items-center gap-1 backdrop-blur-sm">
                        {item.mediaType === "video" ? (
                          <>
                            <span className="material-symbols-outlined text-[10px]">play_circle</span> Video
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-[10px]">image</span> Photo
                          </>
                        )}
                      </span>

                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-[10px] font-bold uppercase rounded-md backdrop-blur-sm">
                        {item.category || "General"}
                      </span>
                    </div>
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-gray-900 line-clamp-1 mb-0.5" title={item.title}>
                          {item.title}
                        </h4>
                        
                        {item.redirectUrl && (
                          <div className="mb-1 flex items-center gap-1 text-[10px] text-teal-600 font-semibold truncate">
                            <span className="material-symbols-outlined text-[11px]">link</span>
                            <span className="truncate" title={item.redirectUrl}>{item.redirectUrl}</span>
                          </div>
                        )}

                        {item.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mt-1" title={item.description}>
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div className="flex justify-end pt-3 mt-3 border-t border-gray-100">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
