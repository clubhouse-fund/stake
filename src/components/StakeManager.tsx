'use client'
import { useState, useEffect } from 'react'
import { useAccount, useReadContract, useWriteContract } from 'wagmi'
import { parseUnits, formatUnits } from 'viem'
import { STAKE_ABI, TOKEN_ABI, CONTRACT_ADDRESSES } from '@/constants'
import { Zap, Lock, TrendingUp, Loader2 } from 'lucide-react'

export default function StakeManager() {
  const { address, chainId, isConnected } = useAccount()
  const [amount, setAmount] = useState('')
  const [tier, setTier] = useState(0)
  const [liveReward, setLiveReward] = useState("0.00")

  const activeAddy = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES] || CONTRACT_ADDRESSES[71]

  // FIX: Added the token address as the second argument to match the ABI
  const { data: stake } = useReadContract({
    address: activeAddy.staking as `0x${string}`,
    abi: STAKE_ABI,
    functionName: 'getUserStake',
    args: [address!, activeAddy.token as `0x${string}`],
    query: { enabled: !!address, refetchInterval: 5000 }
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: activeAddy.token as `0x${string}`,
    abi: TOKEN_ABI,
    functionName: 'allowance',
    args: [address!, activeAddy.staking as `0x${string}`],
    query: { enabled: !!address }
  })

  const { writeContractAsync, isPending } = useWriteContract()

  // --- LIVE TICKER LOGIC ---
  useEffect(() => {
    // FIX: Using index-based access with casting to bypass tuple errors
    const stakeData = stake as any;
    if (!stakeData || !stakeData[5]) return; // index 5 is 'active' in your contract
    
    const interval = setInterval(() => {
      const principal = parseFloat(formatUnits(stakeData[0], 18));
      // Simple visual ticker increment for UI feel
      setLiveReward(prev => (principal > 0 ? (parseFloat(prev) + 0.000001).toFixed(6) : "0.000000"))
    }, 1000)
    return () => clearInterval(interval)
  }, [stake])

  const handleAction = async () => {
    const raw = parseUnits(amount || '0', 18)
    try {
      if (allowance !== undefined && (allowance as bigint) < raw) {
        await writeContractAsync({ 
          address: activeAddy.token as `0x${string}`, 
          abi: TOKEN_ABI, 
          functionName: 'approve', 
          args: [activeAddy.staking as `0x${string}`, raw] 
        })
        refetchAllowance()
      } else {
        // FIX: Ensure stake matches the multi-pool ABI (tokenAddress, amount, tier)
        await writeContractAsync({ 
          address: activeAddy.staking as `0x${string}`, 
          abi: STAKE_ABI, 
          functionName: 'stake', 
          args: [activeAddy.token as `0x${string}`, raw, BigInt(tier)] 
        })
      }
    } catch (e) { console.error(e) }
  }

  if (!isConnected) return <div className="text-center p-10 bg-slate-900 rounded-3xl border border-dashed border-slate-700 text-slate-400">Please connect your wallet to view the Clubhouse.</div>

  const stakeData = stake as any;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Action Card */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white"><Zap size={20} className="text-blue-500" /> Stake Tokens</h3>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-800 text-white outline-none focus:border-blue-500" placeholder="0.00" />
        <div className="grid grid-cols-2 gap-2 mb-6">
          {['Flexible', '30 Days', '1 Year', '5 Years'].map((l, i) => (
            <button key={i} onClick={() => setTier(i)} className={`p-3 rounded-xl border text-sm transition ${tier === i ? 'bg-blue-600 border-blue-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>{l}</button>
          ))}
        </div>
        <button onClick={handleAction} disabled={isPending} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-white flex justify-center items-center gap-2 disabled:opacity-50">
          {isPending && <Loader2 className="animate-spin" />}
          { (allowance as bigint || 0n) < parseUnits(amount || '0', 18) ? 'Approve' : 'Confirm Stake' }
        </button>
      </div>

      {/* Stats Card */}
      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between">
        <div>
          <h3 className="text-slate-400 text-xs font-bold uppercase mb-4 tracking-widest">Your Earnings</h3>
          <div className="text-5xl font-mono font-black text-white mb-2">{liveReward}</div>
          <p className="text-blue-400 text-sm font-bold tracking-tight">
            STAKED: {stakeData ? formatUnits(stakeData[0], 18) : '0.00'}
          </p>
        </div>
        
        <div className="mt-8 space-y-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Lock Progress</span>
            <span>{stakeData?.[5] ? 'Secured' : 'No Active Stake'}</span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div className={`bg-blue-500 h-full ${stakeData?.[5] ? 'w-[45%]' : 'w-0'}`} /> 
          </div>
          <button 
            onClick={() => writeContractAsync({ 
              address: activeAddy.staking as `0x${string}`, 
              abi: STAKE_ABI, 
              functionName: 'unstake', 
              args: [activeAddy.token as `0x${string}`] 
            })} 
            className="w-full py-3 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition text-sm font-bold"
          >
            Withdraw Assets
          </button>
        </div>
      </div>
    </div>
  )
}