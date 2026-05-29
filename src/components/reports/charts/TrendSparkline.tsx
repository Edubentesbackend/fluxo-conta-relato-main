import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';

interface SparkPoint { value: number }

interface TrendSparklineProps {
  data: SparkPoint[];
  color: string;
  positive?: boolean;
}

const CustomTooltip = ({ active, payload, color }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border/60 bg-card px-2 py-1 text-xs shadow-card">
      <span style={{ color }}>{payload[0].value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}</span>
    </div>
  );
};

export const TrendSparkline: React.FC<TrendSparklineProps> = ({ data, color, positive = true }) => {
  if (!data || data.length < 2) return null;

  const fillColor = positive ? color : '#EF4444';
  const lineColor = positive ? color : '#EF4444';

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.25} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Tooltip content={<CustomTooltip color={lineColor} />} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={lineColor}
          strokeWidth={1.5}
          fill={`url(#spark-${color.replace('#', '')})`}
          dot={false}
          activeDot={{ r: 3, fill: lineColor }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};
