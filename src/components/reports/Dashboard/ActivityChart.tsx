import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Area, AreaChart } from "recharts";
import { MonthlyVolume } from "@/hooks/useReportsData";
import { formatCurrency } from "@/utils/currency";
import { CalendarIcon, TrendingUp, BarChart3, MousePointer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BankStatementModal } from './BankStatementModal';
import { useTransactions } from '@/hooks/useTransactions';

interface ActivityChartProps {
  data: MonthlyVolume[];
  isLoading?: boolean;
  filters?: any;
}

export const ActivityChart = ({ data, isLoading, filters }: ActivityChartProps) => {
  const [selectedPeriod, setSelectedPeriod] = useState<{
    month: string;
    year: string;
    monthYear: string;
  } | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Hook para buscar transações do período selecionado
  const { data: periodTransactions } = useTransactions(
    selectedPeriod ? {
      ...filters,
      startDate: new Date(parseInt(selectedPeriod.year), parseInt(selectedPeriod.month) - 1, 1),
      endDate: new Date(parseInt(selectedPeriod.year), parseInt(selectedPeriod.month), 0, 23, 59, 59, 999)
    } : undefined
  );

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      const [year, month] = payload.month_year.split('-');
      
      setSelectedPeriod({
        month,
        year,
        monthYear: payload.month_year
      });
      setIsModalOpen(true);
    }
  };
  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2 animate-fade-in">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-48"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded"></div>
          </CardContent>
        </Card>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-40"></div>
          </CardHeader>
          <CardContent>
            <div className="h-80 bg-muted rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedData = data.map(item => {
    const [year, month] = item.month_year.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return {
      ...item,
      month_year_formatted: date.toLocaleDateString('pt-BR', {
        month: 'short',
        year: '2-digit'
      }),
      total_volume_number: parseFloat(item.total_volume.toString())
    };
  });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card/95 backdrop-blur-sm border border-border rounded-lg p-4 shadow-large">
          <p className="font-medium text-foreground mb-2">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name === 'total_volume_number' ? 'Volume' : entry.name}: {' '}
              {entry.name === 'total_volume_number' 
                ? formatCurrency(entry.value) 
                : entry.value
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const totalVolume = formattedData.reduce((sum, item) => sum + item.total_volume_number, 0);
  const totalTransactions = formattedData.reduce((sum, item) => sum + item.transaction_count, 0);

  // Preparar dados do modal
  const modalData = selectedPeriod && periodTransactions ? {
    month: selectedPeriod.month.padStart(2, '0'),
    year: selectedPeriod.year,
    transactions: periodTransactions,
    totalVolume: periodTransactions.reduce((sum, t) => sum + t.amount, 0),
    transactionCount: periodTransactions.length
  } : null;

  return (
    <div className="space-y-6 animate-fade-in-delayed">
      {/* Modal do extrato */}
      <BankStatementModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        periodData={modalData}
      />
      {/* Stats Summary */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        <Card className="border-0 shadow-soft bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Período</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(totalVolume)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-soft bg-gradient-to-br from-accent/5 to-accent/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transações</p>
                <p className="text-2xl font-bold text-accent">{totalTransactions}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-accent/60" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-soft bg-gradient-to-br from-warning/5 to-warning/10">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Média Mensal</p>
                <p className="text-2xl font-bold text-warning-foreground">
                  {formatCurrency(totalVolume / (formattedData.length || 1))}
                </p>
              </div>
              <CalendarIcon className="h-8 w-8 text-warning/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {/* Volume Evolution Chart */}
        <Card className="overflow-hidden shadow-medium hover-lift group cursor-pointer transition-all duration-300 hover:shadow-large">
          <div className="h-1 gradient-primary"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 group-hover:text-primary transition-colors">
              <TrendingUp className="h-5 w-5 text-primary" />
              Evolução do Volume
              <Badge variant="outline" className="ml-2">
                {formattedData.length} meses
              </Badge>
              <Badge className="ml-auto gradient-primary text-white shadow-soft animate-bounce-subtle">
                <MousePointer className="h-3 w-3 mr-1" />
                Clique para detalhes
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={formattedData} onClick={handleChartClick}>
                <defs>
                  <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month_year_formatted" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="total_volume_number" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  fill="url(#volumeGradient)"
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{ 
                    r: 8, 
                    stroke: "hsl(var(--primary))", 
                    strokeWidth: 3,
                    fill: "hsl(var(--card))",
                    cursor: 'pointer'
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Transaction Count Chart */}
        <Card className="overflow-hidden shadow-medium hover-lift group cursor-pointer transition-all duration-300 hover:shadow-large">
          <div className="h-1 gradient-accent"></div>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 group-hover:text-accent transition-colors">
              <BarChart3 className="h-5 w-5 text-accent" />
              Número de Transações
              <Badge variant="outline" className="ml-2">
                Mensal
              </Badge>
              <Badge className="ml-auto gradient-accent text-white shadow-soft animate-bounce-subtle">
                <MousePointer className="h-3 w-3 mr-1" />
                Clique para extrato
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={formattedData} barCategoryGap="20%" onClick={handleChartClick}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.9}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="month_year_formatted" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                />
                <Bar 
                  dataKey="transaction_count" 
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                  name="Transações"
                  cursor="pointer"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};