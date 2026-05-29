import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { motion, AnimatePresence } from "framer-motion"
import { Info, TrendingUp, Calculator, Eye } from "lucide-react"
import { cn } from "@/lib/utils"

interface SmartTooltipProps {
  title: string
  description: string
  details?: string
  formula?: string
  example?: string
  trend?: "up" | "down" | "neutral"
  children: React.ReactNode
  side?: "top" | "right" | "bottom" | "left"
  className?: string
}

export function SmartTooltip({
  title,
  description,
  details,
  formula,
  example,
  trend,
  children,
  side = "top",
  className
}: SmartTooltipProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-3 w-3 text-success" />
      case "down":
        return <TrendingUp className="h-3 w-3 text-destructive rotate-180" />
      default:
        return null
    }
  }

  return (
    <TooltipPrimitive.Root open={isOpen} onOpenChange={setIsOpen} delayDuration={200}>
      <TooltipPrimitive.Trigger asChild>
        {children}
      </TooltipPrimitive.Trigger>
      
      <AnimatePresence>
        {isOpen && (
          <TooltipPrimitive.Portal forceMount>
            <TooltipPrimitive.Content
              side={side}
              sideOffset={8}
              className={cn(
                "z-50 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg",
                "max-w-sm p-0",
                className
              )}
              asChild
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: side === "top" ? 10 : -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: side === "top" ? 10 : -10 }}
                transition={{ duration: 0.15 }}
              >
                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    <h4 className="font-semibold text-sm">{title}</h4>
                    {getTrendIcon()}
                  </div>

                  {/* Main Description */}
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {description}
                  </p>

                  {/* Details */}
                  {details && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-start gap-2">
                        <Eye className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <p className="text-xs text-muted-foreground">
                          {details}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Formula */}
                  {formula && (
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-start gap-2">
                        <Calculator className="h-3 w-3 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Fórmula:</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {formula}
                          </code>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Example */}
                  {example && (
                    <div className="pt-2 border-t border-border/50">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Exemplo:</p>
                      <p className="text-xs text-muted-foreground italic">
                        {example}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            </TooltipPrimitive.Content>
          </TooltipPrimitive.Portal>
        )}
      </AnimatePresence>
    </TooltipPrimitive.Root>
  )
}

// Specialized tooltips for common financial metrics
export function MetricTooltip({ children, metricType }: { children: React.ReactNode, metricType: string }) {
  const getMetricInfo = (type: string) => {
    switch (type) {
      case "totalVolume":
        return {
          title: "Volume Total",
          description: "Soma absoluta de todas as transações no período selecionado, incluindo entradas e saídas.",
          formula: "Σ|valor_transação|",
          example: "Se teve R$1.000 de entrada e R$500 de saída, o volume total é R$1.500"
        }
      case "netBalance":
        return {
          title: "Saldo Líquido",
          description: "Diferença entre entradas e saídas, mostrando o resultado financeiro líquido.",
          formula: "Σ(entradas) - Σ(saídas)",
          example: "R$1.000 de entradas - R$500 de saídas = R$500 de saldo líquido"
        }
      case "avgTransaction":
        return {
          title: "Valor Médio por Transação",
          description: "Valor médio de cada transação, calculado dividindo o volume total pelo número de transações.",
          formula: "Volume Total ÷ Número de Transações",
          example: "R$1.500 em 10 transações = R$150 por transação em média"
        }
      case "transactionCount":
        return {
          title: "Número de Transações",
          description: "Quantidade total de movimentações financeiras registradas no período.",
          details: "Inclui todas as transações, independente do valor ou tipo."
        }
      default:
        return {
          title: "Métrica Financeira",
          description: "Indicador calculado com base nos dados das transações."
        }
    }
  }

  const info = getMetricInfo(metricType)

  return (
    <SmartTooltip {...info}>
      {children}
    </SmartTooltip>
  )
}