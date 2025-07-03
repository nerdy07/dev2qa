'use server';

import sgMail from '@sendgrid/mail';

const sendgridApiKey = process.env.SENDGRID_API_KEY;

if (sendgridApiKey) {
    sgMail.setApiKey(sendgridApiKey);
} else {
    console.warn('SendGrid API key not found. Email notifications are disabled.');
}

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions) {
    if (!sendgridApiKey) {
        console.error('Attempted to send email without an API key.');
        // In a real app, you might want to return an error or handle this more gracefully.
        return { success: false, error: 'Email service is not configured.' };
    }

    const msg = {
        to,
        from: 'no-reply@dev2qa.app', // You will need to verify this sender address in SendGrid
        subject,
        html,
    };

    try {
        await sgMail.send(msg);
        return { success: true };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, error: 'Failed to send email.' };
    }
}
