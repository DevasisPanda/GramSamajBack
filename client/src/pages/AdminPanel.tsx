import { useState, useEffect } from "react";
import { Route, Switch, useLocation } from "wouter";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Menu } from "lucide-react";

// Import existing admin pages
import AdminDashboard from "./AdminDashboard";
import DonationManagementPage from "./DonationManagementPage";
import CreateCampaignPage from "./admin/crowdfunding/CreateCampaignPage";
import ActiveCampaignsPage from "./admin/crowdfunding/ActiveCampaignsPage";
import CompletedCampaignsPage from "./admin/crowdfunding/CompletedCampaignsPage";
import FailedDonationsPage from "./admin/crowdfunding/FailedDonationsPage";
import InternshipManagementPage from "./InternshipManagementPage";
import EventManagementPage from "./EventManagementPage";

// Import System Users module pages
import ActiveUsersPage from "./admin/ActiveUsersPage";
import AddMemberPage from "./admin/AddMemberPage";
import BlockedUsersPage from "./admin/BlockedUsersPage";
import SystemRegistryPage from "./admin/SystemRegistryPage";
import MemberDetailsPage from "./admin/MemberDetailsPage";

// Import Membership module pages
import MembershipRequestsPage from "./admin/MembershipRequestsPage";
import ActiveMembershipsPage from "./admin/ActiveMembershipsPage";
import ExpiringMembershipsPage from "./admin/ExpiringMembershipsPage";

// Import Certificate module pages
import CertificateBuilder from "./admin/CertificateBuilder";
import IssueCertificatePage from "./admin/certificates/IssueCertificatePage";
import ActiveCertificatesPage from "./admin/certificates/ActiveCertificatesPage";
import OrganizationCertificatesPage from "./admin/certificates/OrganizationCertificatesPage";
import WebsiteManagement from "./admin/WebsiteManagement";

// Import Expense module pages
import AddExpensePage from "./admin/expenses/AddExpensePage";
import ExpensesDataPage from "./admin/expenses/ExpensesDataPage";
import HomepageManagementPage from "./admin/website/HomepageManagementPage";
import AboutUsManagementPage from "./admin/website/AboutUsManagementPage";
import AuditManagementPage from "./admin/website/AuditManagementPage";
import AchievementsManagementPage from "./admin/website/AchievementsManagementPage";
import ManagementBodyAdminPage from "./admin/ManagementBodyAdminPage";

// Import News module pages
import CreateNewsPage from "./admin/news/CreateNewsPage";


// Import Visitor module pages
import GenerateVisitorCertPage from "./admin/visitor/GenerateVisitorCertPage";
import ActiveVisitorCertsPage from "./admin/visitor/ActiveVisitorCertsPage";

// Import Message module pages
import SendSingleMessagePage from "./admin/messages/SendSingleMessagePage";
import SendBulkMessagePage from "./admin/messages/SendBulkMessagePage";
import PreviousNoticesPage from "./admin/messages/PreviousNoticesPage";

// Import Enquiry module pages
import EnquiriesPage from "./EnquiriesPage";

// Import Projects Module
import ProjectsPage from "./admin/ProjectsPage";

// Import Beneficiary Management Page
import BeneficiaryManagementPage from "./admin/BeneficiaryManagementPage";

// Import Analytics Dashboard
import AnalyticsDashboard from "./admin/AnalyticsDashboard";

export default function AdminPanel() {
  const { user, loading } = useAuth();
  const [location] = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== "admin") {
      window.location.href = "/member-dashboard";
    }
  }, [user, loading]);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (user?.role !== "admin") {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden relative">
      {/* Sidebar */}
      <AdminSidebar isOpen={isMobileSidebarOpen} onClose={() => setIsMobileSidebarOpen(false)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto bg-gray-50 relative">
        {/* Mobile Top Header */}
        <div className="lg:hidden bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 sticky top-0 z-30 shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/aird-logo.png" alt="AIRD Logo" className="w-8 h-8 rounded-full object-contain" />
              <span className="font-extrabold text-forest-800 text-sm tracking-tight">AIRD Admin</span>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <Switch>
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/admin-dashboard" component={AdminDashboard} />
            
            {/* System Users Module */}
            <Route path="/admin/users/add" component={AddMemberPage} />
            <Route path="/admin/users/active" component={ActiveUsersPage} />
            <Route path="/admin/users/blocked" component={BlockedUsersPage} />
            <Route path="/admin/users/registry" component={SystemRegistryPage} />
            <Route path="/admin/users/detail/:id" component={MemberDetailsPage} />

            {/* Membership Module */}
            <Route path="/admin/membership/requests" component={MembershipRequestsPage} />
            <Route path="/admin/membership/active" component={ActiveMembershipsPage} />
            <Route path="/admin/membership/expiring" component={ExpiringMembershipsPage} />

            {/* Certificate Management Module */}
            <Route path="/admin/certificates/builder" component={CertificateBuilder} />
            <Route path="/admin/certificates/issue" component={IssueCertificatePage} />
            <Route path="/admin/certificates/active" component={ActiveCertificatesPage} />
            <Route path="/admin/certificates/org" component={OrganizationCertificatesPage} />

            {/* Expense Management Module */}
            <Route path="/admin/expenses/add" component={AddExpensePage} />
            <Route path="/admin/expenses/data" component={ExpensesDataPage} />

            {/* Visitor Certificate Module */}
            <Route path="/admin/visitor/generate" component={GenerateVisitorCertPage} />
            <Route path="/admin/visitor/active" component={ActiveVisitorCertsPage} />

            {/* Website Settings Module */}
            <Route path="/admin/management-body" component={ManagementBodyAdminPage} />
            <Route path="/admin/website/gallery" component={WebsiteManagement} />
            <Route path="/admin/website/homepage" component={HomepageManagementPage} />
            <Route path="/admin/website/about" component={AboutUsManagementPage} />
            <Route path="/admin/website/audits" component={AuditManagementPage} />
            <Route path="/admin/website/achievements" component={AchievementsManagementPage} />

            {/* News Management Module */}
            <Route path="/admin/news/create" component={CreateNewsPage} />

            {/* Message Module */}
            <Route path="/admin/messages/single" component={SendSingleMessagePage} />
            <Route path="/admin/messages/all" component={SendBulkMessagePage} />
            <Route path="/admin/messages/previous" component={PreviousNoticesPage} />
            
            {/* Crowd Funding Module */}
            <Route path="/admin/crowdfunding/active" component={ActiveCampaignsPage} />
            <Route path="/admin/crowdfunding/completed" component={CompletedCampaignsPage} />
            <Route path="/admin/crowdfunding/donations" component={DonationManagementPage} />
            <Route path="/admin/crowdfunding/failed" component={FailedDonationsPage} />
            <Route path="/admin/crowdfunding/create" component={CreateCampaignPage} />
            
            {/* Internship Module */}
            <Route path="/admin/internships" component={InternshipManagementPage} />
            
            {/* Events Module */}
            <Route path="/admin/events" component={EventManagementPage} />
            
            {/* Enquiry Module */}
            <Route path="/admin/enquiries/user" component={EnquiriesPage} />
            <Route path="/admin/enquiries/resolved" component={EnquiriesPage} />
            
            {/* Projects Module */}
            <Route path="/admin/projects" component={ProjectsPage} />

            {/* Beneficiary Management Module */}
            <Route path="/admin/beneficiary/requests" component={BeneficiaryManagementPage} />
            <Route path="/admin/beneficiary/active" component={BeneficiaryManagementPage} />
            <Route path="/admin/beneficiary/inactive" component={BeneficiaryManagementPage} />
            <Route path="/admin/beneficiary/completed" component={BeneficiaryManagementPage} />
            <Route path="/admin/beneficiary/rejected" component={BeneficiaryManagementPage} />
            <Route path="/admin/beneficiary/add" component={BeneficiaryManagementPage} />

            {/* Website Analytics Module */}
            <Route path="/admin/analytics" component={AnalyticsDashboard} />
            
            {/* Fallback */}
            <Route component={AdminDashboard} />
          </Switch>
        </div>
        <footer className="w-full py-4 text-center text-xs text-gray-400 mt-auto">
          Create by Star Marketing
        </footer>
      </div>
    </div>
  );
}
