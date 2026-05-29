import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, PieChart, TrendingDown, Shield, AlertCircle } from "lucide-react";
import { ActivityChart } from "../../reports/Dashboard/ActivityChart";
import { AdvancedMetrics } from "../../reports/Dashboard/AdvancedMetrics";
import { TransactionInsights, MonthlyVolume } from "@/hooks/useReportsData";
import { formatCurrency } from "@/utils/currency";

interface CFODashboardProps {
  insights: TransactionInsights;
  monthlyData: MonthlyVolume[];
  isLoading?: boolean;
}

export function CFODashboard({ insights, monthlyData, isLoading }: CFODashboardProps) {
  return (
    <div className="space-y-6" data-tour="cfo-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Financial KPIs for CFO */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Fluxo de Caixa</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.total_volume)}</div>
            <p className="text-xs text-muted-foreground">Volume total movimentado</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">EBITDA Margin</CardTitle>
            <PieChart className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">32.5%</div>
            <p className="text-xs text-muted-foreground">Margem operacional</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Custo Médio</CardTitle>
            <TrendingDown className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.avg_transaction_amount)}</div>
            <p className="text-xs text-muted-foreground">Por transação</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Compliance</CardTitle>
            <Shield className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">98%</div>
            <p className="text-xs text-muted-foreground">Taxa de conformidade</p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityChart 
          data={monthlyData} 
          isLoading={isLoading}
        />
        <AdvancedMetrics 
          insights={insights}
          monthlyData={monthlyData}
        />
      </div>

      <Card className="gradient-card">
        <CardHeader>
          <CardTitle>Análise de Riscos Financeiros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-success/10 rounded-lg border border-success/20">
              <div>
                <p className="font-medium">Liquidez</p>
                <p className="text-sm text-muted-foreground">Indicadores saudáveis</p>
              </div>
              <Shield className="h-6 w-6 text-success" />
            </div>
            <div className="flex items-center justify-between p-4 bg-warning/10 rounded-lg border border-warning/20">
              <div>
                <p className="font-medium">Concentração</p>
                <p className="text-sm text-muted-foreground">Monitorar diversificação</p>
              </div>
              <AlertCircle className="h-6 w-6 text-warning" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
