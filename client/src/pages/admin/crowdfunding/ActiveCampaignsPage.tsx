import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRazorpayPayment } from "@/hooks/useRazorpayPayment";
import { toast } from "sonner";

export default function ActiveCampaignsPage() {
  const { user } = useAuth();
  const { initiatePayment, isProcessing } = useRazorpayPayment();
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "donation" | "volunteer">("all");
  const [filterAmountStr, setFilterAmountStr] = useState("");

  // Queries
  const { data: campaigns } = trpc.campaign.getActive.useQuery();
  const { data: campaignStats } = trpc.campaign.getStats.useQuery(
    { campaignId: selectedCampaign || 0 },
    { enabled: !!selectedCampaign }
  );
  const { data: campaignDonations } = trpc.campaign.getDonations.useQuery(
    { campaignId: selectedCampaign || 0 },
    { enabled: !!selectedCampaign }
  );
  const { data: campaignVolunteers, refetch: refetchVolunteers } = trpc.campaign.getVolunteers.useQuery(
    { campaignId: selectedCampaign || 0 },
    { enabled: !!selectedCampaign }
  );

  const joinVolunteerMutation = trpc.campaign.joinVolunteer.useMutation({
    onSuccess: () => {
      toast.success("Successfully joined as a volunteer!");
      refetchVolunteers();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateVolunteerStatusMutation = trpc.campaign.updateVolunteerStatus.useMutation({
    onSuccess: () => {
      toast.success("Volunteer status updated!");
      refetchVolunteers();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const markCompletedMutation = trpc.campaign.markCompleted.useMutation({
    onSuccess: () => {
      toast.success("Campaign manually marked as completed!");
      setSelectedCampaign(null);
      // Let the query cache invalidate/refetch automatically if set up, or force reload
      window.location.reload(); 
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const filteredCampaigns = campaigns?.filter(c => {
    if (filterType !== "all" && c.campaignType !== filterType) return false;
    
    const amountOrPeople = parseFloat(filterAmountStr);
    if (!isNaN(amountOrPeople) && amountOrPeople > 0) {
       if (c.campaignType === "donation" && parseFloat(c.goalAmount as unknown as string) < amountOrPeople) return false;
       if (c.campaignType === "volunteer" && c.targetVolunteers && c.targetVolunteers < amountOrPeople) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle>Active Campaigns</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={filterType} onValueChange={(val: any) => setFilterType(val)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  <SelectItem value="donation">Donations Only</SelectItem>
                  <SelectItem value="volunteer">Volunteer Only</SelectItem>
                </SelectContent>
              </Select>
              {filterType !== "all" && (
                <Input
                  type="number"
                  placeholder={filterType === "donation" ? "Min Amount (₹)" : "Min Volunteers"}
                  value={filterAmountStr}
                  onChange={(e) => setFilterAmountStr(e.target.value)}
                  className="w-32"
                />
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredCampaigns && filteredCampaigns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredCampaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`border p-4 rounded-lg cursor-pointer transition flex flex-col ${
                    selectedCampaign === campaign.id ? "border-blue-500 bg-blue-50 shadow-md" : "hover:border-gray-400 bg-white"
                  }`}
                  onClick={() => setSelectedCampaign(campaign.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{campaign.title}</h3>
                    <span className={`text-xs px-2 py-1 rounded capitalize ${campaign.campaignType === 'donation' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                      {campaign.campaignType}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{campaign.description}</p>
                  
                  <div className="mt-auto space-y-2 pt-3 border-t text-xs text-gray-600">
                    {campaign.whyNeeded && <p><strong>Why:</strong> <span className="line-clamp-1">{campaign.whyNeeded}</span></p>}
                    {campaign.forWhom && <p><strong>For:</strong> <span className="line-clamp-1">{campaign.forWhom}</span></p>}
                    {campaign.impact && <p><strong>Impact:</strong> <span className="line-clamp-1">{campaign.impact}</span></p>}
                  </div>

                  <div className="mt-4 pt-3 border-t">
                    {campaign.campaignType === "volunteer" ? (
                      <p className="text-sm font-medium text-gray-800">
                        Target Volunteers: {campaign.targetVolunteers || "Open"}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm font-medium text-gray-800">Goal: ₹{campaign.goalAmount}</p>
                        <div className="mt-2 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-green-500 h-1.5 rounded-full" style={{ width: "45%" }}></div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No active campaigns found matching the filters.</p>
          )}
        </CardContent>
      </Card>

      {/* Campaign Details */}
      {selectedCampaign && campaignStats && (
        <div className="grid gap-6 md:grid-cols-3">
          {campaigns?.find(c => c.id === selectedCampaign)?.campaignType === "volunteer" ? (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Volunteer Progress</CardTitle>
                  {user?.role === "admin" && (
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs py-1 h-8"
                      onClick={() => markCompletedMutation.mutate({ campaignId: selectedCampaign })}
                      disabled={markCompletedMutation.isPending}
                    >
                      {markCompletedMutation.isPending ? "Updating..." : "Mark Completed"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Target Volunteers</p>
                    <p className="text-2xl font-bold">{campaigns?.find(c => c.id === selectedCampaign)?.targetVolunteers || "Open"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registered Volunteers</p>
                    <p className="text-2xl font-bold text-teal-600">{campaignVolunteers?.length || 0}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Days Remaining</p>
                    <p className="text-2xl font-bold">{Math.max(0, campaignStats.daysRemaining)}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Campaign Progress</CardTitle>
                  {user?.role === "admin" && (
                    <Button 
                      variant="outline" 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs py-1 h-8"
                      onClick={() => markCompletedMutation.mutate({ campaignId: selectedCampaign })}
                      disabled={markCompletedMutation.isPending}
                    >
                      {markCompletedMutation.isPending ? "Updating..." : "Mark Completed"}
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Goal Amount</p>
                    <p className="text-2xl font-bold">₹{campaignStats.goalAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Raised</p>
                    <p className="text-2xl font-bold text-green-600">₹{campaignStats.totalRaised.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Progress</p>
                    <p className="text-xl font-bold">{campaignStats.percentage.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Campaign Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Total Donors</p>
                    <p className="text-2xl font-bold">{campaignStats.donorCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Days Remaining</p>
                    <p className="text-2xl font-bold">{Math.max(0, campaignStats.daysRemaining)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Average Donation</p>
                    <p className="text-lg font-semibold">
                      ₹{campaignStats.donorCount > 0 ? (campaignStats.totalRaised / campaignStats.donorCount).toFixed(2) : "0"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {campaigns?.find(c => c.id === selectedCampaign)?.campaignType === "donation" ? (
            <Card>
              <CardHeader>
                <CardTitle>Progress Bar</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-500 h-4 rounded-full transition-all"
                      style={{ width: `${campaignStats.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{campaignStats.percentage.toFixed(1)}% of goal reached</p>
                </div>
                <Button className="w-full" disabled={isProcessing} onClick={() => {
                  const campaign = campaigns?.find(c => c.id === selectedCampaign);
                  if (!campaign) return;
                  initiatePayment({
                    amount: 100,
                    donorName: user?.name || user?.email || "Donor",
                    donorEmail: user?.email || "",
                    purpose: `Donation to ${campaign.title}`,
                    campaignId: selectedCampaign!,
                  });
                }}>{isProcessing ? "Opening Checkout..." : "Donate to Campaign"}</Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Volunteer Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mt-2">Join this campaign to help us achieve our goals!</p>
                </div>
                {user?.role === "user" && (
                  <Button 
                    className="w-full bg-teal-600 hover:bg-teal-700"
                    onClick={() => joinVolunteerMutation.mutate({ campaignId: selectedCampaign })}
                    disabled={joinVolunteerMutation.isPending}
                  >
                    {joinVolunteerMutation.isPending ? "Joining..." : "Join as Volunteer"}
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Campaign Donations & Volunteers */}
      {selectedCampaign && (
        <>
          {campaigns?.find(c => c.id === selectedCampaign)?.campaignType === "donation" && campaignDonations && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Donations</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignDonations.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {campaignDonations.map((donation) => (
                      <div key={donation.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold">₹{donation.amount}</p>
                            <p className="text-sm text-gray-600">{donation.donorName}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded capitalize ${
                            donation.paymentStatus === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}>
                            {donation.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No donations yet</p>
                )}
              </CardContent>
            </Card>
          )}

          {campaigns?.find(c => c.id === selectedCampaign)?.campaignType === "volunteer" && user?.role === "admin" && campaignVolunteers && (
            <Card>
              <CardHeader>
                <CardTitle>Registered Volunteers Pipeline</CardTitle>
              </CardHeader>
              <CardContent>
                {campaignVolunteers.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {campaignVolunteers.map((vol) => (
                      <div key={vol.id} className="border-b pb-3 last:border-b-0">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold">{vol.name}</p>
                            <p className="text-sm text-gray-600">{vol.email}</p>
                            <p className="text-xs text-gray-400 mt-1">Applied: {new Date(vol.createdAt).toLocaleDateString()}</p>
                          </div>
                          
                          <Select
                            value={vol.status}
                            onValueChange={(val: any) => updateVolunteerStatusMutation.mutate({ id: vol.id, status: val })}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No volunteers yet</p>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
