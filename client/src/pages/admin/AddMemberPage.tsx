import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/form-inputs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { UserPlus, ArrowLeft } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function AddMemberPage() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    membershipType: "regular" as "regular" | "lifetime",
    profileImage: "",
  });

  const createUserMutation = trpc.admin.createUser.useMutation({
    onSuccess: (data) => {
      toast.success(`Member added successfully! Membership No: ${data.membershipNumber}`);
      utils.admin.getAllUsers.invalidate();
      setLocation("/admin/users/active");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    // Basic email format check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    createUserMutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="icon" onClick={() => setLocation("/admin/users/active")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Member</h1>
          <p className="text-gray-500 text-sm">Manually register a user and assign them a membership.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-teal-600" />
            Member Details
          </CardTitle>
          <CardDescription>
            This action creates an account and an active membership immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <ImageUpload 
                  label="Profile Image" 
                  value={formData.profileImage} 
                  defaultAspectRatio="portrait"
                  onChange={(url) => setFormData({ ...formData, profileImage: url })} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address <span className="text-red-500">*</span></label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Phone Number</label>
                <PhoneInput
                  value={formData.phone}
                  onChange={(phone) => setFormData({ ...formData, phone })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Temporary Password <span className="text-red-500">*</span></label>
                <Input
                  type="password"
                  placeholder="Enter a secure password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={6}
                />
                <p className="text-xs text-gray-400">User can change this later in their dashboard.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Membership Type <span className="text-red-500">*</span></label>
                <Select
                  value={formData.membershipType}
                  onValueChange={(value: any) => setFormData({ ...formData, membershipType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular</SelectItem>
                    <SelectItem value="lifetime">Lifetime</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                className="mr-3"
                onClick={() => setLocation("/admin/users/active")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-teal-600 hover:bg-teal-700 text-white"
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? "Adding Member..." : "Add Member"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

