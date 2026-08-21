import { getLoadedConfig } from '../config/loadConfig.js';

export async function sendEmail(templateId, templateParams) {
  const config = getLoadedConfig();
  if (!config?.emailjs?.publicKey || !config.emailjs.serviceId || !templateId) return false;
  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service_id: config.emailjs.serviceId,
      template_id: templateId,
      user_id: config.emailjs.publicKey,
      template_params: templateParams,
    }),
  });
  if (!response.ok) throw new Error('Die E-Mail konnte nicht versendet werden.');
  return true;
}

export const sendBookingApprovalEmail = (params) => {
  const config = getLoadedConfig();
  return sendEmail(config?.emailjs?.bookingTemplateId, params);
};
export const sendCancellationEmail = (params) => {
  const config = getLoadedConfig();
  return sendEmail(config?.emailjs?.cancellationTemplateId, params);
};
