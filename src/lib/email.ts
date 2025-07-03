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
        console.error('Attempted to send email without Mailgun being configured.');
        return { success: false, error: 'Email service is not configured.' };
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
    } catch (error) {
        console.error('Error sending email via Mailgun:', error);
        return { success: false, error: 'Failed to send email.' };
    }
}
