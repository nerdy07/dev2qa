'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface ProtectedRouteProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  roles?: string[];
  requireAll?: boolean;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  permission, 
  permissions = [],
  roles = [],
  requireAll = false,
  redirectTo = '/dashboard'
}: ProtectedRouteProps) {
  const { user, hasPermission, hasRole, loading, rolesLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Wait for auth and roles to finish loading before checking permissions
    if (loading || rolesLoading) return;

    // Redirect to login page if user is not authenticated
    if (!user) {
      router.push('/');
      return;
    }

    // Only check permissions - NO hardcoded role checks
    // If roles prop is provided, it's ignored - permissions are the source of truth
    if (permission || permissions.length > 0) {
      const hasRequiredPermission = () => {
        if (permissions.length > 0) {
          return requireAll 
            ? permissions.every(p => hasPermission(p))
            : permissions.some(p => hasPermission(p));
        }
        return hasPermission(permission!);
      };

      if (!hasRequiredPermission()) {
        router.push(redirectTo);
        return;
      }
    }
    
    // If only roles are specified (no permissions), check roles from Firestore
    // This is a fallback for backward compatibility, but should be avoided
    if (roles.length > 0 && !permission && permissions.length === 0) {
      const hasRequiredRole = requireAll 
        ? roles.every(role => hasRole(role))
        : hasRole(roles);
      
      if (!hasRequiredRole) {
        router.push(redirectTo);
        return;
      }
    }
  }, [user, hasPermission, hasRole, loading, rolesLoading, router, permission, permissions, roles, requireAll, redirectTo]);

  if (loading || rolesLoading) {
    return (
      <div className="flex-1 space-y-4 p-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
          <div className="grid gap-1">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[109px] w-full" />
          <Skeleton className="h-[109px] w-full" />
          <Skeleton className="h-[109px] w-full" />
          <Skeleton className="h-[109px] w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    // Show loading skeleton while redirecting
    return (
      <div className="flex-1 space-y-4 p-4">
        <div className="flex flex-col md:flex-row items-start justify-between gap-4 mb-8">
          <div className="grid gap-1">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-5 w-80" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-[109px] w-full" />
          <Skeleton className="h-[109px] w-full" />
          <Skeleton className="h-[109px] w-full" />
          <Skeleton className="h-[109px] w-full" />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
