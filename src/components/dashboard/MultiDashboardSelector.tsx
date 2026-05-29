import * as React from "react"
import { motion } from "framer-motion"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  TrendingUp, 
  Users, 
  Target, 
  BarChart3, 
  PieChart,
  Crown,
  Briefcase,
  Settings
} from "lucide-react"
import { cn } from "@/lib/utils"

export type DashboardProfile = "ceo" | "cfo" | "manager" | "analyst"

interface DashboardProfileConfig {
  id: DashboardProfile
  title: string
  description: string
  icon: React.ComponentType<any>
  color: string
  gradient: string
  features: string[]
}

const profileConfigs: DashboardProfileConfig[] = [
  {
    id: "ceo",
    title: "CEO / Executivo",
    description: "Visão estratégica e resumo executivo",
    icon: Crown,
    color: "text-primary",
    gradient: "from-primary/20 to-primary/5",
    features: ["KPIs Estratégicos", "Resumo Executivo", "Projeções", "Benchmarks"]
  },
  {
    id: "cfo", 
    title: "CFO / Financeiro",
    description: "Análise financeira detalhada e controles",
    icon: TrendingUp,
    color: "text-success",
    gradient: "from-success/20 to-success/5", 
    features: ["Fluxo de Caixa", "Análise de Riscos", "Compliance", "Auditoria"]
  },
  {
    id: "manager",
    title: "Gerente / Operacional", 
    description: "Gestão operacional e performance de equipe",
    icon: Briefcase,
    color: "text-accent",
    gradient: "from-accent/20 to-accent/5",
    features: ["Performance", "Metas", "Eficiência", "Controles"]
  },
  {
    id: "analyst",
    title: "Analista / Técnico",
    description: "Análise detalhada e relatórios técnicos",
    icon: BarChart3, 
    color: "text-support",
    gradient: "from-support/20 to-support/5",
    features: ["Dados Detalhados", "Relatórios", "Métricas", "Exportações"]
  }
]

interface MultiDashboardSelectorProps {
  selectedProfile: DashboardProfile
  onProfileChange: (profile: DashboardProfile) => void
  className?: string
}

export function MultiDashboardSelector({ 
  selectedProfile, 
  onProfileChange, 
  className 
}: MultiDashboardSelectorProps) {
  return (
    <div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
      {profileConfigs.map((profile, index) => {
        const Icon = profile.icon
        const isSelected = selectedProfile === profile.id
        
        return (
          <motion.div
            key={profile.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="cursor-pointer group"
            onClick={() => onProfileChange(profile.id)}
          >
            <Card className={cn(
              "h-full transition-all duration-300 hover:shadow-lg",
              isSelected 
                ? "ring-2 ring-primary shadow-lg scale-105" 
                : "hover:scale-102 hover:shadow-md"
            )}>
              <CardContent className="p-6">
                <div className={cn(
                  "w-12 h-12 rounded-2xl mb-4 flex items-center justify-center transition-all",
                  `bg-gradient-to-br ${profile.gradient}`,
                  isSelected && "scale-110"
                )}>
                  <Icon className={cn("h-6 w-6", profile.color)} />
                </div>
                
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-lg leading-tight">
                      {profile.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {profile.description}
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    {profile.features.map((feature, featureIndex) => (
                      <motion.div
                        key={feature}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (index * 0.1) + (featureIndex * 0.05) }}
                        className="flex items-center gap-2"
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isSelected ? profile.color.replace('text-', 'bg-') : "bg-muted"
                        )} />
                        <span className="text-xs text-muted-foreground">
                          {feature}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </div>
                
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <Badge className={cn("text-xs", profile.color)}>
                      Ativo
                    </Badge>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

export function getProfileConfig(profile: DashboardProfile) {
  return profileConfigs.find(config => config.id === profile) || profileConfigs[0]
}