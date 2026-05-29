import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartTooltip } from "@/components/ui/smart-tooltip"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, Calendar, Activity } from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { useTransactions } from "@/hooks/useTransactions"
import { format, startOfDay, eachDayOfInterval, subDays, getDay } from "date-fns"
import { ptBR } from "date-fns/locale"

interface HeatmapChartProps {
  className?: string
  weeks?: number
}

interface DayData {
  date: Date
  dayOfWeek: number
  amount: number
  transactionCount: number
  intensity: number
  formattedDate: string
}

export function HeatmapChart({ className, weeks = 12 }: HeatmapChartProps) {
  const { data: transactions, isLoading } = useTransactions()

  const heatmapData = React.useMemo(() => {
    if (!transactions) return []

    const endDate = new Date()
    const startDate = subDays(endDate, weeks * 7)
    
    // Create array of all days in the period
    const allDays = eachDayOfInterval({ start: startDate, end: endDate })
    
    // Group transactions by date
    const transactionsByDate = transactions.reduce((acc, transaction) => {
      const date = format(startOfDay(new Date(transaction.transaction_date)), 'yyyy-MM-dd')
      if (!acc[date]) {
        acc[date] = { amount: 0, count: 0 }
      }
      acc[date].amount += Math.abs(parseFloat(transaction.amount.toString()))
      acc[date].count += 1
      return acc
    }, {} as Record<string, { amount: number; count: number }>)

    // Calculate max amount for intensity normalization
    const maxAmount = Math.max(...Object.values(transactionsByDate).map(d => d.amount), 1)

    // Create heatmap data
    return allDays.map(date => {
      const dateKey = format(date, 'yyyy-MM-dd')
      const dayData = transactionsByDate[dateKey] || { amount: 0, count: 0 }
      
      return {
        date,
        dayOfWeek: getDay(date),
        amount: dayData.amount,
        transactionCount: dayData.count,
        intensity: dayData.amount / maxAmount,
        formattedDate: format(date, 'dd/MM/yyyy')
      } as DayData
    })
  }, [transactions, weeks])

  const getIntensityColor = (intensity: number) => {
    if (intensity === 0) return 'bg-muted/30'
    if (intensity <= 0.2) return 'bg-primary/20'
    if (intensity <= 0.4) return 'bg-primary/40'
    if (intensity <= 0.6) return 'bg-primary/60'
    if (intensity <= 0.8) return 'bg-primary/80'
    return 'bg-primary'
  }

  const getWeeksData = () => {
    const weeksData: DayData[][] = []
    let currentWeek: DayData[] = []

    heatmapData.forEach((day, index) => {
      if (day.dayOfWeek === 0 && currentWeek.length > 0) {
        // Start new week on Sunday
        weeksData.push([...currentWeek])
        currentWeek = []
      }
      currentWeek.push(day)
      
      if (index === heatmapData.length - 1) {
        weeksData.push(currentWeek)
      }
    })

    return weeksData
  }

  const weekLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const weeksData = getWeeksData()
  const totalAmount = heatmapData.reduce((sum, day) => sum + day.amount, 0)
  const totalTransactions = heatmapData.reduce((sum, day) => sum + day.transactionCount, 0)
  const activeDays = heatmapData.filter(day => day.amount > 0).length

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Mapa de Calor de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-7 gap-1">
              {[...Array(7 * weeks)].map((_, i) => (
                <div key={i} className="w-4 h-4 bg-muted animate-pulse rounded-sm" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Mapa de Calor de Atividades
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Últimas {weeks} semanas</span>
            </div>
            <Badge variant="outline">
              {activeDays} dias ativos
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-primary/5 border border-primary/10">
            <p className="text-2xl font-bold text-primary">{formatCurrency(totalAmount)}</p>
            <p className="text-sm text-muted-foreground">Volume Total</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-success/5 border border-success/10">
            <p className="text-2xl font-bold text-success">{totalTransactions}</p>
            <p className="text-sm text-muted-foreground">Transações</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-warning/5 border border-warning/10">
            <p className="text-2xl font-bold text-warning">
              {totalTransactions > 0 ? formatCurrency(totalAmount / totalTransactions) : 'R$ 0,00'}
            </p>
            <p className="text-sm text-muted-foreground">Média por Transação</p>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="space-y-2">
          {/* Week day labels */}
          <div className="grid grid-cols-8 gap-1 text-xs text-muted-foreground">
            <div></div> {/* Empty cell for alignment */}
            {weekLabels.map(label => (
              <div key={label} className="text-center py-1">
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap rows by week */}
          <div className="space-y-1">
            {weeksData.map((week, weekIndex) => (
              <motion.div
                key={weekIndex}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: weekIndex * 0.05 }}
                className="grid grid-cols-8 gap-1"
              >
                {/* Week number */}
                <div className="text-xs text-muted-foreground text-right py-1 pr-2">
                  {format(week[0]?.date || new Date(), 'MMM', { locale: ptBR })}
                </div>

                {/* Days of the week */}
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const dayData = week.find(d => d.dayOfWeek === dayIndex)
                  
                  if (!dayData) {
                    return <div key={dayIndex} className="w-4 h-4" />
                  }

                  return (
                    <SmartTooltip
                      key={dayIndex}
                      title={`Atividade - ${dayData.formattedDate}`}
                      description={`${dayData.transactionCount} transações totalizando ${formatCurrency(dayData.amount)}`}
                      details={`Intensidade: ${(dayData.intensity * 100).toFixed(1)}% do máximo diário`}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: (weekIndex * 7 + dayIndex) * 0.01 }}
                        className={`w-4 h-4 rounded-sm cursor-pointer transition-all hover:scale-110 border border-border/50 ${getIntensityColor(dayData.intensity)}`}
                      />
                    </SmartTooltip>
                  )
                })}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Menos</span>
          <div className="flex items-center gap-1">
            {[0, 0.2, 0.4, 0.6, 0.8, 1].map(intensity => (
              <div
                key={intensity}
                className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)}`}
              />
            ))}
          </div>
          <span>Mais</span>
        </div>
      </CardContent>
    </Card>
  )
}