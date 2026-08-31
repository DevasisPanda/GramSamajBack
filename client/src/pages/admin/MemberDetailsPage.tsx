import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { FileText, Award, CreditCard, Share2, User, QrCode, ShieldAlert } from "lucide-react";
import { format } from "date-fns";
import { CaptureActions } from "@/components/CaptureActions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { VerifiableDocument } from "@/components/VerifiableDocument";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export default function MemberDetailsPage() {
  const [, params] = useRoute("/admin/users/detail/:id");
  const [, setLocation] = useLocation();
  const userId = params?.id ? parseInt(params.id) : 0;

  const appointmentRef = useRef<HTMLDivElement>(null);
  const certRef = useRef<HTMLDivElement>(null);
  const idCardRefMP = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  
  // Upgrade member to lifetime mutation
  const upgradeMutation = trpc.membership.upgradeToLifetime.useMutation({
    onSuccess: () => {
      utils.membership.getMemberDetails.invalidate({ userId });
      toast.success("Membership successfully upgraded to Lifetime!");
    }
  });

  // Generate ID Card mutation
  const generateIDCardMutation = trpc.document.generateIDCard.useMutation({
    onSuccess: () => {
      utils.document.getIDCards.invalidate({ memberId: member?.id });
      toast.success("ID Card generated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to generate ID Card");
    }
  });

  // Queries
  const { data: member, isLoading } = trpc.membership.getMemberDetails.useQuery(
    { userId },
    { enabled: !!userId }
  );

  const { data: certificates } = trpc.document.getCertificates.useQuery(
    { recipientId: userId },
    { enabled: !!userId }
  );

  const { data: appointmentLetters } = trpc.document.getAppointmentLetters.useQuery(
    { recipientId: userId },
    { enabled: !!userId }
  );

  const { data: idCards } = trpc.document.getIDCards.useQuery(
    { memberId: member?.id },
    { enabled: !!member?.id }
  );

  const { data: dbTemplates } = trpc.document.getTemplateConfigs.useQuery();

  // Modal states
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [resetPasswordVal, setResetPasswordVal] = useState("");

  const resetPasswordMutation = trpc.admin.resetUserPassword.useMutation({
    onSuccess: (res) => {
      toast.success(res.message || "User password has been successfully reset!");
      setIsResetPasswordModalOpen(false);
      setResetPasswordVal("");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to reset password");
    }
  });

  const handleResetPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetPasswordVal.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    resetPasswordMutation.mutate({
      userId,
      newPassword: resetPasswordVal,
    });
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading member details...</div>;
  }

  if (!member) {
    return <div className="flex h-screen items-center justify-center text-red-500">Member not found.</div>;
  }

  const latestLetter = appointmentLetters && appointmentLetters.length > 0 ? appointmentLetters[0] : null;
  const membershipCert = certificates?.find(c => c.certificateType === "membership" || c.certificateType === "volunteer" || c.certificateType === "achievement");
  const latestIDCard = idCards && idCards.length > 0 ? idCards[0] : null;

  const Row = ({ icon: Icon, label, value }: { icon?: any; label: string; value: React.ReactNode }) => (
    <div className="flex border-b border-gray-200">
      <div className="w-1/3 bg-emerald-50/50 p-3 flex items-center gap-2 border-r border-gray-200 font-medium text-gray-700 text-sm">
        {Icon && <Icon className="w-4 h-4 text-teal-700" />}
        {label}
      </div>
      <div className="w-2/3 p-3 text-sm text-gray-600 bg-white flex items-center">
        {value || "N/A"}
      </div>
    </div>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="bg-teal-700 text-white p-2 text-center font-semibold text-sm">
      {title}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-2xl bg-white shadow-lg overflow-hidden flex flex-col">
        
        {/* Header Section */}
        <div className="bg-gray-50 flex flex-col items-center py-6 border-b border-gray-200">
          <div className="w-24 h-24 rounded-full border-4 border-red-500 overflow-hidden mb-3 bg-white flex items-center justify-center">
            {member.user?.profileImage ? (
              <img src={member.user.profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <img src="/aird-logo.png" alt="AIRD Logo" className="w-full h-full object-contain p-1" />
            )}
          </div>
          <div className="flex items-center gap-2 text-gray-800 font-semibold">
            <User className="w-4 h-4" />
            Details Of {member.user?.name || "Member"}
          </div>
          <div className="mt-1">
            <StatusBadge status={member.user?.role} isSystemAdmin={member.user?.isSystemAdmin} />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 flex flex-col gap-4">
          
          {/* Active Documents */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Active Documents" />
            <div className="bg-white p-4">
              <div className="grid grid-cols-3 gap-2 mb-2">
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-2 flex items-center justify-center gap-1"
                  onClick={() => {
                    if (latestLetter) {
                      setIsAppointmentModalOpen(true);
                    } else {
                      toast.error("No appointment letter has been issued for this member yet.");
                    }
                  }}
                >
                  <FileText className="w-3 h-3" /> Appointment Letter
                </Button>
                <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-2 flex items-center justify-center gap-1"
                  onClick={() => {
                    if (membershipCert) {
                      setIsCertificateModalOpen(true);
                    } else {
                      toast.error("No membership certificate has been issued for this member yet.");
                    }
                  }}
                >
                  <Award className="w-3 h-3" /> Membership Certificate
                </Button>
                 <Button 
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-2 flex items-center justify-center gap-1"
                  onClick={() => {
                    if (latestIDCard) {
                      setIsIDCardModalOpen(true);
                    } else {
                      if (window.confirm("No ID Card has been generated for this member yet. Would you like to generate it now?")) {
                        generateIDCardMutation.mutate({
                          memberId: member.id,
                          designation: member.user?.designation || "Trust Member",
                        });
                      }
                    }
                  }}
                  disabled={generateIDCardMutation.isPending}
                >
                  <CreditCard className="w-3 h-3" /> {generateIDCardMutation.isPending ? "Generating..." : "ID Card"}
                </Button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant="outline" 
                  className="bg-[#8cc63f] hover:bg-[#7ab131] text-white border-none text-xs h-8 px-2 flex items-center justify-center gap-1"
                  onClick={() => {
                    if (latestLetter) {
                      window.open(`/verify/certificate/${latestLetter.qrCode}`, '_blank');
                    } else {
                      toast.error("Issue appointment letter first to share.");
                    }
                  }}
                >
                  Share on <Share2 className="w-3 h-3 ml-1" />
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-[#8cc63f] hover:bg-[#7ab131] text-white border-none text-xs h-8 px-2 flex items-center justify-center gap-1"
                  onClick={() => {
                    if (membershipCert) {
                      window.open(`/verify/certificate/${membershipCert.qrCode}`, '_blank');
                    } else {
                      toast.error("Issue membership certificate first to share.");
                    }
                  }}
                >
                  Share on <Share2 className="w-3 h-3 ml-1" />
                </Button>
                <Button 
                  variant="outline" 
                  className="bg-[#8cc63f] hover:bg-[#7ab131] text-white border-none text-xs h-8 px-2 flex items-center justify-center gap-1"
                  onClick={() => {
                    if (latestIDCard) {
                      window.open(`/verify/idcard/${latestIDCard.qrCode}`, '_blank');
                    } else {
                      toast.error("Issue ID card first to share.");
                    }
                  }}
                >
                  Share on <Share2 className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </div>

          {/* Registration Details */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Registration details" />
            <div className="flex flex-col">
              <Row icon={FileText} label="Reg No:" value={member.membershipNumber} />
              <Row icon={FileText} label="Reg Date:" value={member.joinDate ? format(new Date(member.joinDate), "dd-MM-yyyy") : ""} />
              <Row icon={FileText} label="Account's Status:" value={<span className="capitalize">{member.status}</span>} />
              <Row icon={CreditCard} label="Payment Status:" value={
                member.paymentStatus === "paid" ? (
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    💳 Paid Online (₹{member.amountPaid || (member.membershipType === "lifetime" ? "5,100" : "500")})
                  </span>
                ) : member.paymentStatus === "exempted" ? (
                  <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    🎁 1st Year Free / Exempted
                  </span>
                ) : (
                  <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    ⚠️ Unpaid / Signup Only (₹0)
                  </span>
                )
              } />
              {member.paymentTxnId && (
                <Row icon={CreditCard} label="Razorpay Txn ID:" value={<span className="font-mono text-xs font-semibold text-gray-800">{member.paymentTxnId}</span>} />
              )}
              <Row icon={User} label="User Type:" value={<span className="capitalize">{member.user?.role}</span>} />
              <Row icon={User} label="Verified By:" value="Admin" />
              <Row icon={FileText} label="Membership Type:" value={
                <div className="flex items-center gap-2">
                  <span className="capitalize">{member.membershipType}</span>
                  {member.membershipType !== 'lifetime' && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-6 text-[10px] px-2 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
                      onClick={() => upgradeMutation.mutate({ membershipId: member.id })}
                      disabled={upgradeMutation.isPending}
                    >
                      Grant Lifetime
                    </Button>
                  )}
                </div>
              } />
            </div>
          </div>

          {/* Personal Information */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Personal Information" />
            <div className="flex flex-col">
              <Row icon={User} label="Name:" value={member.user?.name} />
              <Row icon={User} label="Father Name:" value={member.user?.fatherName} />
              <Row icon={FileText} label="Email:" value={member.user?.email} />
              <Row icon={FileText} label="Mobile:" value={member.user?.phone} />
              <Row icon={FileText} label="Date Of Birth:" value={member.user?.dob ? format(new Date(member.user.dob), "dd-MM-yyyy") : ""} />
              <Row icon={FileText} label="Aadhar Card No.:" value={member.user?.aadharNumber} />
            </div>
          </div>

          {/* Demographic Information */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Demographic Information" />
            <div className="flex flex-col">
              <Row icon={FileText} label="Gender:" value={<span className="capitalize">{member.user?.gender}</span>} />
              <Row icon={FileText} label="Married Status:" value={<span className="capitalize">{member.user?.maritalStatus}</span>} />
              <Row icon={FileText} label="Category:" value={member.user?.category} />
              <Row icon={FileText} label="Blood Group:" value={member.user?.bloodGroup} />
            </div>
          </div>

          {/* Professional Information */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Professional Information" />
            <div className="flex flex-col">
              <Row icon={User} label="Occupation:" value={member.user?.occupation} />
            </div>
          </div>

          {/* Residential Address Details */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Residential Address Details" />
            <div className="flex flex-col">
              <Row icon={FileText} label="Address:" value={member.user?.address} />
              <Row icon={FileText} label="Pin Code:" value={member.user?.pinCode} />
              <Row icon={FileText} label="State:" value={member.user?.state} />
              <Row icon={FileText} label="City:" value={member.user?.city} />
            </div>
          </div>

          {/* Media Upload */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Media Upload" />
            <div className="flex border-b border-gray-200">
              <div className="w-1/3 bg-emerald-50/50 p-3 flex items-center gap-2 border-r border-gray-200 font-medium text-gray-700 text-sm">
                <FileText className="w-4 h-4 text-teal-700" />
                User Profile:
              </div>
              <div className="w-2/3 p-3 bg-white flex items-center justify-center">
                {member.user?.profileImage ? (
                  <img src={member.user.profileImage} alt="Profile" className="w-32 h-32 object-cover border border-gray-300" />
                ) : (
                  <div className="w-32 h-32 bg-gray-200 flex items-center justify-center text-gray-400 text-xs border border-gray-300">
                    No Image
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Role Applying For */}
          <div className="border border-teal-700 rounded overflow-hidden">
            <SectionHeader title="Role Applying For in the Organization" />
            <div className="flex flex-col border-b-0">
              <Row icon={Award} label="Designation:" value={member.user?.designation || "Member"} />
            </div>
          </div>

          {/* Reset Password Button */}
          <Button 
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold mt-2"
            onClick={() => setIsResetPasswordModalOpen(true)}
          >
            Reset User Password
          </Button>

          {/* Go Back Button */}
          <Button 
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold mt-2"
            onClick={() => setLocation("/admin/users/active")}
          >
            Go Back
          </Button>

        </div>
        
        {/* Footer */}
        <div className="bg-teal-800 text-white text-center py-3 text-xs leading-relaxed mt-auto">
          © 2026 Digital NGO-Software<br/>
          Create by Star Marketing
        </div>
      </div>

      {/* ==================== PREVIEW MODALS ==================== */}

      {/* 1. Appointment Letter Preview Modal */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-teal-800 flex items-center gap-2">
              <FileText className="w-5 h-5" /> Appointment Letter Preview
            </DialogTitle>
            <DialogDescription>
              Preview of official appointment letter for {member.user?.name}.
            </DialogDescription>
          </DialogHeader>

          {latestLetter && (
            <div className="py-4 flex justify-center">
              <VerifiableDocument
                templateId="appointment"
                fieldValues={{
                  letterNumber: latestLetter.letterNumber,
                  name1: member.user?.name || "",
                  name2: member.user?.name || "",
                  post: latestLetter.position,
                  mobile: member.user?.phone || "",
                  fromDate: format(new Date(latestLetter.appointmentDate), "dd/MM/yyyy"),
                  toDate: "Ongoing"
                }}
                dbTemplates={dbTemplates}
                cardRef={appointmentRef}
                className="max-w-lg mx-auto rounded-lg"
              />
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <CaptureActions cardRef={appointmentRef} filename={`Appointment_Letter_${member?.user?.name?.replace(/\s+/g, "_") || "member"}`} />
            <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsAppointmentModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 2. Membership Certificate Preview Modal */}
      <Dialog open={isCertificateModalOpen} onOpenChange={setIsCertificateModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-teal-800 flex items-center gap-2">
              <Award className="w-5 h-5" /> Membership Certificate Preview
            </DialogTitle>
          </DialogHeader>

          {membershipCert && (
            <div className="py-4 flex justify-center">
              <VerifiableDocument
                templateId={membershipCert.certificateType}
                fieldValues={
                  membershipCert.certificateType === 'achievement'
                    ? {
                        fullName: member.user?.name || "",
                        description: membershipCert.description || "",
                        issueDate: membershipCert.issueDate ? format(new Date(membershipCert.issueDate), "dd/MM/yyyy") : "",
                        certificateNumber: membershipCert.certificateNumber,
                      }
                    : {
                        fullName: member.user?.name || "",
                        membershipNumber: membershipCert.certificateNumber,
                        joinDate: membershipCert.issueDate ? format(new Date(membershipCert.issueDate), "dd/MM/yyyy") : "",
                        expiryDate: membershipCert.expiryDate ? format(new Date(membershipCert.expiryDate), "dd/MM/yyyy") : "Lifetime",
                      }
                }
                dbTemplates={dbTemplates}
                cardRef={certRef}
                className="max-w-lg mx-auto rounded-lg"
              />
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex gap-2">
            <CaptureActions cardRef={certRef} filename={`Certificate_${membershipCert?.certificateNumber || "document"}`} />
            <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsCertificateModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. ID Card Preview Modal */}
      <Dialog open={isIDCardModalOpen} onOpenChange={setIsIDCardModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-teal-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5" /> Digital ID Card Preview
            </DialogTitle>
          </DialogHeader>

          {latestIDCard && (
            <div className="py-4 flex justify-center">
              <VerifiableDocument
                templateId="id_card"
                fieldValues={{
                  photo: member.user?.profileImage || "",
                  fullName: member.user?.name || "",
                  designation: member.user?.designation || "Trust Member",
                  cardNumber: latestIDCard.cardNumber,
                  mobile: member.user?.phone || "N/A",
                  email: member.user?.email || "N/A",
                  city: member.user?.city || "N/A",
                  issueDate: latestIDCard.issueDate ? format(new Date(latestIDCard.issueDate), "dd-MM-yyyy") : "",
                  expiryDate: latestIDCard.expiryDate ? format(new Date(latestIDCard.expiryDate), "dd-MM-yyyy") : "Lifetime",
                }}
                dbTemplates={dbTemplates}
                cardRef={idCardRefMP}
                className="max-w-lg mx-auto rounded-lg"
              />
            </div>
          )}

          <DialogFooter className="pt-2 border-t flex gap-2">
            <CaptureActions cardRef={idCardRefMP} filename={`ID_Card_${member?.user?.name?.replace(/\s+/g, "_") || "member"}`} />
            <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsIDCardModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 4. Reset User Password Modal */}
      <Dialog open={isResetPasswordModalOpen} onOpenChange={setIsResetPasswordModalOpen}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-amber-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-amber-600" /> Administrative Password Reset
            </DialogTitle>
            <DialogDescription>
              Overwrite the password for user <strong>{member.user?.name}</strong> ({member.user?.email}).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="admin-new-password">New Password *</Label>
              <Input
                id="admin-new-password"
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={resetPasswordVal}
                onChange={(e) => setResetPasswordVal(e.target.value)}
                required
              />
            </div>

            <DialogFooter className="pt-4 border-t gap-2">
              <Button type="button" variant="outline" onClick={() => setIsResetPasswordModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold" disabled={resetPasswordMutation.isPending}>
                {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

    </div>
  );
}
