import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Receipt, Check, Loader2 } from "lucide-react";
import { ImageUpload } from "@/components/ui/ImageUpload";
import { useLocation } from "wouter";

export default function AddExpensePage() {
  const [, setLocation] = useLocation();
  const [formData, setFormData] = useState({
    expenseType: "",
    amount: "",
    reason: "",
    imageUrl: "",
  });

  const createMutation = trpc.expense.createExpense.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      setFormData({
        expenseType: "",
        amount: "",
        reason: "",
        imageUrl: "",
      });
      setLocation("/admin/expenses/data");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to add expense");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.expenseType.trim()) {
      toast.error("Please enter the expense type");
      return;
    }
    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }
    if (!formData.reason.trim()) {
      toast.error("Please enter the reason");
      return;
    }

    createMutation.mutate({
      expenseType: formData.expenseType,
      amount: numAmount,
      reason: formData.reason,
      imageUrl: formData.imageUrl || undefined,
    });
  };

  return (
    <div className="space-y-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Receipt className="w-8 h-8 text-blue-600" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Add New Expense</h1>
          <p className="text-gray-500 text-sm">Record administrative expenses, event costs, and receipt proofs.</p>
        </div>
      </div>

      <Card className="bg-white border-gray-200 shadow-md">
        <CardHeader>
          <CardTitle className="text-gray-800 text-xl font-bold">Expense Details</CardTitle>
          <CardDescription>Enter the type of expenditure, total amount, purpose, and upload a copy of the receipt.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="expense-type" className="text-gray-700 font-medium">Expense Type *</Label>
              <Input
                id="expense-type"
                placeholder="e.g. Office rent, Event snacks, Stationery, Travel"
                value={formData.expenseType}
                onChange={(e) => setFormData({ ...formData, expenseType: e.target.value })}
                required
                className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-gray-700 font-medium">Amount (INR ₹) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
                className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason" className="text-gray-700 font-medium">Reason / Description *</Label>
              <Textarea
                id="reason"
                placeholder="Describe what the funds were used for..."
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                required
                rows={4}
                className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700 font-medium">Receipt Photo (Optional)</Label>
              <ImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                label=""
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/admin/expenses/data")}
                className="border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 px-5"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Expense
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
