// src/app/layout.tsx
// REMOVED 'use client' FROM HERE

import React from 'react'
import Web3Provider from '@/context'
import VersionProtector from '@/components/VersionProtector'
import './globals.css'

export const metadata = {
  title: 'Clubhouse Staking',
  description: 'Premium Staking Protocol',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Clubhouse',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  themeColor: '#020617',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#020617] antialiased selection:bg-blue-500/30">
        {/* This client component handles the auto-refresh logic safely */}
        <VersionProtector /> 
        
        <Web3Provider>
          <div className="min-h-screen flex flex-col overflow-x-hidden"> 
            <main className="flex-grow">
              {children}
            </main>
          </div>
        </Web3Provider>
      </body>
    </html>
  )
}