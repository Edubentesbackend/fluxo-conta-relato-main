import React from 'react';
import { TransactionWithRunningBalance } from '@/types/database';
import { formatCurrency } from '@/utils/currency';

interface BalanceEvolutionSparklineProps {
  transactions: TransactionWithRunningBalance[];
  height?: number;
}

export const BalanceEvolutionSparkline: React.FC<BalanceEvolutionSparklineProps> = ({ 
  transactions,
  height = 40 
}) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-10 text-xs text-muted-foreground">
        Sem dados
      </div>
    );
  }

  // Sort by date
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  );

  const balances = sortedTransactions.map(t => t.runningBalance);
  const maxBalance = Math.max(...balances.map(Math.abs));
  const minBalance = Math.min(...balances);

  // Calculate SVG path
  const width = 120;
  const padding = 2;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;

  const points = balances.map((balance, index) => {
    const x = padding + (index / (balances.length - 1)) * chartWidth;
    const normalizedBalance = maxBalance === 0 ? 0.5 : (balance + maxBalance) / (2 * maxBalance);
    const y = padding + chartHeight - normalizedBalance * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const currentBalance = balances[balances.length - 1];
  const trend = balances.length > 1 ? (currentBalance > balances[0] ? 'up' : currentBalance < balances[0] ? 'down' : 'stable') : 'stable';

  return (
    <div className="flex items-center gap-2">
      <svg 
        width={width} 
        height={height} 
        className="overflow-visible"
      >
        {/* Zero line */}
        {minBalance < 0 && (
          <line
            x1={padding}
            y1={padding + chartHeight / 2}
            x2={width - padding}
            y2={padding + chartHeight / 2}
            stroke="currentColor"
            strokeWidth="1"
            strokeDasharray="2,2"
            className="text-muted-foreground/30"
          />
        )}

        {/* Line path */}
        <polyline
          points={points}
          fill="none"
          stroke={currentBalance >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Gradient fill */}
        <defs>
          <linearGradient id={`gradient-${currentBalance}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={currentBalance >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} stopOpacity="0.3" />
            <stop offset="100%" stopColor={currentBalance >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <polygon
          points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
          fill={`url(#gradient-${currentBalance})`}
        />

        {/* End point */}
        <circle
          cx={padding + chartWidth}
          cy={padding + chartHeight - ((currentBalance + maxBalance) / (2 * maxBalance)) * chartHeight}
          r="3"
          fill={currentBalance >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'}
          className="drop-shadow-md"
        />
      </svg>

      <div className="text-right">
        <p className="text-xs text-muted-foreground">
          {trend === 'up' ? '📈' : trend === 'down' ? '📉' : '➡️'}
        </p>
        <p className="text-xs font-medium">
          {transactions.length}
        </p>
      </div>
    </div>
  );
};
