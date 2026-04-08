import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { defineChain, type AppKitNetwork } from '@reown/appkit/networks'
import { createStorage, http } from 'wagmi'

export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID!

export const confluxMainnet = defineChain({
  id: 1030,
  caipNetworkId: 'eip155:1030',
  chainNamespace: 'eip155',
  name: 'Conflux eSpace',
  nativeCurrency: { name: 'Conflux', symbol: 'CFX', decimals: 18 },
  rpcUrls: { default: { http: ['https://evm.confluxrpc.com'] } },
  blockExplorers: { default: { name: 'ConfluxScan', url: 'https://evm.confluxscan.net' } },
})

export const confluxTestnet = defineChain({
  id: 71,
  caipNetworkId: 'eip155:71',
  chainNamespace: 'eip155',
  name: 'Conflux Testnet',
  nativeCurrency: { name: 'Conflux', symbol: 'CFX', decimals: 18 },
  rpcUrls: { default: { http: ['https://evmtestnet.confluxrpc.com'] } },
  blockExplorers: { default: { name: 'ConfluxScan', url: 'https://evmtestnet.confluxscan.net' } },
})

export const networks = [confluxMainnet, confluxTestnet] as [AppKitNetwork, ...AppKitNetwork[]]

// The redirect metadata must be clean for mobile handshake
export const metadata = {
  name: 'Clubhouse Staking',
  description: 'Premium Staking Protocol',
  url: 'https://stake.clubhouse.fund', 
  icons: ['https://stake.clubhouse.fund/apple-touch-icon.png'],
  redirect: {
    native: 'clubhouse://', // Simpler scheme is safer for iOS/Android
    universal: 'https://stake.clubhouse.fund'
  }
}

export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: typeof window !== 'undefined' ? window.localStorage : undefined
  }),
  ssr: false, 
  projectId,
  networks,
  // NO MANUAL CONNECTORS HERE - Reown adds them automatically!
  transports: {
    [1030]: http('https://evm.confluxrpc.com'),
    [71]: http('https://evmtestnet.confluxrpc.com'),
  }
})

export const config = wagmiAdapter.wagmiConfig