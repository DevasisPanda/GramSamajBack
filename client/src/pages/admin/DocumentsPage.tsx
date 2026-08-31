import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-primary" />
        <h1 className="text-3xl font-bold tracking-tight">Documents & ID Cards</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generate & Manage Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">This module will handle ID Cards, Certificates, and Appointment Letters.</p>
        </CardContent>
      </Card>
    </div>
  );
}
