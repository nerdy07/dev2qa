'use server';

import * as SibApiV3Sdk from 'sib-api-v3-sdk';

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
const brevoSenderName = process.env.BREVO_SENDER_NAME || 'Dev2QA';

let apiInstance: SibApiV3Sdk.TransactionalEmailsApi | null = null;
const isBrevoConfigured = brevoApiKey && brevoSenderEmail;

if (isBrevoConfigured) {
    let defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = brevoApiKey;
    apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
} else {
    console.warn('Brevo API key or sender email not found. Email notifications are disabled. Please check .env file.');
}

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions): Promise<{ success: boolean; error?: string }> {
    if (!isBrevoConfigured || !apiInstance) {
        return { success: false, error: 'Email service is not configured. Please provide BREVO_API_KEY and BREVO_SENDER_EMAIL in your .env file.' };
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    
    sendSmtpEmail.to = to.split(',').map(email => ({ email: email.trim() }));
    sendSmtpEmail.sender = { email: brevoSenderEmail!, name: brevoSenderName };
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        return { success: true };
    } catch (error: any) {
        console.error('Error sending email via Brevo:', JSON.stringify(error, null, 2));
        
        const errorMessage = error.body?.message || error.message || 'An unknown error occurred during the API call to Brevo.';
        
        if (error.status === 401 || (typeof errorMessage === 'string' && errorMessage.includes('Key not found'))) {
             return { success: false, error: 'Brevo authentication failed (401). Please check if your BREVO_API_KEY is correct in the .env file.' };
        }
        
        if (typeof errorMessage === 'string' && (errorMessage.includes('sender is not valid') || errorMessage.includes('Sender not found'))) {
            return { success: false, error: 'Brevo Error: The sender email address is not valid or not authorized in your Brevo account.' };
        }

        return { success: false, error: `Brevo API Error: ${errorMessage}` };
    }
}
