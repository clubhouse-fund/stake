import React from 'react'

export default function Header() {
  return (
    <header className="flex justify-between items-center p-6 border-b border-white/10 backdrop-blur-md sticky top-0 z-50 bg-slate-950/50">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
          C
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white hidden sm:block">
          Clubhouse <span className="text-blue-500 font-light underline decoration-blue-500/30">Stake</span>
        </h1>
      </div>

      <div className="flex items-center gap-4">
        {/* We style the wrapper, Reown handles the inside */}
        <div className="p-[1px] bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full hover:scale-105 transition-transform">
          <appkit-button size="md" balance="show" />
        </div>
      </div>
    </header>
  )
}