'use client'

import React, { useState, useEffect, useMemo, useRef, Suspense } from 'react'
import { parseUnits, formatUnits, maxUint256 } from 'viem'
import { 
  useAccount, useReadContract, useWriteContract, 
  useWaitForTransactionReceipt, useChainId
} from 'wagmi'
import { isAddress } from 'viem'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  ShieldCheck, Loader2, Rocket, Landmark, 
  Coins, ArrowRightLeft, ExternalLink, X, 
  CheckCircle, Wallet, Clock, Star, Lock, Timer, PlusCircle, ChevronLeft, Copy,
  Users, Share2, Info,  Search, Check, AlertCircle, Vault
} from 'lucide-react'

import { STAKING_ABI, ERC20_ABI, CONTRACT_ADDRESSES } from '@/constants'
import Navbar from '@/components/Navbar'

const STAKING_TIERS = [
  { label: 'Flexible', duration: '1 Hour', apr: '4%', index: 0, multiplier: '1.00x' },
  { label: 'Starter', duration: '7 Days', apr: '4.8%', index: 1, multiplier: '1.20x' },
  { label: 'Growth', duration: '30 Days', apr: '6%', index: 2, multiplier: '1.50x' },
  { label: 'Quarterly', duration: '90 Days', apr: '8%', index: 3, multiplier: '2.00x' },
  { label: 'Yearly', duration: '1 Year', apr: '12%', index: 4, multiplier: '3.00x' },
  { label: 'Loyalty', duration: '3 Years', apr: '18%', index: 5, multiplier: '4.50x' },
  { label: 'Legendary', duration: '5 Years', apr: '24%', index: 6, multiplier: '6.00x' },
]

const BASE_APR = 400n; 
const SECONDS_IN_YEAR = 31536000n;
const BPS_DIVISOR = 1000000n; 
const MIN_CLAIM_INTERVAL = 2592000; 

function StakingPageContent() {
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'stake' | 'create'>('stake')
  const { address } = useAccount()
  const chainId = useChainId()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [searchInput, setSearchInput] = useState('')
  const [searchError, setSearchError] = useState(false)
  
  const [selectedTokenAddr, setSelectedTokenAddr] = useState<string>('')
  const [stakeAmount, setStakeAmount] = useState('')
  const [adminAmount, setAdminAmount] = useState('')
  const [newTokenAddress, setNewTokenAddress] = useState('')
  const [selectedTier, setSelectedTier] = useState(0)
  const [lastActionType, setLastActionType] = useState<'stake' | 'deposit' | 'approve' | 'create' | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [mgmtMode, setMgmtMode] = useState<'deposit' | 'withdraw'>('deposit')

  const [liveYield, setLiveYield] = useState<bigint>(0n)
  const [liveCountdown, setLiveCountdown] = useState<number>(0)
  const [liveUnstakeCountdown, setLiveUnstakeCountdown] = useState<number>(0)

  const [txPopup, setTxPopup] = useState<{show: boolean, hash: string, status: 'pending' | 'success' | 'error'}>({ 
    show: false, hash: '', status: 'pending' 
  })

  const activeConfig = (CONTRACT_ADDRESSES as any)[chainId] || CONTRACT_ADDRESSES[71]
  const STAKING_CONTRACT = activeConfig.staking as `0x${string}`
  const EXPLORER_URL = activeConfig.explorer || 'https://evmtestnet.confluxscan.org/tx'
  const EXPLORER_ADDRESS_URL = EXPLORER_URL.replace('/tx', '/address')

  // --- CONTRACT READS ---
  const { data: registeredTokensResult, refetch: refetchPoolList } = useReadContract({
    address: STAKING_CONTRACT, 
    abi: STAKING_ABI, 
    functionName: 'getRegisteredTokens',
    args: [0n, 500n] 
  })

  const registeredPools = useMemo(() => {
    return (registeredTokensResult as any)?.[0] || []
  }, [registeredTokensResult])

  const currentPoolData = useMemo(() => {
    return (registeredPools as any[]).find(p => p.tokenAddress.toLowerCase() === selectedTokenAddr.toLowerCase())
  }, [registeredPools, selectedTokenAddr])

  useEffect(() => {
    const poolAddrParam = searchParams.get('pool')
    if (poolAddrParam && registeredPools.length > 0) {
      const matchingPool = (registeredPools as any[]).find(
        (p: any) => p.tokenAddress.toLowerCase() === poolAddrParam.toLowerCase()
      )
      if (matchingPool) {
        setSelectedTokenAddr(matchingPool.tokenAddress)
        setActiveTab('stake')
      }
    }
  }, [searchParams, registeredPools])

  const { data: poolInfo, refetch: refetchPool } = useReadContract({
    address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'pools', args: [selectedTokenAddr as `0x${string}`],
    query: { enabled: !!selectedTokenAddr }
  })

  const { data: availableRewards, refetch: refetchAvailable } = useReadContract({
    address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'getAvailableRewards', args: [selectedTokenAddr as `0x${string}`],
    query: { enabled: !!selectedTokenAddr }
  })

  const { data: userStake, refetch: refetchUser } = useReadContract({
    address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'getUserStake',
    args: [address as `0x${string}`, selectedTokenAddr as `0x${string}`],
    query: { enabled: !!address && !!selectedTokenAddr }
  })

  const { data: rawStakeData, refetch: refetchRaw } = useReadContract({
    address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'userStakes',
    args: [address as `0x${string}`, selectedTokenAddr as `0x${string}`],
    query: { enabled: !!address && !!selectedTokenAddr }
  })

  const { data: userBalance, refetch: refetchBalance } = useReadContract({
    address: selectedTokenAddr as `0x${string}`, abi: ERC20_ABI, functionName: 'balanceOf', args: [address as `0x${string}`],
    query: { enabled: !!address && !!selectedTokenAddr }
  })

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: selectedTokenAddr as `0x${string}`, abi: ERC20_ABI, functionName: 'allowance', 
    args: [address as `0x${string}`, STAKING_CONTRACT],
    query: { enabled: !!address && !!selectedTokenAddr }
  })

  const { data: poolPositionsResult, refetch: refetchPositions } = useReadContract({
    address: STAKING_CONTRACT,
    abi: STAKING_ABI,
    functionName: 'getPoolPositionsByToken',
    args: [selectedTokenAddr as `0x${string}`],
    query: { enabled: !!selectedTokenAddr }
  })

  const poolPositions = useMemo(() => {
    return (poolPositionsResult as any) || []
  }, [poolPositionsResult])

  const { writeContract, data: hash, error: writeError, isPending: isWriting } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash })

  useEffect(() => {
    const timer = setInterval(() => {
      if (!rawStakeData || !userStake) return;
      const amount = BigInt((rawStakeData as any)[0]);
      const lastClaimTime = Number((rawStakeData as any)[2]);
      const lockDuration = Number((rawStakeData as any)[3]);
      const multiplier = BigInt((rawStakeData as any)[4]);
      const startTime = Number((rawStakeData as any)[1]);
      const now = Math.floor(Date.now() / 1000);
      const end = startTime + lockDuration;
      const calcTime = now > end ? end : now;
      if (calcTime > lastClaimTime) {
        const elapsed = BigInt(calcTime - lastClaimTime);
        const earned = (amount * BASE_APR * multiplier * elapsed) / (SECONDS_IN_YEAR * 1000000n);
        setLiveYield(earned);
      } else {
        setLiveYield(0n);
      }
      const nextClaim = lastClaimTime + MIN_CLAIM_INTERVAL;
      setLiveCountdown(nextClaim - now > 0 ? nextClaim - now : 0);
      setLiveUnstakeCountdown(end - now > 0 ? end - now : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [rawStakeData, userStake]);

  const currentSymbol = useMemo(() => currentPoolData?.symbol || 'TOKEN', [currentPoolData]);
  const isManager = useMemo(() => {
    if (!poolInfo || !address) return false;
    const manager = (poolInfo as any)[0];
    return manager?.toLowerCase() === address.toLowerCase();
  }, [poolInfo, address]);

  const isLoading = isWriting || isConfirming
  const isEligibleForHarvest = useMemo(() => {
    if (!rawStakeData) return false;
    const lockDuration = Number((rawStakeData as any)[3]);
    return lockDuration >= 2592000;
  }, [rawStakeData]);

  useEffect(() => {
    const poolParam = searchParams.get('pool')
    if (registeredPools && registeredPools.length > 0 && !selectedTokenAddr && !poolParam) {
      setSelectedTokenAddr((registeredPools as any[])[0].tokenAddress)
    }
  }, [registeredPools, selectedTokenAddr, searchParams])

  useEffect(() => {
    if (hash) setTxPopup({ show: true, hash, status: 'pending' })
    if (writeError) setTxPopup({ show: true, hash: '', status: 'error' })
  }, [hash, writeError])

  useEffect(() => {
    if (isConfirmed) {
      setTxPopup(prev => ({ ...prev, status: 'success' }))
      refetchPool(); refetchUser(); refetchAllowance(); refetchBalance(); refetchPoolList(); refetchAvailable(); refetchRaw(); refetchPositions();
      if (lastActionType === 'deposit' && activeTab === 'create') {
        setTimeout(() => { setActiveTab('stake'); setAdminAmount(''); }, 1500);
      }
      if (lastActionType === 'stake') setStakeAmount('');
      if (lastActionType === 'deposit' && activeTab === 'stake') setAdminAmount('');
      setTimeout(() => setTxPopup({ show: false, hash: '', status: 'pending' }), 5000)
    }
  }, [isConfirmed, lastActionType, activeTab])

  const handleAction = (type: 'stake' | 'deposit') => {
    const amountStr = type === 'stake' ? stakeAmount : adminAmount
    if (!amountStr || parseFloat(amountStr) <= 0) return
    const amountParsed = parseUnits(amountStr, 18)
    if (allowance !== undefined && (allowance as bigint) < amountParsed) {
      setLastActionType('approve');
      writeContract({ address: selectedTokenAddr as `0x${string}`, abi: ERC20_ABI, functionName: 'approve', args: [STAKING_CONTRACT, maxUint256] })
    } else {
      setLastActionType(type);
      if (type === 'stake') {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'stake', args: [selectedTokenAddr as `0x${string}`, amountParsed, BigInt(selectedTier)] })
      } else {
        writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'depositRewards', args: [selectedTokenAddr as `0x${string}`, amountParsed] })
      }
    }
  }

  const formatCountdown = (sec: number) => {
    if (sec <= 0) return "00m 00s";
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    return `${m}m ${s}s`;
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAddress(searchInput)) return
    router.push(`/?pool=${searchInput.toLowerCase()}`)
    setSearchInput('')
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?pool=${selectedTokenAddr.toLowerCase()}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const cardStyle = isDarkMode ? "bg-slate-900/60 border-white/5" : "bg-white border-slate-200 shadow-sm"
  const inputStyle = isDarkMode ? "bg-black/40 border-white/10 text-white" : "bg-slate-100 border-slate-200"

  // Fix: Safe access to tuple for TypeScript
  const userHasStake = Boolean(userStake && (userStake as any)[4]);

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-[#020617] text-slate-200" : "bg-[#f8fafc] text-slate-900"}`}>
      <Navbar isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />

      {txPopup.show && (
        <div className="fixed bottom-4 right-4 left-4 md:left-auto md:bottom-6 md:right-6 z-50 animate-in slide-in-from-bottom-4">
          <div className={`p-5 md:p-6 rounded-[2rem] border shadow-2xl flex items-center gap-4 ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
            {txPopup.status === 'pending' ? <Loader2 className="animate-spin text-blue-500" /> : <CheckCircle className="text-green-500" />}
            <div className="pr-4 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest opacity-50">{txPopup.status === 'pending' ? 'Broadcasting' : 'Confirmed'}</p>
              <a href={`${EXPLORER_URL}/${txPopup.hash}`} target="_blank" className="text-xs font-bold text-blue-500 flex items-center gap-1">VIEW TX <ExternalLink size={12}/></a>
            </div>
            <button onClick={() => setTxPopup(p => ({...p, show: false}))} className="p-1 opacity-50 hover:opacity-100"><X size={16}/></button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto pt-20 md:pt-25 pb-20 px-4 md:px-6">
        
        <div className="space-y-3 mb-8">
            <div className={`p-1 rounded-[1.5rem] md:rounded-[2rem] border flex items-center flex-nowrap gap-2 overflow-hidden ${cardStyle}`}>
                <div className={`flex p-1 rounded-xl bg-black/5 dark:bg-white/5 shrink-0`}>
                    <button onClick={() => setActiveTab('stake')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase transition-all ${activeTab === 'stake' ? 'bg-black text-white shadow-lg' : 'opacity-40'}`}>Stake</button>
                    <button onClick={() => setActiveTab('create')} className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg font-black text-[9px] md:text-[10px] uppercase transition-all ${activeTab === 'create' ? 'bg-black text-white shadow-lg' : 'opacity-40'}`}>Create</button>
                </div>
                <div className="h-6 w-px bg-slate-500/20 mx-1 shrink-0" />
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar flex-1 pb-1 md:pb-0">
                    <div className="flex items-center gap-2 px-2 shrink-0">
                        <Coins size={14} className="text-blue-500" />
                    </div>
                    {(registeredPools as any[])?.map((pool: any) => (
                        <button 
                            key={pool.tokenAddress} 
                            onClick={() => { 
                                setSelectedTokenAddr(pool.tokenAddress); 
                                setActiveTab('stake');
                                router.push(`/?pool=${pool.tokenAddress.toLowerCase()}`); 
                            }} 
                            className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg font-bold text-[10px] md:text-xs transition-all whitespace-nowrap flex items-center gap-2 ${selectedTokenAddr.toLowerCase() === pool.tokenAddress.toLowerCase() ? 'bg-blue-600 text-white' : 'hover:bg-blue-500/10 opacity-60'}`}
                        >
                            {pool.symbol}
                            {pool.poolManager?.toLowerCase() === address?.toLowerCase() && <Star size={10} className="fill-yellow-400 text-yellow-400" />}
                        </button>
                    ))}
                </div>
            </div>

            {selectedTokenAddr && (
              <div className={`p-3 md:p-4 rounded-[1.5rem] md:rounded-[2.5rem] border flex flex-col lg:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 ${cardStyle}`}>
                  <div className="flex flex-col md:flex-row items-center gap-3 w-full lg:w-auto">
                      <div className={`flex items-center gap-4 px-4 py-2 md:py-3 rounded-2xl border ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-100'} w-full md:w-auto`}>
                          <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                                  <Lock size={16} strokeWidth={2.5} />
                              </div>
                              <div>
                                  <p className="text-[8px] font-black opacity-40 uppercase tracking-widest leading-none mb-1">Active Pool</p>
                                  <p className="text-[11px] font-bold truncate max-w-[120px] md:max-w-none">{currentSymbol}</p>
                              </div>
                          </div>
                          <div className="h-6 w-px bg-slate-500/10" />
                          <div>
                              <p className="text-[8px] font-black opacity-40 uppercase tracking-widest leading-none mb-1">Contract Address</p>
                              <div className="flex items-center gap-2">
                                  <p className="text-[10px] font-mono font-bold opacity-80">{selectedTokenAddr.slice(0, 6)}...{selectedTokenAddr.slice(-4)}</p>
                                  <button onClick={() => navigator.clipboard.writeText(selectedTokenAddr)} className="opacity-40 hover:opacity-100 transition-all">
                                      <Copy size={12} />
                                  </button>
                              </div>
                          </div>
                      </div>
                      <button 
                          onClick={handleCopyLink}
                          className={`w-full md:w-auto px-6 py-3 md:py-4 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-[10px] uppercase tracking-wider shrink-0 ${copiedLink ? 'bg-green-500 text-white' : 'bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white border border-blue-500/20'}`}
                      >
                          {copiedLink ? <CheckCircle size={14} /> : <Share2 size={14} />}
                          {copiedLink ? 'Link Copied!' : 'Share'}
                      </button>
                  </div>
                  <div className="w-full lg:w-auto lg:min-w-[380px] shrink-0">
                    <form onSubmit={handleSearch} className="relative flex items-center group w-full">
                      <Search size={14} className="absolute left-4 text-blue-500 opacity-50" />
                      <input 
                        type="text" 
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        placeholder="Pool 0xAddress..."
                        className={`w-full py-3 md:py-4 pl-11 pr-4 rounded-2xl text-[11px] md:text-xs font-bold outline-none transition-all border ${
                          isDarkMode 
                            ? 'bg-black/40 border-white/10 focus:border-blue-500/50 focus:bg-white/10' 
                            : 'bg-white border-slate-200 focus:border-blue-500/50 shadow-sm'
                        }`}
                      />
                    </form>
                  </div>
              </div>
            )}
        </div>

        {activeTab === 'stake' ? (
          <>
            {isManager && (
              <div className="mb-8 p-6 md:p-8 border border-blue-500/20 rounded-[2rem] md:rounded-[3rem] bg-blue-600/5 backdrop-blur-md">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Landmark size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm md:text-base font-black uppercase italic leading-none">Pool Management</h3>
                            <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Admin Control Panel</p>
                        </div>
                    </div>
                    <div className="flex p-1 rounded-xl bg-black/10 dark:bg-white/5 w-full md:w-auto">
                        <button 
                            onClick={() => { setMgmtMode('deposit'); setAdminAmount(''); }}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${mgmtMode === 'deposit' ? 'bg-blue-600 text-white shadow-md' : 'opacity-40'}`}
                        >
                            Deposit
                        </button>
                        <button 
                            onClick={() => { setMgmtMode('withdraw'); setAdminAmount(''); }}
                            className={`flex-1 md:flex-none px-6 py-2 rounded-lg font-black text-[10px] uppercase transition-all ${mgmtMode === 'withdraw' ? 'bg-slate-800 text-white shadow-md' : 'opacity-40'}`}
                        >
                            Withdraw
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className={`md:col-span-8 flex items-center px-4 md:px-6 rounded-2xl border ${inputStyle} transition-all`}>
                    <div className="flex-1">
                        <p className="text-[9px] font-black opacity-30 uppercase mb-[-4px]">
                            {mgmtMode === 'deposit' ? 'Your Wallet Balance' : 'Idle Reward Pool'}
                        </p>
                        <input 
                            type="number" 
                            value={adminAmount} 
                            onChange={(e) => setAdminAmount(e.target.value)} 
                            placeholder="0.00" 
                            className="w-full bg-transparent py-4 md:py-5 outline-none font-bold text-lg md:text-2xl" 
                        />
                    </div>
                    <button 
                        onClick={() => {
                            const maxVal = mgmtMode === 'deposit' 
                                ? formatUnits(userBalance || 0n, 18) 
                                : formatUnits(availableRewards as bigint || 0n, 18);
                            setAdminAmount(maxVal);
                        }} 
                        className="text-[9px] font-black bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                    >
                        MAX
                    </button>
                  </div>

                  {mgmtMode === 'deposit' ? (
                    <button 
                        onClick={() => handleAction('deposit')} 
                        disabled={isLoading || !adminAmount} 
                        className="md:col-span-4 h-16 md:h-auto bg-blue-600 text-white rounded-2xl font-black uppercase text-xs hover:bg-blue-500 flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : (
                            allowance !== undefined && (allowance as bigint) < parseUnits(adminAmount || '0', 18) 
                            ? 'Approve & Deposit' 
                            : 'Confirm Deposit'
                        )}
                    </button>
                  ) : (
                    <button 
                        onClick={() => writeContract({ 
                            address: STAKING_CONTRACT, 
                            abi: STAKING_ABI, 
                            functionName: 'withdrawUnallocated', 
                            args: [selectedTokenAddr as `0x${string}`, parseUnits(adminAmount || '0', 18)] 
                        })} 
                        disabled={isLoading || !adminAmount}
                        className="md:col-span-4 h-16 md:h-auto bg-slate-800 text-white rounded-2xl font-black uppercase text-xs hover:bg-slate-700 flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
                    >
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Withdraw Balance'}
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-8 md:mb-10">
              <StatCard label="TVL" value={formatUnits((poolInfo as any)?.[2] || 0n, 18)} sub={currentSymbol} cardStyle={cardStyle} />
              <StatCard label="Reserved" value={formatUnits((poolInfo as any)?.[3] || 0n, 18)} sub="Claims" cardStyle={cardStyle} />
              <StatCard label="Stakers" value={(poolInfo as any)?.[5]?.toString() || '0'} sub="Wallets" cardStyle={cardStyle} />
              <StatCard label="Reward Pool" value={formatUnits(availableRewards as bigint || 0n, 18)} sub="Balance" cardStyle={cardStyle} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-10">
                <div className="lg:col-span-8">
                  {userHasStake ? (
                    <div className={`p-6 md:p-10 border rounded-[2rem] md:rounded-[3.5rem] ${cardStyle}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10 md:mb-12">
                        <h2 className="text-xl md:text-2xl font-black uppercase italic flex items-center gap-3"><ShieldCheck className="text-blue-500" size={28}/> Active Position</h2>
                        <div className={`px-4 md:px-6 py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase flex items-center gap-2 ${liveUnstakeCountdown === 0 ? 'bg-green-500 text-white' : 'bg-blue-600/10 text-blue-500'}`}>
                          <Timer size={14} className="md:w-4 md:h-4"/> {liveUnstakeCountdown === 0 ? "MATURED" : `${formatCountdown(liveUnstakeCountdown)}`}
                        </div>
                      </div>
                      <p className="text-4xl md:text-6xl font-black mb-10 md:mb-14 tabular-nums tracking-tighter">{parseFloat(formatUnits((userStake as any)[0], 18)).toLocaleString()} <span className="text-blue-500 text-2xl md:text-4xl">{currentSymbol}</span></p>
                      <button onClick={() => writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'unstake', args: [selectedTokenAddr as `0x${string}`] })} disabled={liveUnstakeCountdown > 0 || isLoading} className={`w-full py-5 md:py-7 rounded-2xl md:rounded-[2rem] font-black uppercase text-base md:text-xl transition-all shadow-2xl ${liveUnstakeCountdown > 0 ? 'bg-slate-500/20 opacity-40 grayscale' : 'bg-green-600 text-white hover:scale-[1.01]'}`}>
                        {isLoading ? <Loader2 className="animate-spin mx-auto"/> : (liveUnstakeCountdown > 0 ? `Locked` : 'Unstake & Claim')}
                      </button>
                    </div>
                  ) : (
                    <div className={`p-6 md:p-10 border rounded-[2rem] md:rounded-[3.5rem] ${cardStyle}`}>
                      <h2 className="text-xl md:text-2xl font-black mb-6 md:mb-10 uppercase italic">1. Select Staking APY</h2>
                      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-5">
                        {STAKING_TIERS.map((tier) => (
                          <button key={tier.index} onClick={() => setSelectedTier(tier.index)} className={`p-4 rounded-2xl md:rounded-[1.5rem] border text-left transition-all relative overflow-hidden ${selectedTier === tier.index ? 'bg-blue-600 border-blue-400 text-white scale-[1.02] shadow-xl' : isDarkMode ? 'bg-black/40 border-white/5' : 'bg-slate-50 border-slate-100'}`}>
                            <p className="text-[10px] font-black opacity-60 uppercase mb-1 tracking-widest">{tier.label}</p>
                            <p className="text-2xl md:text-4xl font-black tracking-tighter">{tier.apr}</p>
                            <p className={`text-[12px] font-black mt-1 opacity-80 ${selectedTier === tier.index ? 'text-blue-100' : 'text-blue-500'}`}>{tier.multiplier}</p>
                            <div className="mt-4 md:mt-8">
                              <span className={`text-[9px] font-black px-3 py-1 rounded-lg uppercase ${selectedTier === tier.index ? 'bg-white/20' : 'bg-black/10'}`}>{tier.duration}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="lg:col-span-4">
                  {userHasStake ? (
                    <div className="p-8 md:p-10 rounded-[2rem] md:rounded-[3.5rem] bg-gradient-to-br from-blue-600 to-indigo-950 text-white shadow-2xl h-full flex flex-col">
                      <div className="flex-1">
                        <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em] mb-3">Yield Accrued</p>
                        <p className="text-3xl md:text-5xl font-black font-mono tracking-tighter mb-4 truncate">{parseFloat(formatUnits(liveYield, 18)).toLocaleString(undefined, {minimumFractionDigits: 8})}</p>
                        <p className="text-xs font-bold opacity-40 uppercase italic mb-8 md:mb-10">{currentSymbol}</p>
                        {!isEligibleForHarvest ? (
                          <div className="bg-white/10 p-4 rounded-xl border border-white/10 flex items-start gap-3">
                            <Lock className="text-blue-300 shrink-0" size={18} />
                            <p className="text-[11px] font-bold leading-relaxed opacity-80 uppercase">Released at maturity.</p>
                          </div>
                        ) : liveCountdown === 0 ? (
                          <button onClick={() => writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'claimRewards', args: [selectedTokenAddr as `0x${string}`] })} disabled={isLoading} className="w-full py-5 md:py-7 bg-white text-blue-900 rounded-2xl md:rounded-[2rem] font-black uppercase text-sm shadow-2xl hover:scale-105 transition-all flex items-center justify-center gap-2">
                            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <>HARVEST <ArrowRightLeft size={16}/></>}
                          </button>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black uppercase opacity-60 tracking-widest flex items-center gap-2"><Clock size={14}/> Next Harvest In</p>
                            <div className="bg-black/30 p-5 rounded-xl border border-white/5 text-center">
                              <p className="text-xl font-black font-mono tracking-widest">{formatCountdown(liveCountdown)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`p-6 md:p-10 border rounded-[2rem] md:rounded-[3.5rem] ${cardStyle} h-full`}>
                      <h3 className="font-black italic uppercase mb-8 md:mb-10 flex items-center gap-3"><Wallet size={24} className="text-blue-500" /> 2. Amount</h3>
                      <div className={`p-6 md:p-8 rounded-2xl md:rounded-[2.5rem] border mb-8 md:mb-10 ${inputStyle}`}>
                        <div className="flex justify-between items-center mb-4 md:mb-5">
                          <span className="text-[9px] md:text-[10px] font-black opacity-40 uppercase">Bal: {parseFloat(formatUnits(userBalance || 0n, 18)).toLocaleString()}</span>
                          <button onClick={() => setStakeAmount(formatUnits(userBalance || 0n, 18))} className="text-[9px] font-black bg-blue-600 text-white px-3 py-1.5 rounded-lg">MAX</button>
                        </div>
                        <input type="number" value={stakeAmount} onChange={(e)=>setStakeAmount(e.target.value)} placeholder="0.00" className="bg-transparent text-4xl md:text-5xl font-black w-full outline-none tracking-tighter" />
                      </div>
                      <button onClick={() => handleAction('stake')} disabled={!stakeAmount || isLoading} className={`w-full py-6 md:py-8 rounded-2xl md:rounded-[2.2rem] font-black uppercase text-base md:text-lg transition-all shadow-2xl flex items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-black text-white'} disabled:opacity-20`}>
                        {isLoading ? <Loader2 className="animate-spin" /> : (allowance !== undefined && (allowance as bigint) < parseUnits(stakeAmount || '0', 18) ? `Approve` : `Confirm Stake`)}
                      </button>
                    </div>
                  )}
                </div>
            </div>

            <div className="mt-12 md:mt-16 overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8 md:mb-10">
                <div className="flex items-center gap-4">
                  <Users size={28} className="text-blue-500" />
                  <h3 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight">Active Stakers</h3>
                </div>
                <span className={`w-fit text-xs md:text-sm font-black px-4 py-2 rounded-full border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                  {poolPositions.length} POSITIONS
                </span>
              </div>
              <div className={`overflow-x-auto no-scrollbar border rounded-[1.5rem] md:rounded-[2.5rem] ${cardStyle}`}>
                <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className={`${isDarkMode ? 'bg-white/5' : 'bg-slate-50'} border-b ${isDarkMode ? 'border-white/5' : 'border-slate-100'}`}>
                        <th className="px-8 md:px-10 py-7 text-[15px] font-black uppercase opacity-40">Wallet</th>
                        <th className="px-8 md:px-10 py-7 text-[15px] font-black uppercase opacity-40">Amount</th>
                        <th className="px-8 md:px-10 py-7 text-[15px] font-black uppercase opacity-40">Tier</th>
                        <th className="px-8 md:px-10 py-7 text-[15px] font-black uppercase opacity-40 text-right">Unlock Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-500/10">
                      {poolPositions.length > 0 ? (
                        poolPositions.map((pos: any, idx: number) => {
                          const isSelf = pos.user.toLowerCase() === address?.toLowerCase();
                          const unlockDate = new Date(Number(pos.lockEndTime) * 1000);
                          const isMatured = Math.floor(Date.now() / 1000) > Number(pos.lockEndTime);
                          return (
                            <tr key={idx} className={`group transition-colors ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                              <td className="px-8 md:px-10 py-7 font-mono text-base font-bold">
                                <div className="flex items-center gap-3">
                                  {pos.user.slice(0, 6)}...{pos.user.slice(-4)}
                                  {isSelf && <span className="text-[10px] bg-blue-600 text-white px-3 py-1 rounded-md font-black italic">YOU</span>}
                                </div>
                              </td>
                              <td className="px-8 md:px-10 py-7 font-black text-xl">
                                {parseFloat(formatUnits(pos.amount, 18)).toLocaleString()} <span className="text-blue-500 opacity-60 text-sm ml-1">{currentSymbol}</span>
                              </td>
                              <td className="px-8 md:px-10 py-7">
                                <span className={`px-3 py-1.5 rounded-lg text-sm font-black ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}>
                                  x{(Number(pos.multiplier) / 100).toFixed(2)}
                                </span>
                              </td>
                              <td className="px-8 md:px-10 py-7 text-right">
                                <span className={`text-[15px] font-black ${isMatured ? 'text-green-500' : 'opacity-70'}`}>
                                  {isMatured ? 'MATURED' : unlockDate.toLocaleDateString()}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr><td colSpan={4} className="px-8 py-24 text-center opacity-20 text-sm font-black uppercase">No Active Positions</td></tr>
                      )}
                    </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-2xl mx-auto py-6 md:py-10">
            <div className={`p-8 md:p-12 border rounded-[2.5rem] md:rounded-[4rem] text-center ${cardStyle}`}>
              <div className="flex flex-col items-center">
                {!isConfirmed && !isManager ? (
                  <>
                    <h2 className="text-xl md:text-2xl font-black uppercase italic flex items-center gap-3"><Rocket className="text-blue-500" size={28}/> Create Pool</h2>
                    <p className="text-[12px] md:text-[18px] opacity-90 mb-10 md:mb-12 text-left pt-4 px-4 md:px-6">Launch a new staking pool with a 5% platform fee charged on each stake.</p>
                    <div className="w-full space-y-4 md:space-y-6">
                      <input 
                          type="text" 
                          value={newTokenAddress} 
                          onChange={(e) => { setNewTokenAddress(e.target.value); setSelectedTokenAddr(e.target.value); }} 
                          placeholder="Token Address (0x...) ERC-20" 
                          className={`w-full p-5 md:p-7 rounded-[1.5rem] md:rounded-[2rem] outline-none font-mono text-xs md:text-sm border-2 text-center transition-all ${isDarkMode ? 'bg-black/40 border-white/5 focus:border-blue-600' : 'bg-slate-50 border-slate-100 focus:border-blue-500'}`} 
                      />
                      <button 
                        onClick={() => { setLastActionType('create'); writeContract({ address: STAKING_CONTRACT, abi: STAKING_ABI, functionName: 'createPool', args: [newTokenAddress as `0x${string}`] }); }} 
                        disabled={!newTokenAddress || isLoading} 
                        className="w-full py-5 md:py-7 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-lg md:text-xl uppercase shadow-2xl transition-all bg-blue-600 text-white flex items-center justify-center gap-3"
                      >
                        {isLoading ? <Loader2 className="animate-spin" /> : <>Deploy <PlusCircle size={20}/></>}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="w-full animate-in zoom-in-95 duration-500 items-start">
                    <h2 className="text-xl md:text-2xl font-black uppercase italic flex items-center gap-3"><CheckCircle className="text-blue-500" size={28}/>Activate Pool</h2>
                    <p className="text-[12px] md:text-[18px] opacity-90 mb-10 md:mb-12 text-left pt-4 px-4 md:px-6">Set up the total yield rewards for this pool.</p>
                    <div className="space-y-4 md:space-y-6 mt-10">
                      <div className={`p-6 rounded-[1.5rem] md:rounded-[2.5rem] border ${inputStyle}`}>
                        <input type="number" value={adminAmount} onChange={(e) => setAdminAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent text-3xl md:text-4xl font-black outline-none text-center" />
                      </div>
                      <button onClick={() => handleAction('deposit')} disabled={!adminAmount || isLoading} className="w-full py-5 md:py-7 rounded-[1.5rem] md:rounded-[2.5rem] font-black text-lg uppercase shadow-2xl bg-blue-600 text-white">
                        {isLoading ? <Loader2 className="animate-spin mx-auto" /> : 'Deposit Rewards'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 max-w-7xl mx-auto px-4 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-3 text-left">
            <p className="text-[12px] font-mono font-bold opacity-50 uppercase tracking-widest shrink-0">Contract:</p>
            <div className="flex items-center gap-2 max-w-full overflow-hidden">
              <p className="text-[11px] md:text-sm font-mono font-bold opacity-80 truncate tracking-tight">{STAKING_CONTRACT}</p>
              <button onClick={() => navigator.clipboard.writeText(STAKING_CONTRACT)} className="opacity-40 hover:opacity-100 transition-all p-1 shrink-0" title="Copy Address">
                <Copy size={14} />
              </button>
            </div>
            <span className="hidden sm:inline opacity-20 mx-2">|</span>
            <a href={`${EXPLORER_ADDRESS_URL}/${STAKING_CONTRACT}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[11px] font-black uppercase text-blue-500 hover:text-blue-400 shrink-0 transition-colors">
              Explorer <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({ label, value, sub, cardStyle }: any) {
  return (
    <div className={`p-4 md:p-10 rounded-[1.5rem] md:rounded-[3rem] border transition-all ${cardStyle}`}>
      <p className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] opacity-40 mb-1 md:mb-3 italic">{label}</p>
      <p className="text-lg md:text-4xl font-black tabular-nums tracking-tighter truncate">{parseFloat(value || '0').toLocaleString(undefined, { maximumFractionDigits: 1 })}</p>
      <div className="text-[8px] md:text-[11px] text-blue-500 font-bold uppercase mt-2 md:mt-4 flex items-center gap-1 md:gap-2">
        <div className="w-1 h-1 md:w-1.5 md:h-1.5 rounded-full bg-blue-500 animate-pulse" />
        {sub}
      </div>
    </div>
  )
}

export default function Home() {
    return (
      <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>}>
        <StakingPageContent />
      </Suspense>
    )
}