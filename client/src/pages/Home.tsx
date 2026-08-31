import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useLocation } from "wouter";
import { Heart, Users, Target, TrendingUp, Shield, Mail } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">NGO Management</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && user ? (
              <>
                <span className="text-gray-700">Welcome, {user.name}</span>
                <Button onClick={() => setLocation("/dashboard")} variant="default">
                  Dashboard
                </Button>
                <Button onClick={() => logout()} variant="outline">
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => setLocation("/login")} variant="default">
                Login
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">Comprehensive NGO Management Platform</h2>
          <p className="text-xl text-gray-600 mb-8">Streamline your NGO operations with our all-in-one management system. Handle memberships, donations, campaigns, and more with ease.</p>
          {!isAuthenticated && (
            <Button size="lg" onClick={() => setLocation("/login")} className="gap-2">
              Get Started
            </Button>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Key Features</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <Users className="h-8 w-8 text-blue-500 mb-2" />
                <CardTitle>Membership Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Register, approve, and manage member profiles with automated renewal tracking and referral systems.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Heart className="h-8 w-8 text-red-500 mb-2" />
                <CardTitle>Donation Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Collect and track donations with automatic receipt generation and comprehensive donor history management.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Target className="h-8 w-8 text-green-500 mb-2" />
                <CardTitle>Campaigns</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Create and manage fundraising campaigns with goal tracking and real-time progress monitoring.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 text-purple-500 mb-2" />
                <CardTitle>ID Cards & Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Generate digital ID cards and certificates with QR code verification for instant validation.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Mail className="h-8 w-8 text-orange-500 mb-2" />
                <CardTitle>Communication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Send bulk messages, individual communications, and automated notifications to members and beneficiaries.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <TrendingUp className="h-8 w-8 text-indigo-500 mb-2" />
                <CardTitle>Analytics & Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Get comprehensive insights with detailed reports on donations, memberships, campaigns, and activities.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Modules Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-12">Complete Feature Set</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Member & Donor Management</h4>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Member registration and approval</li>
                <li>✓ Membership renewal tracking</li>
                <li>✓ Referral system</li>
                <li>✓ Donor history management</li>
                <li>✓ Status management (Active/Inactive/Blocked)</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Documents & Verification</h4>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Digital ID card generation</li>
                <li>✓ QR code verification</li>
                <li>✓ Certificate management</li>
                <li>✓ Appointment letters</li>
                <li>✓ Receipt management</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Financial Management</h4>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Online donation collection</li>
                <li>✓ Cash donation entry</li>
                <li>✓ PhonePe payment integration</li>
                <li>✓ Automatic receipt generation</li>
                <li>✓ Financial reports</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Campaigns & Beneficiaries</h4>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Crowdfunding campaigns</li>
                <li>✓ Goal tracking</li>
                <li>✓ Beneficiary registration</li>
                <li>✓ Assistance tracking</li>
                <li>✓ Search & filter system</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Content & Communication</h4>
              <ul className="space-y-2 text-gray-600">
                <li>✓ News & updates publishing</li>
                <li>✓ Activity feed system</li>
                <li>✓ Bulk messaging</li>
                <li>✓ Email automation</li>
                <li>✓ Birthday wishes</li>
              </ul>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm">
              <h4 className="font-bold text-lg mb-4">Website & Admin</h4>
              <ul className="space-y-2 text-gray-600">
                <li>✓ Dynamic website pages</li>
                <li>✓ Gallery management</li>
                <li>✓ Events management</li>
                <li>✓ Admin dashboard</li>
                <li>✓ Role-based access control</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Transform Your NGO?</h3>
          <p className="text-lg mb-8 opacity-90">Start managing your organization more efficiently today.</p>
          {!isAuthenticated && (
            <Button size="lg" variant="secondary" onClick={() => setLocation("/login")}>
              Login to Get Started
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="container mx-auto px-4 text-center space-y-2">
          <p>&copy; 2026 NGO Management System. All rights reserved.</p>
          <p className="text-xs text-gray-500">Create by Star Marketing</p>
        </div>
      </footer>
    </div>
  );
}
