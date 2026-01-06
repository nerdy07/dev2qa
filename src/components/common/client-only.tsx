'use client';

import { useEffect, useState } from 'react';

/**
 * ClientOnly component that only renders its children on the client side
 * This prevents hydration mismatches for components that generate random IDs
 */
export function ClientOnly({ children, fallback = null }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
