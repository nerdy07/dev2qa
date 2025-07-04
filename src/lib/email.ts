'use server';

import * as Brevo from '@getbrevo/brevo';

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
// Making sender name optional and providing a default.
const brevoSenderName = process.env.BREVO_SENDER_NAME || 'Dev2QA';

let brevoClient: Brevo.TransactionalEmailsApi | null = null;
const isBrevoConfigured = brevoApiKey && brevoSenderEmail;

if (isBrevoConfigured) {
    brevoClient = new Brevo.TransactionalEmailsApi();
    brevoClient.setApiKey(Brevo.TransactionalEmailsApiApiKeys.apiKey, brevoApiKey);
} else {
    console.warn('Brevo API key or sender email not found. Email notifications are disabled. Please check .env file.');
}

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions): Promise<{ success: boolean; error?: string }> {
    if (!isBrevoConfigured || !brevoClient) {
        return { success: false, error: 'Email service is not configured. Please provide BREVO_API_KEY and BREVO_SENDER_EMAIL in your .env file.' };
    }

    const sendSmtpEmail = new Brevo.SendSmtpEmail();
    
    sendSmtpEmail.to = to.split(',').map(email => ({ email: email.trim() }));
    sendSmtpEmail.sender = { email: brevoSenderEmail!, name: brevoSenderName };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    try {
        await brevoClient.sendTransacEmail(sendSmtpEmail);
        return { success: true };
    } catch (error: any) {
        console.error('Error sending email via Brevo:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.response?.body?.message || error.message || 'An unknown error occurred during the API call to Brevo.';
        
        if (error.response?.statusCode === 401 || (typeof errorMessage === 'string' && errorMessage.includes('Key not found'))) {
             return { success: false, error: 'Brevo authentication failed (401). Please check if your BREVO_API_KEY is correct in the .env file.' };
        }
        
        if (typeof errorMessage === 'string' && errorMessage.includes('sender is not valid')) {
            return { success: false, error: 'Brevo Error: The sender email address is not valid or not authorized in your Brevo account.' };
        }

        return { success: false, error: `Brevo API Error: ${errorMessage}` };
    }
}
