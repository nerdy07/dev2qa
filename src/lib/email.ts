'use server';

import Mailgun from 'mailgun.js';
import formData from 'form-data';

const mailgunApiKey = process.env.MAILGUN_API_KEY;
const mailgunDomain = process.env.MAILGUN_DOMAIN;

let mailgun: Mailgun | null = null;
let mg: ReturnType<Mailgun['client']> | null = null;

if (mailgunApiKey && mailgunDomain) {
    mailgun = new Mailgun(formData);
    mg = mailgun.client({ username: 'api', key: mailgunApiKey });
} else {
    console.warn('Mailgun API key or domain not found. Email notifications are disabled.');
}

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions) {
    if (!mg || !mailgunDomain) {
        return { success: false, error: 'Email service is not configured. Please check your MAILGUN_API_KEY and MAILGUN_DOMAIN environment variables in the .env file.' };
    }

    const msg = {
        from: `Dev2QA <mailgun@${mailgunDomain}>`,
        to: [to],
        subject,
        html,
    };

    try {
        await mg.messages.create(mailgunDomain, msg);
        return { success: true };
    } catch (error: any) {
        console.error('Error sending email via Mailgun:', error);
        
        // Provide specific, actionable error messages
        if (error.status === 401) {
            return { success: false, error: 'Mailgun authentication failed (401). Please check if your MAILGUN_API_KEY is correct in the .env file.' };
        }
        
        const errorMessage = error.details || error.message || 'An unknown error occurred during the API call to Mailgun.';
        
        if (typeof errorMessage === 'string' && errorMessage.includes('Sandbox subdomains are for test purposes only')) {
            return { success: false, error: 'Mailgun Sandbox Error: You must add the recipient email address to the authorized recipients list in your Mailgun account before sending.' };
        }
        
        return { success: false, error: `Mailgun API Error: ${errorMessage}` };
    }
}
