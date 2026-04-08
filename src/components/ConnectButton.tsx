// src/components/ConnectButton.tsx
'use client'
import { useConnect } from 'wagmi'

export function MetaMaskDefaultButton() {
  const { connect, connectors } = useConnect()

  const handleConnect = () => {
    // Look for the specific MetaMask connector we added in the config
    const mm = connectors.find((c) => c.id === 'io.metamask' || c.id === 'metaMaskSDK') 
               || connectors.find(c => c.id === 'injected');
    
    if (mm) {
      connect({ connector: mm })
    }
  }

  return (
    <button 
      onClick={handleConnect}
      className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-xl"
    >
      Connect MetaMask
    </button>
  )
}