'use client'
import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';

// This matches your Solidity struct for "getUserStake"
interface UserStake {
  principal: bigint;
  accruedRewards: bigint;
  lockEndTime: bigint;
  active: boolean;
  multiplier: bigint; // Assuming 100 = 1x
}

export function useLiveRewards(stake: UserStake | undefined) {
  const [ticker, setTicker] = useState("0.000000");

  useEffect(() => {
    if (!stake || !stake.active) return;

    const interval = setInterval(() => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const SECONDS_IN_YEAR = 31536000n;
      const BASE_APR = 400n; // 4% = 400 Basis Points

      // If lock has ended, rewards stop accruing (depending on your contract logic)
      let timeForCalc = now;
      if (stake.lockEndTime > 0n && now > stake.lockEndTime) {
        timeForCalc = stake.lockEndTime;
      }

      // Local estimation of growth per second
      // Formula: (Principal * APR * Multiplier * Time) / (10000 * 100 * Year)
      const additional = (stake.principal * BASE_APR * stake.multiplier * (now % 60n)) / (1000000n * SECONDS_IN_YEAR);
      const total = stake.accruedRewards + additional;

      setTicker(Number(formatUnits(total, 18)).toFixed(8));
    }, 1000);

    return () => clearInterval(interval);
  }, [stake]);

  return ticker;
}