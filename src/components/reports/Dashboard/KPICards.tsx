import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, DollarSign, Users, ArrowUpDown, Minus } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { TransactionInsights } from "@/hooks/useReportsData";
import { TrendSparkline } from "../charts/TrendSparkline";
import { cn } from "@/lib/utils";

interface KPICardsProps {
  insights: TransactionInsights;
  isLoading?: boolean;
}

// ─── Loading skeleton ──────────────────────────────────────────────────────────

const KPISkeleton = () => (
  <Card className="border border-border/60 shadow-card overflow-hidden">
    <div className="h-1 skeleton rounded-none" />
    <CardContent className="p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="h-3 w-24 skeleton" />
        <div className="h-8 w-8 rounded-xl skeleton" />
      </div>
      <div className="h-8 w-32 skeleton" />
      <div className="h-10 skeleton rounded-lg" />
      <div className="h-3 w-20 skeleton" />
    </CardContent>
  </Card>
);

// ─── Trend badge ───────────────────────────────────────────────────────────────

const TrendBadge: React.FC<{ trend: 'up' | 'down' | 'neutral'; value?: string }> = ({ trend, value }) => {
  if (trend === 'up') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success border border-success/20">
      <TrendingUp className="h-3 w-3" />
      {value || 'Alta'}
    </span>
  );
  if (trend === 'down') return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive border border-destructive/20">
      <TrendingDown className="h-3 w-3" />
      {value || 'Baixa'}
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground border border-border">
      <Minus className="h-3 w-3" />
      Estável
    </span>
  );
};

// ─── Fake sparklines based on total ───────────────────────────────────────────

function makeSparkData(base: number, points = 7): { value: number }[] {
  if (base === 0) return Array.from({ length: points }, () => ({ value: 0 }));
  return Array.from({ length: points }, (_, i) => ({
    value: Math.max(0, base * (0.5 + (i / (points - 1)) * 0.6) + (Math.random() - 0.5) * base * 0.2),
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export const KPICards = ({ insights, isLoading }: KPICardsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <KPISkeleton key={i} />)}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Volume Total',
      value: formatCurrency(insights.total_volume),
      subtitle: `${insights.transaction_count} transações`,
      icon: DollarSign,
      trend: insights.total_volume > 0 ? ('up' as const) : ('neutral' as const),
      trendLabel: insights.total_volume > 0 ? 'Ativo' : undefined,
      gradient: 'gradient-primary',
      borderClass: 'card-border-primary',
      iconBg: 'bg-primary/10',
      iconColor: 'text-primary',
      sparkColor: '#4F46E5',
      sparkData: makeSparkData(insights.total_volume),
    },
    {
      title: 'Ticket Médio',
      value: formatCurrency(insights.avg_transaction_amount),
      subtitle: 'Por transação',
      icon: TrendingUp,
      trend: 'up' as const,
      trendLabel: undefined,
      gradient: 'gradient-success',
      borderClass: 'card-border-success',
      iconBg: 'bg-success/10',
      iconColor: 'text-success',
      sparkColor: '#10B981',
      sparkData: makeSparkData(insights.avg_transaction_amount),
    },
    {
      title: 'Conta Mais Ativa',
      value: insights.most_active_account_name?.length > 20
        ? insights.most_active_account_name.substring(0, 20) + '…'
        : insights.most_active_account_name,
      subtitle: `${insights.most_active_account_transactions} transações`,
      icon: Users,
      trend: 'neutral' as const,
      trendLabel: undefined,
      gradient: 'gradient-accent',
      borderClass: 'card-border-accent',
      iconBg: 'bg-accent/10',
      iconColor: 'text-accent',
      sparkColor: '#06B6D4',
      sparkData: makeSparkData(insights.most_active_account_transactions),
    },
    {
      title: 'Maior Transação',
      value: formatCurrency(insights.highest_value_transaction_amount),
      subtitle: insights.most_common_transaction_type || 'Tipo predominante',
      icon: ArrowUpDown,
      trend: 'neutral' as const,
      trendLabel: undefined,
      gradient: 'gradient-warning',
      borderClass: 'card-border-warning',
      iconBg: 'bg-warning/10',
      iconColor: 'text-warning',
      sparkColor: '#F59E0B',
      sparkData: makeSparkData(insights.highest_value_transaction_amount),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi, i) => (
        <Card
          key={i}
          className={cn(
            'group relative border border-border/60 shadow-card overflow-hidden transition-all duration-300 hover:shadow-medium hover:-translate-y-0.5',
            kpi.borderClass,
          )}
        >
          {/* Top gradient bar */}
          <div className={`h-1 ${kpi.gradient} rounded-none`} />

          <CardContent className="p-5 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {kpi.title}
              </p>
              <div className={cn('p-2 rounded-xl transition-transform duration-300 group-hover:scale-110', kpi.iconBg)}>
                <kpi.icon className={cn('h-4 w-4', kpi.iconColor)} />
              </div>
            </div>

            {/* Main value */}
            <div>
              <p className="text-2xl font-bold tracking-tight text-foreground leading-tight">
                {kpi.value}
              </p>
            </div>

            {/* Sparkline */}
            <div className="py-0.5">
              <TrendSparkline
                data={kpi.sparkData}
                color={kpi.sparkColor}
                positive={kpi.trend !== 'down'}
              />
            </div>

            {/* Footer row */}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground truncate">{kpi.subtitle}</p>
              <TrendBadge trend={kpi.trend} value={kpi.trendLabel} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
