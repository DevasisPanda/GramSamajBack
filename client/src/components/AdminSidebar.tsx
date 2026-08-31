import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Heart,
  Network,
  Award,
  FileText,
  Mail,
  Briefcase,
  Banknote,
  HelpCircle,
  GraduationCap,
  Calendar,
  Activity,
  Receipt,
  Newspaper,
  LogOut,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Globe,
  X,
  BarChart3,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

interface MenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  path?: string;
  submenu?: MenuItem[];
}

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: <LayoutDashboard className="w-5 h-5" />, path: "/admin-dashboard" },
  { id: "analytics", label: "Website Analytics", icon: <BarChart3 className="w-5 h-5" />, path: "/admin/analytics" },
  { id: "system-users", label: "System Users", icon: <Users className="w-5 h-5" />, submenu: [
        { id: "users-add", label: "Add Member", path: "/admin/users/add" },
        { id: "users-active", label: "Active Users", path: "/admin/users/active" },
      { id: "users-blocked", label: "Blocked Users", path: "/admin/users/blocked" },
      { id: "users-registry", label: "System Registry", path: "/admin/users/registry" },
  ]},
  { id: "membership", label: "Membership", icon: <Award className="w-5 h-5" />, submenu: [
      { id: "mem-requests", label: "Membership Requests", path: "/admin/membership/requests" },
      { id: "mem-active", label: "Active Memberships", path: "/admin/membership/active" },
      { id: "mem-expiring", label: "Upcoming Expiries", path: "/admin/membership/expiring" },
  ]},
  { id: "certificates", label: "Certificate Management", icon: <FileText className="w-5 h-5" />, submenu: [
      { id: "cert-builder", label: "Layout Builder", path: "/admin/certificates/builder" },
      { id: "cert-org", label: "Organization Certificates", path: "/admin/certificates/org" },
      { id: "cert-issue", label: "Issue Activity Certificate", path: "/admin/certificates/issue" },
      { id: "cert-active", label: "Active Certificate", path: "/admin/certificates/active" },
  ]},
  { id: "visitor", label: "Visitor Certificate", icon: <FileText className="w-5 h-5" />, submenu: [
      { id: "vis-generate", label: "Generate Certificate", path: "/admin/visitor/generate" },
      { id: "vis-active", label: "Active Certificate", path: "/admin/visitor/active" },
  ]},
  { id: "messages", label: "Send Message", icon: <Mail className="w-5 h-5" />, submenu: [
      { id: "msg-single", label: "Send To Single User", path: "/admin/messages/single" },
      { id: "msg-all", label: "Send To All User", path: "/admin/messages/all" },
      { id: "msg-prev", label: "Previous Notice", path: "/admin/messages/previous" },
  ]},
  { id: "beneficiary", label: "Beneficiary Management", icon: <Heart className="w-5 h-5" />, submenu: [
      { id: "ben-request", label: "Direct Ben. Request", path: "/admin/beneficiary/requests" },
      { id: "ben-add", label: "Add Beneficiary", path: "/admin/beneficiary/add" },
      { id: "ben-active", label: "Active Beneficiary", path: "/admin/beneficiary/active" },
      { id: "ben-inactive", label: "Inactive Beneficiary", path: "/admin/beneficiary/inactive" },
  ]},
  { id: "crowdfunding", label: "Crowd Funding", icon: <Banknote className="w-5 h-5" />, submenu: [
      { id: "cf-create", label: "Create Campaign", path: "/admin/crowdfunding/create" },
      { id: "cf-active", label: "Active Campaigns", path: "/admin/crowdfunding/active" },
      { id: "cf-complete", label: "Completed Campaigns", path: "/admin/crowdfunding/completed" },
      { id: "cf-donations", label: "Received Donations", path: "/admin/crowdfunding/donations" },
      { id: "cf-failed", label: "Failed Donations", path: "/admin/crowdfunding/failed" },
  ]},
  { id: "enquiry", label: "Enquiry Management", icon: <HelpCircle className="w-5 h-5" />, submenu: [
      { id: "enq-user", label: "User Enquiries", path: "/admin/enquiries/user" },
      { id: "enq-resolved", label: "Resolved Enquiries", path: "/admin/enquiries/resolved" },
  ]},
  { id: "projects", label: "Project Management", icon: <Briefcase className="w-5 h-5" />, path: "/admin/projects" },
  { id: "internship", label: "Internship Management", icon: <GraduationCap className="w-5 h-5" />, path: "/admin/internships" },
  { id: "events", label: "Event Management", icon: <Calendar className="w-5 h-5" />, path: "/admin/events" },
  { id: "expense", label: "Expense Management", icon: <Receipt className="w-5 h-5" />, submenu: [
      { id: "exp-add", label: "Add Expense", path: "/admin/expenses/add" },
      { id: "exp-data", label: "Expense Data", path: "/admin/expenses/data" },
  ]},
  { id: "news", label: "News Management", icon: <Newspaper className="w-5 h-5" />, submenu: [
      { id: "news-create", label: "Create News", path: "/admin/news/create" },
  ]},
  { id: "website-settings", label: "Website Settings", icon: <Globe className="w-5 h-5" />, submenu: [
      { id: "web-management-team", label: "Management Team (12 Leaders)", path: "/admin/management-body" },
      { id: "web-gallery", label: "Gallery Management", path: "/admin/website/gallery" },
      { id: "web-homepage", label: "Homepage Management", path: "/admin/website/homepage" },
      { id: "web-aboutus", label: "About Us Management", path: "/admin/website/about" },
      { id: "web-audits", label: "Audit Reports", path: "/admin/website/audits" },
      { id: "web-achievements", label: "Achievements", path: "/admin/website/achievements" },
  ]},
];

export default function AdminSidebar({ isOpen, onClose }: { isOpen?: boolean; onClose?: () => void }) {
  const [expandedMenus, setExpandedMenus] = useState<string[]>(["dashboard"]);
  const [location, navigate] = useLocation();
  const configQuery = trpc.system.getConfig.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const toggleMenu = (menuId: string) => {
    setExpandedMenus((prev) =>
      prev.includes(menuId) ? prev.filter((id) => id !== menuId) : [...prev, menuId]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");
    
    const frontendUrl = configQuery.data?.frontendUrl || "http://localhost:5173";
    window.location.href = `${frontendUrl}/?action=logout`;
  };

  const renderMenuItems = (items: MenuItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id}>
        <button
          onClick={() => {
            if (item.submenu) {
              toggleMenu(item.id);
            } else if (item.path) {
              navigate(item.path);
              if (onClose) onClose();
            }
          }}
          className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition ${
            location === item.path
              ? "bg-blue-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          } ${level > 0 ? "text-sm" : ""}`}
        >
          <div className="flex items-center gap-3">
            {item.icon}
            <span>{item.label}</span>
          </div>
          {item.submenu && (
            <span className="text-gray-400">
              {expandedMenus.includes(item.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </span>
          )}
        </button>

        {item.submenu && expandedMenus.includes(item.id) && (
          <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-2">
            {renderMenuItems(item.submenu, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const frontendUrl = configQuery.data?.frontendUrl || "http://localhost:5173";

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/55 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <div 
        className={`fixed lg:static inset-y-0 left-0 w-72 bg-white border-r border-gray-200 h-screen overflow-y-auto flex flex-col z-50 transition-transform duration-300 transform lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          {/* Close button for mobile */}
          <div className="flex items-center justify-between mb-4 lg:hidden">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Navigation</span>
            <button 
              onClick={onClose}
              className="p-1 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 mb-3">
            <img src="/aird-logo.png" alt="AIRD Trust Logo" className="w-12 h-12 object-contain rounded-full border border-gray-100 shadow-sm" />
            <div>
              <h1 className="text-xl font-extrabold text-forest-800 leading-tight">AIRD Admin</h1>
              <p className="text-xs text-gray-500 font-medium">NGO Management System</p>
            </div>
          </div>
          <a 
            href={frontendUrl}
            className="flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Visit Public Website
          </a>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 pb-24">
          {renderMenuItems(menuItems)}
        </div>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-200 sticky bottom-0 bg-white z-10">
          <Button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </>
  );
}

