'use client'

import React, { ReactNode, useState, useEffect } from 'react'
import { wagmiAdapter, config, projectId, networks, metadata } from '@/config' 
import { createAppKit } from '@reown/appkit/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
    },
  },
})

createAppKit({
  adapters: [wagmiAdapter],
  networks, 
  projectId,
  metadata, // Imported from config.ts to ensure they are identical
  themeMode: 'dark',
  allWallets: 'SHOW', 
  
  // Logic to prevent "extension-searching" on mobile
  enableWalletConnect: true, 
  enableInjected: typeof window !== 'undefined' && !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent),

  featuredWalletIds: [
    'c5333199c36784345064865604e3f6317069e74ed3533829041d49a74c603125', // MetaMask
    'fd20dc426fb37566d803205b19bbc1d4096b248ac04545e350dd3afb78884f0e', // Coinbase
    '4622a2b2d6ad131920786df757913386ec9a65664320950337839ed04f2162a8', // Trust
  ],

  themeVariables: {
    '--w3m-z-index': 9999,
    '--w3m-accent': '#FFD700',
    '--w3m-color-mix': '#020617',
    '--w3m-color-mix-strength': 40,
    '--w3m-border-radius-master': '10px',
  },

  features: {
    analytics: true,
    email: false, 
    socials: false,
    swaps: false,
    onramp: false,
  }
})

export default function Web3Provider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>
        <div className={`transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
          {mounted ? children : (
             <div className="fixed inset-0 bg-[#020617] flex items-center justify-center z-[9999]">
               <div className="w-12 h-12 border-4 border-[#FFD700]/20 border-t-[#FFD700] rounded-full animate-spin" />
             </div>
          )}
        </div>
      </QueryClientProvider>
    </WagmiProvider>
  )
}