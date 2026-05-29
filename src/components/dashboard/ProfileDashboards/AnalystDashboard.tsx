import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, FileBarChart, Filter, Table2 } from "lucide-react";
import { InteractiveTable } from "../../reports/Tables/InteractiveTable";
import { AdvancedMetrics } from "../../reports/Dashboard/AdvancedMetrics";
import { ActivityChart } from "../../reports/Dashboard/ActivityChart";
import { TransactionInsights, MonthlyVolume } from "@/hooks/useReportsData";
import { TransactionWithAccounts } from "@/hooks/useTransactions";
import { formatCurrency } from "@/utils/currency";
import { format } from "date-fns";

interface AnalystDashboardProps {
  insights: TransactionInsights;
  monthlyData: MonthlyVolume[];
  transactions: TransactionWithAccounts[];
  isLoading?: boolean;
}

export function AnalystDashboard({ insights, monthlyData, transactions, isLoading }: AnalystDashboardProps) {
  const transactionColumns = [
    {
      key: 'created_at' as keyof TransactionWithAccounts,
      label: 'Data',
      sortable: true,
      render: (value: any) => format(new Date(value), 'dd/MM/yyyy HH:mm')
    },
    {
      key: 'type' as keyof TransactionWithAccounts,
      label: 'Tipo',
      sortable: true
    },
    {
      key: 'amount' as keyof TransactionWithAccounts,
      label: 'Valor',
      sortable: true,
      render: (value: number) => formatCurrency(value)
    },
    {
      key: 'source_account_name' as keyof TransactionWithAccounts,
      label: 'Conta Origem',
      sortable: true
    }
  ];

  return (
    <div className="space-y-6" data-tour="analyst-dashboard">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-4"
      >
        {/* Technical KPIs for Analyst */}
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Registros</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.transaction_count}</div>
            <p className="text-xs text-muted-foreground">Transações analisadas</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor Médio</CardTitle>
            <FileBarChart className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(insights.avg_transaction_amount)}</div>
            <p className="text-xs text-muted-foreground">Por transação</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Filtros Ativos</CardTitle>
            <Filter className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Nenhum filtro aplicado</p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Exportações</CardTitle>
            <Table2 className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">Relatórios gerados</p>
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
          <CardTitle className="flex items-center gap-2">
            <Table2 className="h-5 w-5" />
            Dados Detalhados de Transações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InteractiveTable 
            columns={transactionColumns}
            data={transactions.slice(0, 20)}
            searchable
          />
        </CardContent>
      </Card>
    </div>
  );
}
