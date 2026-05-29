import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { 
  Activity, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  User, 
  CreditCard,
  RefreshCw,
  Zap
} from "lucide-react"
import { formatCurrency } from "@/utils/currency"
import { useTransactions } from "@/hooks/useTransactions"
import { format, isToday, isYesterday, formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ActivityFeedProps {
  className?: string
  limit?: number
}

export function ActivityFeed({ className, limit = 10 }: ActivityFeedProps) {
  const { data: transactions, isLoading, refetch } = useTransactions()
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const getActivityIcon = (amount: number, type?: string) => {
    if (amount > 0) {
      return <ArrowUpRight className="h-4 w-4 text-success" />
    } else {
      return <ArrowDownLeft className="h-4 w-4 text-destructive" />
    }
  }

  const getActivityColor = (amount: number) => {
    return amount > 0 ? "success" : "destructive"
  }

  const formatActivityDate = (date: string) => {
    const activityDate = new Date(date)
    
    if (isToday(activityDate)) {
      return `Hoje, ${format(activityDate, 'HH:mm')}`
    } else if (isYesterday(activityDate)) {
      return `Ontem, ${format(activityDate, 'HH:mm')}`
    } else {
      return formatDistanceToNow(activityDate, { 
        addSuffix: true, 
        locale: ptBR 
      })
    }
  }

  const getActivityType = (description: string, amount: number) => {
    const lowerDesc = description.toLowerCase()
    
    if (lowerDesc.includes('pix')) return { type: 'PIX', icon: Zap }
    if (lowerDesc.includes('ted') || lowerDesc.includes('doc')) return { type: 'Transferência', icon: ArrowUpRight }
    if (lowerDesc.includes('cartão') || lowerDesc.includes('card')) return { type: 'Cartão', icon: CreditCard }
    if (amount > 0) return { type: 'Entrada', icon: ArrowUpRight }
    return { type: 'Saída', icon: ArrowDownLeft }
  }

  const recentTransactions = React.useMemo(() => {
    if (!transactions) return []
    
    return [...transactions]
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
      .slice(0, limit)
  }, [transactions, limit])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Feed de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-muted animate-pulse rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                  <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
                </div>
                <div className="h-6 bg-muted animate-pulse rounded w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Feed de Atividades
            <Badge variant="outline" className="ml-2">
              Tempo Real
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {recentTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="font-medium text-muted-foreground mb-2">
              Nenhuma atividade encontrada
            </h3>
            <p className="text-sm text-muted-foreground">
              As transações aparecerão aqui conforme forem registradas.
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <AnimatePresence>
              <div className="space-y-4">
                {recentTransactions.map((transaction, index) => {
                  const activityType = getActivityType(transaction.description, parseFloat(transaction.amount.toString()))
                  const amount = parseFloat(transaction.amount.toString())
                  
                  return (
                    <motion.div
                      key={transaction.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center gap-4 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      {/* Activity Icon */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        amount > 0 ? 'bg-success/10' : 'bg-destructive/10'
                      }`}>
                        {getActivityIcon(amount)}
                      </div>

                      {/* Activity Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">
                            {transaction.description}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {activityType.type}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">
                              {transaction.source_account_name || 'Conta não identificada'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>
                              {formatActivityDate(transaction.transaction_date)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Amount */}
                      <div className="text-right">
                        <p className={`font-bold ${
                          amount > 0 ? 'text-success' : 'text-destructive'
                        }`}>
                          {amount > 0 ? '+' : ''}{formatCurrency(Math.abs(amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {amount > 0 ? 'Entrada' : 'Saída'}
                        </p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </AnimatePresence>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  )
}