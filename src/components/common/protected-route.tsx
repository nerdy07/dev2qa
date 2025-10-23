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
  const { user, hasPermission, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    // Check role-based access
    if (roles.length > 0) {
      const hasRequiredRole = requireAll 
        ? roles.every(role => user.role === role)
        : roles.includes(user.role);
      
      if (!hasRequiredRole) {
        router.push(redirectTo);
        return;
      }
    }

    // Check permission-based access
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
  }, [user, hasPermission, loading, router, permission, permissions, roles, requireAll, redirectTo]);

  if (loading) {
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
    return null;
  }

  return <>{children}</>;
}
