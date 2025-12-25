/**
 * Utility functions for generating user-friendly IDs
 * Format: PREFIX-NUMBER (e.g., REQ-001, CERT-042)
 */

const PREFIXES = {
  request: 'REQ',
  certificate: 'CERT',
  project: 'PROJ',
  team: 'TEAM',
  design: 'DSGN',
  leave: 'LEAVE',
  bonus: 'BNS',
  infraction: 'INFR',
  comment: 'CMT',
} as const;

type IdPrefix = keyof typeof PREFIXES;

/**
 * Generates a user-friendly ID from a Firestore document ID
 * Uses the last 6 characters of the Firestore ID to create a readable number
 */
export function generateFriendlyId(documentId: string, prefix: IdPrefix): string {
  // Extract numeric characters from the document ID
  const numericPart = documentId.replace(/\D/g, '').slice(-6);
  // If no numbers found, use a hash of the ID
  const num = numericPart || documentId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0).toString().slice(-6);
  // Pad to 6 digits
  const padded = num.padStart(6, '0');
  return `${PREFIXES[prefix]}-${padded}`;
}

/**
 * Generates a short, sequential-looking ID
 * Uses timestamp + random to create unique IDs
 */
export function generateShortId(prefix: IdPrefix): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${PREFIXES[prefix]}-${timestamp.slice(-4)}${random}`;
}

/**
 * Formats an existing ID to be more user-friendly
 * If already in friendly format, returns as-is
 * Otherwise converts Firestore ID to friendly format
 */
export function formatFriendlyId(id: string | undefined | null, prefix: IdPrefix): string {
  if (!id) return '-';
  
  // Check if already in friendly format (PREFIX-NUMBER)
  if (id.includes('-') && id.startsWith(PREFIXES[prefix])) {
    return id;
  }
  
  // Convert Firestore ID to friendly format
  return generateFriendlyId(id, prefix);
}

/**
 * Extracts the display ID from a document
 * Checks for shortId/reference field first, then friendly format
 */
export function extractDisplayId(document: any, prefix: IdPrefix): string {
  // Prefer shortId or reference field if available
  if (document.shortId) return document.shortId;
  if (document.reference) return document.reference;
  
  // Fallback to formatting the document ID
  return formatFriendlyId(document.id, prefix);
}
