
'use server';

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
const brevoSenderName = process.env.BREVO_SENDER_NAME || 'Dev2QA Certificate Management';

const isBrevoConfigured = brevoApiKey && brevoSenderEmail;

/**
 * Check email service configuration status
 * Useful for debugging email issues
 */
export async function getEmailConfigStatus(): Promise<{
  configured: boolean;
  hasApiKey: boolean;
  hasSenderEmail: boolean;
  hasSenderName: boolean;
  issues: string[];
}> {
  const hasApiKey = !!brevoApiKey;
  const hasSenderEmail = !!brevoSenderEmail;
  const hasSenderName = !!brevoSenderName;
  const configured = hasApiKey && hasSenderEmail;
  
  const issues: string[] = [];
  if (!hasApiKey) {
    issues.push('BREVO_API_KEY is missing in environment variables');
  }
  if (!hasSenderEmail) {
    issues.push('BREVO_SENDER_EMAIL is missing in environment variables');
  }
  if (!hasSenderName) {
    issues.push('BREVO_SENDER_NAME is missing (using default)');
  }
  
  return {
    configured,
    hasApiKey,
    hasSenderEmail,
    hasSenderName,
    issues,
  };
}

interface MailOptions {
    to: string;
    subject: string;
    html: string;
    cc?: string; // Optional CC field - comma-separated emails
}

export async function sendEmail({ to, subject, html, cc }: MailOptions): Promise<{ success: boolean; error?: string }> {
    if (!isBrevoConfigured) {
        const errorMessage = 'Email service is not configured. Please provide BREVO_API_KEY and BREVO_SENDER_EMAIL in your .env file.';
        console.error('[EMAIL ERROR]', errorMessage);
        return { success: false, error: errorMessage };
    }

    // Brevo API expects an array of objects for recipients
    const emailRecipients = to.split(',').map(email => ({ email: email.trim() }));
    
    // Add CC if provided
    const payload: any = {
        sender: {
            name: brevoSenderName,
            email: brevoSenderEmail,
        },
        to: emailRecipients,
        subject: subject,
        htmlContent: html,
    };
    
    if (cc && cc.trim()) {
        const ccRecipients = cc.split(',').map(email => ({ email: email.trim() }));
        payload.cc = ccRecipients;
    }

    try {
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': brevoApiKey,
                'content-type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            // Attempt to parse the error response from Brevo
            let errorBody: any = {};
            let errorMessage = `Brevo API Error: Status ${response.status}`;
            
            try {
                errorBody = await response.json();
                errorMessage = errorBody.message || errorMessage;
            } catch (parseError) {
                // If JSON parsing fails, try to get text
                try {
                    const text = await response.text();
                    errorMessage = text || errorMessage;
                } catch (textError) {
                    // If all else fails, use status code
                    errorMessage = `Brevo API Error: Status ${response.status}`;
                }
            }
            
            // Always log errors for debugging
            console.error('[EMAIL ERROR] Failed to send email:', {
                to,
                subject,
                status: response.status,
                error: errorMessage,
                errorBody: process.env.NODE_ENV === 'development' ? errorBody : undefined,
            });
            
            // Provide more specific feedback for common configuration errors
            if (response.status === 401) {
                return { success: false, error: 'Brevo authentication failed. Please check if your BREVO_API_KEY is correct in the .env file.' };
            }
            if (errorMessage.includes('Sender not found') || errorMessage.includes('sender is not valid')) {
                return { success: false, error: 'Brevo Error: The sender email address is not valid or not authorized in your Brevo account.' };
            }
            if (errorMessage.includes("Invalid recipient email address")) {
                return { success: false, error: `Brevo Error: One of the recipient emails is invalid.` };
            }

            return { success: false, error: errorMessage };
        }

        // Brevo API returns 201 for success
        if (process.env.NODE_ENV === 'development') {
            console.log('[EMAIL SUCCESS]', { to, subject, status: response.status });
        }
        return { success: true };

    } catch (error: any) {
        // Always log errors for debugging
        console.error('[EMAIL ERROR] Network or unknown error while sending email:', {
            to,
            subject,
            error: error.message || String(error),
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        });
        return { success: false, error: 'A network or unknown error occurred while trying to send the email.' };
    }
}
