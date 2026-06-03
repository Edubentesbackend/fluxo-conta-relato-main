import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Target, Users, AlertCircle } from "lucide-react";
import { ExecutiveSummary } from "../ExecutiveSummary";
import { ActivityChart } from "../../reports/dashboard/ActivityChart";
import { HeatmapChart } from "../HeatmapChart";
import { TransactionInsights, MonthlyVolume } from "@/hooks/useReportsData";
import { TransactionWithAccounts } from "@/hooks/useTransactions";

interface CEODashboardProps {
  insights: TransactionInsights;
  monthlyData: MonthlyVolume[];
  transactions: TransactionWithAccounts[];
  isLoading?: boolean;
  aiSummary?: string;
  aiLoading?: boolean;
}

export function CEODashboard({ insights, monthlyData, transactions, isLoading, aiSummary, aiLoading }: CEODashboardProps) {
  return (
    <div className="space-y-6" data-tour="ceo-dashboard">
      <motion.div
        data-tour="kpi-cards"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Strategic KPIs for CEO */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Meta Anual</CardTitle>
            <Target className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Do objetivo alcançado</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Crescimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">+23%</div>
            <p className="text-xs text-muted-foreground">vs. trimestre anterior</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Contas Ativas</CardTitle>
            <Users className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.transaction_count}</div>
            <p className="text-xs text-muted-foreground">Operações no período</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Alertas</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>
      </motion.div>

      <ExecutiveSummary 
        insights={insights} 
        monthlyData={monthlyData}
        isLoading={isLoading}
        aiSummary={aiSummary}
        aiLoading={aiLoading}
      />

      <div className="grid gap-6 md:grid-cols-2" data-tour="charts">
        <ActivityChart 
          data={monthlyData} 
          isLoading={isLoading}
        />
        <HeatmapChart />
      </div>
    </div>
  );
}
