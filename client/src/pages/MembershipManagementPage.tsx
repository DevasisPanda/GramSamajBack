import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PhoneInput, AadharInput, PincodeInput, DOBInput } from "@/components/ui/form-inputs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { ShieldCheck, Clock, CreditCard, CheckCircle2, AlertCircle, Award, User, Sparkles, Info, HelpCircle } from "lucide-react";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function MembershipManagementPage() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // Selected payment plan: "regular" (Yearly ₹500) or "lifetime" (One-Time ₹5000)
  const [selectedPlan, setSelectedPlan] = useState<"regular" | "lifetime">("regular");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Profile form state
  const [formData, setFormData] = useState({
    profileImage: "",
    name: "",
    fatherName: "",
    phone: "",
    email: "",
    dob: "",
    aadharNumber: "",
    gender: "male",
    maritalStatus: "single",
    category: "General",
    bloodGroup: "",
    occupation: "",
    designation: "",
    bio: "",
    address: "",
    city: "",
    state: "",
    pinCode: "",
  });

  // Queries
  const { data: getProfile } = trpc.member.getProfile.useQuery();
  const { data: myMembership, refetch: refetchMyMembership } = trpc.membership.getMyMembership.useQuery();
  const { data: pendingData, refetch: refetchPending } = trpc.membership.getPending.useQuery(
    { page: 1, pageSize: 1000 },
    { enabled: user?.role === "admin" }
  );

  // Sync profile data into form
  useEffect(() => {
    if (getProfile) {
      setFormData({
        profileImage: getProfile.profileImage || "",
        name: getProfile.name || "",
        fatherName: getProfile.fatherName || "",
        phone: (getProfile.phone || "").replace(/\D/g, "").slice(0, 10),
        email: getProfile.email || "",
        dob: getProfile.dob ? new Date(getProfile.dob).toISOString().split('T')[0] : "",
        aadharNumber: (getProfile.aadharNumber || "").replace(/\D/g, "").slice(0, 12),
        gender: (getProfile.gender as any) || "male",
        maritalStatus: (getProfile.maritalStatus as any) || "single",
        category: (getProfile.category as any) || "General",
        bloodGroup: getProfile.bloodGroup || "",
        occupation: getProfile.occupation || "",
        designation: getProfile.designation || "",
        bio: getProfile.bio || "",
        address: getProfile.address || "",
        city: getProfile.city || "",
        state: getProfile.state || "",
        pinCode: (getProfile.pinCode || "").replace(/\D/g, "").slice(0, 6),
      });
    }
  }, [getProfile]);

  // Load Razorpay Script dynamically
  useEffect(() => {
    if (typeof window !== "undefined" && !window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Mutations
  const updateProfileMutation = trpc.member.updateProfile.useMutation();
  const createOrderMutation = trpc.membership.createMembershipOrder.useMutation();
  const verifyPaymentMutation = trpc.membership.verifyMembershipPayment.useMutation();

  const approveMutation = trpc.membership.approve.useMutation({
    onSuccess: () => {
      toast.success("Membership approved successfully!");
      refetchPending();
      refetchMyMembership();
    },
    onError: (error) => toast.error(error.message),
  });

  const rejectMutation = trpc.membership.reject.useMutation({
    onSuccess: () => {
      toast.success("Membership rejected!");
      refetchPending();
      refetchMyMembership();
    },
    onError: (error) => toast.error(error.message),
  });

  // Handle Razorpay Payment Checkout
  const handlePayAndApply = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone || !formData.aadharNumber) {
      toast.error("Please fill in all required fields (Full Name, Phone Number, Aadhar Number)");
      return;
    }

    setIsProcessingPayment(true);

    try {
      // 1. Save profile details first (fire-and-forget, don't block payment)
      updateProfileMutation.mutate(formData as any);

      // Amount: Regular = ₹500, Lifetime = ₹5,100
      const amount = selectedPlan === "lifetime" ? 5100 : 500;

      // 2. Create Razorpay order using mutate + onSuccess (matches working Donate.tsx pattern)
      createOrderMutation.mutate(
        {
          membershipType: selectedPlan,
          amount,
          userName: formData.name,
          userEmail: formData.email || user?.email || "",
          userPhone: formData.phone,
        },
        {
          onSuccess: (orderData) => {
            if (!window.Razorpay) {
              toast.error("Razorpay SDK failed to load. Please refresh and try again.");
              setIsProcessingPayment(false);
              return;
            }

            const options = {
              key: orderData.key,
              order_id: orderData.orderId,
              name: "Valmiki Samaj Charitable Trust",
              description: `Membership Fee (${selectedPlan === "lifetime" ? "Lifetime One-Time" : "Annual Subscription"})`,
              prefill: {
                name: formData.name,
                email: formData.email || user?.email || "",
                contact: formData.phone,
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
                    membershipType: selectedPlan,
                  },
                  {
                    onSuccess: () => {
                      toast.success("Payment verified! Your application has been submitted for 24h review.");
                      refetchMyMembership();
                      setIsProcessingPayment(false);
                    },
                    onError: (err) => {
                      toast.error(err.message || "Payment verification failed.");
                      setIsProcessingPayment(false);
                    },
                  }
                );
              },
              modal: {
                ondismiss: function () {
                  setIsProcessingPayment(false);
                  toast.info("Payment cancelled.");
                },
              },
            };

            const rzp = new window.Razorpay(options);
            rzp.on("payment.failed", function () {
              toast.error("Payment failed. Please try again.");
              setIsProcessingPayment(false);
            });
            rzp.open();
          },
          onError: (err) => {
            console.error("Order creation failed:", err);
            toast.error(err.message || "Failed to initiate payment. Please try again.");
            setIsProcessingPayment(false);
          },
        }
      );
    } catch (err: any) {
      console.error("Payment flow error:", err);
      toast.error(err.message || "Failed to initiate payment. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const isPendingApproval = Boolean(
    myMembership && 
    (myMembership.paymentStatus === "paid" || myMembership.paymentStatus === "exempted") && 
    myMembership.status !== "active"
  );
  const isActiveMember = myMembership?.status === "active";

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto font-['Plus_Jakarta_Sans']">
      
      {/* 24-HOUR REVIEW NOTIFICATION BANNER */}
      {isPendingApproval && (
        <Card className="bg-amber-50/90 border-2 border-amber-400 shadow-lg animate-fade-in">
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3.5 bg-amber-500 text-white rounded-2xl shadow-md shrink-0 mt-0.5">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-extrabold text-amber-950">24-Hour Review Window Active</h3>
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-green-200 text-green-800 border border-green-300">
                  ✓ Payment Verified
                </span>
              </div>
              <p className="text-amber-900 text-base leading-relaxed font-medium">
                Thank you for applying! Your membership payment and details have been recorded. Our admin team is currently reviewing your Aadhar & contact records. Approval typically takes up to <strong>24 hours</strong>.
              </p>
              <div className="flex flex-wrap gap-4 text-xs font-bold text-amber-900 bg-amber-100/70 p-3 rounded-xl border border-amber-200">
                <span>• <strong>Membership No:</strong> {myMembership?.membershipNumber}</span>
                <span>• <strong>Plan Type:</strong> <span className="capitalize">{myMembership?.membershipType}</span></span>
                <span>• <strong>Payment Status:</strong> <span className="capitalize font-extrabold text-green-700">{myMembership?.paymentStatus}</span></span>
                {myMembership?.paymentTxnId && <span>• <strong>Razorpay TXN:</strong> {myMembership.paymentTxnId}</span>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ACTIVE MEMBER BADGE */}
      {isActiveMember && (
        <Card className="bg-emerald-50/90 border-2 border-emerald-300 shadow-md">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-extrabold text-emerald-950">Official Active Member</h3>
                    <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500" />
                  </div>
                  <p className="text-emerald-800 text-sm font-medium mt-0.5">
                    Your membership is verified & active! All features (ID Card, Certificates, Beneficiary Applications) are unlocked.
                  </p>
                </div>
              </div>
              <div className="bg-white p-3 px-5 rounded-xl border border-emerald-200 shadow-sm text-right">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Membership No.</p>
                <p className="text-lg font-extrabold text-emerald-800">{myMembership.membershipNumber}</p>
              </div>
            </div>

            {/* Plan & Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-emerald-200 text-xs font-semibold text-emerald-950">
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Plan Type</span>
                <span className="font-extrabold text-sm text-[#061941] capitalize">
                  {myMembership.membershipType === "lifetime" ? "Lifetime (₹5,100 One-Time)" : "Annual Subscription (₹500/year)"}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Renewal Date</span>
                <span className="font-extrabold text-sm text-[#061941]">
                  {myMembership.membershipType === "lifetime" ? "Lifetime (Never Expires)" : myMembership.renewalDate ? new Date(myMembership.renewalDate).toLocaleDateString() : "Annual Renewal"}
                </span>
              </div>
              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-xs">
                <span className="text-gray-500 block uppercase tracking-wider text-[10px]">Subscription Status</span>
                <span className="font-extrabold text-sm text-green-700">
                  {myMembership.membershipType === "lifetime" ? "Lifetime Active" : "Active (Can be cancelled anytime)"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PROCEDURE INSTRUCTIONS CARD (Only shown if NOT active member) */}
      {!isActiveMember && (
        <Card className="bg-blue-50/70 border-2 border-blue-200 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center gap-2.5 text-[#061941] mb-3">
              <Info className="w-6 h-6 text-blue-600 shrink-0" />
              <h3 className="text-lg font-extrabold">Membership Application Procedure</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-semibold text-gray-700">
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-xs">
                <span className="text-blue-600 font-extrabold block text-sm mb-1">Step 1</span>
                Fill out all personal, Aadhar, and contact details in the form below.
              </div>
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-xs">
                <span className="text-blue-600 font-extrabold block text-sm mb-1">Step 2</span>
                Choose your membership plan: Yearly Subscription (₹500/yr - cancel anytime) or Lifetime One-Time (₹5,100 MRP).
              </div>
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-xs">
                <span className="text-blue-600 font-extrabold block text-sm mb-1">Step 3</span>
                Click <strong>Pay & Apply Membership</strong> to complete secure Razorpay payment.
              </div>
              <div className="p-3 bg-white rounded-xl border border-blue-100 shadow-xs">
                <span className="text-blue-600 font-extrabold block text-sm mb-1">Step 4</span>
                Our admin team verifies your details within 24 hours to unlock all features!
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MEMBER DETAILS FORM & PAYMENT (Only shown if NOT active member) */}
      {!isActiveMember && (
        <Card className="border-gray-200 shadow-lg bg-white overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#061941] to-[#122e6b] text-white p-6">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-extrabold text-[#fed813] flex items-center gap-2">
                  <User className="w-6 h-6" /> Membership Application Form
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm mt-1">
                  Provide your complete profile details, select your payment plan, and submit for 24h admin verification.
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 space-y-8">
            <form onSubmit={handlePayAndApply} className="space-y-8">
              
              {/* Step 1: Personal Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#061941] border-b pb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#061941] text-white text-xs flex items-center justify-center font-bold">1</span>
                  Personal Details & Identity
                </h3>

                {/* Passport Photo Upload */}
                <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-4">
                  <ImageUpload
                    label="Passport Size Member Photo / Profile Picture"
                    value={formData.profileImage}
                    onChange={(url) => setFormData({ ...formData, profileImage: url })}
                    defaultAspectRatio="portrait"
                  />
                  <p className="text-xs text-gray-500 mt-1">Upload a clear passport size photograph for your Official Member ID Card and Certificate.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold text-gray-700">Full Name *</Label>
                    <Input
                      placeholder="Enter full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Father / Husband Name</Label>
                    <Input
                      placeholder="Enter father or husband name"
                      value={formData.fatherName}
                      onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Mobile Phone Number *</Label>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(phone) => setFormData({ ...formData, phone })}
                      required
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Email Address</Label>
                    <Input
                      type="email"
                      placeholder="example@mail.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Date of Birth</Label>
                    <DOBInput
                      value={formData.dob}
                      onChange={(dob) => setFormData({ ...formData, dob })}
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Aadhar Card Number *</Label>
                    <AadharInput
                      value={formData.aadharNumber}
                      onChange={(aadharNumber) => setFormData({ ...formData, aadharNumber })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="font-bold text-gray-700">Gender</Label>
                    <select
                      className="w-full border-gray-300 rounded-md border p-2.5 bg-white text-sm"
                      value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Marital Status</Label>
                    <select
                      className="w-full border-gray-300 rounded-md border p-2.5 bg-white text-sm"
                      value={formData.maritalStatus}
                      onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                    >
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Category</Label>
                    <select
                      className="w-full border-gray-300 rounded-md border p-2.5 bg-white text-sm"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="General">General</option>
                      <option value="OBC">OBC</option>
                      <option value="SC">SC</option>
                      <option value="ST">ST</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Blood Group</Label>
                    <Input
                      placeholder="e.g. O+, A+, B+"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="font-bold text-gray-700">Occupation / Profession</Label>
                    <Input
                      placeholder="e.g. Teacher, Business, Engineer"
                      value={formData.occupation}
                      onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="font-bold text-gray-700">Role / Designation Applying For</Label>
                    <Input
                      placeholder="e.g. Volunteer, Member, Youth Wing"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label className="font-bold text-gray-700">Bio / About Yourself</Label>
                    <Input
                      placeholder="Tell us briefly about your background and social work interests"
                      value={formData.bio}
                      onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Address */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#061941] border-b pb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#061941] text-white text-xs flex items-center justify-center font-bold">2</span>
                  Address & Residential Details
                </h3>

                <div className="space-y-4">
                  <div>
                    <Label className="font-bold text-gray-700">Complete Address</Label>
                    <Textarea
                      placeholder="House No, Street, Landmark"
                      rows={2}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="font-bold text-gray-700">City</Label>
                      <Input
                        placeholder="City"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-gray-700">State</Label>
                      <Input
                        placeholder="State"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="font-bold text-gray-700">Pincode</Label>
                      <PincodeInput
                        value={formData.pinCode}
                        onChange={(pinCode) => setFormData({ ...formData, pinCode })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 3: Select Payment Plan */}
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-[#061941] border-b pb-2 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#061941] text-white text-xs flex items-center justify-center font-bold">3</span>
                  Select Membership Payment Plan
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Regular Yearly Subscription */}
                  <div
                    onClick={() => setSelectedPlan("regular")}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedPlan === "regular"
                        ? "border-[#061941] bg-blue-50/50 shadow-md ring-2 ring-[#061941]/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Yearly Subscription
                        </span>
                        <h4 className="text-xl font-extrabold text-gray-900 mt-2">Annual Membership</h4>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === "regular" ? "border-[#061941] bg-[#061941]" : "border-gray-300"}`}>
                        {selectedPlan === "regular" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-[#061941]">₹500</span>
                      <span className="text-gray-500 text-sm font-medium"> / year</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-2">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Full active member dashboard features</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Flexible annual subscription — cancel/stop anytime from panel</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Digital Member ID Card & Certificates</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-green-600" /> Eligible for Beneficiary Application</li>
                    </ul>
                  </div>

                  {/* Lifetime One-Time Payment */}
                  <div
                    onClick={() => setSelectedPlan("lifetime")}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer relative ${
                      selectedPlan === "lifetime"
                        ? "border-[#061941] bg-amber-50/50 shadow-md ring-2 ring-amber-500/20"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          One-Time Single Payment
                        </span>
                        <h4 className="text-xl font-extrabold text-gray-900 mt-2">Lifetime Membership</h4>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === "lifetime" ? "border-[#061941] bg-[#061941]" : "border-gray-300"}`}>
                        {selectedPlan === "lifetime" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                    </div>
                    <div className="mb-4">
                      <span className="text-3xl font-extrabold text-[#061941]">₹5,100</span>
                      <span className="text-gray-500 text-sm font-medium"> / lifetime (MRP)</span>
                    </div>
                    <ul className="text-xs text-gray-600 space-y-2">
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-600" /> Immediate dashboard access tied to registered phone & email</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-600" /> Lifetime validity with 0 annual renewal fees</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-600" /> Premium Lifetime Badge & Gold ID Card</li>
                      <li className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-amber-600" /> Priority Beneficiary & Assistance Granting</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit & Pay Action Button */}
              <div className="pt-4 border-t border-gray-100">
                <Button
                  type="submit"
                  disabled={isProcessingPayment}
                  className="w-full py-6 text-base font-extrabold bg-[#fed813] text-[#061941] hover:bg-[#ebd41c] shadow-lg rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CreditCard className="w-5 h-5" />
                  {isProcessingPayment 
                    ? "Processing Secure Payment..." 
                    : `Pay ₹${selectedPlan === "lifetime" ? "5,100" : "500"} & Apply Membership`
                  }
                </Button>
                <p className="text-center text-xs text-gray-400 mt-3">
                  🔒 Secured by Razorpay 256-bit SSL. Upon successful payment, your application is submitted for 24h admin approval.
                </p>
              </div>

            </form>
          </CardContent>
        </Card>
      )}

      {/* ADMIN PENDING MEMBERSHIPS REVIEW SECTION */}
      {user?.role === "admin" && (
        <Card className="border-gray-200 shadow-md bg-white">
          <CardHeader>
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-teal-800">
              <ShieldCheck className="w-5 h-5 text-teal-600" /> Pending Membership Applications ({pendingData?.items?.length || 0})
            </CardTitle>
            <CardDescription>
              Review details, verify Razorpay payment status, and approve or grant 1st year free exemptions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {pendingData?.items && pendingData.items.length > 0 ? (
              <div className="space-y-4">
                {pendingData.items.map((member: any) => (
                  <div key={member.id} className="border p-5 rounded-xl bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-gray-900 text-lg">{member.name || "Anonymous User"}</h4>
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-gray-200 text-gray-700">
                          {member.membershipType}
                        </span>
                        {member.paymentStatus === "paid" ? (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-green-100 text-green-800 border border-green-300">
                            PAID (₹{member.amountPaid || "500"})
                          </span>
                        ) : (
                          <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            UNPAID / PENDING
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 pt-1">
                        <div><span className="text-gray-400">Reg No:</span> {member.membershipNumber}</div>
                        <div><span className="text-gray-400">Phone:</span> {member.phone || "N/A"}</div>
                        <div><span className="text-gray-400">Email:</span> {member.email || "N/A"}</div>
                        {member.paymentTxnId && (
                          <div className="col-span-3 text-emerald-700 font-mono text-[11px]">
                            Razorpay TXN: {member.paymentTxnId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                        onClick={() => approveMutation.mutate({ membershipId: member.id })}
                        disabled={approveMutation.isPending}
                      >
                        Approve Membership
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-500 text-amber-700 hover:bg-amber-50 font-bold"
                        onClick={() => approveMutation.mutate({ membershipId: member.id, isExempted: true })}
                        disabled={approveMutation.isPending}
                      >
                        Approve (1st Yr Free)
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate({ membershipId: member.id })}
                        disabled={rejectMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-6">No pending membership applications to review.</p>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
}
