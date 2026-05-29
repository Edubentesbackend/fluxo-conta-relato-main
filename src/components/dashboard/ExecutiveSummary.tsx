import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { SmartTooltip } from "@/components/ui/smart-tooltip"
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  AlertTriangle, 
  CheckCircle2,
  Brain,
  Zap
} from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { TransactionInsights, MonthlyVolume } from "@/hooks/useReportsData"

interface ExecutiveSummaryProps {
  insights: TransactionInsights
  monthlyData: MonthlyVolume[]
  isLoading?: boolean
  aiSummary?: string
  aiLoading?: boolean
}

export function ExecutiveSummary({ insights, monthlyData, isLoading, aiSummary, aiLoading }: ExecutiveSummaryProps) {
  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>Resumo Executivo</CardTitle>
            <div className="flex items-center gap-1">
              <Zap className="h-4 w-4 animate-pulse text-warning" />
              <span className="text-sm text-muted-foreground">Analisando...</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate executive insights
  const calculateTrend = () => {
    if (monthlyData.length < 2) return { direction: "neutral" as const, percentage: 0 }
    
    const current = monthlyData[monthlyData.length - 1]?.total_volume || 0
    const previous = monthlyData[monthlyData.length - 2]?.total_volume || 0
    
    if (previous === 0) return { direction: "neutral" as const, percentage: 0 }
    
    const percentage = ((current - previous) / previous) * 100
    return {
      direction: percentage > 0 ? "up" as const : percentage < 0 ? "down" as const : "neutral" as const,
      percentage: Math.abs(percentage)
    }
  }

  const calculateHealthScore = () => {
    const avgTransaction = parseFloat(insights.avg_transaction_amount.toString())
    const totalTransactions = insights.transaction_count
    const hasRegularActivity = totalTransactions > 10
    const hasHealthyAverage = avgTransaction > 100
    
    let score = 0
    if (hasRegularActivity) score += 40
    if (hasHealthyAverage) score += 30
    if (insights.total_volume > 10000) score += 30
    
    return Math.min(score, 100)
  }

  const generateAIInsights = () => {
    const trend = calculateTrend()
    const avgTransaction = parseFloat(insights.avg_transaction_amount.toString())
    const insights_arr = []

    // Volume insight
    if (trend.direction === "up" && trend.percentage > 10) {
      insights_arr.push({
        type: "positive",
        title: "Crescimento Acelerado",
        description: `Volume aumentou ${trend.percentage.toFixed(1)}% no último mês - tendência muito positiva.`,
        icon: TrendingUp,
        priority: "high"
      })
    } else if (trend.direction === "down" && trend.percentage > 15) {
      insights_arr.push({
        type: "warning",
        title: "Declínio Significativo",
        description: `Volume caiu ${trend.percentage.toFixed(1)}% no último mês - requer atenção.`,
        icon: TrendingDown,
        priority: "high"
      })
    }

    // Transaction pattern insight
    if (avgTransaction > 1000) {
      insights_arr.push({
        type: "positive",
        title: "Transações de Alto Valor",
        description: `Valor médio de ${formatCurrency(avgTransaction)} indica operações premium.`,
        icon: DollarSign,
        priority: "medium"
      })
    }

    // Activity insight
    if (insights.transaction_count < 5) {
      insights_arr.push({
        type: "neutral",
        title: "Atividade Baixa",
        description: "Poucas transações registradas. Considere estratégias de aumento de volume.",
        icon: AlertTriangle,
        priority: "medium"
      })
    } else if (insights.transaction_count > 50) {
      insights_arr.push({
        type: "positive",
        title: "Alta Atividade",
        description: `${insights.transaction_count} transações indicam operação muito ativa.`,
        icon: CheckCircle2,
        priority: "low"
      })
    }

    return insights_arr.slice(0, 3) // Max 3 insights
  }

  const trend = calculateTrend()
  const healthScore = calculateHealthScore()
  const aiInsights = generateAIInsights()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="col-span-full border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Brain className="h-5 w-5 text-primary" />
              </motion.div>
              <CardTitle className="text-xl">Resumo Executivo Inteligente</CardTitle>
            </div>
            <Badge variant="outline" className="gap-1">
              <Zap className="h-3 w-3" />
              IA Analytics
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SmartTooltip
              title="Volume Total Analisado"
              description="Soma de todas as transações no período, indicando o volume de negócios."
            >
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Volume Total</p>
                    <p className="text-2xl font-bold text-primary">
                      {formatCurrency(parseFloat(insights.total_volume.toString()))}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-primary/60" />
                </div>
              </div>
            </SmartTooltip>

            <SmartTooltip
              title="Score de Saúde Financeira"
              description="Pontuação baseada em volume, frequência e padrões de transação."
              formula="(atividade * 0.4) + (valor_médio * 0.3) + (volume * 0.3)"
            >
              <div className="p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Health Score</p>
                    <p className="text-2xl font-bold text-success">{healthScore}%</p>
                  </div>
                  <Target className="h-8 w-8 text-success/60" />
                </div>
                <Progress value={healthScore} className="h-2" />
              </div>
            </SmartTooltip>

            <SmartTooltip
              title="Tendência Mensal"
              description="Variação percentual do volume em relação ao mês anterior."
              trend={trend.direction}
            >
              <div className={`p-4 rounded-lg border ${
                trend.direction === "up" ? "bg-success/10 border-success/20" :
                trend.direction === "down" ? "bg-destructive/10 border-destructive/20" :
                "bg-muted/10 border-muted/20"
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Tendência</p>
                    <div className="flex items-center gap-1">
                      {trend.direction === "up" && <TrendingUp className="h-4 w-4 text-success" />}
                      {trend.direction === "down" && <TrendingDown className="h-4 w-4 text-destructive" />}
                      <p className={`text-2xl font-bold ${
                        trend.direction === "up" ? "text-success" :
                        trend.direction === "down" ? "text-destructive" :
                        "text-muted-foreground"
                      }`}>
                        {trend.percentage > 0 ? `${trend.percentage.toFixed(1)}%` : "Estável"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </SmartTooltip>
          </div>

          {aiSummary && (
            <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Insights Claude
              </h4>
              <p className="text-sm text-muted-foreground whitespace-pre-line">
                {aiSummary}
              </p>
            </div>
          )}

          {aiLoading && !aiSummary && (
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-muted-foreground">
              Gerando insights com Claude...
            </div>
          )}

          {/* AI Insights */}
          {!aiSummary && aiInsights.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-lg flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                Insights Inteligentes
              </h4>
              
              <div className="space-y-3">
                {aiInsights.map((insight, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`p-4 rounded-lg border-l-4 ${
                      insight.type === "positive" ? "bg-success/5 border-l-success" :
                      insight.type === "warning" ? "bg-warning/5 border-l-warning" :
                      "bg-muted/5 border-l-muted"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <insight.icon className={`h-5 w-5 mt-0.5 ${
                        insight.type === "positive" ? "text-success" :
                        insight.type === "warning" ? "text-warning" :
                        "text-muted-foreground"
                      }`} />
                      <div>
                        <h5 className="font-medium">{insight.title}</h5>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
