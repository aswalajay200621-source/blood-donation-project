import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_eblorag';
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_uts7pu3';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'FnzjkIi6CBXcYl12d';
const TARGET_EMAIL = import.meta.env.VITE_EMAILJS_TARGET_EMAIL || 'aswalajay200621@gmail.com';

/**
 * Sends a 2FA OTP code directly to user's email using EmailJS
 * @param {string} otpCode 6-digit verification code
 * @param {string} recipientEmail Target email address
 */
export async function sendOtpEmail(otpCode, recipientEmail = TARGET_EMAIL) {
  try {
    const templateParams = {
      otp_code: otpCode,
      to_email: recipientEmail,
      email: recipientEmail,
      name: 'Hospital Administrator'
    };

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      templateParams,
      PUBLIC_KEY
    );

    console.log('✅ 2FA Email sent successfully via EmailJS:', response.status, response.text);
    return { success: true, response };
  } catch (error) {
    console.error('❌ Failed to send 2FA Email via EmailJS:', error);
    return {
      success: false,
      error: error?.text || error?.message || 'Email delivery failed'
    };
  }
}
