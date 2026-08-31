import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageDown, FileDown, Printer } from "lucide-react";
import { toast } from "sonner";

let html2canvas: any = null;
let jsPDF: any = null;

async function ensureLibraries() {
  if (!html2canvas) {
    // html2canvas-pro supports oklch(), lab(), lch() etc. that Tailwind v4 uses
    const mod = await import("html2canvas-pro");
    html2canvas = mod.default;
  }
  if (!jsPDF) {
    const mod = await import("jspdf");
    jsPDF = mod.default;
  }
}

export function useCapture(filename: string = "document") {
  const ref = useRef<HTMLDivElement>(null);
  const [capturing, setCapturing] = useState<"jpg" | "pdf" | null>(null);

  const capture = useCallback(
    async (format: "jpg" | "pdf") => {
      const el = ref.current;
      if (!el) {
        toast.error("Content not found");
        return;
      }

      setCapturing(format);
      try {
        await ensureLibraries();

        const canvas = await html2canvas(el, {
          scale: 3,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
          logging: false,
        });

        if (format === "jpg") {
          const link = document.createElement("a");
          link.download = `${filename}.jpg`;
          link.href = canvas.toDataURL("image/jpeg", 0.95);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(`JPG saved as ${filename}.jpg`);
        } else {
          // Use PNG (lossless) for PDF sharpness
          const imgData = canvas.toDataURL("image/png");
          const pdf = new jsPDF({
            orientation: canvas.width > canvas.height ? "landscape" : "portrait",
            unit: "px",
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
          pdf.save(`${filename}.pdf`);
          toast.success(`PDF saved as ${filename}.pdf`);
        }
      } catch (err: any) {
        toast.error(`Failed to capture: ${err.message}`);
      } finally {
        setCapturing(null);
      }
    },
    [filename]
  );

  return { ref, capture, capturing };
}

interface CaptureActionsProps {
  cardRef: React.RefObject<HTMLDivElement | null>;
  filename?: string;
  className?: string;
}

export function CaptureActions({ cardRef, filename = "document", className = "" }: CaptureActionsProps) {
  const [loading, setLoading] = useState<"jpg" | "pdf" | null>(null);

  const handleCapture = async (format: "jpg" | "pdf") => {
    const el = cardRef.current;
    if (!el) {
      toast.error("Content not found");
      return;
    }

    setLoading(format);
    try {
      await ensureLibraries();

      const canvas = await html2canvas(el, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      if (format === "jpg") {
        const link = document.createElement("a");
        link.download = `${filename}.jpg`;
        link.href = canvas.toDataURL("image/jpeg", 0.95);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`JPG saved as ${filename}.jpg`);
      } else {
        // Use PNG (lossless) for maximum sharpness in PDF
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: canvas.width > canvas.height ? "landscape" : "portrait",
          unit: "px",
          format: [canvas.width, canvas.height]
        });
        pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
        pdf.save(`${filename}.pdf`);
        toast.success(`PDF saved as ${filename}.pdf`);
      }
    } catch (err: any) {
      toast.error(`Failed to capture: ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const handlePrint = () => {
    const el = cardRef.current;
    if (!el) {
      toast.error("Content not found");
      return;
    }

    // Open a new window with just the receipt content for clean printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocked. Please allow popups for printing.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${filename}</title>
        <style>
          @page { size: A4; margin: 0; }
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>${el.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1"
        disabled={loading === "jpg"}
        onClick={() => handleCapture("jpg")}
      >
        <ImageDown className="w-3.5 h-3.5" />
        {loading === "jpg" ? "Saving..." : "JPG"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1"
        disabled={loading === "pdf"}
        onClick={() => handleCapture("pdf")}
      >
        <FileDown className="w-3.5 h-3.5" />
        {loading === "pdf" ? "Saving..." : "PDF"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-8 text-xs gap-1"
        onClick={handlePrint}
      >
        <Printer className="w-3.5 h-3.5" />
        Print
      </Button>
    </div>
  );
}
