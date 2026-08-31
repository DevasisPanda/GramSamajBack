import QRCode from "qrcode";

export async function generateMemberQRCode(membershipNumber: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(membershipNumber, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw error;
  }
}

export async function generateVerificationQRCode(data: {
  membershipNumber: string;
  name: string;
  type: string;
}): Promise<string> {
  try {
    const jsonData = JSON.stringify(data);
    const qrDataUrl = await QRCode.toDataURL(jsonData, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 1,
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating verification QR code:", error);
    throw error;
  }
}

export function downloadQRCode(qrDataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = qrDataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
