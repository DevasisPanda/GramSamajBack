import axios from 'axios';

const resendApiKey = process.env.RESEND_API_KEY;
const defaultFromEmail = process.env.EMAIL_FROM || 'AIRD Trust <no-reply@airdup.com>';
const fallbackFromEmail = 'AIRD Trust <onboarding@resend.dev>';


/**
 * Helper to send email via Resend with auto-fallback if custom domain is not verified.
 */
async function sendResendMail(payload: {
  from?: string;
  to: string | string[];
  subject: string;
  html: string;
  attachments?: Array<{ filename: string; content?: string; path?: string }>;
}) {
  const toList = Array.isArray(payload.to) ? payload.to : [payload.to];
  const validTo = toList.filter((e) => e && e.includes('@'));

  if (validTo.length === 0) {
    console.log('[Resend Email] Skipping: no valid recipient email address');
    return { success: false, error: 'no_email' };
  }

  if (!resendApiKey) {
    console.log('\n========================================================');
    console.log('               [MOCK EMAIL SERVICE]                     ');
    console.log('========================================================');
    console.log(`To: ${validTo.join(', ')}`);
    console.log(`Subject: ${payload.subject}`);
    if (payload.attachments) {
      console.log(`Attachments: ${payload.attachments.map((a) => a.filename).join(', ')}`);
    }
    console.log('========================================================\n');
    return { success: true, mock: true };
  }

  const sendWithFrom = async (fromAddress: string) => {
    return await axios.post(
      'https://api.resend.com/emails',
      {
        from: fromAddress,
        to: validTo,
        subject: payload.subject,
        html: payload.html,
        attachments: payload.attachments,
      },
      {
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
  };

  try {
    const response = await sendWithFrom(payload.from || defaultFromEmail);
    console.log(`[Resend Email] Email sent successfully to ${validTo.join(', ')}. ID: ${response.data?.id}`);
    return { success: true, id: response.data?.id };
  } catch (error: any) {
    const errData = error.response?.data || error.message;
    console.warn(`[Resend Email] Initial send attempt failed:`, errData);

    // If domain verification error, retry once with standard Resend onboarding domain
    if (typeof errData === 'object' && (errData?.statusCode === 403 || errData?.message?.includes('domain') || errData?.name === 'validation_error')) {
      try {
        console.log(`[Resend Email] Retrying with fallback domain: ${fallbackFromEmail}`);
        const retryResp = await sendWithFrom(fallbackFromEmail);
        console.log(`[Resend Email] Retry successful. ID: ${retryResp.data?.id}`);
        return { success: true, id: retryResp.data?.id };
      } catch (retryErr: any) {
        console.error(`[Resend Email] Fallback send failed:`, retryErr.response?.data || retryErr.message);
      }
    }
    return { success: false, error: errData };
  }
}

/**
 * Sends a password reset email using Resend.com
 */
export const sendPasswordResetEmail = async (email: string, resetLink: string) => {
  const subject = "Reset Your Password - Appropriate Institute of Rural Development (AIRD Trust)";
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Appropriate Institute of Rural Development (AIRD Trust)</h2>
      </div>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 16px; line-height: 24px; margin-bottom: 16px;">Hello,</p>
      <p style="font-size: 16px; line-height: 24px; margin-bottom: 24px;">We received a request to reset the password for your account. Click the button below to choose a new password. This link is valid for 1 hour.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}" style="background-color: #fed813; color: #061941; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">Reset Password</a>
      </div>
      <p style="font-size: 14px; line-height: 20px; color: #64748b; margin-bottom: 8px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="font-size: 14px; line-height: 20px; word-break: break-all; color: #2563eb; margin-bottom: 24px;">
        <a href="${resetLink}" style="color: #2563eb; text-decoration: underline;">${resetLink}</a>
      </p>
      <p style="font-size: 14px; line-height: 20px; color: #64748b; margin-bottom: 16px;">If you did not request a password reset, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; line-height: 16px; color: #94a3b8; text-align: center; margin: 0;">This is an automated email from Appropriate Institute of Rural Development (AIRD Trust). Please do not reply directly to this message.</p>
    </div>
  `;

  return await sendResendMail({
    to: email,
    subject,
    html: htmlContent,
  });
};

/**
 * Sends official donation receipt email with attached PDF.
 */
export const sendDonationReceiptEmail = async (
  data: {
    receiptNumber: string;
    donorName: string;
    donorEmail: string;
    amount: string;
    purpose: string;
    transactionId: string;
    createdAt: Date | string;
    donorPhone?: string;
  },
  pdfBufferOrUrl?: Buffer | string
) => {
  if (!data.donorEmail || !data.donorEmail.includes("@")) {
    console.log(`[Resend Email] Skipping: no valid donor email`);
    return { success: false, error: "no_email" };
  }

  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleDateString("en-GB")
    : new Date().toLocaleDateString("en-GB");

  const subject = `Official Donation Receipt - Appropriate Institute of Rural Development (AIRD Trust) (#${data.receiptNumber})`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Appropriate Institute of Rural Development (AIRD Trust)</h2>
    <p style="color: #475569; margin: 4px 0 0; font-size: 14px;">Official Donation Receipt</p>
  </div>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

  <p style="font-size: 16px; line-height: 24px;">Dear <strong>${data.donorName || "Donor"}</strong>,</p>
  <p style="font-size: 16px; line-height: 24px; margin-bottom: 16px;">
    Thank you for your generous contribution of <strong>Rs. ${parseFloat(data.amount).toFixed(2)}</strong> to Appropriate Institute of Rural Development (AIRD Trust). Your support helps us continue our mission.
  </p>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Receipt No:</b></td><td style="padding: 6px 0; color: #1e293b;">${data.receiptNumber}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Payment ID:</b></td><td style="padding: 6px 0; color: #1e293b;">${data.transactionId || "N/A"}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Amount:</b></td><td style="padding: 6px 0; color: #115e59; font-weight: bold;">Rs. ${parseFloat(data.amount).toFixed(2)}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Purpose:</b></td><td style="padding: 6px 0; color: #1e293b;">${data.purpose || "General Donation"}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Date:</b></td><td style="padding: 6px 0; color: #1e293b;">${date}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>80G URN:</b></td><td style="padding: 6px 0; color: #1e293b;">AADTV2345L25AD01</td></tr>
    </table>
  </div>

  <p style="font-size: 14px; line-height: 20px; color: #475569; margin-bottom: 16px;">
    Your official donation receipt is attached to this email. Donations to Appropriate Institute of Rural Development (AIRD Trust) are eligible for tax exemption under Section 80G of the Income Tax Act.
  </p>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 12px; line-height: 16px; color: #94a3b8; text-align: center; margin: 0;">This is an automated email from Appropriate Institute of Rural Development (AIRD Trust). Please do not reply directly to this message.</p>
</div>
  `;

  const attachments: Array<{ filename: string; content?: string; path?: string }> = [];
  if (Buffer.isBuffer(pdfBufferOrUrl)) {
    attachments.push({
      filename: `Donation_Receipt_${data.receiptNumber}.pdf`,
      content: pdfBufferOrUrl.toString("base64"),
    });
  } else if (typeof pdfBufferOrUrl === "string" && pdfBufferOrUrl.length > 0) {
    attachments.push({
      filename: `Donation_Receipt_${data.receiptNumber}.pdf`,
      path: pdfBufferOrUrl,
    });
  }

  return await sendResendMail({
    to: data.donorEmail,
    subject,
    html,
    attachments: attachments.length > 0 ? attachments : undefined,
  });
};

/**
 * Sends membership payment confirmation email to the member.
 */
export const sendMembershipPaymentEmail = async (data: {
  memberName: string;
  memberEmail: string;
  membershipType: string;
  amount: string | number;
  transactionId: string;
  membershipNumber?: string;
}) => {
  if (!data.memberEmail || !data.memberEmail.includes("@")) {
    console.log(`[Resend Email] Skipping: no valid member email`);
    return { success: false, error: "no_email" };
  }

  const membershipLabel = data.membershipType === "lifetime" ? "Lifetime Membership" : "1-Year Regular Membership";
  const formattedAmount = parseFloat(String(data.amount)).toFixed(2);
  const subject = `Membership Payment Received - Appropriate Institute of Rural Development (AIRD Trust)`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Appropriate Institute of Rural Development (AIRD Trust)</h2>
    <p style="color: #475569; margin: 4px 0 0; font-size: 14px;">Membership Fee Payment Receipt</p>
  </div>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

  <p style="font-size: 16px; line-height: 24px;">Dear <strong>${data.memberName || "Member"}</strong>,</p>
  <p style="font-size: 16px; line-height: 24px; margin-bottom: 16px;">
    We have successfully received your membership payment of <strong>Rs. ${formattedAmount}</strong> for <strong>${membershipLabel}</strong>.
  </p>

  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${data.membershipNumber ? `<tr><td style="padding: 6px 0; color: #64748b;"><b>Membership No:</b></td><td style="padding: 6px 0; color: #1e293b;">${data.membershipNumber}</td></tr>` : ""}
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Plan Type:</b></td><td style="padding: 6px 0; color: #1e293b;">${membershipLabel}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Payment ID:</b></td><td style="padding: 6px 0; color: #1e293b;">${data.transactionId || "N/A"}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Amount Paid:</b></td><td style="padding: 6px 0; color: #115e59; font-weight: bold;">Rs. ${formattedAmount}</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Application Status:</b></td><td style="padding: 6px 0; color: #d97706; font-weight: bold;">Under 24h Review</td></tr>
      <tr><td style="padding: 6px 0; color: #64748b;"><b>Date:</b></td><td style="padding: 6px 0; color: #1e293b;">${new Date().toLocaleDateString("en-GB")}</td></tr>
    </table>
  </div>

  <p style="font-size: 14px; line-height: 20px; color: #475569; margin-bottom: 16px;">
    Our administrative team is reviewing your profile. Once approved, your official digital ID card and membership certificate will be automatically activated in your Member Dashboard.
  </p>

  <div style="text-align: center; margin: 28px 0;">
    <a href="${process.env.FRONTEND_URL || 'https://airdup.com'}/admin/login" style="background-color: #061941; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 15px;">Go to Member Portal</a>
  </div>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 12px; line-height: 16px; color: #94a3b8; text-align: center; margin: 0;">This is an automated confirmation email from Appropriate Institute of Rural Development (AIRD Trust). Please do not reply directly to this message.</p>
</div>
  `;

  return await sendResendMail({
    to: data.memberEmail,
    subject,
    html,
  });
};

/**
 * Sends membership approval notification email to the member.
 */
export const sendMembershipApprovalEmail = async (data: {
  memberName: string;
  memberEmail: string;
  membershipNumber: string;
  membershipType: string;
}) => {
  if (!data.memberEmail || !data.memberEmail.includes("@")) {
    return { success: false, error: "no_email" };
  }

  const subject = `Congratulations! Your Membership Has Been Approved - Appropriate Institute of Rural Development (AIRD Trust)`;

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff; color: #1e293b;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">Appropriate Institute of Rural Development (AIRD Trust)</h2>
    <p style="color: #16a34a; margin: 4px 0 0; font-size: 15px; font-weight: bold;">Membership Approved 🎉</p>
  </div>
  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

  <p style="font-size: 16px; line-height: 24px;">Dear <strong>${data.memberName || "Member"}</strong>,</p>
  <p style="font-size: 16px; line-height: 24px; margin-bottom: 16px;">
    We are pleased to inform you that your membership application for <strong>Appropriate Institute of Rural Development (AIRD Trust)</strong> has been approved!
  </p>

  <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px;">
    <p style="margin: 0 0 8px; font-size: 14px; color: #166534;"><b>Your Official Membership Number:</b></p>
    <p style="margin: 0; font-size: 20px; font-weight: bold; color: #15803d; font-family: monospace;">${data.membershipNumber}</p>
  </div>

  <p style="font-size: 14px; line-height: 20px; color: #475569; margin-bottom: 16px;">
    You can now log in to your Member Dashboard to access your digital ID card, membership certificate, participate in community programs, and access exclusive member resources.
  </p>

  <div style="text-align: center; margin: 28px 0;">
    <a href="${process.env.FRONTEND_URL || 'https://airdup.com'}/admin/login" style="background-color: #061941; color: #ffffff; padding: 12px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 15px;">Log In to Member Portal</a>
  </div>

  <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
  <p style="font-size: 12px; line-height: 16px; color: #94a3b8; text-align: center; margin: 0;">Appropriate Institute of Rural Development (AIRD Trust) • 46-A, Nai Basti Babu Ganj, Lucknow, UP – 226020</p>
</div>
  `;

  return await sendResendMail({
    to: data.memberEmail,
    subject,
    html,
  });
};
