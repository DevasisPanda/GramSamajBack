import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput, AadharInput, PincodeInput, DOBInput } from "@/components/ui/form-inputs";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, LogOut, User, Mail, Phone, FileText, CreditCard, Award, Calendar, Check, DollarSign, QrCode, Users, ChevronDown, Lock, CheckCircle2, AlertTriangle, Clock, HelpCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDate, formatPhone, maskAadhar } from "@/lib/formatters";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { VerifiableDocument } from "@/components/VerifiableDocument";
import { DonationReceiptHTML } from "@/components/DonationReceiptHTML";
import { CaptureActions } from "@/components/CaptureActions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function MemberDashboard() {
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [profile, setProfile] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);

  // Modal dialog states
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donationAmount, setDonationAmount] = useState("");
  const [donationNotes, setDonationNotes] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("general");
  const [isCertificatesModalOpen, setIsCertificatesModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);
  const [selectedPreviewCert, setSelectedPreviewCert] = useState<any>(null);
  const [isPreviewCertModalOpen, setIsPreviewCertModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptDonation, setSelectedReceiptDonation] = useState<any>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const appointmentRef = useRef<HTMLDivElement>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const certificateRef = useRef<HTMLDivElement>(null);
  const idCardRef = useRef<HTMLDivElement>(null);

  // Load Razorpay Checkout SDK
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Razorpay Mutations
  const createOrderMutation = trpc.payment.createOrder.useMutation();
  const verifyPaymentMutation = trpc.payment.verifyPayment.useMutation();

  // Legacy direct donation mutation (fallback/offline)
  const createDonationMutation = trpc.donation.create.useMutation({
    onSuccess: (res) => {
      toast.success(`Donation successful! Receipt No: ${res.receiptNumber}`);
      setIsDonationModalOpen(false);
      setDonationAmount("");
      setDonationNotes("");
      utils.donation.getMyDonations.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    }
  });

  const handleMakeDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(donationAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // 1. Trigger Razorpay Order Creation
    createOrderMutation.mutate(
      {
        amount: amountNum,
        donorId: profile?.id,
        donorName: profile?.name || "Valued Member",
        donorEmail: profile?.email || "member@valmikisamajcharitabletrust.org",
        donorPhone: (profile?.phone || "").replace(/\D/g, "").slice(0, 10) || undefined,
        purpose: selectedCampaign === "general" ? (donationNotes || "General Donation") : `Campaign Donation: ${selectedCampaign}`,
        campaignId: selectedCampaign !== "general" ? parseInt(selectedCampaign) : undefined,
      },
      {
        onSuccess: (orderData) => {
          if (!window.Razorpay) {
            toast.error("Razorpay SDK failed to load. Please refresh and try again.");
            return;
          }

          const options = {
            key: orderData.keyId,
            amount: orderData.amount,
            currency: orderData.currency,
            order_id: orderData.orderId,
            name: "Valmiki Samaj Charitable Trust",
            description: selectedCampaign === "general" ? (donationNotes || "NGO Donation") : `Campaign #${selectedCampaign}`,
            prefill: {
              name: profile?.name || "",
              email: profile?.email || "",
              contact: profile?.phone || "",
            },
            theme: {
              color: "#061941",
            },
            handler: function (response: any) {
              verifyPaymentMutation.mutate(
                {
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                },
                {
                  onSuccess: (res) => {
                    toast.success("Donation Payment Verified! Thank you for your support.");
                    setIsDonationModalOpen(false);
                    setDonationAmount("");
                    setDonationNotes("");
                    utils.donation.getMyDonations.invalidate();
                  },
                  onError: (err) => {
                    toast.error(err.message || "Payment verification failed.");
                  },
                }
              );
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        },
        onError: (err) => {
          toast.error(err.message || "Failed to initiate payment. Please check Razorpay keys in server configuration.");
        },
      }
    );
  };
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    bio: "",
    fatherName: "",
    dob: "",
    aadharNumber: "",
    gender: "male",
    maritalStatus: "single",
    category: "General",
    bloodGroup: "",
    occupation: "",
    address: "",
    pinCode: "",
    state: "",
    city: "",
    designation: "",
    profileImage: "",
  });

  const getProfileQuery = trpc.member.getProfile.useQuery();
  const { data: myMembership } = trpc.membership.getMyMembership.useQuery();
  const updateProfileMutation = trpc.member.updateProfile.useMutation();
  const configQuery = trpc.system.getConfig.useQuery();

  // Member Dashboard Modals & Verification Documents Data Queries
  const { data: myCertificates, isLoading: isCertificatesLoading } = trpc.document.getMyCertificates.useQuery(undefined, { enabled: myMembership?.status === "active" });
  const { data: myIDCard, isLoading: isIDCardLoading } = trpc.document.getMyIDCard.useQuery(undefined, { enabled: myMembership?.status === "active" });
  const { data: myAppointmentLetters } = trpc.document.getMyAppointmentLetters.useQuery(undefined, { enabled: myMembership?.status === "active" });
  const { data: myDonations, isLoading: isDonationsLoading } = trpc.donation.getMyDonations.useQuery({ page: 1, pageSize: 50 });
  const activeCampaignsQuery = trpc.campaign.getActive.useQuery();
  const { data: dbTemplates } = trpc.document.getTemplateConfigs.useQuery();

  useEffect(() => {
    if (getProfileQuery.data) {
      setProfile(getProfileQuery.data);
      setFormData({
        name: getProfileQuery.data.name || "",
        phone: getProfileQuery.data.phone || "",
        bio: getProfileQuery.data.bio || "",
        fatherName: getProfileQuery.data.fatherName || "",
        dob: getProfileQuery.data.dob ? new Date(getProfileQuery.data.dob).toISOString().split('T')[0] : "",
        aadharNumber: getProfileQuery.data.aadharNumber || "",
        gender: getProfileQuery.data.gender || "male",
        maritalStatus: getProfileQuery.data.maritalStatus || "single",
        category: getProfileQuery.data.category || "General",
        bloodGroup: getProfileQuery.data.bloodGroup || "",
        occupation: getProfileQuery.data.occupation || "",
        address: getProfileQuery.data.address || "",
        pinCode: getProfileQuery.data.pinCode || "",
        state: getProfileQuery.data.state || "",
        city: getProfileQuery.data.city || "",
        designation: getProfileQuery.data.designation || "",
        profileImage: getProfileQuery.data.profileImage || "",
      });
    }
  }, [getProfileQuery.data]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    
    const frontendUrl = configQuery.data?.frontendUrl || "http://localhost:5173";
    window.location.href = `${frontendUrl}/?action=logout`;
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfileMutation.mutateAsync(formData as any);
      setProfile({ ...profile, ...formData } as any);
      setEditMode(false);
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (getProfileQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 24-HOUR REVIEW NOTIFICATION BANNER */}
      {myMembership?.status === "pending" && (myMembership?.paymentStatus === "paid" || myMembership?.paymentStatus === "exempted") && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 shrink-0 animate-pulse text-amber-100" />
              <div>
                <p className="font-extrabold text-sm sm:text-base">Membership Application Under 24-Hour Review</p>
                <p className="text-xs text-amber-100 font-medium">Your payment and profile have been recorded. Verification usually completes within 24 hours. Gated features will unlock automatically.</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setLocation("/member/membership")}
              className="bg-white text-amber-900 hover:bg-amber-100 font-extrabold text-xs shadow-sm shrink-0"
            >
              View Application Details
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">Member Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleLogout} variant="outline" className="gap-2">
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 flex-1">
        {/* Welcome Message */}
        <Alert className="mb-8 bg-blue-50 border-blue-200">
          <Heart className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-blue-800">
            Welcome, <strong>{profile?.name || "Member"}</strong>! Manage your profile and stay updated with NGO activities.
          </AlertDescription>
        </Alert>

        {/* Profile Card */}
        <Card className="mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              My Profile
            </CardTitle>
            <Button
              onClick={() => setEditMode(!editMode)}
              variant={editMode ? "destructive" : "outline"}
            >
              {editMode ? "Cancel" : "Edit Profile"}
            </Button>
          </CardHeader>
          <CardContent>
            {editMode ? (
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="font-semibold text-lg text-teal-800 mb-3 border-b pb-2">Profile Image</h3>
                  <ImageUpload 
                    value={formData.profileImage} 
                    defaultAspectRatio="square"
                    onChange={(url) => setFormData({ ...formData, profileImage: url })} 
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="font-semibold text-lg text-teal-800 mb-3 border-b pb-2">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Full Name</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} /></div>
                    <div><Label>Father Name</Label><Input value={formData.fatherName} onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })} /></div>
                    <div><Label>Phone Number</Label><PhoneInput value={formData.phone} onChange={(phone) => setFormData({ ...formData, phone })} /></div>
                    <div><Label>Date of Birth</Label><DOBInput value={formData.dob} onChange={(dob) => setFormData({ ...formData, dob })} /></div>
                    <div><Label>Aadhar Card No.</Label><AadharInput value={formData.aadharNumber} onChange={(aadharNumber) => setFormData({ ...formData, aadharNumber })} /></div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="font-semibold text-lg text-teal-800 mb-3 border-b pb-2">Demographic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Gender</Label>
                      <select className="w-full border-gray-300 rounded-md border p-2 bg-white" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                        <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <Label>Marital Status</Label>
                      <select className="w-full border-gray-300 rounded-md border p-2 bg-white" value={formData.maritalStatus} onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}>
                        <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option>
                      </select>
                    </div>
                    <div>
                      <Label>Category</Label>
                      <select className="w-full border-gray-300 rounded-md border p-2 bg-white" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })}>
                        <option value="General">General</option><option value="OBC">OBC</option><option value="SC">SC</option><option value="ST">ST</option><option value="Other">Other</option>
                      </select>
                    </div>
                    <div><Label>Blood Group</Label><Input value={formData.bloodGroup} onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })} /></div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="font-semibold text-lg text-teal-800 mb-3 border-b pb-2">Professional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><Label>Occupation</Label><Input value={formData.occupation} onChange={(e) => setFormData({ ...formData, occupation: e.target.value })} /></div>
                    <div><Label>Role Applying For</Label><Input value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} /></div>
                    <div className="md:col-span-2"><Label>Bio</Label><Input value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder="Tell us about yourself" /></div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                  <h3 className="font-semibold text-lg text-teal-800 mb-3 border-b pb-2">Residential Address</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><Label>Full Address</Label><Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} /></div>
                    <div><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
                    <div><Label>State</Label><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></div>
                    <div><Label>Pin Code</Label><PincodeInput value={formData.pinCode} onChange={(pinCode) => setFormData({ ...formData, pinCode })} /></div>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-teal-700 hover:bg-teal-800 text-white font-bold h-12 text-lg mt-4">
                  Save All Changes
                </Button>
              </form>
            ) : (
              <div className="space-y-6">
                {profile?.profileImage && (
                  <div className="flex justify-center mb-6">
                    <img src={profile.profileImage} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg" />
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <div><p className="text-gray-500 text-sm">Full Name</p><p className="font-semibold">{profile?.name || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">Father Name</p><p className="font-semibold">{profile?.fatherName || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm flex items-center gap-1"><Mail className="h-4 w-4"/> Email</p><p className="font-semibold">{profile?.email}</p></div>
                  <div><p className="text-gray-500 text-sm flex items-center gap-1"><Phone className="h-4 w-4"/> Phone</p><p className="font-semibold">{formatPhone(profile?.phone)}</p></div>
                  <div><p className="text-gray-500 text-sm">Date of Birth</p><p className="font-semibold">{formatDate(profile?.dob)}</p></div>
                  <div><p className="text-gray-500 text-sm">Aadhar Number</p><p className="font-semibold">{maskAadhar(profile?.aadharNumber)}</p></div>
                </div>

                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><p className="text-gray-500 text-sm">Gender</p><p className="font-semibold capitalize">{profile?.gender || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">Marital Status</p><p className="font-semibold capitalize">{profile?.maritalStatus || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">Category</p><p className="font-semibold">{profile?.category || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">Blood Group</p><p className="font-semibold">{profile?.bloodGroup || "N/A"}</p></div>
                </div>

                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><p className="text-gray-500 text-sm">Occupation</p><p className="font-semibold">{profile?.occupation || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">Role Applying For</p><p className="font-semibold">{profile?.designation || "N/A"}</p></div>
                  {profile?.bio && <div className="md:col-span-2"><p className="text-gray-500 text-sm">Bio</p><p>{profile.bio}</p></div>}
                </div>

                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3"><p className="text-gray-500 text-sm">Address</p><p className="font-semibold">{profile?.address || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">City</p><p className="font-semibold">{profile?.city || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">State</p><p className="font-semibold">{profile?.state || "N/A"}</p></div>
                  <div><p className="text-gray-500 text-sm">Pin Code</p><p className="font-semibold">{profile?.pinCode || "N/A"}</p></div>
                </div>

              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded">
                <p className="text-gray-600 text-sm">Status</p>
                <p className="text-lg font-semibold capitalize text-blue-600">{profile?.status}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded">
                <p className="text-gray-600 text-sm">Role</p>
                <p className="text-lg font-semibold capitalize text-purple-600">{profile?.role}</p>
              </div>
              <div className="p-4 bg-green-50 rounded">
                <p className="text-gray-600 text-sm">Member Since</p>
                <p className="text-lg font-semibold text-green-600">
                  {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "N/A"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Quick Actions</CardTitle>
            {!myMembership || myMembership.status !== "active" ? (
              <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Gated: Active Membership Required
              </span>
            ) : (
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Full Access Unlocked
              </span>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              
              {/* Membership Button / Active Badge */}
              {!myMembership || myMembership.status !== "active" ? (
                <Button 
                  className="min-h-[48px] h-auto py-2.5 px-3 bg-[#fed813] hover:bg-[#ebd41c] text-[#061941] font-extrabold gap-2 border-2 border-[#061941] animate-pulse shadow-md text-xs sm:text-sm text-center leading-tight whitespace-normal max-w-full flex items-center justify-center" 
                  onClick={() => setLocation("/member/membership")}
                >
                  <User className="h-4 w-4 shrink-0" />
                  <span>{myMembership?.status === "pending" && (myMembership?.paymentStatus === "paid" || myMembership?.paymentStatus === "exempted") ? "Membership Pending (24h Review)" : "Apply for Membership & Pay"}</span>
                </Button>
              ) : (
                <Button 
                  className="min-h-[48px] h-auto py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold gap-2 cursor-default text-xs sm:text-sm text-center leading-tight whitespace-normal max-w-full flex items-center justify-center"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" />
                  <span>Active Member ({myMembership.membershipNumber})</span>
                </Button>
              )}

              {/* View & Download ID Card */}
              <Button 
                className={`min-h-[48px] h-auto py-2.5 px-3 gap-2 transition-all text-xs sm:text-sm flex items-center justify-center ${
                  myMembership?.status === "active" 
                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed hover:bg-gray-100"
                }`}
                onClick={() => {
                  if (myMembership?.status === "active") {
                    setIsIDCardModalOpen(true);
                  } else {
                    toast.error("Active Membership Required! Approval takes up to 24h after payment.");
                  }
                }}
              >
                {myMembership?.status === "active" ? <CreditCard className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 text-amber-500 shrink-0" />}
                <span>View & Download ID Card</span>
              </Button>

              {/* Appointment Letter */}
              {myAppointmentLetters && myAppointmentLetters.length > 0 && (
                <Button 
                  className={`min-h-[48px] h-auto py-2.5 px-3 gap-2 transition-all text-xs sm:text-sm flex items-center justify-center ${
                    myMembership?.status === "active" 
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                      : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed hover:bg-gray-100"
                  }`}
                  onClick={() => {
                    if (myMembership?.status === "active") {
                      setIsAppointmentModalOpen(true);
                    } else {
                      toast.error("Active Membership Required! Approval takes up to 24h after payment.");
                    }
                  }}
                >
                  {myMembership?.status === "active" ? <FileText className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 text-amber-500 shrink-0" />}
                  <span>View Appointment Letter</span>
                </Button>
              )}

              {/* Make a Donation */}
              <Button className="min-h-[48px] h-auto py-2.5 px-3 bg-green-600 hover:bg-green-700 gap-2 text-white text-xs sm:text-sm flex items-center justify-center" onClick={() => setIsDonationModalOpen(true)}>
                <Heart className="h-4 w-4 shrink-0" />
                <span>Make a Donation</span>
              </Button>

              {/* View Certificates */}
              <Button 
                className={`min-h-[48px] h-auto py-2.5 px-3 gap-2 transition-all text-xs sm:text-sm flex items-center justify-center ${
                  myMembership?.status === "active" 
                    ? "bg-purple-600 hover:bg-purple-700 text-white" 
                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed hover:bg-gray-100"
                }`}
                onClick={() => {
                  if (myMembership?.status === "active") {
                    setIsCertificatesModalOpen(true);
                  } else {
                    toast.error("Active Membership Required! Approval takes up to 24h after payment.");
                  }
                }}
              >
                {myMembership?.status === "active" ? <Award className="h-4 w-4 shrink-0" /> : <Lock className="h-4 w-4 text-amber-500 shrink-0" />}
                <span>View Certificates</span>
              </Button>

              {/* Donation History */}
              <Button className="min-h-[48px] h-auto py-2.5 px-3 bg-orange-600 hover:bg-orange-700 gap-2 text-white text-xs sm:text-sm flex items-center justify-center" onClick={() => setIsHistoryModalOpen(true)}>
                <FileText className="h-4 w-4 shrink-0" />
                <span>Donation History</span>
              </Button>

              {/* Apply for Beneficiary */}
              <Button 
                className={`min-h-[48px] h-auto py-2.5 px-3 gap-2 transition-all text-xs sm:text-sm flex items-center justify-center ${
                  myMembership?.status === "active" 
                    ? "bg-rose-600 hover:bg-rose-700 text-white cursor-pointer" 
                    : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed hover:bg-gray-100"
                }`}
                onClick={() => {
                  if (myMembership?.status === "active") {
                    const baseUrl = configQuery.data?.frontendUrl || "https://valmikisamajcharitabletrust.org";
                    window.open(`${baseUrl}/beneficiary`, "_blank");
                  } else {
                    toast.error("Active Membership Required! Approval takes up to 24h after payment.");
                  }
                }}
              >
                {myMembership?.status === "active" ? <Heart className="h-4 w-4 fill-white shrink-0" /> : <Lock className="h-4 w-4 text-amber-500 shrink-0" />}
                <span>Apply for Beneficiary</span>
              </Button>

              {/* View Beneficiary */}
              <Button 
                className="min-h-[48px] h-auto py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 gap-2 text-white text-xs sm:text-sm flex items-center justify-center" 
                onClick={() => {
                  const baseUrl = configQuery.data?.frontendUrl || "https://valmikisamajcharitabletrust.org";
                  window.open(`${baseUrl}/view-beneficiary`, "_blank");
                }}
              >
                <Users className="h-4 w-4 shrink-0" />
                <span>View Beneficiary</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. Make Donation Dialog */}
      <Dialog open={isDonationModalOpen} onOpenChange={setIsDonationModalOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              Make a Donation
            </DialogTitle>
            <DialogDescription>
              Your support empowers children, women, and marginalized families.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleMakeDonation} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="donation-amount">Donation Amount (INR)</Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-500 font-bold">₹</span>
                <Input
                  id="donation-amount"
                  type="number"
                  placeholder="Enter amount (e.g. 1000)"
                  className="pl-7"
                  value={donationAmount}
                  onChange={(e) => setDonationAmount(e.target.value)}
                  required
                  min={1}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donation-campaign">Select Cause / Campaign</Label>
              <select
                id="donation-campaign"
                className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm"
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
              >
                <option value="general">General NGO Fund</option>
                {activeCampaignsQuery.data?.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="donation-purpose">Purpose / Notes</Label>
              <Input
                id="donation-purpose"
                placeholder="E.g., birthday donation, education aid"
                value={donationNotes}
                onChange={(e) => setDonationNotes(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsDonationModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#061941] hover:bg-[#0a255c] text-white font-extrabold gap-2" disabled={createOrderMutation.isPending}>
                <CreditCard className="w-4 h-4 text-[#fed813]" />
                {createOrderMutation.isPending ? "Opening Razorpay..." : "Proceed to Pay via Razorpay"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. View Certificates Dialog */}
      <Dialog open={isCertificatesModalOpen} onOpenChange={setIsCertificatesModalOpen}>
        <DialogContent className="max-w-2xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <Award className="h-5 w-5 text-purple-600" />
              My Certificates
            </DialogTitle>
            <DialogDescription>
              Certificates awarded to you by Valmiki Samaj Charitable Trust.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isCertificatesLoading ? (
              <p className="text-center text-gray-500">Loading certificates...</p>
            ) : !myCertificates || myCertificates.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed text-gray-400">
                <Award className="h-12 w-12 mx-auto mb-2 opacity-30 text-purple-500" />
                No certificates have been issued to you yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myCertificates.map((cert) => (
                  <div key={cert.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded font-medium capitalize">
                          {cert.certificateType}
                        </span>
                        <span className="text-[10px] text-gray-400 font-mono">
                          {cert.certificateNumber}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1 text-sm">{cert.title}</h4>
                      <p className="text-xs text-gray-500 mb-3 line-clamp-2">{cert.description}</p>
                    </div>
                    <div className="border-t pt-2 flex items-center justify-end gap-2 mt-auto">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1 mr-auto">
                        <Calendar className="h-3 w-3" />
                        {cert.issueDate ? new Date(cert.issueDate).toLocaleDateString() : ""}
                      </span>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-purple-700 border-purple-200 hover:bg-purple-50" onClick={() => { setSelectedPreviewCert(cert); setIsPreviewCertModalOpen(true); }}>
                        View
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 text-xs text-purple-700 border-purple-200 hover:bg-purple-50" onClick={() => window.open(`/verify/certificate/${cert.qrCode}`, '_blank')}>
                        Verify
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. Donation History Dialog */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className="max-w-3xl bg-white max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <FileText className="h-5 w-5 text-orange-600" />
              Donation History
            </DialogTitle>
            <DialogDescription>
              A record of your past support and generosity.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {isDonationsLoading ? (
              <p className="text-center text-gray-500">Loading donation records...</p>
            ) : !myDonations || myDonations.items.length === 0 ? (
              <div className="text-center py-8 border rounded-lg border-dashed text-gray-400">
                <Heart className="h-12 w-12 mx-auto mb-2 opacity-30 text-red-500" />
                No donation history found. Start your journey today!
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b font-semibold text-gray-700">
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Purpose / Campaign</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myDonations.items.map((donation) => (
                      <tr key={donation.id} className="border-b bg-white hover:bg-gray-50">
                        <td className="p-3 font-mono">{donation.receiptNumber}</td>
                        <td className="p-3 text-gray-500">
                          {donation.createdAt ? new Date(donation.createdAt).toLocaleDateString() : ""}
                        </td>
                        <td className="p-3 font-medium text-gray-900">
                          {donation.purpose || "Campaign Donation"}
                        </td>
                        <td className="p-3 font-bold text-teal-700">
                          ₹{parseFloat(donation.amount as string || "0").toFixed(2)}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                            donation.paymentStatus === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : donation.paymentStatus === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {donation.paymentStatus === 'completed' && <Check className="h-2.5 w-2.5 text-green-600" />}
                            {donation.paymentStatus}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {donation.paymentStatus === 'completed' ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-7 text-xs text-teal-700 border-teal-200 hover:bg-teal-50"
                              onClick={() => {
                                setSelectedReceiptDonation(donation);
                                setIsReceiptModalOpen(true);
                              }}
                            >
                              View Receipt
                            </Button>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. ID Card Preview Dialog */}
      <Dialog open={isIDCardModalOpen} onOpenChange={setIsIDCardModalOpen}>
        <DialogContent className="max-w-md bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <CreditCard className="h-5 w-5" />
              Digital ID Card
            </DialogTitle>
            <DialogDescription>
              Your official digital identity card from Valmiki Samaj Charitable Trust.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6 flex justify-center">
            {isIDCardLoading ? (
              <p className="text-gray-500">Loading ID Card...</p>
            ) : !myIDCard ? (
              <div className="text-center py-6 text-gray-500">
                <CreditCard className="h-16 w-16 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700 mb-1">ID Card Not Generated</p>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Your ID card has not been issued by the administrator yet. Once your membership is verified, it will show up here.
                </p>
              </div>
            ) : (
              <VerifiableDocument
                templateId="id_card"
                fieldValues={{
                  photo: profile?.profileImage || "",
                  fullName: profile?.name || "",
                  designation: profile?.designation || "Trust Member",
                  cardNumber: myIDCard.cardNumber,
                  mobile: profile?.phone || "N/A",
                  email: profile?.email || "N/A",
                  city: profile?.city || "N/A",
                  issueDate: myIDCard.issueDate ? new Date(myIDCard.issueDate).toLocaleDateString() : "",
                  expiryDate: myIDCard.expiryDate ? new Date(myIDCard.expiryDate).toLocaleDateString() : "Lifetime",
                }}
                dbTemplates={dbTemplates}
                cardRef={idCardRef}
                className="max-w-[280px] mx-auto rounded-2xl"
              />
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex gap-2 w-full">
            <CaptureActions cardRef={idCardRef} filename={`ID_Card_${profile?.name?.replace(/\s+/g, "_") || "member"}`} />
            <Button variant="outline" className="text-gray-700 bg-white" onClick={() => setIsIDCardModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Preview Certificate Dialog */}
      <Dialog open={isPreviewCertModalOpen} onOpenChange={setIsPreviewCertModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <Award className="h-5 w-5 text-purple-600" />
              Certificate Preview
            </DialogTitle>
          </DialogHeader>

          <div className="py-4 flex justify-center">
            {selectedPreviewCert && (
              selectedPreviewCert.certificateType === 'visitor' ? (
                <VerifiableDocument
                  templateId="id_card"
                  fieldValues={{
                    fullName: profile?.name || "",
                    designation: "TEMPORARY VISITOR",
                    cardNumber: selectedPreviewCert.certificateNumber,
                    mobile: profile?.phone || "N/A",
                    email: profile?.email || "N/A",
                    city: profile?.city || "N/A",
                    issueDate: selectedPreviewCert.issueDate ? new Date(selectedPreviewCert.issueDate).toLocaleDateString() : "",
                    expiryDate: selectedPreviewCert.expiryDate ? new Date(selectedPreviewCert.expiryDate).toLocaleDateString() : "Same Day",
                  }}
                  dbTemplates={dbTemplates}
                  cardRef={certificateRef}
                  className="max-w-[280px] mx-auto rounded-2xl"
                />
              ) : (
                <VerifiableDocument
                  templateId={selectedPreviewCert.certificateType}
                  fieldValues={
                    selectedPreviewCert.certificateType === 'achievement'
                      ? {
                          fullName: profile?.name || "",
                          description: selectedPreviewCert.description || "",
                          issueDate: selectedPreviewCert.issueDate ? new Date(selectedPreviewCert.issueDate).toLocaleDateString() : "",
                          certificateNumber: selectedPreviewCert.certificateNumber,
                        }
                      : {
                          fullName: profile?.name || "",
                          membershipNumber: selectedPreviewCert.certificateNumber,
                          joinDate: selectedPreviewCert.issueDate ? new Date(selectedPreviewCert.issueDate).toLocaleDateString() : "",
                          expiryDate: selectedPreviewCert.expiryDate ? new Date(selectedPreviewCert.expiryDate).toLocaleDateString() : "Lifetime",
                        }
                  }
                  dbTemplates={dbTemplates}
                  cardRef={certificateRef}
                  className="max-w-lg mx-auto rounded-lg"
                />
              )
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex gap-2 w-full">
            <CaptureActions cardRef={certificateRef} filename={`Certificate_${selectedPreviewCert?.certificateNumber || "document"}`} />
            <Button variant="outline" className="text-gray-700 bg-white" onClick={() => setIsPreviewCertModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Donation Receipt Preview Dialog */}
      <Dialog open={isReceiptModalOpen} onOpenChange={setIsReceiptModalOpen}>
        <DialogContent className="max-w-3xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <FileText className="h-5 w-5 text-orange-600" />
              Donation Receipt Preview
            </DialogTitle>
            <DialogDescription>
              Official tax-exempted receipt for your contribution to Valmiki Samaj Charitable Trust.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex justify-center">
            {selectedReceiptDonation && (
              <DonationReceiptHTML
                fieldValues={{
                  receiptNumber: selectedReceiptDonation.receiptNumber,
                  date: selectedReceiptDonation.createdAt ? new Date(selectedReceiptDonation.createdAt).toLocaleDateString("en-IN") : "",
                  donorName: profile?.name || selectedReceiptDonation.donorName || "Valued Donor",
                  donorEmail: profile?.email || selectedReceiptDonation.donorEmail || "",
                  donorPhone: profile?.phone || selectedReceiptDonation.donorPhone || "",
                  donorPan: profile?.panNumber || "",
                  donorAddress: profile?.address || "",
                  pinCode: profile?.pinCode || "",
                  amount: `Rs. ${parseFloat(selectedReceiptDonation.amount as string || "0").toLocaleString("en-IN")}/-`,
                  purpose: selectedReceiptDonation.purpose || "General NGO Fund",
                  modeOfDonation: selectedReceiptDonation.donationType?.toUpperCase() || "ONLINE",
                  transactionId: selectedReceiptDonation.transactionId || selectedReceiptDonation.receiptNumber,
                }}
                cardRef={receiptRef}
                className="mx-auto"
              />
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex gap-2 w-full">
            <CaptureActions cardRef={receiptRef} filename={`Donation_Receipt_${selectedReceiptDonation?.receiptNumber || "receipt"}`} />
            <Button variant="outline" className="text-gray-700 bg-white" onClick={() => setIsReceiptModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Appointment Letter Preview Dialog */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
        <DialogContent className="max-w-xl bg-white p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-teal-800">
              <FileText className="h-5 w-5 text-indigo-600" />
              Appointment Letter Preview
            </DialogTitle>
            <DialogDescription>
              Preview of your official appointment letter from Valmiki Samaj Charitable Trust.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 flex justify-center">
            {myAppointmentLetters && myAppointmentLetters.length > 0 && (
              <VerifiableDocument
                templateId="appointment"
                fieldValues={{
                  letterNumber: myAppointmentLetters[0].letterNumber,
                  name1: profile?.name || "",
                  name2: profile?.name || "",
                  post: myAppointmentLetters[0].position,
                  mobile: profile?.phone || "N/A",
                  fromDate: myAppointmentLetters[0].appointmentDate ? new Date(myAppointmentLetters[0].appointmentDate).toLocaleDateString() : "",
                  toDate: "Ongoing"
                }}
                dbTemplates={dbTemplates}
                cardRef={appointmentRef}
                className="max-w-md mx-auto rounded-xl"
              />
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex gap-2">
            <CaptureActions cardRef={appointmentRef} filename={`Appointment_Letter_${profile?.name?.replace(/\s+/g, "_") || "member"}`} />
            <Button className="bg-teal-700 hover:bg-teal-800 text-white" onClick={() => setIsAppointmentModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <footer className="w-full py-6 text-center border-t border-gray-200 mt-auto bg-white">
        <p className="text-gray-600 text-xs mb-1">
          © 2026 NGO Management System. All rights reserved.
        </p>
        <p className="text-gray-400 text-[10px]">Create by Star Marketing</p>
      </footer>
    </div>
  );
}
