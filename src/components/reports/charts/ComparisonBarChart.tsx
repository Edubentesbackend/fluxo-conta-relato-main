import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency } from '@/utils/currency';

interface ComparisonData {
  name: string;
  sent: number;
  received: number;
}

interface ComparisonBarChartProps {
  data: ComparisonData[];
  title?: string;
}

export const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({ data, title }) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-foreground mb-2">{label}</p>
          <p className="text-sm text-destructive">
            Enviado: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
          </p>
          <p className="text-sm text-success">
            Recebido: <span className="font-semibold">{formatCurrency(payload[1].value)}</span>
          </p>
          <p className="text-sm text-muted-foreground border-t border-border mt-2 pt-2">
            Saldo: <span className={`font-semibold ${payload[1].value - payload[0].value >= 0 ? 'text-success' : 'text-destructive'}`}>
              {formatCurrency(Math.abs(payload[1].value - payload[0].value))}
            </span>
          </p>
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
        <BarChart data={data} layout="horizontal">
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis 
            type="number"
            tickFormatter={(value) => formatCurrency(value)}
            className="text-xs text-muted-foreground"
          />
          <YAxis 
            type="category"
            dataKey="name"
            width={120}
            className="text-xs text-muted-foreground"
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => value === 'sent' ? 'Enviado' : 'Recebido'}
          />
          <Bar 
            dataKey="sent" 
            fill="hsl(var(--destructive))"
            radius={[0, 4, 4, 0]}
            className="transition-all duration-300 hover:opacity-80"
          />
          <Bar 
            dataKey="received" 
            fill="hsl(var(--success))"
            radius={[0, 4, 4, 0]}
            className="transition-all duration-300 hover:opacity-80"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
