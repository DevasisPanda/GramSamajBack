import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function UserManagement() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Manage Users & Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This module will allow you to add new members, assign roles, and view the entire user list.</p>
        </CardContent>
      </Card>
    </div>
  );
}
