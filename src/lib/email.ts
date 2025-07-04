'use server';

const brevoApiKey = process.env.BREVO_API_KEY;
const brevoSenderEmail = process.env.BREVO_SENDER_EMAIL;
const brevoSenderName = process.env.BREVO_SENDER_NAME || 'Dev2QA';

const isBrevoConfigured = brevoApiKey && brevoSenderEmail;

interface MailOptions {
    to: string;
    subject: string;
    html: string;
}

export async function sendEmail({ to, subject, html }: MailOptions): Promise<{ success: boolean; error?: string }> {
    if (!isBrevoConfigured) {
        const errorMessage = 'Email service is not configured. Please provide BREVO_API_KEY and BREVO_SENDER_EMAIL in your .env file.';
        console.warn(errorMessage);
        return { success: false, error: errorMessage };
    }

    const emailRecipients = to.split(',').map(email => ({ email: email.trim() }));

    const payload = {
        sender: {
            name: brevoSenderName,
            email: brevoSenderEmail,
        },
        to: emailRecipients,
        subject: subject,
        htmlContent: html,
    };

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
            const errorBody = await response.json();
            const errorMessage = errorBody.message || `Brevo API Error: Status ${response.status}`;
            console.error('Error sending email via Brevo:', errorBody);

            if (response.status === 401) {
                return { success: false, error: 'Brevo authentication failed (401). Please check if your BREVO_API_KEY is correct in the .env file.' };
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
        return { success: true };

    } catch (error: any) {
        console.error('Failed to send email:', error);
        return { success: false, error: 'A network or unknown error occurred while trying to send the email.' };
    }
}
