import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CheckCircle2, Clock, Users } from "lucide-react";
import { ActivityFeed } from "../ActivityFeed";
import { ActivityChart } from "../../reports/dashboard/ActivityChart";
import { TransactionInsights, MonthlyVolume } from "@/hooks/useReportsData";
import { TransactionWithAccounts } from "@/hooks/useTransactions";
import { Progress } from "@/components/ui/progress";

interface ManagerDashboardProps {
  insights: TransactionInsights;
  monthlyData: MonthlyVolume[];
  transactions: TransactionWithAccounts[];
  isLoading?: boolean;
}

export function ManagerDashboard({ insights, monthlyData, transactions, isLoading }: ManagerDashboardProps) {
  return (
    <div className="space-y-6" data-tour="manager-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Operational KPIs for Manager */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Eficiência</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89%</div>
            <Progress value={89} className="mt-2" />
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Completas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{insights.transaction_count}</div>
            <p className="text-xs text-muted-foreground">Operações processadas</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
            <Clock className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.5h</div>
            <p className="text-xs text-muted-foreground">Por processo</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Equipe Ativa</CardTitle>
            <Users className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">Colaboradores</p>
          </CardContent>
        </Card>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-2">
        <ActivityChart 
          data={monthlyData} 
          isLoading={isLoading}
        />
        <ActivityFeed />
      </div>

      <Card className="gradient-card">
        <CardHeader>
          <CardTitle>Metas da Equipe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Processamento Mensal</span>
              <span className="text-sm text-muted-foreground">85/100</span>
            </div>
            <Progress value={85} />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Qualidade</span>
              <span className="text-sm text-muted-foreground">92/100</span>
            </div>
            <Progress value={92} className="[&>div]:bg-success" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Prazo de Entrega</span>
              <span className="text-sm text-muted-foreground">78/100</span>
            </div>
            <Progress value={78} className="[&>div]:bg-warning" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
