import { WagmiAdapter } from '@reown/appkit-adapter-wagmi'
import { arbitrum, base, bsc, defineChain } from '@reown/appkit/networks'
import { cookieStorage, createStorage, http } from 'wagmi'

// 1. Get your Project ID
export const projectId = process.env.NEXT_PUBLIC_PROJECT_ID

if (!projectId) {
  throw new Error('Project ID is not defined. Check your .env.local file.')
}

// 2. Custom Chain Definition: Conflux eSpace (Mainnet)
export const confluxMainnet = defineChain({
  id: 1030,
  caipNetworkId: 'eip155:1030',
  chainNamespace: 'eip155',
  name: 'Conflux eSpace',
  nativeCurrency: {
    name: 'Conflux',
    symbol: 'CFX',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://evm.confluxrpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ConfluxScan',
      url: 'https://evm.confluxscan.net',
    },
  },
})

// 3. Custom Chain Definition: Conflux eSpace Testnet
export const confluxTestnet = defineChain({
  id: 71,
  caipNetworkId: 'eip155:71',
  chainNamespace: 'eip155',
  name: 'Conflux Testnet',
  nativeCurrency: {
    name: 'Conflux',
    symbol: 'CFX',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://evmtestnet.confluxrpc.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'ConfluxScan',
      url: 'https://evmtestnet.confluxscan.net',
    },
  },
})

// 4. Combine all networks
export const networks = [
  base, 
  confluxMainnet, 
  confluxTestnet, 
  bsc, 
  arbitrum
]

// 5. Set up the Wagmi Adapter
// REMOVED 'features' from here as it caused the Type Error
export const wagmiAdapter = new WagmiAdapter({
  storage: createStorage({
    storage: cookieStorage
  }),
  ssr: true,
  projectId,
  networks,
  transports: {
    [base.id]: http(),
    [confluxMainnet.id]: http('https://evm.confluxrpc.com'),
    [confluxTestnet.id]: http('https://evmtestnet.confluxrpc.com'),
    [bsc.id]: http(),
    [arbitrum.id]: http(),
  }
})

// 6. Export the wagmi config for use in WagmiProvider
export const config = wagmiAdapter.wagmiConfig

// 7. Export features separately (Use these in your createAppKit call in your Provider file)
export const appKitFeatures = {
  analytics: true,
  email: false,
  socials: [],
  emailShowWallets: true,
}