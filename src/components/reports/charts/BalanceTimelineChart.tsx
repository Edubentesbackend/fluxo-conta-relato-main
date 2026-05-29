import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency } from '@/utils/currency';
import { format } from 'date-fns';

interface TimelineData {
  date: string;
  balance: number;
  sent: number;
  received: number;
}

interface BalanceTimelineChartProps {
  data: TimelineData[];
  title?: string;
}

export const BalanceTimelineChart: React.FC<BalanceTimelineChartProps> = ({ data, title }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          <p className="text-sm text-muted-foreground">
            Saldo: <span className={`font-semibold ${payload[0].value >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(payload[0].value))}
            </span>
          </p>
          {payload[1] && (
            <>
              <p className="text-sm text-destructive">
                Enviado: <span className="font-semibold">{formatCurrency(payload[1].value)}</span>
              </p>
              <p className="text-sm text-success">
                Recebido: <span className="font-semibold">{formatCurrency(payload[2].value)}</span>
              </p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Nenhum dado disponível para exibir
      </div>
    );
  }

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold text-foreground mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            dataKey="date"
            className="text-xs text-muted-foreground"
            tickFormatter={(value) => {
              try {
                return format(new Date(value), 'MMM yy');
              } catch {
                return value;
              }
            }}
          />
          <YAxis 
            className="text-xs text-muted-foreground"
            tickFormatter={(value) => formatCurrency(value)}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="balance"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#colorBalance)"
            className="transition-all duration-300"
          />
          <Line
            type="monotone"
            dataKey="sent"
            stroke="hsl(var(--destructive))"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            className="transition-all duration-300"
          />
          <Line
            type="monotone"
            dataKey="received"
            stroke="hsl(var(--success))"
            strokeWidth={1.5}
            strokeDasharray="5 5"
            dot={false}
            className="transition-all duration-300"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
