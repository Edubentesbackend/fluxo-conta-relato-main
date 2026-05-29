import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CalendarDays,
  Target,
  BarChart3,
  ArrowUpDown,
  Activity,
  Zap,
  Eye
} from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { MonthlyVolume, TransactionInsights } from '@/hooks/useReportsData';

interface AdvancedMetricsProps {
  insights: TransactionInsights;
  monthlyData: MonthlyVolume[];
}

export const AdvancedMetrics = ({ insights, monthlyData }: AdvancedMetricsProps) => {
  // Calcular tendências e métricas avançadas
  const calculateTrend = () => {
    if (monthlyData.length < 2) return 0;
    const lastMonth = monthlyData[monthlyData.length - 1];
    const previousMonth = monthlyData[monthlyData.length - 2];
    return ((lastMonth.total_volume - previousMonth.total_volume) / previousMonth.total_volume) * 100;
  };

  const calculateVelocity = () => {
    if (monthlyData.length === 0) return 0;
    const totalDays = monthlyData.length * 30; // Aproximação
    return insights.transaction_count / totalDays;
  };

  const calculateEfficiency = () => {
    if (insights.transaction_count === 0) return 0;
    return (insights.total_volume / insights.transaction_count) / 1000; // Score baseado no valor médio
  };

  const trend = calculateTrend();
  const velocity = calculateVelocity();
  const efficiency = calculateEfficiency();

  const metrics = [
    {
      title: "Tendência Mensal",
      value: trend.toFixed(1) + "%",
      description: trend >= 0 ? "Crescimento" : "Queda",
      icon: trend >= 0 ? TrendingUp : TrendingDown,
      color: trend >= 0 ? "text-success" : "text-destructive",
      gradient: trend >= 0 ? "gradient-success" : "gradient-destructive",
      progress: Math.min(Math.abs(trend), 100)
    },
    {
      title: "Velocidade de Transações",
      value: velocity.toFixed(1),
      description: "Transações/dia",
      icon: Zap,
      color: "text-warning-foreground",
      gradient: "gradient-warning",
      progress: Math.min(velocity * 10, 100)
    },
    {
      title: "Score de Eficiência",
      value: efficiency.toFixed(1),
      description: "Performance operacional",
      icon: Target,
      color: "text-support",
      gradient: "gradient-support",
      progress: Math.min(efficiency * 2, 100)
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(insights.avg_transaction_amount),
      description: "Valor médio por transação",
      icon: DollarSign,
      color: "text-primary",
      gradient: "gradient-primary",
      progress: 75 // Valor fixo para demonstração
    }
  ];

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card 
            key={index}
            className="border-0 shadow-soft hover-lift transition-all duration-300 group cursor-pointer overflow-hidden touch-manipulation"
          >
            <div className="h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-20"></div>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg ${metric.gradient} shadow-soft`}>
                  <metric.icon className="h-5 w-5 text-white" />
                </div>
                <Badge variant="outline" className="text-xs">
                  <Eye className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">{metric.title}</p>
                <p className={`text-2xl sm:text-xl lg:text-2xl font-bold ${metric.color} responsive-text-2xl`}>
                  {metric.value}
                </p>
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                
                <div className="mt-3">
                  <Progress 
                    value={metric.progress} 
                    className="h-2 bg-muted/50"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Insights Detalhados */}
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* Conta Mais Ativa */}
        <Card className="border-0 shadow-medium hover-lift group overflow-hidden">
          <div className="h-1 gradient-accent"></div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-accent responsive-text-xl">
              <Activity className="h-5 w-5" />
              Conta Mais Ativa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 gradient-card rounded-xl shadow-soft">
              <div className="space-y-1">
                <p className="font-semibold text-foreground responsive-text-xl">
                  {insights.most_active_account_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {insights.most_active_account_transactions} transações
                </p>
              </div>
              <div className="text-right">
                <Badge className="gradient-accent text-white shadow-soft">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Destaque
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maior Transação */}
        <Card className="border-0 shadow-medium hover-lift group overflow-hidden">
          <div className="h-1 gradient-primary"></div>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-primary responsive-text-xl">
              <ArrowUpDown className="h-5 w-5" />
              Maior Transação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 gradient-card rounded-xl shadow-soft">
              <div className="space-y-1">
                <p className="text-2xl sm:text-xl lg:text-2xl font-bold text-primary responsive-text-2xl">
                  {formatCurrency(insights.highest_value_transaction_amount)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Valor único mais alto
                </p>
              </div>
              <div className="text-right">
                <Badge className="gradient-primary text-white shadow-soft">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Máximo
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumo Executivo */}
      <Card className="border-0 shadow-large hover-lift group overflow-hidden">
        <div className="h-1 gradient-support"></div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-support responsive-text-xl">
            <CalendarDays className="h-5 w-5" />
            Resumo Executivo do Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
            <div className="text-center p-4 gradient-card rounded-xl shadow-soft">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-support responsive-text-3xl">
                {formatCurrency(insights.total_volume)}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Volume Total Movimentado</p>
            </div>
            <div className="text-center p-4 gradient-card rounded-xl shadow-soft">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-accent responsive-text-3xl">
                {insights.transaction_count}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Total de Operações</p>
            </div>
            <div className="text-center p-4 gradient-card rounded-xl shadow-soft">
              <p className="text-3xl sm:text-2xl lg:text-3xl font-bold text-warning-foreground responsive-text-3xl">
                {monthlyData.length}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Meses Analisados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};