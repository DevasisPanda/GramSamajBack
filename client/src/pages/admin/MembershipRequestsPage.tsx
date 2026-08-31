import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Clock, CreditCard, ShieldAlert, CheckCircle2, AlertTriangle, Gift } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function MembershipRequestsPage() {
  const utils = trpc.useUtils();
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid" | "exempted">("all");

  // Fetch pending memberships from members table
  const { data, isLoading } = trpc.membership.getPending.useQuery({ page: 1, pageSize: 1000 });

  const pendingMembers = data?.items || [];

  const paidMembers = pendingMembers.filter(m => m.paymentStatus === "paid");
  const unpaidMembers = pendingMembers.filter(m => m.paymentStatus === "unpaid" || !m.paymentStatus);
  const exemptedMembers = pendingMembers.filter(m => m.paymentStatus === "exempted");

  const filteredMembers = pendingMembers.filter(m => {
    if (filter === "paid") return m.paymentStatus === "paid";
    if (filter === "unpaid") return m.paymentStatus === "unpaid" || !m.paymentStatus;
    if (filter === "exempted") return m.paymentStatus === "exempted";
    return true;
  });

  const approveMutation = trpc.membership.approve.useMutation({
    onSuccess: () => {
      toast.success("Membership request approved!");
      utils.membership.getPending.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const rejectMutation = trpc.membership.reject.useMutation({
    onSuccess: () => {
      toast.success("Membership request rejected.");
      utils.membership.getPending.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  if (isLoading) {
    return <div className="p-8">Loading membership requests...</div>;
  }

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Membership Requests</h1>
          <p className="text-gray-500 mt-1">Review and approve new user applications with verified Razorpay payment records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1 bg-emerald-100 text-emerald-800 font-bold border-emerald-300">
            {paidMembers.length} Paid Online
          </Badge>
          <Badge variant="secondary" className="text-sm px-3 py-1 bg-amber-100 text-amber-800 font-bold border-amber-300">
            {unpaidMembers.length} Unpaid / Signup Only
          </Badge>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          size="sm"
          variant={filter === "all" ? "default" : "outline"}
          onClick={() => setFilter("all")}
          className="font-bold"
        >
          All Applications ({pendingMembers.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "paid" ? "default" : "outline"}
          onClick={() => setFilter("paid")}
          className={filter === "paid" ? "bg-emerald-600 hover:bg-emerald-700 font-bold" : "border-emerald-500 text-emerald-700 hover:bg-emerald-50 font-bold"}
        >
          💳 Paid Online ({paidMembers.length})
        </Button>
        <Button
          size="sm"
          variant={filter === "unpaid" ? "default" : "outline"}
          onClick={() => setFilter("unpaid")}
          className={filter === "unpaid" ? "bg-amber-600 hover:bg-amber-700 font-bold" : "border-amber-500 text-amber-700 hover:bg-amber-50 font-bold"}
        >
          ⚠️ Unpaid / Signup Only ({unpaidMembers.length})
        </Button>
        {exemptedMembers.length > 0 && (
          <Button
            size="sm"
            variant={filter === "exempted" ? "default" : "outline"}
            onClick={() => setFilter("exempted")}
            className={filter === "exempted" ? "bg-blue-600 hover:bg-blue-700 font-bold" : "border-blue-500 text-blue-700 hover:bg-blue-50 font-bold"}
          >
            🎁 Exempted ({exemptedMembers.length})
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending Applications</CardTitle>
          <CardDescription>Verify whether applicant completed Razorpay fee payment before approving.</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMembers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg text-gray-500 mt-4">
              <Check className="w-12 h-12 mx-auto text-green-200 mb-3" />
              <p className="text-lg font-medium text-gray-900">No applications match this filter</p>
              <p>Try switching to another filter tab above.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredMembers.map((member) => {
                const isPaid = member.paymentStatus === "paid";
                const isExempted = member.paymentStatus === "exempted";
                const amountDisplay = member.amountPaid ? `₹${member.amountPaid}` : (member.membershipType === "lifetime" ? "₹5,100" : "₹500");

                return (
                  <div key={member.id} className={`border p-4 rounded-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white hover:bg-gray-50 transition-colors shadow-sm ${isPaid ? "border-l-4 border-l-emerald-500" : "border-l-4 border-l-amber-400"}`}>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <h3 className="font-semibold text-lg text-gray-900">{member.name || "Anonymous Applicant"}</h3>
                        <span className="text-sm text-gray-500 font-mono">({member.membershipNumber})</span>
                        <Badge variant="outline" className="capitalize">{member.membershipType || "Regular"}</Badge>

                        {/* Distinguishing Payment Badges */}
                        {isPaid ? (
                          <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            PAID ONLINE ({amountDisplay})
                          </Badge>
                        ) : isExempted ? (
                          <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5" />
                            1ST YEAR FREE (Exempted)
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50 font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            UNPAID / SIGNUP ONLY (₹0)
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-6 text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-medium">Email:</span>
                          <span className="truncate max-w-[200px]" title={member.email || undefined}>{member.email || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-400 font-medium">Phone:</span>
                          <span>{member.phone || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{member.createdAt ? format(new Date(member.createdAt), "MMM d, yyyy") : "Recently"}</span>
                        </div>
                      </div>

                      {/* Payment Transaction Details */}
                      {isPaid && member.paymentTxnId && (
                        <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1 inline-flex items-center gap-2 mt-1">
                          <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Razorpay Txn: <strong className="font-mono">{member.paymentTxnId}</strong></span>
                        </div>
                      )}

                      {member.referralCode && (
                        <div className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-1">
                          <span className="text-gray-400 font-normal">Referred by:</span>
                          <Badge variant="secondary" className="h-5 py-0 px-2 text-[10px]">{member.referralCode}</Badge>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0 flex-wrap">
                      <Button
                        className="flex-1 md:flex-none flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold"
                        onClick={() => {
                          if (window.confirm(`Approve membership request for ${member.name || 'this member'}?`)) {
                            approveMutation.mutate({ membershipId: member.id });
                          }
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="w-4 h-4" />
                        Approve
                      </Button>
                      {!isPaid && (
                        <Button
                          variant="outline"
                          className="flex-1 md:flex-none flex items-center gap-1 border-amber-500 text-amber-700 hover:bg-amber-50 font-bold"
                          onClick={() => {
                            if (window.confirm(`Approve membership with 1st Year Free Exemption?`)) {
                              approveMutation.mutate({ membershipId: member.id, isExempted: true });
                            }
                          }}
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          1st Year Free
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        className="flex-1 md:flex-none flex items-center gap-1.5"
                        onClick={() => {
                          if (window.confirm(`Are you sure you want to REJECT this membership?`)) {
                            rejectMutation.mutate({ membershipId: member.id });
                          }
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
