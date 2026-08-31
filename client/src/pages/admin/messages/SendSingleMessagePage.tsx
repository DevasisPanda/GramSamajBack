import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Send, Info } from "lucide-react";

export default function SendSingleMessagePage() {
  const [formData, setFormData] = useState({
    recipientId: "",
    phone: "",
    subject: "",
    content: "",
  });

  const utils = trpc.useUtils();
  const { data: usersData, isLoading: usersLoading } = trpc.admin.getAllUsers.useQuery({ page: 1, pageSize: 1000 });
  
  const sendMessageMutation = trpc.message.sendSingle.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "Message sent successfully!");
      utils.message.getPreviousNotices.invalidate();
      setFormData({
        recipientId: "",
        phone: "",
        subject: "",
        content: "",
      });
    },
    onError: (err) => {
      toast.error(err.message || "Failed to send message");
    }
  });

  const handleUserSelect = (val: string) => {
    const selectedUser = usersData?.items?.find(u => u.id.toString() === val);
    setFormData(prev => ({
      ...prev,
      recipientId: val,
      phone: selectedUser?.phone || prev.phone,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.content) {
      toast.error("Please fill in subject and content");
      return;
    }

    if (!formData.recipientId && !formData.phone) {
      toast.error("Please select a user OR enter a WhatsApp phone number");
      return;
    }

    sendMessageMutation.mutate({
      recipientId: formData.recipientId ? parseInt(formData.recipientId) : undefined,
      phone: formData.phone || undefined,
      subject: formData.subject,
      content: formData.content,
    });
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Mail className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold">Direct Message</h1>
          <p className="text-gray-500 mt-1">Send a direct system notice to a specific user.</p>
        </div>
      </div>

      <Card className="mb-6 border-blue-100 bg-blue-50/50">
        <CardContent className="p-4 flex gap-3 text-sm text-blue-800">
          <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-900">WhatsApp Sync Enabled</p>
            <p className="text-blue-700 mt-0.5">This notice will automatically be redirected to the recipient's phone number as a WhatsApp message via WhatsApp REST API.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compose Message</CardTitle>
          <CardDescription>This message will appear in the user's personal dashboard.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="recipientId">Select Recipient User</Label>
                <Select 
                  value={formData.recipientId} 
                  onValueChange={handleUserSelect}
                  disabled={usersLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={usersLoading ? "Loading users..." : "Search registered user"} />
                  </SelectTrigger>
                  <SelectContent>
                    {usersData?.items?.map(user => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email || 'No Email'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp Phone Number *</Label>
                <Input
                  id="phone"
                  placeholder="e.g. 7077906817 or 917077906817"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                placeholder="Message subject line"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Message Content *</Label>
              <Textarea
                id="content"
                placeholder="Type your message here..."
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                required
                rows={8}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg"
              disabled={sendMessageMutation.isPending}
            >
              <Send className="w-5 h-5 mr-2" />
              {sendMessageMutation.isPending ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
