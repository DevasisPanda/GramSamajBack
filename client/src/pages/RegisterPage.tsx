import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, AlertCircle, CheckCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function RegisterPage() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const registerMutation = trpc.auth.register.useMutation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.name === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: val,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.name || !formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    // Name must have at least 3 words
    const nameWords = formData.name.trim().split(/\s+/);
    if (nameWords.length < 3) {
      setError("Full name must include at least 3 words (e.g., John David Doe)");
      return;
    }

    // Phone must be exactly 10 digits
    if (!/^\d{10}$/.test(formData.phone)) {
      setError("Phone number must be exactly 10 digits");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);

    try {
      await registerMutation.mutateAsync({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
      });

      setSuccess(true);
      toast.success("Registration successful! You can now log in.");

      setTimeout(() => {
        setLocation("/login");
      }, 3000);
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      toast.error(err.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="pt-8">
            <div className="text-center space-y-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
              <p className="text-gray-600">
                Your account has been created. You can now log in to the member portal.
              </p>
              <p className="text-sm text-gray-500">Redirecting to login page...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex flex-col items-center justify-center gap-2 mb-4">
            <img src="/aird-logo.png" alt="AIRD Emblem" className="h-16 w-16 object-contain rounded-full shadow-sm bg-white p-1" />
            <h1 className="text-2xl font-bold text-gray-900">AIRD Management Portal</h1>
          </div>
          <p className="text-gray-600">Create your account &bull; Appropriate Institute of Rural Development</p>
        </div>

        {/* Register Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center">Join Our Community</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John David Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
                <p className="text-[11px] text-gray-500">Must include at least 3 words (First Middle Last)</p>
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                  maxLength={10}
                />
                <p className="text-[11px] text-gray-500">Must be exactly 10 digits</p>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                  className="h-10"
                />
              </div>

              <p className="-mt-2 text-[11px] text-gray-500">Password must be at least 6 characters</p>

              {/* Register Button */}
              <Button
                type="submit"
                className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                disabled={isLoading}
              >
                {isLoading ? "Creating Account..." : "Register"}
              </Button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{" "}
                <button
                  onClick={() => setLocation("/login")}
                  className="text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Login here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1 pb-6">
          <p className="text-gray-600 text-xs">
            © 2026 NGO Management System. All rights reserved.
          </p>
          <p className="text-gray-500 text-[10px]">
            Create by Star Marketing
          </p>
        </div>
      </div>
    </div>
  );
}
