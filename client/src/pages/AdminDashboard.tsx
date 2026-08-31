import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, Heart, TrendingUp, LogOut, Trash2, CheckCircle, XCircle, IndianRupee, Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const getAllUsersQuery = trpc.admin.getAllUsers.useQuery({ page: 1, pageSize: 1000 });
  const approveMutation = trpc.admin.approveUser.useMutation();
  const blockMutation = trpc.admin.blockUser.useMutation();
  const unblockMutation = trpc.admin.unblockUser.useMutation();
  const deleteMutation = trpc.admin.deleteUser.useMutation();
  const promoteMutation = trpc.admin.promoteToAdmin.useMutation();
  const configQuery = trpc.system.getConfig.useQuery();

  // New stats queries
  const getExpensesQuery = trpc.expense.getExpenses.useQuery();
  const getDonationsStatsQuery = trpc.donation.getStats.useQuery();
  const getEnquiriesQuery = trpc.enquiry.list.useQuery();

  const totalExpenses = getExpensesQuery.data?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) ?? 0;
  const totalDonations = getDonationsStatsQuery.data?.totalDonations ?? 0;
  const totalEnquiries = getEnquiriesQuery.data?.filter((e: any) => !e.isRead).length ?? 0;

  useEffect(() => {
    if (getAllUsersQuery.data) {
      setUsers(getAllUsersQuery.data?.items || []);
    }
  }, [getAllUsersQuery.data]);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    
    const frontendUrl = configQuery.data?.frontendUrl || "http://localhost:5173";
    window.location.href = `${frontendUrl}/?action=logout`;
  };

  const handleApprove = async (userId: number) => {
    try {
      await approveMutation.mutateAsync({ userId });
      setUsers(users.map((u) => (u.id === userId ? { ...u, status: "active" } : u)));
      toast.success("User approved");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleBlock = async (userId: number) => {
    try {
      await blockMutation.mutateAsync({ userId });
      setUsers(users.map((u) => (u.id === userId ? { ...u, status: "blocked" } : u)));
      toast.success("User blocked");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleUnblock = async (userId: number) => {
    try {
      await unblockMutation.mutateAsync({ userId });
      setUsers(users.map((u) => (u.id === userId ? { ...u, status: "active" } : u)));
      toast.success("User unblocked");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (userId: number) => {
    if (confirm("Are you sure you want to delete this user?")) {
      try {
        await deleteMutation.mutateAsync({ userId });
        setUsers(users.filter((u) => u.id !== userId));
        toast.success("User deleted");
      } catch (err: any) {
        toast.error(err.message);
      }
    }
  };

  const handlePromote = async (userId: number) => {
    try {
      await promoteMutation.mutateAsync({ userId });
      setUsers(users.map((u) => (u.id === userId ? { ...u, role: "admin" } : u)));
      toast.success("User promoted to admin");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    pendingUsers: users.filter((u) => u.status === "pending").length,
    adminUsers: users.filter((u) => u.role === "admin").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <Button onClick={handleLogout} variant="outline" className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/users/active")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Active Users</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/membership/requests")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Pending Approval</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pendingUsers}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Admin Users</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.adminUsers}</p>
                </div>
                <Heart className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial & Operational Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/crowdfunding/donations")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Donations</p>
                  <p className="text-3xl font-bold text-teal-600">
                    {getDonationsStatsQuery.isLoading ? "..." : `₹${totalDonations.toLocaleString("en-IN")}`}
                  </p>
                </div>
                <IndianRupee className="h-8 w-8 text-teal-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/expenses/data")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Expenses</p>
                  <p className="text-3xl font-bold text-red-600">
                    {getExpensesQuery.isLoading ? "..." : `₹${totalExpenses.toLocaleString("en-IN")}`}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/admin/enquiries/user")}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">New Enquiry Requests</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {getEnquiriesQuery.isLoading ? "..." : totalEnquiries}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Management */}
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search */}
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />

            {/* Users Table */}
            {getAllUsersQuery.isLoading ? (
              <p className="text-gray-600">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <Alert>
                <AlertDescription>No users found</AlertDescription>
              </Alert>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Name</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Email</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Role</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Status</th>
                      <th className="px-4 py-2 text-left text-sm font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{user.name || "N/A"}</td>
                        <td className="px-4 py-3 text-sm">{user.email}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge
                            variant={
                              user.status === "active"
                                ? "default"
                                : user.status === "pending"
                                  ? "outline"
                                  : "destructive"
                            }
                          >
                            {user.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm space-x-2">
                          {user.status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(user.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                          )}
                          {user.status === "active" && (
                            <Button
                              size="sm"
                              onClick={() => handleBlock(user.id)}
                              variant="outline"
                              className="text-red-600"
                            >
                              Block
                            </Button>
                          )}
                          {user.status === "blocked" && (
                            <Button
                              size="sm"
                              onClick={() => handleUnblock(user.id)}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              Unblock
                            </Button>
                          )}
                          {user.role !== "admin" && (
                            <Button
                              size="sm"
                              onClick={() => handlePromote(user.id)}
                              variant="outline"
                              className="text-purple-600"
                            >
                              Promote
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => handleDelete(user.id)}
                            variant="outline"
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
