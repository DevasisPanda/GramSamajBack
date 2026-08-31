export type FieldConfig = {
  id: string;
  label: string;
  text: string;
  x: number;
  y: number;
  size: number;
  color: string;
  weight: "normal" | "bold";
  align: "left" | "center" | "right";
};

export type TemplateConfig = {
  id: string;
  name: string;
  src: string;
  imgWidth: number;
  imgHeight: number;
  fields: FieldConfig[];
};

// Appointment Letter template
export const APPOINTMENT_TEMPLATE: TemplateConfig = {
  id: "appointment",
  name: "Appointment Letter",
  src: "https://res.cloudinary.com/dxmovdiru/image/upload/v1781611664/ngo-management/templates/appointment_letter_template.jpg",
  imgWidth: 1133,
  imgHeight: 1600,
  fields: [
    { id: "letterNumber", label: "Ref Number", text: "", x: 310, y: 385, size: 20, color: "#1f2937", weight: "bold", align: "left" },
    { id: "name1", label: "Name (1st)", text: "", x: 130, y: 454, size: 22, color: "#1f2937", weight: "bold", align: "left" },
    { id: "name2", label: "Name (2nd)", text: "", x: 409, y: 840, size: 22, color: "#1f2937", weight: "bold", align: "center" },
    { id: "post", label: "Post / Position", text: "", x: 1080, y: 842, size: 24, color: "#0f172a", weight: "bold", align: "right" },
    { id: "mobile", label: "Mobile Number", text: "", x: 150, y: 420, size: 20, color: "#1f2937", weight: "normal", align: "left" },
    { id: "fromDate", label: "From Date", text: "", x: 240, y: 660, size: 20, color: "#4b5563", weight: "bold", align: "left" },
    { id: "toDate", label: "To Date", text: "", x: 604, y: 660, size: 20, color: "#4b5563", weight: "bold", align: "left" },
  ],
};

// Achievement Certificate template
export const ACHIEVEMENT_TEMPLATE: TemplateConfig = {
  id: "achievement",
  name: "Achievement Certificate",
  src: "https://res.cloudinary.com/dxmovdiru/image/upload/v1781611663/ngo-management/templates/achievement_certificate_template.jpg",
  imgWidth: 1280,
  imgHeight: 954,
  fields: [
    { id: "fullName", label: "Recipient Name", text: "", x: 640, y: 530, size: 36, color: "#1f2937", weight: "bold", align: "center" },
    { id: "description", label: "Description", text: "", x: 640, y: 660, size: 26, color: "#4b5563", weight: "normal", align: "center" },
    { id: "issueDate", label: "Issue Date", text: "", x: 180, y: 810, size: 20, color: "#4b5563", weight: "bold", align: "left" },
    { id: "certificateNumber", label: "Cert No.", text: "", x: 1100, y: 810, size: 32, color: "#4b5563", weight: "bold", align: "right" },
  ],
};

// Membership Certificate template
export const MEMBERSHIP_TEMPLATE: TemplateConfig = {
  id: "membership",
  name: "Membership Certificate",
  src: "https://res.cloudinary.com/lbpicumc/image/upload/v1785351420/ngo-management/templates/membership_certificate_template.jpg",
  imgWidth: 904,
  imgHeight: 1354,
  fields: [
    { id: "fullName", label: "Member Name", text: "", x: 450, y: 530, size: 36, color: "#1e293b", weight: "bold", align: "center" },
    { id: "membershipNumber", label: "Membership No.", text: "", x: 160, y: 740, size: 20, color: "#1e293b", weight: "bold", align: "center" },
    { id: "joinDate", label: "Join Date", text: "", x: 465, y: 740, size: 20, color: "#1e293b", weight: "bold", align: "center" },
    { id: "expiryDate", label: "Expiry Date", text: "", x: 745, y: 740, size: 20, color: "#1e293b", weight: "bold", align: "center" },
  ],
};

export const ID_CARD_TEMPLATE: TemplateConfig = {
  id: "id_card",
  name: "ID Card",
  src: "https://res.cloudinary.com/lbpicumc/image/upload/v1785351419/ngo-management/templates/generate_id_template.jpg",
  imgWidth: 1599,
  imgHeight: 1067,
  fields: [
    { id: "photo", label: "Member Photo Box", text: "Member Photo", x: 300, y: 475, size: 160, color: "#2563eb", weight: "bold", align: "center" },
    { id: "fullName", label: "Name", text: "", x: 200, y: 695, size: 24, color: "#ef4444", weight: "bold", align: "left" },
    { id: "cardNumber", label: "Card No.", text: "", x: 200, y: 745, size: 22, color: "#000000", weight: "bold", align: "left" },
    { id: "mobile", label: "Mobile", text: "", x: 200, y: 795, size: 22, color: "#000000", weight: "bold", align: "left" },
    { id: "email", label: "Email", text: "", x: 200, y: 845, size: 20, color: "#000000", weight: "bold", align: "left" },
    { id: "city", label: "City", text: "", x: 200, y: 895, size: 22, color: "#000000", weight: "bold", align: "left" },
    { id: "issueDate", label: "Joining Date", text: "", x: 1280, y: 845, size: 22, color: "#000000", weight: "bold", align: "left" },
    { id: "expiryDate", label: "Validity Date", text: "", x: 1280, y: 895, size: 22, color: "#000000", weight: "bold", align: "left" },
  ],
};

export const DONATION_RECEIPT_TEMPLATE: TemplateConfig = {
  id: "donation",
  name: "Donation Receipt",
  src: "https://res.cloudinary.com/dxmovdiru/image/upload/v1781611665/ngo-management/templates/donation_receipt_template.jpg",
  imgWidth: 905,
  imgHeight: 1280,
  fields: [
    { id: "receiptNumber", label: "Receipt No.", text: "", x: 208, y: 224, size: 18, color: "#1e293b", weight: "bold", align: "left" },
    { id: "date", label: "Date", text: "", x: 706, y: 224, size: 18, color: "#1e293b", weight: "bold", align: "right" },
    { id: "donorName", label: "Donor Name", text: "", x: 217, y: 384, size: 22, color: "#1e293b", weight: "bold", align: "left" },
    { id: "amount", label: "Amount", text: "", x: 217, y: 563, size: 24, color: "#115e59", weight: "bold", align: "left" },
    { id: "purpose", label: "Purpose", text: "", x: 217, y: 723, size: 20, color: "#1e293b", weight: "bold", align: "left" },
    { id: "paymentMethod", label: "Payment Method", text: "", x: 217, y: 795, size: 18, color: "#1e293b", weight: "bold", align: "left" },
    { id: "transactionId", label: "Transaction ID", text: "", x: 217, y: 865, size: 18, color: "#1e293b", weight: "bold", align: "left" },
  ],
};

export const ALL_TEMPLATES: TemplateConfig[] = [
  APPOINTMENT_TEMPLATE,
  ACHIEVEMENT_TEMPLATE,
  MEMBERSHIP_TEMPLATE,
  ID_CARD_TEMPLATE,
  DONATION_RECEIPT_TEMPLATE,
];

export function getTemplate(id: string): TemplateConfig | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id);
}

export function mergeTemplates(dbTemplates: any[] | undefined): TemplateConfig[] {
  if (!dbTemplates) return ALL_TEMPLATES;
  return ALL_TEMPLATES.map((staticTpl) => {
    const dbTpl = dbTemplates.find((t) => t.type === staticTpl.id);
    if (!dbTpl) return staticTpl;

    let fields = staticTpl.fields;
    try {
      if (typeof dbTpl.designJson === "string") {
        fields = JSON.parse(dbTpl.designJson);
      } else if (dbTpl.designJson && typeof dbTpl.designJson === "object") {
        fields = dbTpl.designJson as any;
      }
    } catch (e) {
      console.error("Failed to parse designJson for template", dbTpl.type, e);
    }

    return {
      ...staticTpl,
      src: dbTpl.templateImage || staticTpl.src,
      fields,
    };
  });
}
