// Analytics tracking utility
'use client';

import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export type AnalyticsEvent = {
  type: 'page_view' | 'button_click' | 'form_submit' | 'export' | 'leaderboard_like' | 'profile_update' | 'notification_open';
  userId?: string;
  page?: string;
  action?: string;
  metadata?: Record<string, any>;
};

export async function trackEvent(event: AnalyticsEvent) {
  if (!db) {
    console.warn('Analytics: Database not available');
    return;
  }

  try {
    await addDoc(collection(db, 'analytics'), {
      ...event,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
}

export function useAnalytics() {
  return {
    trackPageView: (page: string) => trackEvent({ type: 'page_view', page }),
    trackClick: (action: string, metadata?: Record<string, any>) => 
      trackEvent({ type: 'button_click', action, metadata }),
    trackFormSubmit: (formName: string, metadata?: Record<string, any>) => 
      trackEvent({ type: 'form_submit', action: formName, metadata }),
    trackExport: (exportType: string, metadata?: Record<string, any>) => 
      trackEvent({ type: 'export', action: exportType, metadata }),
  };
}

