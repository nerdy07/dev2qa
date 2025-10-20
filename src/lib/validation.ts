import { z } from 'zod';
// Lightweight, dependency-free sanitization fallbacks
// We avoid importing DOMPurify on the server to keep things simple.
// If you want stronger sanitization, we can wire DOMPurify later.

// Common validation schemas
export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number');

export const nameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must be less than 100 characters')
  .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name can only contain letters, spaces, hyphens, apostrophes, and periods');

export const phoneSchema = z
  .string()
  .regex(/^[\+]?[1-9][\d]{0,15}$/, 'Invalid phone number format')
  .optional();

// User validation schemas
export const userRoleSchema = z.enum(['admin', 'requester', 'qa_tester']);

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  role: userRoleSchema,
  expertise: z.string().max(500).optional(),
  baseSalary: z.number().min(0).max(1000000).optional(),
  annualLeaveEntitlement: z.number().min(0).max(365).default(20),
});

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  role: userRoleSchema.optional(),
  expertise: z.string().max(500).optional(),
  baseSalary: z.number().min(0).max(1000000).optional(),
  annualLeaveEntitlement: z.number().min(0).max(365).optional(),
  disabled: z.boolean().optional(),
});

// Request validation schemas
export const certificateRequestSchema = z.object({
  taskTitle: z.string().min(3, 'Task title must be at least 3 characters').max(200, 'Task title must be less than 200 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description must be less than 2000 characters'),
  associatedTeam: z.string().min(1, 'Team is required'),
  associatedProject: z.string().min(1, 'Project is required'),
  taskLink: z.string().url('Invalid URL format').optional().or(z.literal('')),
});

// Leave request validation
export const leaveRequestSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason must be less than 500 characters'),
  dates: z.object({
    from: z.date(),
    to: z.date(),
  }).refine(data => data.to >= data.from, {
    message: "End date must be after start date",
    path: ["to"],
  }),
});

// Infraction validation
export const infractionSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  infractionType: z.string().min(1, 'Infraction type is required'),
  description: z.string().min(5, 'Description must be at least 5 characters').max(1000, 'Description must be less than 1000 characters'),
  severity: z.enum(['low', 'medium', 'high']).default('medium'),
});

// Bonus validation
export const bonusSchema = z.object({
  userId: z.string().min(1, 'User is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0').max(100000, 'Amount must be less than 100,000'),
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500, 'Reason must be less than 500 characters'),
  date: z.date().max(new Date(), 'Date cannot be in the future'),
});

// Input sanitization functions
export function sanitizeString(input: string): string {
  return String(input ?? '').trim().replace(/[\u0000-\u001F\u007F]/g, '');
}

export function sanitizeHtml(input: string): string {
  // Strip script/style tags and on* attributes as a basic guard
  const withoutTags = String(input ?? '')
    .replace(/<\/(script|style)>/gi, '')
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/(script|style)>/gi, '')
    .replace(/ on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/ on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/ on[a-z]+\s*=\s*[^\s>]+/gi, '');
  return withoutTags;
}

export function sanitizeUrl(input: string): string {
  try {
    const url = new URL(input);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    return url.toString();
  } catch {
    throw new Error('Invalid URL format');
  }
}

// Validation helper functions
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const result = passwordSchema.safeParse(password);
  return {
    valid: result.success,
    errors: result.success ? [] : result.error.errors.map(e => e.message)
  };
}

export function validatePhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

// Rate limiting helper
export function createRateLimit(maxRequests: number, windowMs: number) {
  const requests = new Map<string, number[]>();
  
  return (identifier: string): boolean => {
    const now = Date.now();
    const userRequests = requests.get(identifier) || [];
    
    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return false; // Rate limit exceeded
    }
    
    // Add current request
    validRequests.push(now);
    requests.set(identifier, validRequests);
    
    return true; // Request allowed
  };
}
