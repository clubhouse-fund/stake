// app/manifest.ts
import { MetadataRoute } from 'next'

// ADD THIS LINE: This tells the static exporter to bake this file into the build
export const dynamic = 'force-static'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Clubhouse Staking',
    short_name: 'Clubhouse',
    description: 'Premium Web3 Staking Protocol',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#FFD700',
    icons: [
      {
        src: '/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ],
  }
}