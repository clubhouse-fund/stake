'use client'

import { useEffect } from 'react'

export default function VersionProtector() {
  useEffect(() => {
    const handleChunkError = (e: ErrorEvent | PromiseRejectionEvent) => {
      // Look for the specific symptoms of a version mismatch
      const message = 'message' in e ? e.message : (e.reason?.message || "");
      
      if (message.includes("ChunkLoadError") || message.includes("Unexpected token '<'")) {
        const now = Date.now();
        const lastReload = sessionStorage.getItem('pwa_force_reload');
        
        // Safety: don't loop if the error persists
        if (!lastReload || (now - parseInt(lastReload) > 10000)) {
          sessionStorage.setItem('pwa_force_reload', now.toString());
          
          // FORCE RELOAD: We add a dummy query param (?v=...) 
          // to bypass the Service Worker/Browser cache entirely.
          const url = new URL(window.location.href);
          url.searchParams.set('v', now.toString());
          window.location.replace(url.toString());
        }
      }
    };

    window.addEventListener('error', handleChunkError);
    window.addEventListener('unhandledrejection', handleChunkError);
    
    return () => {
      window.removeEventListener('error', handleChunkError);
      window.removeEventListener('unhandledrejection', handleChunkError);
    };
  }, []);

  return null;
}