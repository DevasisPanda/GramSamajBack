import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AdminPanel from "./pages/AdminPanel";
import MemberDashboard from "./pages/MemberDashboard";
import MembershipManagementPage from "./pages/MembershipManagementPage";
import DonationManagementPage from "./pages/DonationManagementPage";
import ActiveCampaignsPage from "./pages/admin/crowdfunding/ActiveCampaignsPage";
import { trpc } from "@/lib/trpc";
import FloatingWhatsAppBadge from "./components/FloatingWhatsAppBadge";

function SSOReceiver() {
  const [, setLocation] = useLocation();
  const consumeHandoff = trpc.auth.consumeHandoff.useMutation();
  
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token");
    const code = searchParams.get("code");
    const role = searchParams.get("role");
    const redirect = searchParams.get("redirect");

    if (token) {
      localStorage.setItem("authToken", token);
      if (role) {
        localStorage.setItem("userRole", role);
      }
      
      // Force reload to update token in components, or navigate
      if (redirect) {
        window.location.href = redirect;
      } else if (role === "admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/member-dashboard";
      }
    } else if (code) {
      consumeHandoff.mutate(
        { handoffCode: code },
        {
          onSuccess: (data) => {
            localStorage.setItem("authToken", data.token);
            if (role) {
              localStorage.setItem("userRole", role);
            }
            if (redirect) {
              window.location.href = redirect;
            } else if (role === "admin") {
              window.location.href = "/admin";
            } else {
              window.location.href = "/member-dashboard";
            }
          },
          onError: (err) => {
            console.error("SSO Handoff consumption failed:", err);
            window.location.href = "/login?error=handoff_failed";
          }
        }
      );
    } else {
      window.location.href = "/login";
    }
  }, [setLocation]);

  return <div className="flex h-screen w-full items-center justify-center">Authenticating securely...</div>;
}

function LogoutSSOReceiver() {
  const configQuery = trpc.system.getConfig.useQuery(undefined, {
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (configQuery.isLoading) return;

    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userName");

    const params = new URLSearchParams(window.location.search);
    let redirectUrl = params.get("redirect") || "/";

    // Security: Validate the redirect URL to prevent open redirect attacks
    if (redirectUrl.startsWith("http://") || redirectUrl.startsWith("https://")) {
      try {
        const parsedUrl = new URL(redirectUrl);
        const allowedFrontendHost = configQuery.data?.frontendUrl ? new URL(configQuery.data.frontendUrl).host : "";
        const currentHost = window.location.host;

        if (parsedUrl.host !== allowedFrontendHost && parsedUrl.host !== currentHost) {
          // Reject foreign domains and fall back to a safe local path
          redirectUrl = "/";
        }
      } catch (e) {
        redirectUrl = "/";
      }
    } else if (!redirectUrl.startsWith("/")) {
      // Reject malformed paths
      redirectUrl = "/";
    }

    window.location.href = redirectUrl;
  }, [configQuery.data, configQuery.isLoading]);

  return <div className="flex h-screen w-full items-center justify-center">Logging out securely...</div>;
}

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const [, setLocation] = useLocation();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60000,
  });

  useEffect(() => {
    if (meQuery.isSuccess && meQuery.data) {
      localStorage.setItem("userRole", meQuery.data.role);
      if (meQuery.data.role !== "admin") {
        setLocation("/member-dashboard");
      }
    } else if (meQuery.isError) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
      localStorage.removeItem("userRole");
      setLocation("/login");
    }
  }, [meQuery.isSuccess, meQuery.isError, meQuery.data, setLocation]);

  if (meQuery.isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
          <p className="text-sm text-slate-500 font-medium">Loading Management Portal...</p>
        </div>
      </div>
    );
  }

  return meQuery.data?.role === "admin" ? <Component /> : <LoginPage />;
}

function MemberRoute({ component: Component }: { component: React.ComponentType }) {
  const token = typeof window !== "undefined" ? (localStorage.getItem("authToken") || localStorage.getItem("token")) : null;
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    }
  }, [token, setLocation]);

  return token ? <Component /> : <LoginPage />;
}

function HomeRoute() {
  const token = typeof window !== "undefined" ? (localStorage.getItem("authToken") || localStorage.getItem("token")) : null;
  const role = typeof window !== "undefined" ? localStorage.getItem("userRole") : null;
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!token) {
      setLocation("/login");
    } else if (role === "admin") {
      setLocation("/admin-dashboard");
    } else {
      setLocation("/member-dashboard");
    }
  }, [token, role, setLocation]);

  return <LoginPage />;
}

const AdminPanelRoute = () => <AdminRoute component={AdminPanel} />;
const MemberDashboardRoute = () => <MemberRoute component={MemberDashboard} />;
const MembershipRoute = () => <MemberRoute component={MembershipManagementPage} />;
const DonationsRoute = () => <MemberRoute component={DonationManagementPage} />;
const CampaignsRoute = () => <MemberRoute component={ActiveCampaignsPage} />;

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />

      {/* SSO Route */}
      <Route path="/sso" component={SSOReceiver} />
      <Route path="/logout-sso" component={LogoutSSOReceiver} />

      {/* Admin Routes */}
      <Route path="/admin" component={AdminPanelRoute} />
      <Route path="/admin/:subpath*" component={AdminPanelRoute} />
      <Route path="/admin-dashboard" component={AdminPanelRoute} />

      {/* Member Routes */}
      <Route path="/member-dashboard" component={MemberDashboardRoute} />
      <Route path="/member/membership" component={MembershipRoute} />
      <Route path="/member/donations" component={DonationsRoute} />
      <Route path="/member/campaigns" component={CampaignsRoute} />

      {/* Default Routes */}
      <Route path="/" component={HomeRoute} />
      <Route path="/404" component={NotFound} />
      <Route component={LoginPage} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <FloatingWhatsAppBadge />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
