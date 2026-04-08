'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAccount, useDisconnect, useSwitchChain, useChainId } from 'wagmi'
import { useAppKit } from '@reown/appkit/react'
import { Wallet, LogOut, ChevronDown, Circle, Sun, Moon } from 'lucide-react'

interface NavbarProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
}

export default function Navbar({ isDarkMode, setIsDarkMode }: NavbarProps) {
  const { address, isConnected } = useAccount()
  const { disconnect } = useDisconnect()
  const { chains, switchChain } = useSwitchChain()
  const chainId = useChainId()
  const { open } = useAppKit()
  
  const [showNetworkMenu, setShowNetworkMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const currentChain = chains.find(c => c.id === chainId)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { 
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowNetworkMenu(false) 
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const navBg = isDarkMode ? "bg-black/100 border-white/5" : "bg-white/100 border-slate-200"
  const textColor = isDarkMode ? "text-white" : "text-slate-900"
  const pillBg = isDarkMode ? "bg-slate-900 border-white/10" : "bg-slate-100 border-slate-200"

  return (
    <nav className={`fixed top-0 left-0 right-0 z-[100] backdrop-blur-xl border-b transition-all duration-300 ${navBg}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        {/* Logo - Adjusted spacing for mobile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <img 
            src="https://clubhouse.fund/img/clubhouse-logo-bw.212a7d14.svg" 
            alt="Logo" 
            className={`w-8 h-8 sm:w-10 sm:h-10 ${isDarkMode ? 'invert-0' : 'invert'}`} 
          />
          {/* Hide text "Stake" on very small screens if needed, or just keep it small */}
          <span className={`text-lg sm:text-xl font-black tracking-tighter ${textColor}`}>Stake</span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Theme Toggle */}
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 sm:p-2.5 rounded-full border transition-all ${isDarkMode ? 'bg-slate-800 border-white/10 text-amber-400' : 'bg-white border-slate-300 text-slate-500'}`}
          >
            {isDarkMode ? <Sun size={16} className="sm:w-[18px]" fill="currentColor" /> : <Moon size={16} className="sm:w-[18px]" fill="currentColor" />}
          </button>

          {/* Network Switcher - COMPACT MOBILE VERSION */}
          {isConnected && (
            <div className="relative" ref={menuRef}>
              <button 
                onClick={() => setShowNetworkMenu(!showNetworkMenu)} 
                className={`flex items-center gap-2 border px-3 sm:px-4 py-2 rounded-full text-xs font-bold ${pillBg} ${textColor}`}
              >
                <Circle className={`w-2 h-2 fill-current text-blue-500`} />
                {/* Text hidden on mobile, visible on small screens (640px+) */}
                <span className="hidden sm:inline">
                  {currentChain?.name || `Chain: ${chainId}`}
                </span>
                <ChevronDown size={14} />
              </button>
              
              {showNetworkMenu && (
                <div className={`absolute top-full mt-2 right-0 w-48 sm:w-56 border rounded-2xl p-2 shadow-2xl ${isDarkMode ? 'bg-slate-900 border-white/10' : 'bg-white border-slate-200'}`}>
                  {chains.map((c) => (
                    <button 
                      key={c.id} 
                      onClick={() => { switchChain({ chainId: c.id }); setShowNetworkMenu(false); }} 
                      className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-colors ${chainId === c.id ? 'bg-blue-600 text-white' : isDarkMode ? 'hover:bg-white/5 text-slate-400' : 'hover:bg-slate-50 text-slate-600'}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Connect Button - Responsive Text */}
          {!isConnected ? (
            <button 
              onClick={() => open()} 
              className={`${isDarkMode ? 'bg-blue-600' : 'bg-black'} text-white px-4 sm:px-6 py-2.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg hover:scale-105 active:scale-95`}
            >
              <Wallet size={16} /> 
              <span className="hidden xs:inline">Connect</span>
            </button>
          ) : (
            <div className={`flex items-center gap-1 sm:gap-2 border pl-3 sm:pl-4 pr-1 py-1 rounded-full ${pillBg}`}>
              <span className={`text-xs sm:text-sm font-mono ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                {address?.slice(0, 4)}...{address?.slice(-4)}
              </span>
              <button onClick={() => disconnect()} className="p-2 hover:text-red-500 transition-colors">
                <LogOut size={14} className="sm:w-[16px]" />
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}