import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function CreateCampaignPage() {
  const { user } = useAuth();
  const { data: projectsData } = trpc.project.getAll.useQuery();
  
  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    whyNeeded: "",
    forWhom: "",
    impact: "",
    goalAmount: "",
    targetVolunteers: "",
    category: "",
    campaignType: "donation" as "donation" | "volunteer",
    endDate: "", 
    campaignImage: "",
    projectId: "",
    presetTiers: [] as { id: string; label: string; amount: number; description?: string }[],
  });

  const createCampaignMutation = trpc.campaign.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Campaign created! Code: ${data.campaignCode}`);
      setNewCampaign({ 
        title: "", description: "", whyNeeded: "", forWhom: "", impact: "", 
        goalAmount: "", targetVolunteers: "", category: "", campaignType: "donation", endDate: "", campaignImage: "",
        projectId: "", presetTiers: []
      });
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleAddTier = () => {
    if (newCampaign.presetTiers.length >= 3) {
      toast.error("You can add at most 3 preset donation tiers.");
      return;
    }
    const newId = `tier_${Date.now()}`;
    setNewCampaign(prev => ({
      ...prev,
      presetTiers: [...prev.presetTiers, { id: newId, label: "", amount: 0, description: "" }]
    }));
  };

  const handleRemoveTier = (id: string) => {
    setNewCampaign(prev => ({
      ...prev,
      presetTiers: prev.presetTiers.filter(t => t.id !== id)
    }));
  };

  const handleUpdateTier = (id: string, field: 'label' | 'amount' | 'description', value: any) => {
    setNewCampaign(prev => ({
      ...prev,
      presetTiers: prev.presetTiers.map(t => {
        if (t.id === id) {
          return { ...t, [field]: field === 'amount' ? (value === "" ? 0 : parseFloat(value)) : value };
        }
        return t;
      })
    }));
  };

  const handleCreateCampaign = () => {
    if (!newCampaign.title || (newCampaign.campaignType === "donation" && !newCampaign.goalAmount) || (newCampaign.campaignType === "volunteer" && !newCampaign.targetVolunteers) || !newCampaign.endDate) {
      toast.error("Please fill in all required fields including goals and end date.");
      return;
    }
    
    // Validate custom preset packages if any
    const invalidTier = newCampaign.presetTiers.find(t => !t.label || !t.amount || t.amount <= 0);
    if (invalidTier) {
      toast.error("Please provide valid titles and amounts for all custom packages.");
      return;
    }
    
    createCampaignMutation.mutate({
      title: newCampaign.title,
      description: newCampaign.description,
      whyNeeded: newCampaign.whyNeeded,
      forWhom: newCampaign.forWhom,
      impact: newCampaign.impact,
      goalAmount: newCampaign.campaignType === "volunteer" ? 0 : parseFloat(newCampaign.goalAmount),
      targetVolunteers: newCampaign.campaignType === "volunteer" ? parseInt(newCampaign.targetVolunteers) : undefined,
      category: newCampaign.category,
      campaignType: newCampaign.campaignType,
      campaignImage: newCampaign.campaignImage || undefined,
      projectId: newCampaign.projectId ? Number(newCampaign.projectId) : undefined,
      presetTiers: newCampaign.presetTiers.length > 0 ? newCampaign.presetTiers : undefined,
      startDate: new Date(),
      endDate: new Date(newCampaign.endDate),
    });
  };

  if (user?.role !== "admin") return <div className="p-6">Access Denied</div>;

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Create New Campaign</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload 
            label="Campaign Cover Image" 
            value={newCampaign.campaignImage} 
            defaultAspectRatio="video"
            onChange={(url) => setNewCampaign({ ...newCampaign, campaignImage: url })} 
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-amber-700 font-bold">Import from Project (Optional)</label>
              <select
                value={newCampaign.projectId}
                onChange={(e) => {
                  const pId = e.target.value;
                  if (!pId) {
                    setNewCampaign({ ...newCampaign, projectId: "", title: "", description: "", campaignImage: "", category: "" });
                    return;
                  }
                  const project = projectsData?.find(p => p.id === Number(pId));
                  if (project) {
                    setNewCampaign({
                      ...newCampaign,
                      projectId: String(project.id),
                      title: project.title,
                      description: project.description || "",
                      campaignImage: project.image || "",
                      category: "Project Integration"
                    });
                    toast.info(`Imported details from project "${project.title}"!`);
                  }
                }}
                className="w-full h-10 px-3 py-2 border rounded-md bg-amber-50/20 border-amber-200"
              >
                <option value="">-- Select Project --</option>
                {projectsData?.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Campaign Title</label>
              <Input
                value={newCampaign.title}
                onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                placeholder="e.g., Education Fund"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Campaign Type</label>
              <select
                value={newCampaign.campaignType}
                onChange={(e) => setNewCampaign({ ...newCampaign, campaignType: e.target.value as any })}
                className="w-full h-10 px-3 py-2 border rounded-md"
              >
                <option value="donation">Donation</option>
                <option value="volunteer">Volunteer Work</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {newCampaign.campaignType === "donation" ? (
              <div>
                <label className="text-sm font-medium">Goal Amount (₹)</label>
                <Input
                  type="number"
                  value={newCampaign.goalAmount}
                  onChange={(e) => setNewCampaign({ ...newCampaign, goalAmount: e.target.value })}
                  placeholder="Enter goal amount"
                  min="1"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Target Number of Volunteers</label>
                <Input
                  type="number"
                  value={newCampaign.targetVolunteers}
                  onChange={(e) => setNewCampaign({ ...newCampaign, targetVolunteers: e.target.value })}
                  placeholder="Enter number of people needed"
                  min="1"
                />
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={newCampaign.endDate}
                onChange={(e) => setNewCampaign({ ...newCampaign, endDate: e.target.value })}
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={newCampaign.description}
              onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
              placeholder="Campaign overview"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Why is it needed?</label>
              <Input
                value={newCampaign.whyNeeded}
                onChange={(e) => setNewCampaign({ ...newCampaign, whyNeeded: e.target.value })}
                placeholder="The core problem"
              />
            </div>
            <div>
              <label className="text-sm font-medium">For Whom?</label>
              <Input
                value={newCampaign.forWhom}
                onChange={(e) => setNewCampaign({ ...newCampaign, forWhom: e.target.value })}
                placeholder="Target beneficiaries"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Expected Impact</label>
              <Input
                value={newCampaign.impact}
                onChange={(e) => setNewCampaign({ ...newCampaign, impact: e.target.value })}
                placeholder="What will change?"
              />
            </div>
          </div>

          {newCampaign.campaignType === "donation" && (
            <div className="border border-gray-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-sm font-semibold text-primary block">Custom Donation Packages (Max 3)</label>
                  <span className="text-[11px] text-gray-400">Configure quick-select donation options for this campaign.</span>
                </div>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={handleAddTier}
                  disabled={newCampaign.presetTiers.length >= 3}
                  className="border-primary text-primary hover:bg-slate-50"
                >
                  + Add Package Card
                </Button>
              </div>
              
              {newCampaign.presetTiers.length > 0 ? (
                <div className="space-y-3">
                  {newCampaign.presetTiers.map((tier, index) => (
                    <div key={tier.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-white border border-gray-200 p-3 rounded-lg shadow-sm">
                      <div className="md:col-span-4">
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Package Title</label>
                        <Input
                          value={tier.label}
                          onChange={(e) => handleUpdateTier(tier.id, 'label', e.target.value)}
                          placeholder="e.g. Sponsor 1 Book"
                          required
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Amount (₹)</label>
                        <Input
                          type="number"
                          value={tier.amount || ""}
                          onChange={(e) => handleUpdateTier(tier.id, 'amount', e.target.value)}
                          placeholder="₹"
                          required
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1">Description (Optional)</label>
                        <Input
                          value={tier.description || ""}
                          onChange={(e) => handleUpdateTier(tier.id, 'description', e.target.value)}
                          placeholder="e.g. Support a child's studies"
                        />
                      </div>
                      <div className="md:col-span-1 text-right">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => handleRemoveTier(tier.id)}
                          className="h-10 w-full"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-white border border-dashed rounded-lg text-xs text-gray-400">
                  No custom packages defined. Will fallback to default donation preset cards.
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Category</label>
            <Input
              value={newCampaign.category}
              onChange={(e) => setNewCampaign({ ...newCampaign, category: e.target.value })}
              placeholder="e.g., Education, Health"
            />
          </div>
          <Button onClick={handleCreateCampaign} className="w-full" disabled={createCampaignMutation.isPending}>
            {createCampaignMutation.isPending ? "Creating..." : "Create Campaign"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
