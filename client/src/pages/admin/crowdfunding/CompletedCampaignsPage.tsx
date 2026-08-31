import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/_core/hooks/useAuth";

export default function CompletedCampaignsPage() {
  const { user } = useAuth();
  const [selectedCampaign, setSelectedCampaign] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<"all" | "donation" | "volunteer">("all");
  const [filterAmountStr, setFilterAmountStr] = useState("");

  // Queries
  const { data: campaigns } = trpc.campaign.getCompleted.useQuery();
  const { data: campaignStats } = trpc.campaign.getStats.useQuery(
    { campaignId: selectedCampaign || 0 },
    { enabled: !!selectedCampaign }
  );

  const filteredCampaigns = campaigns?.filter(c => {
    if (filterType !== "all" && c.campaignType !== filterType) return false;
    
    const amountOrPeople = parseFloat(filterAmountStr);
    if (!isNaN(amountOrPeople) && amountOrPeople > 0) {
       if (c.campaignType === "donation" && parseFloat(c.goalAmount as unknown as string) < amountOrPeople) return false;
       if (c.campaignType === "volunteer" && c.targetVolunteers && c.targetVolunteers < amountOrPeople) return false;
    }
    return true;
  });

  if (user?.role !== "admin") return <div className="p-6">Access Denied</div>;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <CardTitle>Completed Campaigns</CardTitle>
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
                    selectedCampaign === campaign.id ? "border-green-500 bg-green-50 shadow-md" : "hover:border-gray-400 bg-white"
                  }`}
                  onClick={() => setSelectedCampaign(campaign.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg">{campaign.title}</h3>
                    <span className="text-xs px-2 py-1 rounded capitalize bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{campaign.description}</p>
                  
                  <div className="mt-4 pt-3 border-t">
                    {campaign.campaignType === "volunteer" ? (
                      <p className="text-sm font-medium text-gray-800">
                        Target Volunteers: {campaign.targetVolunteers || "Open"}
                      </p>
                    ) : (
                      <p className="text-sm font-medium text-gray-800">Goal: ₹{campaign.goalAmount}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No completed campaigns found.</p>
          )}
        </CardContent>
      </Card>

      {/* Campaign Details */}
      {selectedCampaign && campaignStats && (
        <div className="grid gap-6 md:grid-cols-2">
          {campaigns?.find(c => c.id === selectedCampaign)?.campaignType === "volunteer" ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Final Volunteer Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Target Volunteers</p>
                    <p className="text-2xl font-bold">{campaigns?.find(c => c.id === selectedCampaign)?.targetVolunteers || "Open"}</p>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Final Campaign Progress</CardTitle>
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
                  <CardTitle>Final Stats</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">Total Donors</p>
                    <p className="text-2xl font-bold">{campaignStats.donorCount}</p>
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
        </div>
      )}
    </div>
  );
}
