import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Send, Users, Info } from "lucide-react";

export default function SendBulkMessagePage() {
  const [formData, setFormData] = useState({
    subject: "",
    content: "",
  });

  const utils = trpc.useUtils();
  
  // Fetch users to show the admin exactly how many people will receive the broadcast
  const { data: usersData, isLoading: usersLoading } = trpc.admin.getAllUsers.useQuery({ page: 1, pageSize: 1000 });
  const activeUsersCount = usersData?.items?.filter(u => u.status === "active").length || 0;

  const sendBulkMutation = trpc.message.sendBulk.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      utils.message.getPreviousNotices.invalidate();
      setFormData({
        subject: "",
        content: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send broadcast");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.content) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (window.confirm(`Are you sure you want to broadcast this message to ${activeUsersCount} users?`)) {
      sendBulkMutation.mutate({
        subject: formData.subject,
        content: formData.content,
      });
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-3xl font-bold">Broadcast Notice</h1>
            <p className="text-gray-500 mt-1">Send a system-wide announcement to all active users.</p>
          </div>
        </div>
        {!usersLoading && (
          <Badge variant="secondary" className="text-lg px-4 py-2 flex items-center gap-2 bg-indigo-50 text-indigo-700 border-indigo-200">
            <Users className="w-5 h-5" />
            {activeUsersCount} Recipients
          </Badge>
        )}
      </div>

      <Card className="mb-6 border-indigo-100 bg-indigo-50/50">
        <CardContent className="p-4 flex gap-3 text-sm text-indigo-800">
          <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-indigo-900">WhatsApp Sync Enabled</p>
            <p className="text-indigo-700 mt-0.5">This announcement will be broadcasted and sent to all recipients' phone numbers as a WhatsApp message via WhatsApp REST API.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-indigo-100 shadow-sm">
        <CardHeader className="bg-indigo-50/50 border-b border-indigo-50 pb-4">
          <CardTitle className="text-indigo-900">Compose Broadcast</CardTitle>
          <CardDescription>This notice will be permanently recorded and visible to all active platform members.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="subject" className="text-gray-700">Notice Subject *</Label>
              <Input
                id="subject"
                placeholder="e.g. Important Update: New Membership Portal Launched!"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className="text-lg py-6"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-gray-700">Detailed Message *</Label>
              <Textarea
                id="content"
                placeholder="Type your complete broadcast message here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={12}
                className="resize-y"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 text-lg"
              disabled={sendBulkMutation.isPending || activeUsersCount === 0}
            >
              <Send className="w-5 h-5 mr-2" />
              {sendBulkMutation.isPending ? "Broadcasting..." : `Broadcast to ${activeUsersCount} Users`}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
