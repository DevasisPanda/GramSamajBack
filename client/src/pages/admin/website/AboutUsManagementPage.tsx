import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Globe, Save, HelpCircle, Plus, Trash2, ArrowUp, ArrowDown, Info, Shield, Compass, BookOpen, Star } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface IntroParagraph {
  text: string;
  boldPrefix?: string;
  isBoldSecondary?: boolean;
}

interface Commitment {
  icon: string;
  title: string;
  description: string;
}

interface CoreValue {
  icon: string;
  title: string;
}

const AVAILABLE_ICONS = [
  { id: "child_care", label: "Child Care (child_care)" },
  { id: "school", label: "Education (school)" },
  { id: "family_restroom", label: "Family Support (family_restroom)" },
  { id: "health_and_safety", label: "Health & Safety (health_and_safety)" },
  { id: "visibility", label: "Transparency (visibility)" },
  { id: "fact_check", label: "Accountability (fact_check)" },
  { id: "gavel", label: "Integrity (gavel)" },
  { id: "volunteer_activism", label: "Compassion (volunteer_activism)" },
  { id: "handshake", label: "Partnership (handshake)" },
  { id: "diversity_3", label: "Unity/Community (diversity_3)" },
];

const safeParseJSON = <T,>(val: any, fallback: T): T => {
  if (val === null || val === undefined) return fallback;
  let parsed = val;
  while (typeof parsed === 'string') {
    try {
      const prev = parsed;
      parsed = JSON.parse(parsed);
      if (parsed === prev) break;
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return fallback;
    }
  }
  if (Array.isArray(fallback) && !Array.isArray(parsed)) {
    return fallback;
  }
  return (parsed as T) || fallback;
};

export default function AboutUsManagementPage() {
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    quote: "",
    motto: "",
    trustName: "",
    regNo: "",
    established: "",
    founder: "",
    logoUrl: "/aird-logo.png",
    introParagraphs: [] as IntroParagraph[],
    commitments: [] as Commitment[],
    visionTitle: "",
    visionDescription: "",
    visionPoints: [] as string[],
    coreValues: [] as CoreValue[],
    promiseTitle: "",
    promiseText: "",
    joinTitle: "",
    joinDescription: "",
  });

  // Queries
  const { data: settings, isLoading } = trpc.aboutUs.getSettings.useQuery();

  // Mutations
  const updateMutation = trpc.aboutUs.updateSettings.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.aboutUs.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update About Us settings");
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        quote: settings.quote || "",
        motto: settings.motto || "",
        trustName: settings.trustName || "",
        regNo: settings.regNo || "",
        established: settings.established || "",
        founder: settings.founder || "",
        logoUrl: settings.logoUrl || "/aird-logo.png",
        introParagraphs: safeParseJSON(settings.introParagraphs, [] as IntroParagraph[]),
        commitments: safeParseJSON(settings.commitments, [] as Commitment[]),
        visionTitle: settings.visionTitle || "",
        visionDescription: settings.visionDescription || "",
        visionPoints: safeParseJSON(settings.visionPoints, [] as string[]),
        coreValues: safeParseJSON(settings.coreValues, [] as CoreValue[]),
        promiseTitle: settings.promiseTitle || "",
        promiseText: settings.promiseText || "",
        joinTitle: settings.joinTitle || "",
        joinDescription: settings.joinDescription || "",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  // Intro Paragraphs Helpers
  const addParagraph = () => {
    setFormData((prev) => ({
      ...prev,
      introParagraphs: [...prev.introParagraphs, { text: "", boldPrefix: "", isBoldSecondary: false }],
    }));
  };

  const removeParagraph = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      introParagraphs: prev.introParagraphs.filter((_, i) => i !== index),
    }));
  };

  const updateParagraph = (index: number, fields: Partial<IntroParagraph>) => {
    setFormData((prev) => ({
      ...prev,
      introParagraphs: prev.introParagraphs.map((p, i) => (i === index ? { ...p, ...fields } : p)),
    }));
  };

  const moveParagraph = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= formData.introParagraphs.length) return;

    setFormData((prev) => {
      const list = [...prev.introParagraphs];
      const temp = list[index];
      list[index] = list[nextIndex];
      list[nextIndex] = temp;
      return { ...prev, introParagraphs: list };
    });
  };

  // Commitments Helpers
  const addCommitment = () => {
    if (formData.commitments.length >= 4) {
      toast.warning("You can add at max 4 commitments.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      commitments: [...prev.commitments, { icon: "info", title: "", description: "" }],
    }));
  };

  const removeCommitment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      commitments: prev.commitments.filter((_, i) => i !== index),
    }));
  };

  const updateCommitment = (index: number, fields: Partial<Commitment>) => {
    setFormData((prev) => ({
      ...prev,
      commitments: prev.commitments.map((c, i) => (i === index ? { ...c, ...fields } : c)),
    }));
  };

  // Core Values Helpers
  const addCoreValue = () => {
    if (formData.coreValues.length >= 4) {
      toast.warning("You can add at max 4 core values.");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      coreValues: [...prev.coreValues, { icon: "star", title: "" }],
    }));
  };

  const removeCoreValue = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      coreValues: prev.coreValues.filter((_, i) => i !== index),
    }));
  };

  const updateCoreValue = (index: number, fields: Partial<CoreValue>) => {
    setFormData((prev) => ({
      ...prev,
      coreValues: prev.coreValues.map((v, i) => (i === index ? { ...v, ...fields } : v)),
    }));
  };

  // Vision Points Helpers
  const addVisionPoint = () => {
    setFormData((prev) => ({
      ...prev,
      visionPoints: [...prev.visionPoints, ""],
    }));
  };

  const removeVisionPoint = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      visionPoints: prev.visionPoints.filter((_, i) => i !== index),
    }));
  };

  const updateVisionPoint = (index: number, value: string) => {
    setFormData((prev) => ({
      ...prev,
      visionPoints: prev.visionPoints.map((p, i) => (i === index ? value : p)),
    }));
  };

  const moveVisionPoint = (index: number, direction: "up" | "down") => {
    const nextIndex = direction === "up" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= formData.visionPoints.length) return;

    setFormData((prev) => {
      const list = [...prev.visionPoints];
      const temp = list[index];
      list[index] = list[nextIndex];
      list[nextIndex] = temp;
      return { ...prev, visionPoints: list };
    });
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading About Us settings...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">About Us Settings</h1>
            <p className="text-gray-500 text-sm">Dynamically customize the headings, mottos, credentials, story content, focus areas, and vision on the public page.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="header" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-gray-100 p-1 rounded-xl mb-6">
            <TabsTrigger value="header" className="rounded-lg flex gap-2 items-center"><Info className="w-4 h-4" /> Header & Identity</TabsTrigger>
            <TabsTrigger value="story" className="rounded-lg flex gap-2 items-center"><BookOpen className="w-4 h-4" /> Story Paragraphs</TabsTrigger>
            <TabsTrigger value="focus" className="rounded-lg flex gap-2 items-center"><Shield className="w-4 h-4" /> Commitments & Values</TabsTrigger>
            <TabsTrigger value="vision" className="rounded-lg flex gap-2 items-center"><Compass className="w-4 h-4" /> Vision & Promise</TabsTrigger>
          </TabsList>

          {/* Header & Identity Tab */}
          <TabsContent value="header" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-teal-800 flex items-center gap-2">
                  <Star className="w-5 h-5 text-teal-600" /> Header Section Content
                </CardTitle>
                <CardDescription>
                  Customizes the top banner display of the About Us page.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quote" className="font-bold flex items-center gap-1.5">
                      Header Quote
                      <span className="text-gray-400 font-normal text-xs">(Renders italicized under "About Us" title)</span>
                    </Label>
                    <Textarea
                      id="quote"
                      placeholder="e.g. Every human life deserves dignity, hope, opportunity..."
                      value={formData.quote}
                      onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
                      rows={2}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="motto" className="font-bold flex items-center gap-1.5">
                      Our Motto
                      <span className="text-gray-400 font-normal text-xs">(Pill under the quote, e.g., Our Motto: Service to Humanity...)</span>
                    </Label>
                    <Input
                      id="motto"
                      placeholder="e.g. Service to Humanity is Service to God."
                      value={formData.motto}
                      onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-teal-800 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-teal-600" /> Trust Identity & Origin Card
                </CardTitle>
                <CardDescription>
                  Modifies the side box that showcases registration number, establishment date, and founder.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="trustName" className="font-bold">Trust Name Title</Label>
                    <Input
                      id="trustName"
                      value={formData.trustName}
                      onChange={(e) => setFormData({ ...formData, trustName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founder" className="font-bold">Founder, Coordinator & President Name</Label>
                    <Input
                      id="founder"
                      value={formData.founder}
                      onChange={(e) => setFormData({ ...formData, founder: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="regNo" className="font-bold">Registration Number</Label>
                    <Input
                      id="regNo"
                      value={formData.regNo}
                      onChange={(e) => setFormData({ ...formData, regNo: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="established" className="font-bold">Established Date</Label>
                    <Input
                      id="established"
                      value={formData.established}
                      onChange={(e) => setFormData({ ...formData, established: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold">Trust Logo / Feature Image (Right Side Graphic)</Label>
                    <ImageUpload
                      value={formData.logoUrl}
                      defaultAspectRatio="square"
                      onChange={(url) => setFormData({ ...formData, logoUrl: url })}
                    />
                    <p className="text-xs text-gray-500">Provide an image path or upload via Cloudinary. Recommended square aspect ratio.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Story Paragraphs Tab */}
          <TabsContent value="story" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-teal-800 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-teal-600" /> Story & Mission Paragraphs
                  </CardTitle>
                  <CardDescription>
                    Add, edit, remove, and style the body paragraphs of the organization story.
                  </CardDescription>
                </div>
                <Button type="button" onClick={addParagraph} className="bg-teal-600 hover:bg-teal-700 text-white font-bold flex gap-1.5 items-center">
                  <Plus className="w-4 h-4" /> Add Paragraph
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.introParagraphs.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 border border-dashed rounded-lg">No story paragraphs configured yet. Click "Add Paragraph" to write one.</div>
                ) : (
                  formData.introParagraphs.map((para, index) => (
                    <div key={index} className="p-4 border rounded-xl bg-gray-50/50 space-y-4 relative group">
                      <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                        <span className="text-xs font-bold text-teal-600 uppercase">Paragraph {index + 1}</span>
                        <div className="flex gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => moveParagraph(index, "up")}
                            className="h-8 w-8"
                          >
                            <ArrowUp className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            disabled={index === formData.introParagraphs.length - 1}
                            onClick={() => moveParagraph(index, "down")}
                            className="h-8 w-8"
                          >
                            <ArrowDown className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeParagraph(index)}
                            className="h-8 w-8 text-white bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Bold Accent Prefix (Optional)</Label>
                          <Input
                            placeholder="e.g. Appropriate Institute of Rural Development. Strengthening Gram Swaraj..."
                            value={para.boldPrefix || ""}
                            onChange={(e) => updateParagraph(index, { boldPrefix: e.target.value })}
                          />
                          <p className="text-[10px] text-gray-400">Renders as bold, primary-colored text at the start of this paragraph.</p>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-bold">Paragraph Text *</Label>
                          <Textarea
                            placeholder="Write paragraph content here..."
                            value={para.text}
                            onChange={(e) => updateParagraph(index, { text: e.target.value })}
                            rows={4}
                            required
                          />
                        </div>

                        <div className="flex items-center gap-2 pt-1.5">
                          <input
                            type="checkbox"
                            id={`secondary-style-${index}`}
                            checked={para.isBoldSecondary || false}
                            onChange={(e) => updateParagraph(index, { isBoldSecondary: e.target.checked })}
                            className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                          />
                          <Label htmlFor={`secondary-style-${index}`} className="text-xs font-semibold cursor-pointer text-gray-600">
                            Apply Highlight Style (Renders in large, bold secondary orange font)
                          </Label>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Commitments & Values Tab */}
          <TabsContent value="focus" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-teal-800 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-teal-600" /> Focus Areas / Deepest Commitments
                  </CardTitle>
                  <CardDescription>
                    Modify the focus cards visible in the middle section of the page (At max 4).
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addCommitment}
                  disabled={formData.commitments.length >= 4}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold flex gap-1.5 items-center"
                >
                  <Plus className="w-4 h-4" /> Add Commitment
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.commitments.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 border border-dashed rounded-lg">
                    No commitments added yet. Click "Add Commitment" to add up to 4.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {formData.commitments.map((card, index) => (
                      <div key={index} className="p-4 border rounded-xl bg-gray-50/50 space-y-4 relative group">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <h4 className="font-bold text-sm text-teal-600 uppercase">Commitment Card {index + 1}</h4>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeCommitment(index)}
                            className="h-8 w-8 text-white bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-xs font-bold block mb-1">
                            Select Card Icon
                          </Label>
                          <div className="flex gap-3 items-center">
                            <div className="bg-teal-50 border border-teal-100 p-2.5 rounded-xl text-teal-600 shrink-0">
                              <span className="material-symbols-outlined text-2xl block">{card.icon || 'info'}</span>
                            </div>
                            <div className="flex-grow">
                              <select
                                value={card.icon || 'info'}
                                onChange={(e) => updateCommitment(index, { icon: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                                required
                              >
                                {AVAILABLE_ICONS.map((icon) => (
                                  <option key={icon.id} value={icon.id}>
                                    {icon.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold">Title</Label>
                          <Input
                            value={card.title}
                            onChange={(e) => updateCommitment(index, { title: e.target.value })}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs font-bold">Description</Label>
                          <Textarea
                            value={card.description}
                            onChange={(e) => updateCommitment(index, { description: e.target.value })}
                            rows={3}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-teal-800 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-teal-600" /> Foundation Core Values
                  </CardTitle>
                  <CardDescription>
                    Modify the value badges near the bottom of the page (At max 4).
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addCoreValue}
                  disabled={formData.coreValues.length >= 4}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold flex gap-1.5 items-center"
                >
                  <Plus className="w-4 h-4" /> Add Core Value
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {formData.coreValues.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 border border-dashed rounded-lg">
                    No core values added yet. Click "Add Core Value" to add up to 4.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {formData.coreValues.map((val, index) => (
                      <div key={index} className="p-4 border rounded-xl bg-gray-50/50 space-y-3 relative group">
                        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                          <h4 className="font-bold text-xs text-teal-600 uppercase">Badge {index + 1}</h4>
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            onClick={() => removeCoreValue(index)}
                            className="h-8 w-8 text-white bg-red-600 hover:bg-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold block mb-1">Select Icon</Label>
                          <div className="flex gap-2 items-center">
                            <div className="bg-teal-50 border border-teal-100 p-2 rounded-lg text-teal-600 shrink-0">
                              <span className="material-symbols-outlined text-xl block">{val.icon || 'star'}</span>
                            </div>
                            <div className="flex-grow">
                              <select
                                value={val.icon || 'star'}
                                onChange={(e) => updateCoreValue(index, { icon: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-600"
                                required
                              >
                                {AVAILABLE_ICONS.map((icon) => (
                                  <option key={icon.id} value={icon.id}>
                                    {icon.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold">Title</Label>
                          <Input
                            value={val.title}
                            onChange={(e) => updateCoreValue(index, { title: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Vision & Promise Tab */}
          <TabsContent value="vision" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-teal-800 flex items-center gap-2">
                    <Compass className="w-5 h-5 text-teal-600" /> Vision for the Future
                  </CardTitle>
                  <CardDescription>
                    Customize the vision title, introductory text, and checklist points.
                  </CardDescription>
                </div>
                <Button type="button" onClick={addVisionPoint} className="bg-teal-600 hover:bg-teal-700 text-white font-bold flex gap-1.5 items-center">
                  <Plus className="w-4 h-4" /> Add Vision Point
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="visionTitle" className="font-bold">Vision Section Title</Label>
                  <Input
                    id="visionTitle"
                    value={formData.visionTitle}
                    onChange={(e) => setFormData({ ...formData, visionTitle: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="visionDescription" className="font-bold">Vision Section Description</Label>
                  <Textarea
                    id="visionDescription"
                    value={formData.visionDescription}
                    onChange={(e) => setFormData({ ...formData, visionDescription: e.target.value })}
                    rows={2}
                    required
                  />
                </div>

                <div className="border-t pt-4 space-y-3">
                  <Label className="font-bold block mb-1">Vision Checklist Points</Label>
                  {formData.visionPoints.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No checklist points added.</p>
                  ) : (
                    formData.visionPoints.map((pt, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={pt}
                          onChange={(e) => updateVisionPoint(index, e.target.value)}
                          placeholder="e.g. No child is deprived of education because of poverty."
                          required
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === 0}
                          onClick={() => moveVisionPoint(index, "up")}
                          className="h-8 w-8"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={index === formData.visionPoints.length - 1}
                          onClick={() => moveVisionPoint(index, "down")}
                          className="h-8 w-8"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          onClick={() => removeVisionPoint(index)}
                          className="h-8 w-8 text-white bg-red-600 hover:bg-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="text-teal-800 flex items-center gap-2">
                  <Star className="w-5 h-5 text-teal-600" /> Organization Promise & Call To Action
                </CardTitle>
                <CardDescription>
                  Modify the central promise quote and the "Join Our Journey" details.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="promiseTitle" className="font-bold">Promise Title</Label>
                    <Input
                      id="promiseTitle"
                      value={formData.promiseTitle}
                      onChange={(e) => setFormData({ ...formData, promiseTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="promiseText" className="font-bold">Promise Quote Text</Label>
                    <Textarea
                      id="promiseText"
                      value={formData.promiseText}
                      onChange={(e) => setFormData({ ...formData, promiseText: e.target.value })}
                      rows={3}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinTitle" className="font-bold">Join Us Title</Label>
                    <Input
                      id="joinTitle"
                      value={formData.joinTitle}
                      onChange={(e) => setFormData({ ...formData, joinTitle: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="joinDescription" className="font-bold">Join Us Description</Label>
                    <Textarea
                      id="joinDescription"
                      value={formData.joinDescription}
                      onChange={(e) => setFormData({ ...formData, joinDescription: e.target.value })}
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="flex justify-end sticky bottom-4 z-10">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-[#061941] hover:bg-black text-[#fed813] font-bold px-8 py-3 rounded-full flex gap-2 items-center shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5"
          >
            <Save className="w-5 h-5" />
            {updateMutation.isPending ? "Saving changes..." : "Save About Us Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
