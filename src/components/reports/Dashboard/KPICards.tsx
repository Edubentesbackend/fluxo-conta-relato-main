import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, DollarSign, Users, ArrowUpDown, Sparkles } from "lucide-react";
import { formatCurrency } from "@/utils/currency";
import { TransactionInsights } from "@/hooks/useReportsData";
import { Badge } from "@/components/ui/badge";

interface KPICardsProps {
  insights: TransactionInsights;
  isLoading?: boolean;
}

export const KPICards = ({ insights, isLoading }: KPICardsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-fade-in">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="overflow-hidden animate-pulse">
            <div className="h-2 gradient-primary"></div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted rounded w-24"></div>
              </CardTitle>
              <div className="h-8 w-8 bg-muted rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted rounded w-32 mb-2"></div>
              <div className="h-3 bg-muted rounded w-20"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: "Volume Total",
      value: formatCurrency(insights.total_volume),
      icon: DollarSign,
      description: `${insights.transaction_count} transações`,
      trend: insights.total_volume > 0 ? "up" : "neutral",
      gradient: "gradient-primary",
      iconBg: "bg-primary/10",
      iconColor: "text-primary",
      delay: "animation-delay-100"
    },
    {
      title: "Ticket Médio",
      value: formatCurrency(insights.avg_transaction_amount),
      icon: TrendingUp,
      description: "Por transação",
      trend: "up",
      gradient: "gradient-success",
      iconBg: "bg-success/10",
      iconColor: "text-success",
      delay: "animation-delay-200"
    },
    {
      title: "Conta Mais Ativa",
      value: insights.most_active_account_name,
      icon: Users,
      description: `${insights.most_active_account_transactions} transações`,
      trend: "neutral",
      gradient: "gradient-accent",
      iconBg: "bg-accent/10",
      iconColor: "text-accent",
      delay: "animation-delay-300"
    },
    {
      title: "Maior Transação",
      value: formatCurrency(insights.highest_value_transaction_amount),
      icon: ArrowUpDown,
      description: insights.most_common_transaction_type,
      trend: "neutral",
      gradient: "gradient-warning",
      iconBg: "bg-warning/10",
      iconColor: "text-warning-foreground",
      delay: "animation-delay-[400ms]"
    }
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-slide-up">
      {kpis.map((kpi, index) => (
        <Card 
          key={index} 
          className={`
            group overflow-hidden border-0 shadow-soft hover-lift
            hover:shadow-large transition-all duration-300 
            bg-gradient-to-br from-card to-card/50 backdrop-blur-sm
            animate-scale-in ${kpi.delay}
          `}
        >
          {/* Gradient top bar */}
          <div className={`h-1 ${kpi.gradient}`}></div>
          
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
              {kpi.title}
            </CardTitle>
            <div className={`
              p-2 rounded-xl ${kpi.iconBg} 
              group-hover:scale-110 group-hover:rotate-6 
              transition-all duration-300
            `}>
              <kpi.icon className={`h-4 w-4 ${kpi.iconColor}`} />
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
              {typeof kpi.value === 'string' && kpi.value.length > 20 
                ? `${kpi.value.substring(0, 20)}...` 
                : kpi.value
              }
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground group-hover:text-muted-foreground/80 transition-colors">
                {kpi.description}
              </p>
              
              {kpi.trend === "up" && (
                <Badge 
                  variant="secondary" 
                  className="text-success bg-success/10 border-success/20 group-hover:shadow-glow"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  <Sparkles className="h-2 w-2" />
                </Badge>
              )}
              {kpi.trend === "down" && (
                <Badge 
                  variant="secondary" 
                  className="text-destructive bg-destructive/10 border-destructive/20"
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Baixo
                </Badge>
              )}
              {kpi.trend === "neutral" && (
                <Badge 
                  variant="outline" 
                  className="group-hover:border-primary/50 transition-colors"
                >
                  <Activity className="h-3 w-3 mr-1" />
                  Estável
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};