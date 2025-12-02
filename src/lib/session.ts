/**
 * Session Management Utility
 * 
 * Provides standardized session handling for the application.
 * Manages user session data, token persistence, and session lifecycle.
 */

const SESSION_KEY = 'dev2qa_session';
const SESSION_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  timestamp: number;
  expiresAt: number;
}

/**
 * Save session data to localStorage
 */
export function saveSession(userId: string, email: string, name: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const now = Date.now();
    const sessionData: SessionData = {
      userId,
      email,
      name,
      timestamp: now,
      expiresAt: now + SESSION_TIMEOUT,
    };
    
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (error) {
    // Silently fail if localStorage is not available (e.g., private browsing mode)
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to save session:', error);
    }
  }
}

/**
 * Get current session data
 */
export function getSession(): SessionData | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const sessionStr = localStorage.getItem(SESSION_KEY);
    if (!sessionStr) return null;
    
    const sessionData: SessionData = JSON.parse(sessionStr);
    
    // Validate session data structure
    if (!sessionData.userId || !sessionData.email || !sessionData.name) {
      clearSession();
      return null;
    }
    
    // Check if session has expired
    if (Date.now() > sessionData.expiresAt) {
      clearSession();
      return null;
    }
    
    return sessionData;
  } catch (error) {
    // Silently fail if localStorage is not available or data is corrupted
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to get session:', error);
    }
    // Try to clear corrupted session data
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore errors when clearing
    }
    return null;
  }
}

/**
 * Check if a valid session exists
 */
export function hasValidSession(): boolean {
  const session = getSession();
  return session !== null && Date.now() <= session.expiresAt;
}

/**
 * Clear session data
 */
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch (error) {
    // Silently fail if localStorage is not available
    if (process.env.NODE_ENV === 'development') {
      console.warn('Failed to clear session:', error);
    }
  }
}

/**
 * Refresh session expiration time
 */
export function refreshSession(): void {
  const session = getSession();
  if (!session) return;
  
  const now = Date.now();
  session.expiresAt = now + SESSION_TIMEOUT;
  session.timestamp = now;
  
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Failed to refresh session:', error);
  }
}

/**
 * Get session expiration time
 */
export function getSessionExpiration(): number | null {
  const session = getSession();
  return session?.expiresAt ?? null;
}

/**
 * Check if session is about to expire (within 1 hour)
 */
export function isSessionExpiringSoon(): boolean {
  const expiration = getSessionExpiration();
  if (!expiration) return false;
  
  const oneHour = 60 * 60 * 1000;
  return expiration - Date.now() < oneHour;
}




