import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Layout, Save, Globe, Image as ImageIcon, Link2, Heart } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomepageManagementPage() {
  const utils = trpc.useUtils();
  const [selectedCard, setSelectedCard] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [selectedSlide, setSelectedSlide] = useState<1 | 2 | 3 | 4 | 5>(1);

  const [formData, setFormData] = useState({
    heroTitle: "Appropriate Institute of Rural Development",
    heroDescription: "",
    heroImage: "",
    heroImage2: "",
    heroImage3: "",
    heroImage4: "",
    heroImage5: "",
    showDonateButton: true,
    quickLink1Text: "",
    quickLink1Url: "",
    quickLink2Text: "",
    quickLink2Url: "",
    quickLink3Text: "",
    quickLink3Url: "",
    quickLink4Text: "",
    quickLink4Url: "",
    donateSmileTitle: "",
    donateSmileContent: "",
    donateSmileImage: "",
    donateSmileTitle2: "",
    donateSmileContent2: "",
    donateSmileImage2: "",
    donateSmileTitle3: "",
    donateSmileContent3: "",
    donateSmileImage3: "",
    donateSmileTitle4: "",
    donateSmileContent4: "",
    donateSmileImage4: "",
    donateSmileTitle5: "",
    donateSmileContent5: "",
    donateSmileImage5: "",
  });

  // Queries
  const { data: settings, isLoading } = trpc.homepage.getSettings.useQuery();

  // Mutations
  const updateMutation = trpc.homepage.updateSettings.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      utils.homepage.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update homepage settings");
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        heroTitle: settings.heroTitle || "Appropriate Institute of Rural Development",
        heroDescription: settings.heroDescription || "",
        heroImage: settings.heroImage || "",
        heroImage2: (settings as any).heroImage2 || "",
        heroImage3: (settings as any).heroImage3 || "",
        heroImage4: (settings as any).heroImage4 || "",
        heroImage5: (settings as any).heroImage5 || "",
        showDonateButton: (settings as any).showDonateButton !== undefined ? (settings as any).showDonateButton : true,
        quickLink1Text: settings.quickLink1Text || "",
        quickLink1Url: settings.quickLink1Url || "",
        quickLink2Text: settings.quickLink2Text || "",
        quickLink2Url: settings.quickLink2Url || "",
        quickLink3Text: settings.quickLink3Text || "",
        quickLink3Url: settings.quickLink3Url || "",
        quickLink4Text: settings.quickLink4Text || "",
        quickLink4Url: settings.quickLink4Url || "",
        donateSmileTitle: settings.donateSmileTitle || "",
        donateSmileContent: settings.donateSmileContent || "",
        donateSmileImage: settings.donateSmileImage || "",
        donateSmileTitle2: (settings as any).donateSmileTitle2 || "",
        donateSmileContent2: (settings as any).donateSmileContent2 || "",
        donateSmileImage2: (settings as any).donateSmileImage2 || "",
        donateSmileTitle3: (settings as any).donateSmileTitle3 || "",
        donateSmileContent3: (settings as any).donateSmileContent3 || "",
        donateSmileImage3: (settings as any).donateSmileImage3 || "",
        donateSmileTitle4: (settings as any).donateSmileTitle4 || "",
        donateSmileContent4: (settings as any).donateSmileContent4 || "",
        donateSmileImage4: (settings as any).donateSmileImage4 || "",
        donateSmileTitle5: (settings as any).donateSmileTitle5 || "",
        donateSmileContent5: (settings as any).donateSmileContent5 || "",
        donateSmileImage5: (settings as any).donateSmileImage5 || "",
      });
    }
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading homepage settings...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Homepage Settings</h1>
            <p className="text-gray-500 text-sm">Dynamically customize the public landing page content, banner images, and quick link redirects.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Tabs defaultValue="hero" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-100 p-1 rounded-xl mb-6">
            <TabsTrigger value="hero" className="rounded-lg flex gap-2 items-center"><Layout className="w-4 h-4" /> Hero Section</TabsTrigger>
            <TabsTrigger value="links" className="rounded-lg flex gap-2 items-center"><Link2 className="w-4 h-4" /> Quick Links</TabsTrigger>
            <TabsTrigger value="donate" className="rounded-lg flex gap-2 items-center"><Heart className="w-4 h-4" /> Donate for Smile</TabsTrigger>
          </TabsList>

          {/* Hero Tab */}
          <TabsContent value="hero" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-blue-800">
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                  Hero Section Banner
                </CardTitle>
                <CardDescription>
                  Customize the landing page background image and hero action buttons.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Slide Selector Buttons */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-xl w-fit mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSlide(s as any)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        selectedSlide === s
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Slide {s}
                    </button>
                  ))}
                </div>

                <div className="border-t pt-4">
                  {selectedSlide === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Hero Slide 1 Background Image *</Label>
                        <ImageUpload
                          value={formData.heroImage}
                          defaultAspectRatio="video"
                          onChange={(url) => setFormData({ ...formData, heroImage: url })}
                        />
                        <p className="text-xs text-gray-500">Provide a high-quality landscape image (Cloudinary upload). Recommended size: 1920x800px.</p>
                      </div>

                      <div className="flex items-center gap-3 p-4 border border-gray-100 bg-gray-50 rounded-xl">
                        <input 
                          type="checkbox"
                          id="show-donate-button"
                          checked={formData.showDonateButton}
                          onChange={(e) => setFormData({ ...formData, showDonateButton: e.target.checked })}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                        />
                        <div className="space-y-0.5">
                          <Label htmlFor="show-donate-button" className="font-bold text-gray-700 cursor-pointer">Show "Donate Now" Button</Label>
                          <p className="text-xs text-gray-500">Keep this checked to display the prominent "Donate Now" button on the hero banner.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedSlide === 2 && (
                    <div className="space-y-2">
                      <Label>Hero Slide 2 Background Image (Optional)</Label>
                      <ImageUpload
                        value={formData.heroImage2}
                        defaultAspectRatio="video"
                        onChange={(url) => setFormData({ ...formData, heroImage2: url })}
                      />
                      <p className="text-xs text-gray-500">Provide a slide image (Cloudinary upload). Recommended size: 1920x800px.</p>
                    </div>
                  )}

                  {selectedSlide === 3 && (
                    <div className="space-y-2">
                      <Label>Hero Slide 3 Background Image (Optional)</Label>
                      <ImageUpload
                        value={formData.heroImage3}
                        defaultAspectRatio="video"
                        onChange={(url) => setFormData({ ...formData, heroImage3: url })}
                      />
                      <p className="text-xs text-gray-500">Provide a slide image (Cloudinary upload). Recommended size: 1920x800px.</p>
                    </div>
                  )}

                  {selectedSlide === 4 && (
                    <div className="space-y-2">
                      <Label>Hero Slide 4 Background Image (Optional)</Label>
                      <ImageUpload
                        value={formData.heroImage4}
                        defaultAspectRatio="video"
                        onChange={(url) => setFormData({ ...formData, heroImage4: url })}
                      />
                      <p className="text-xs text-gray-500">Provide a slide image (Cloudinary upload). Recommended size: 1920x800px.</p>
                    </div>
                  )}

                  {selectedSlide === 5 && (
                    <div className="space-y-2">
                      <Label>Hero Slide 5 Background Image (Optional)</Label>
                      <ImageUpload
                        value={formData.heroImage5}
                        defaultAspectRatio="video"
                        onChange={(url) => setFormData({ ...formData, heroImage5: url })}
                      />
                      <p className="text-xs text-gray-500">Provide a slide image (Cloudinary upload). Recommended size: 1920x800px.</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quick Links Tab */}
          <TabsContent value="links" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-blue-800">
                  <Link2 className="w-5 h-5 text-blue-600" />
                  Quick Action Links
                </CardTitle>
                <CardDescription>
                  Customize labels and target routes/URLs for the 4 links in the sidebar quick-links component.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Link 1 */}
                  <div className="p-4 border border-gray-100 bg-gray-50 rounded-xl space-y-3">
                    <h3 className="font-bold text-gray-700 text-sm">Slot 1</h3>
                    <div className="space-y-2">
                      <Label htmlFor="link1-text">Button Text</Label>
                      <Input
                        id="link1-text"
                        value={formData.quickLink1Text}
                        onChange={(e) => setFormData({ ...formData, quickLink1Text: e.target.value })}
                        required
                        placeholder="Generate ID Card"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link1-url">Target URL / Route</Label>
                      <Input
                        id="link1-url"
                        value={formData.quickLink1Url}
                        onChange={(e) => setFormData({ ...formData, quickLink1Url: e.target.value })}
                        required
                        placeholder="e.g. # (Internal Anchor) or /donate"
                      />
                    </div>
                  </div>

                  {/* Link 2 */}
                  <div className="p-4 border border-gray-100 bg-gray-50 rounded-xl space-y-3">
                    <h3 className="font-bold text-gray-700 text-sm">Slot 2</h3>
                    <div className="space-y-2">
                      <Label htmlFor="link2-text">Button Text</Label>
                      <Input
                        id="link2-text"
                        value={formData.quickLink2Text}
                        onChange={(e) => setFormData({ ...formData, quickLink2Text: e.target.value })}
                        required
                        placeholder="Appointment Letter"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link2-url">Target URL / Route</Label>
                      <Input
                        id="link2-url"
                        value={formData.quickLink2Url}
                        onChange={(e) => setFormData({ ...formData, quickLink2Url: e.target.value })}
                        required
                        placeholder="#"
                      />
                    </div>
                  </div>

                  {/* Link 3 */}
                  <div className="p-4 border border-gray-100 bg-gray-50 rounded-xl space-y-3">
                    <h3 className="font-bold text-gray-700 text-sm">Slot 3</h3>
                    <div className="space-y-2">
                      <Label htmlFor="link3-text">Button Text</Label>
                      <Input
                        id="link3-text"
                        value={formData.quickLink3Text}
                        onChange={(e) => setFormData({ ...formData, quickLink3Text: e.target.value })}
                        required
                        placeholder="Generate Certificate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link3-url">Target URL / Route</Label>
                      <Input
                        id="link3-url"
                        value={formData.quickLink3Url}
                        onChange={(e) => setFormData({ ...formData, quickLink3Url: e.target.value })}
                        required
                        placeholder="#"
                      />
                    </div>
                  </div>

                  {/* Link 4 */}
                  <div className="p-4 border border-gray-100 bg-gray-50 rounded-xl space-y-3">
                    <h3 className="font-bold text-gray-700 text-sm">Slot 4</h3>
                    <div className="space-y-2">
                      <Label htmlFor="link4-text">Button Text</Label>
                      <Input
                        id="link4-text"
                        value={formData.quickLink4Text}
                        onChange={(e) => setFormData({ ...formData, quickLink4Text: e.target.value })}
                        required
                        placeholder="Donate Us"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="link4-url">Target URL / Route</Label>
                      <Input
                        id="link4-url"
                        value={formData.quickLink4Url}
                        onChange={(e) => setFormData({ ...formData, quickLink4Url: e.target.value })}
                        required
                        placeholder="/donate"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Donate for Smile Tab */}
          <TabsContent value="donate" className="space-y-4">
            <Card className="border-gray-200 shadow-sm bg-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl text-blue-800">
                  <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                  Donate For A Smile Section
                </CardTitle>
                <CardDescription>
                  Modify dynamic campaigns cards shown on the homepage. Select card 1, 2, or 3 to update.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Card Selector Tabs */}
                <div className="flex flex-wrap gap-2 p-1.5 bg-gray-100 rounded-xl w-fit">
                  {[1, 2, 3, 4, 5].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCard(c as any)}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                        selectedCard === c
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Card {c} {c === 1 ? "(Dream Project)" : c === 2 ? "(Celebration)" : c === 3 ? "(Wings of Hope)" : c === 4 ? "(Education)" : "(Women)"}
                    </button>
                  ))}
                </div>

                <div className="border-t pt-6">
                  {selectedCard === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="donate-title-1">Card 1 Title *</Label>
                        <Input
                          id="donate-title-1"
                          value={formData.donateSmileTitle}
                          onChange={(e) => setFormData({ ...formData, donateSmileTitle: e.target.value })}
                          required
                          placeholder="e.g. Dream Project"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="donate-content-1">Card 1 Content *</Label>
                        <Textarea
                          id="donate-content-1"
                          value={formData.donateSmileContent}
                          onChange={(e) => setFormData({ ...formData, donateSmileContent: e.target.value })}
                          rows={4}
                          required
                          placeholder="Describe how donations bring smiles and build hope..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Card 1 Cover Image</Label>
                        <ImageUpload
                          value={formData.donateSmileImage}
                          defaultAspectRatio="video"
                          onChange={(url) => setFormData({ ...formData, donateSmileImage: url })}
                        />
                        <p className="text-xs text-gray-500">Provide an image demonstrating impact (Cloudinary upload). Recommended size: 600x400px.</p>
                      </div>
                    </div>
                  )}

                  {selectedCard === 2 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="donate-title-2">Card 2 Title *</Label>
                        <Input
                          id="donate-title-2"
                          value={formData.donateSmileTitle2}
                          onChange={(e) => setFormData({ ...formData, donateSmileTitle2: e.target.value })}
                          required
                          placeholder="e.g. Celebration"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="donate-content-2">Card 2 Content *</Label>
                        <Textarea
                          id="donate-content-2"
                          value={formData.donateSmileContent2}
                          onChange={(e) => setFormData({ ...formData, donateSmileContent2: e.target.value })}
                          rows={4}
                          required
                          placeholder="Describe how donations bring smiles and build hope..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Card 2 Cover Image</Label>
                        <ImageUpload
                          value={formData.donateSmileImage2}
                          onChange={(url) => setFormData({ ...formData, donateSmileImage2: url })}
                        />
                        <p className="text-xs text-gray-500">Provide an image demonstrating impact (Cloudinary upload). Recommended size: 600x400px.</p>
                      </div>
                    </div>
                  )}

                  {selectedCard === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="donate-title-3">Card 3 Title *</Label>
                        <Input
                          id="donate-title-3"
                          value={formData.donateSmileTitle3}
                          onChange={(e) => setFormData({ ...formData, donateSmileTitle3: e.target.value })}
                          required
                          placeholder="e.g. Wings of Hope"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="donate-content-3">Card 3 Content *</Label>
                        <Textarea
                          id="donate-content-3"
                          value={formData.donateSmileContent3}
                          onChange={(e) => setFormData({ ...formData, donateSmileContent3: e.target.value })}
                          rows={4}
                          required
                          placeholder="Describe how donations bring smiles and build hope..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Card 3 Cover Image</Label>
                        <ImageUpload
                          value={formData.donateSmileImage3}
                          onChange={(url) => setFormData({ ...formData, donateSmileImage3: url })}
                        />
                        <p className="text-xs text-gray-500">Provide an image demonstrating impact (Cloudinary upload). Recommended size: 600x400px.</p>
                      </div>
                    </div>
                  )}

                  {selectedCard === 4 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="donate-title-4">Card 4 Title *</Label>
                        <Input
                          id="donate-title-4"
                          value={formData.donateSmileTitle4}
                          onChange={(e) => setFormData({ ...formData, donateSmileTitle4: e.target.value })}
                          required
                          placeholder="e.g. Education Support"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="donate-content-4">Card 4 Content *</Label>
                        <Textarea
                          id="donate-content-4"
                          value={formData.donateSmileContent4}
                          onChange={(e) => setFormData({ ...formData, donateSmileContent4: e.target.value })}
                          rows={4}
                          required
                          placeholder="Describe this campaign..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Card 4 Cover Image</Label>
                        <ImageUpload
                          value={formData.donateSmileImage4}
                          onChange={(url) => setFormData({ ...formData, donateSmileImage4: url })}
                        />
                        <p className="text-xs text-gray-500">Provide an image demonstrating impact (Cloudinary upload). Recommended size: 600x400px.</p>
                      </div>
                    </div>
                  )}

                  {selectedCard === 5 && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="donate-title-5">Card 5 Title *</Label>
                        <Input
                          id="donate-title-5"
                          value={formData.donateSmileTitle5}
                          onChange={(e) => setFormData({ ...formData, donateSmileTitle5: e.target.value })}
                          required
                          placeholder="e.g. Women Empowerment"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="donate-content-5">Card 5 Content *</Label>
                        <Textarea
                          id="donate-content-5"
                          value={formData.donateSmileContent5}
                          onChange={(e) => setFormData({ ...formData, donateSmileContent5: e.target.value })}
                          rows={4}
                          required
                          placeholder="Describe this campaign..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Card 5 Cover Image</Label>
                        <ImageUpload
                          value={formData.donateSmileImage5}
                          onChange={(url) => setFormData({ ...formData, donateSmileImage5: url })}
                        />
                        <p className="text-xs text-gray-500">Provide an image demonstrating impact (Cloudinary upload). Recommended size: 600x400px.</p>
                      </div>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Submit Bar */}
        <div className="flex justify-end pt-4 border-t">
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 h-12 flex gap-2 items-center"
            disabled={updateMutation.isPending}
          >
            <Save className="w-5 h-5" />
            {updateMutation.isPending ? "Saving changes..." : "Save Homepage Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
