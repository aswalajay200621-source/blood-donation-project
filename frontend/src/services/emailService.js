import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_eblorag';
const OTP_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_uts7pu3';
const REMINDER_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_REMINDER_TEMPLATE_ID || 'template_pfqixi4';
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY || 'FnzjkIi6CBXcYl12d';
const TARGET_EMAIL = import.meta.env.VITE_EMAILJS_TARGET_EMAIL || 'aswalajay200621@gmail.com';

/**
 * Sends a 2FA OTP code directly to user's email using EmailJS browser SDK
 * @param {string} otpCode 6-digit verification code
 * @param {string} recipientEmail Target email address
 * @param {string} userName Display name of recipient
 */
export async function sendOtpEmail(otpCode, recipientEmail = TARGET_EMAIL, userName = 'Hospital Staff') {
  try {
    const templateParams = {
      otp_code: otpCode,
      to_email: recipientEmail,
      email: recipientEmail,
      name: userName
    };

    const response = await emailjs.send(
      SERVICE_ID,
      OTP_TEMPLATE_ID,
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

/**
 * Sends a 3-month eligibility recall reminder to a donor using EmailJS
 * @param {Object} donor Donor object with full_name, email, blood_group, last_donation_date
 */
export async function sendDonorReminderEmail(donor) {
  try {
    const toEmail = donor.email || TARGET_EMAIL;
    const formattedLastDate = donor.last_donation_date 
      ? new Date(donor.last_donation_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) 
      : 'recent donation';

    const templateParams = {
      donor_name: donor.full_name || 'Valued Donor',
      name: donor.full_name || 'Valued Donor',
      blood_group: donor.blood_group || 'Unknown',
      last_donation_date: formattedLastDate,
      to_email: toEmail,
      email: toEmail,
      otp_code: `ELIGIBLE (${donor.blood_group})`,
      message: `Dear ${donor.full_name}, it has been over 90 days since your previous whole blood donation on ${formattedLastDate}. You are now clinically eligible to donate again! Blood Group: ${donor.blood_group}.`
    };

    let response;
    try {
      response = await emailjs.send(
        SERVICE_ID,
        REMINDER_TEMPLATE_ID,
        templateParams,
        PUBLIC_KEY
      );
    } catch (primaryErr) {
      console.warn('⚠️ Primary reminder template encountered issue, attempting fallback with active template:', primaryErr);
      response = await emailjs.send(
        SERVICE_ID,
        OTP_TEMPLATE_ID,
        templateParams,
        PUBLIC_KEY
      );
    }

    console.log(`✅ 3-month reminder sent to ${donor.full_name} (${toEmail}) via EmailJS:`, response.status, response.text);
    return { success: true, response };
  } catch (error) {
    console.error(`❌ Failed to send reminder email to ${donor.full_name}:`, error);
    return {
      success: false,
      error: error?.text || error?.message || 'Email delivery failed'
    };
  }
}
