'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ShieldX } from 'lucide-react';

interface PermissionGuardProps {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
  permissions?: string[];
}

export function PermissionGuard({ 
  permission, 
  children, 
  fallback,
  requireAll = false,
  permissions = []
}: PermissionGuardProps) {
  const { hasPermission } = useAuth();
  
  const hasRequiredPermission = () => {
    if (permissions.length > 0) {
      if (requireAll) {
        return permissions.every(p => hasPermission(p));
      } else {
        return permissions.some(p => hasPermission(p));
      }
    }
    return hasPermission(permission);
  };

  if (!hasRequiredPermission()) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Alert variant="destructive">
        <ShieldX className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have permission to access this feature.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

interface RoleGuardProps {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean;
}

export function RoleGuard({ 
  roles, 
  children, 
  fallback,
  requireAll = false 
}: RoleGuardProps) {
  const { hasRole } = useAuth();
  
  const hasRequiredRole = () => {
    if (requireAll) {
      return roles.every(role => hasRole(role));
    } else {
      return hasRole(roles);
    }
  };

  if (!hasRequiredRole()) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <Alert variant="destructive">
        <ShieldX className="h-4 w-4" />
        <AlertTitle>Access Denied</AlertTitle>
        <AlertDescription>
          You don't have the required role to access this feature.
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}
