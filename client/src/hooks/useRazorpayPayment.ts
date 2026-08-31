import { useCallback, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface RazorpayOptions {
  amount: number;
  currency?: string;
  donorName: string;
  donorEmail: string;
  donorPhone?: string;
  donorId?: number;
  purpose?: string;
  campaignId?: number;
  onSuccess?: (receiptNumber: string) => void;
  onError?: (message: string) => void;
}

export function useRazorpayPayment() {
  const [isProcessing, setIsProcessing] = useState(false);

  const createOrder = trpc.payment.createOrder.useMutation();
  const verifyPayment = trpc.payment.verifyPayment.useMutation();

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const initiatePayment = useCallback(
    async (options: RazorpayOptions) => {
      setIsProcessing(true);

      try {
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          toast.error("Failed to load payment gateway. Please try again.");
          setIsProcessing(false);
          return;
        }

        createOrder.mutate(
          {
            amount: options.amount,
            currency: options.currency || "INR",
            donorName: options.donorName,
            donorEmail: options.donorEmail,
            donorPhone: options.donorPhone || undefined,
            donorId: options.donorId || undefined,
            purpose: options.purpose || undefined,
            campaignId: options.campaignId || undefined,
          },
          {
            onSuccess: (order) => {
              const rzp = new (window as any).Razorpay({
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: "Valmiki Samaj Charitable Trust",
                description: options.purpose
                  ? `Donation for ${options.purpose}`
                  : "General Donation",
                order_id: order.orderId,
                handler: (response: any) => {
                  verifyPayment.mutate(
                    {
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    },
                    {
                      onSuccess: (data) => {
                        toast.success("Payment successful! Thank you for your donation.");
                        options.onSuccess?.(data.receiptNumber);
                        setIsProcessing(false);
                      },
                      onError: (err) => {
                        toast.error(err.message);
                        options.onError?.(err.message);
                        setIsProcessing(false);
                      },
                    }
                  );
                },
                modal: {
                  ondismiss: () => {
                    toast.info("Payment cancelled.");
                    setIsProcessing(false);
                  },
                },
              });

              rzp.on("payment.failed", () => {
                toast.error("Payment failed. Please try again.");
                setIsProcessing(false);
              });

              rzp.open();
            },
            onError: (err) => {
              toast.error(err.message);
              options.onError?.(err.message);
              setIsProcessing(false);
            },
          }
        );
      } catch (err: any) {
        toast.error(err.message || "Something went wrong");
        options.onError?.(err.message);
        setIsProcessing(false);
      }
    },
    [createOrder, verifyPayment, loadRazorpayScript]
  );

  return { initiatePayment, isProcessing };
}
