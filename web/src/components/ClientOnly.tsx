'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * ClientOnly component - prevents hydration mismatches by only rendering
 * children after the component has mounted on the client.
 *
 * Use this for components that depend on:
 * - Browser-only APIs (window, localStorage)
 * - Wallet adapter context
 * - Dynamic state that differs between server and client
 *
 * The key insight: initial state must be the SAME on server and client.
 * We start with false (matches SSR), then useEffect sets it to true on client.
 */
export function ClientOnly({
  children,
  fallback = null
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  // Start with false - this matches what SSR renders
  // Then useEffect updates to true after hydration completes
  const [mounted, setMounted] = useState(false);

  // This is the recommended pattern for hydration-safe mounted detection
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return fallback;
  }

  return <>{children}</>;
}
