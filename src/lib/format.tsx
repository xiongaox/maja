import React from 'react';

export function formatMoney(amount: number, forcePlus: boolean = false): React.ReactNode {
  const rounded = Math.round(amount);
  const sign = rounded > 0 ? (forcePlus ? '+' : '') : (rounded < 0 ? '-' : '');
  const absVal = Math.abs(rounded);
  
  return (
    <>
      {sign}
      <span className="text-[0.7em] mx-[1px]">¥</span>
      {absVal}
    </>
  );
}
