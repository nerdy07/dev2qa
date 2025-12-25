/**
 * Email template utilities
 * Provides consistent email templates with logo and branding
 */

/**
 * Gets the base URL for the application
 * Validates and ensures it's a proper absolute URL
 */
function getAppBaseUrl(): string {
  // Hardcode production URL as per user requirement
  const productionUrl = 'https://dev2qa.echobitstech.com';
  
  // In development, allow environment variable override
  if (process.env.NODE_ENV === 'development') {
    const devUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (devUrl) {
      try {
        const url = new URL(devUrl);
        return url.origin;
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('Invalid NEXT_PUBLIC_APP_URL, using production:', devUrl);
        }
      }
    }
  }
  
  return productionUrl;
}

/**
 * Gets the logo URL for use in emails
 * Uses the app URL or defaults to relative path
 */
function getLogoUrl(): string {
  try {
    const baseUrl = getAppBaseUrl();
    return `${baseUrl}/logo.jpg`;
  } catch (e) {
    // Fallback to relative path if URL validation fails
    return '/logo.jpg';
  }
}

/**
 * Wraps email content in a branded template with logo
 */
export function wrapEmailContent(content: string, title?: string): string {
  const logoUrl = getLogoUrl();
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Dev2QA Notification'}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
      <div style="background-color: #ffffff; border-radius: 8px; padding: 30px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <!-- Logo Header -->
        <div style="text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #e5e7eb;">
          <img src="${logoUrl}" alt="Dev2QA Logo" style="max-width: 150px; height: auto; display: block; margin: 0 auto;" />
        </div>
        
        <!-- Email Content -->
        ${content}
        
        <!-- Footer -->
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="font-size: 14px; color: #666; margin: 0; text-align: center;">
          Thanks,<br>
          <strong>The Dev2QA Team</strong>
        </p>
        <p style="font-size: 12px; color: #999; margin: 20px 0 0 0; text-align: center;">
          This is an automated message from Dev2QA. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Creates a valid absolute URL for email links
 * Ensures the URL has a protocol and host
 */
export function getAbsoluteUrl(path: string): string {
  try {
    const baseUrl = getAppBaseUrl();
    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  } catch (e) {
    // If URL validation fails, return path as-is (will be a broken link, but won't crash)
    if (process.env.NODE_ENV === 'development') {
      console.error('Failed to generate absolute URL:', e);
    }
    return path;
  }
}

/**
 * Creates a styled button/link for emails
 */
export function emailButton(href: string, text: string): string {
  // Ensure href is an absolute URL
  const absoluteHref = href.startsWith('http://') || href.startsWith('https://') 
    ? href 
    : getAbsoluteUrl(href);
  
  return `
    <div style="margin: 30px 0; text-align: center;">
      <a href="${absoluteHref}" 
         style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
        ${text}
      </a>
    </div>
  `;
}

