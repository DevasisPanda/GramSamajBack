import axios from 'axios';

/**
 * WhatsApp Messaging Service via AllExpert REST API
 */

function getWhatsAppCredentials() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim().replace(/^["']|["']$/g, "") || "";
  const instanceId = process.env.WHATSAPP_INSTANCE_ID?.trim().replace(/^["']|["']$/g, "") || "";
  return { accessToken, instanceId };
}

export const sendWhatsAppMessage = async (phone: string, subject: string, text: string) => {
  const { accessToken, instanceId } = getWhatsAppCredentials();
  
  // Format phone number to clean digits (no +, spaces or dashes)
  let cleanNumber = phone.replace(/\D/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }

  if (!accessToken || !instanceId) {
    console.log(`[WhatsApp API] Mock/Skipped dispatching to ${cleanNumber}: WHATSAPP_ACCESS_TOKEN or WHATSAPP_INSTANCE_ID not set.`);
    return { success: true, mock: true };
  }

  const formattedMessage = `*${subject}*\n\n${text}\n\n_This is an automated message from Appropriate Institute of Rural Development (AIRD Trust)._`;

  try {
    console.log(`[WhatsApp API] Dispatching message to ${cleanNumber} using Instance ID: ${instanceId}...`);
    const url = `https://button.allexpert.in/api/send?number=${cleanNumber}&type=text&message=${encodeURIComponent(formattedMessage)}&instance_id=${instanceId}&access_token=${accessToken}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        number: cleanNumber,
        type: "text",
        message: formattedMessage,
        instance_id: instanceId,
        access_token: accessToken,
      })
    });

    const responseData = await response.json();
    console.log(`[WhatsApp API] Response for ${cleanNumber}:`, JSON.stringify(responseData));

    if (responseData && typeof responseData === 'object') {
      const msg = typeof responseData.message === 'string' ? responseData.message : '';
      if (msg.toLowerCase().includes('limit') || msg.toLowerCase().includes('exceeded')) {
        console.warn(`[WhatsApp API] WARNING: Message to ${cleanNumber} accepted by endpoint but not delivered: ${msg}`);
        return { success: false, error: 'limit_exceeded', data: responseData };
      }
      if (responseData.status === 'error') {
        console.error(`[WhatsApp API] Error status returned for ${cleanNumber}:`, responseData.message);
        return { success: false, error: 'api_error', data: responseData };
      }
    }

    return { success: true, data: responseData };
  } catch (error: any) {
    console.error(`[WhatsApp API] Error sending message to ${cleanNumber}:`, error.message || error);
    return { success: false, error: error.message };
  }
};

/**
 * Send WhatsApp Media / File Attachment (PDF Receipts, Certificates, Images)
 */
export const sendWhatsAppMedia = async (phone: string, caption: string, mediaUrl: string, filename?: string) => {
  const { accessToken, instanceId } = getWhatsAppCredentials();

  let cleanNumber = phone.replace(/\D/g, '');
  if (cleanNumber.length === 10) {
    cleanNumber = '91' + cleanNumber;
  }

  try {
    console.log(`[WhatsApp API] Dispatching media message to ${cleanNumber}...`);
    const payload: any = {
      number: cleanNumber,
      type: "media",
      message: caption,
      media_url: mediaUrl,
      instance_id: instanceId,
      access_token: accessToken,
    };

    if (filename) {
      payload.filename = filename;
    }

    const response = await axios.post('https://button.allexpert.in/api/send', payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`[WhatsApp Media API] Response:`, response.data);

    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(`[WhatsApp Media API] Error sending media to ${cleanNumber}:`, error.response?.data || error.message);
    throw error;
  }
};
