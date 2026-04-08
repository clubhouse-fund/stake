'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Check for ChunkLoadError or SyntaxError (Unexpected token '<')
    if (
      error.name === 'ChunkLoadError' || 
      error.message.includes("Unexpected token '<'")
    ) {
      console.log("Chunk error detected. Refreshing...");
      window.location.reload();
    }
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ padding: '20px', textAlign: 'center', color: 'white', background: '#0f172a' }}>
          <h2>Something went wrong!</h2>
          <button onClick={() => reset()} style={{ padding: '10px 20px', cursor: 'pointer' }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}