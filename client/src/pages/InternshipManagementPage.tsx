import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ImageUpload } from "@/components/ui/ImageUpload";

export default function InternshipManagementPage() {
  const { user } = useAuth();
  const [selectedInternship, setSelectedInternship] = useState<number | null>(null);
  const [newInternship, setNewInternship] = useState({
    title: "",
    department: "",
    description: "",
    requirements: "",
    duration: "",
    location: "",
    type: "remote" as "remote" | "onsite" | "hybrid",
    image: "",
  });

  // Queries
  const { data: internships, refetch: refetchInternships } = trpc.internship.adminGetAll.useQuery();
  const { data: applications, refetch: refetchApplications } = trpc.internship.getApplications.useQuery(
    { internshipId: selectedInternship || 0 },
    { enabled: !!selectedInternship }
  );

  // Mutations
  const createInternshipMutation = trpc.internship.create.useMutation({
    onSuccess: () => {
      toast.success("Internship posted successfully!");
      setNewInternship({ title: "", department: "", description: "", requirements: "", duration: "", location: "", type: "remote", image: "" });
      refetchInternships();
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const updateStatusMutation = trpc.internship.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Status updated");
      refetchInternships();
    },
  });

  const updateApplicationMutation = trpc.internship.updateApplicationStatus.useMutation({
    onSuccess: () => {
      toast.success("Application status updated");
      refetchApplications();
    },
  });

  const handleCreate = () => {
    if (!newInternship.title || !newInternship.description) {
      toast.error("Please fill in required fields (Title, Description)");
      return;
    }
    createInternshipMutation.mutate(newInternship);
  };

  if (user?.role !== "admin") return <div className="p-6">Access Denied</div>;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Post New Internship</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ImageUpload 
            label="Internship Cover Image" 
            value={newInternship.image} 
            defaultAspectRatio="video"
            onChange={(url) => setNewInternship({ ...newInternship, image: url })} 
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Job Title</label>
              <Input
                value={newInternship.title}
                onChange={(e) => setNewInternship({ ...newInternship, title: e.target.value })}
                placeholder="e.g., Marketing Intern"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Department</label>
              <Input
                value={newInternship.department}
                onChange={(e) => setNewInternship({ ...newInternship, department: e.target.value })}
                placeholder="e.g., Marketing"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Description</label>
            <Input
              value={newInternship.description}
              onChange={(e) => setNewInternship({ ...newInternship, description: e.target.value })}
              placeholder="Detailed description of the role..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Duration</label>
              <Input
                value={newInternship.duration}
                onChange={(e) => setNewInternship({ ...newInternship, duration: e.target.value })}
                placeholder="e.g., 3 Months"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Work Type</label>
              <Select value={newInternship.type} onValueChange={(val: any) => setNewInternship({ ...newInternship, type: val })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={handleCreate} className="w-full" disabled={createInternshipMutation.isPending}>
            {createInternshipMutation.isPending ? "Posting..." : "Post Internship"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Manage Internships</CardTitle>
          </CardHeader>
          <CardContent>
            {internships && internships.length > 0 ? (
              <div className="space-y-3">
                {internships.map((internship) => (
                  <div
                    key={internship.id}
                    className={`border p-4 rounded-lg cursor-pointer transition ${
                      selectedInternship === internship.id ? "border-blue-500 bg-blue-50" : "hover:border-gray-400"
                    }`}
                    onClick={() => setSelectedInternship(internship.id)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{internship.title}</h3>
                        <p className="text-sm text-gray-500">{internship.department} • {internship.type}</p>
                      </div>
                      <Select
                        value={internship.status}
                        onValueChange={(val: any) => updateStatusMutation.mutate({ id: internship.id, status: val })}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">Open</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No internships posted yet.</p>
            )}
          </CardContent>
        </Card>

        {selectedInternship && (
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              {applications && applications.length > 0 ? (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {applications.map((app) => (
                    <div key={app.id} className="border p-4 rounded-lg bg-gray-50">
                      <div className="flex justify-between">
                        <h4 className="font-medium">{app.applicantName}</h4>
                        <Select
                          value={app.status}
                          onValueChange={(val: any) => updateApplicationMutation.mutate({ id: app.id, status: val })}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="interviewing">Interviewing</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{app.applicantEmail} | {app.applicantPhone}</p>
                      {app.educationBackground && <p className="text-xs text-gray-500 mt-1">Edu: {app.educationBackground}</p>}
                      <div className="mt-2 text-sm bg-white p-2 rounded border">
                        <p className="font-medium text-xs text-gray-400 mb-1">Cover Letter</p>
                        <p className="line-clamp-3">{app.coverLetter}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No applications received yet.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
