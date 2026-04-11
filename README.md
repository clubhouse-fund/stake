# Clubhouse - Stake

**Empowering Community Consensus Through Verifiable Solvency. A pool-funded multi-token staking platform with insolvency protection and scalable reward accounting on Conflux.**

URL : https://conflux.clubhouse.fund/

<img width="968" height="777" alt="Screenshot 2026-04-11 at 5 11 06 PM" src="https://github.com/user-attachments/assets/2b6c2fc3-667a-40c9-83c7-3ed944dd90e0" />

## Overview

**Short description:** Clubhouse - Stake is a decentralized staking-as-a-service protocol designed to catalyze community consensus for AI agents, Memecoins, and IP-driven tokens. It solves the "hidden insolvency" issue found in traditional staking contracts by implementing a Net Liability accounting model, ensuring every reward is 100% backed by pool reserves. Unlike standard protocols, it offers a high-performance environment on Conflux eSpace that supports aggressive incentives (up to 400% Base APR) while maintaining total transparency. By leveraging Conflux, Clubhouse provides the sub-cent transaction fees and high throughput necessary for communities to scale their holding incentives without technical or financial friction.


-----

## 🏆 Hackathon Information

**Event:** Global Hackfest 2026  
**Focus Area:** Open Innovation - DeFi for community Consensus
**Team:** 0xClubhouse   


-----

## 👥 Team

| Name | Role | GitHub | Discord |
| :--- | :--- | :--- | :--- |
| 0xClubhouse | Lead Developer | @clubhouse-fund | @clubhouse.fund |
| Algebra | Smart Contract Eng | @algebra-520 | - |
| Eric Chan | Advisor| @ERC520 | @manekimeow |

-----
## 🚀 Problem Statement

Traditional staking rewards often suffer from three major flaws:

1.  **Fragmented Consensus:** In emerging sectors like **AI Agents**, **Memecoins**, **RWA**, and **DePIN**, communities lack a verifiable mechanism to align incentives, leading to "mercenary capital" and "pump-and-dump" cycles rather than collective growth.
2.  **Opaque Reserves:** Users often stake into pools without knowing if the project owner has deposited enough tokens to cover future liabilities, leading to "bank runs."
3.  **High Gas for Management:** Tracking thousands of stakers in a single pool often leads to Gas DoS (Denial of Service) when trying to view or manage data.

**Why it matters:** Insecure, inefficient, or unaligned staking drains ecosystem trust and discourages long-term holding.
**Blockchain Solution:** Clubhouse - Stake uses a "Reserved Reward" logic where the contract mathematically prevents new stakes if the pool's balance doesn't cover the principal plus the *entire* future reward liability. This creates a hard-coded "Proof of Solvency" that ensures community consensus is backed by verifiable math, not just social hype.



-----

## 💡 Solution

Clubhouse - Stake introduces a robust "Multi-Stake" architecture:

  * **Net Liability Accounting:** The `getAvailableRewards` function calculates (Balance - [Total Principal + Net Promised Rewards]). This ensures the pool is always solvent.
  * **Scalable Enumeration:** Uses OpenZeppelin’s `EnumerableSet` and custom index tracking to allow the frontend to fetch thousands of staker positions via pagination without hitting gas limits.
  * **Tiered Multipliers:** Encourages long-term commitment (from 1 hour to 5 years) with multipliers that scale the 400% Base APR.
  * **Platform Sustainability:** A 5% platform fee is automatically routed to the platform wallet upon staking, creating a sustainable revenue model for the protocol.

### Go-to-Market Plan

  * **Target:** Emerging projects on Conflux looking to offer staking without writing their own audited code.
  * **Growth:** Partner with Conflux-based DEXs to provide "Staking Hub" visibility.
  * **Metrics:** We track Total Value Locked (TVL), Number of Active Pools, and the Reward Coverage Ratio.

-----

## ⚡ Conflux Integration

  * **eSpace** - Fully deployed on Conflux eSpace to take advantage of Ethereum compatibility while benefiting from Conflux's superior throughput.



-----

## ✨ Features

### Core Features

  * **Multi-Token Support** - Any ERC20/CRC20 token can have a dedicated staking pool.
  * **Tiered Locking** - 7 distinct time tiers ranging from 1 hour to 5 years.
  * **Intermediate Claims** - Users in 30+ day tiers can claim accrued rewards every 30 days without breaking their lock.

### Advanced Features

  * **Insolvency Guard** - The contract rejects new stakers if the manager hasn't deposited enough rewards to cover the "Max Potential Payout."


-----

## 🛠️ Technology Stack

  * **Frontend:** Next.js 14, Tailwind CSS, Shadcn UI.
  * **Web3 Integration:** Ethers.js, Wagmi, ConnectKit.
  * **Blockchain:** Solidity 0.8.30, Hardhat, Conflux eSpace.
  

-----

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Provider      │    │   Blockchain    │
│   (Next.js)     │◄──►│   (RPC/Wagmi)   │◄──►│   (Conflux eSpace)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                                               │
         ▼                                               ▼
┌─────────────────┐                           ┌─────────────────────┐
│  User Dashboard │                           │ ClubhouseMultiStake │
└─────────────────┘                           └─────────────────────┘
```

**Data Flow:** The frontend queries the `getRegisteredTokens` function with pagination. When a user stakes, the contract calculates the `userMaxReward`, transfers the 5% of the yield as platform fee to the `platformWallet`, and locks the principal.

-----

## 🚀 Installation & Setup

## 💻 Frontend Setup (Next.js)

The frontend is built with Next.js and requires Node.js environment variables to interact with the blockchain.

1. **Clone the Repository**
   ```bash
   git clone [https://github.com/clubhouse-fund/stake.git](https://github.com/clubhouse-fund/stake.git)
   cd stake
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   Create a `.env.local` file in the root directory and add your contract addresses and RPC URLs:
   ```bash
   cp .env.example .env.local
   ```

4. **Launch Development Server**
   ```bash
   npm run dev
   ```
   > The application will be available at **http://localhost:3000**

---

## 📜 Smart Contract Deployment (Hardhat)

If you need to deploy new instances of the staking contracts to the **Conflux Testnet**, follow these steps.

1. **Compile Contracts**
   Ensure your Solidity files are valid and generate the necessary artifacts:
   ```bash
   npx hardhat compile
   ```

2. **Set Up Deployer Wallet**
   Ensure your `.env` file contains a valid `PRIVATE_KEY` with sufficient testnet CFX for gas fees.

3. **Deploy to Conflux Testnet**
   *Note: If a specific script is missing, you may need to create `scripts/deploy.js` or use the existing deployment task.*
   ```bash
   npx hardhat run scripts/deploy.js --network confluxTestnet
   ```

4. **Update Frontend Constants**
   Once deployed, copy the **Contract Address** from your terminal and paste it into your frontend configuration file (usually found in `constants/index.js` or `.env.local`).

---

## 🛠️ Tech Stack
* **Frontend:** Next.js, React, Tailwind CSS
* **Blockchain:** Solidity, Hardhat
* **Network:** Conflux eSpace (Testnet/Mainnet)
```

---

### 💡 Pro-Tips for your README:
* **The "Missing Script" Fix:** Since you noticed `scripts/deploy.js` might be missing in the repo, I added a note in step 3. If you find the actual deployment file is named something like `deploy-stake.js`, just update that line in the README.
* **Webpack Note:** Since your `package.json` uses the `--webpack` flag in the dev script, make sure whoever uses this code has a compatible Node.js version (v16 or v18 is usually safest for older Webpack-linked Next.js projects).
```



-----

## 📱 Usage

### For Pool Managers

1.  **Create Pool:** Call `createPool(tokenAddress)`.
2.  **Fund Rewards:** Call `depositRewards` with the amount of tokens you want to distribute.
3.  **Monitor:** Use the dashboard to check "Available Rewards" to ensure your pool stays open for new stakers.

### For Stakers

1.  **Connect:** Use Fluent or MetaMask on Conflux eSpace.
2.  **Stake:** Select a tier (e.g., 90 days for 2x multiplier).
3.  **Claim/Unstake:** Claim rewards every 30 days or withdraw everything once the timer expires.

-----

## 📄 Smart Contracts

### Testnet (Conflux eSpace)

| Network | Contract | Address | Explorer |
| :---| :--- | :--- | :--- |
| Conflux Testnet | ClubhouseMultiStake | `0xef34dcc94f44ddc0f0e6e323297935916ed26062` | [View on ConfluxScan]([https://evmtestnet.confluxscan.org/address/0xef34dcc94f44ddc0f0e6e323297935916ed26062]https://evmtestnet.confluxscan.org/address/0xef34dcc94f44ddc0f0e6e323297935916ed26062) |

| Conflux eSpace | ClubhouseMultiStake | `0xd191bd6672842982be9dc685fa6bbcd746afea4b` | [View on ConfluxScan]([https://evmtestnet.confluxscan.org/address/0xef34dcc94f44ddc0f0e6e323297935916ed26062](https://evm.confluxscan.org/address/0xd191bd6672842982be9dc685fa6bbcd746afea4b)) |



-----

## 🗺️ Roadmap: The Evolution of Yield

### **Phase 1: Foundation ✅**
* **Core Staking Logic:** Secure vaulting for native and multi-token assets.
* **Multi-Token Support:** Support for CFX, ETH, and major stablecoins.
* **Net Liability Accounting:** Transparent, real-time tracking of protocol TVL vs. user obligations.

### **Phase 2: Liquid Restaking & Yield Synergy 🚀**
* **LST Integration (Lido/RocketPool):** Users can stake Liquid Staking Tokens (like `stETH`) to earn Clubhouse rewards *on top* of their base 3-4% ETH yield.
* **The "Yield Pass-Through":** Automatically route idle vault assets into Lido or Aave to ensure 0% of user capital is "lazy." 
* **Automated Strategy Vaults:** "Set-and-forget" vaults that automatically move capital between the highest-yielding Conflux and Ethereum pools.

### **Phase 3: The Omni-Governance Endgame 💎**
* **Dynamic APR Markets:** Instead of a fixed `BASE_APR`, CH-STAKE holders vote weekly on "Yield Gauges" to direct rewards to specific pools (similar to the Curve/Convex model).
* **Staking-as-Collateral (SaC):** Enable users to mint a synthetic stablecoin or borrow against their staked position without unstaking (Liquid Restaking).
* **AI-Driven Risk Mitigation:** Integration of an on-chain AI agent that monitors liquidations and protocol health, automatically adjusting safety modules during market volatility.
* **RWA Bridge:** Integration with Real-World Assets (RWAs) to back the CH-STAKE treasury with yield-bearing treasury bills for "Real Yield" sustainability.



-----

## 📄 License

This project is licensed under the **MIT License**.

Built with ❤️ for **Global Hackfest 2026**
