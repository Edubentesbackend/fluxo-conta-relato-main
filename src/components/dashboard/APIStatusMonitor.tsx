import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { 
  Activity, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  Clock,
  Database,
  Cloud,
  Webhook
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface APIService {
  id: string
  name: string
  status: "online" | "warning" | "offline"
  responseTime: number
  uptime: number
  lastCheck: Date
  description: string
  icon: React.ComponentType<any>
}

interface WebhookActivity {
  id: string
  endpoint: string
  method: string
  status: number
  timestamp: Date
  duration: number
}

const mockServices: APIService[] = [
  {
    id: "database",
    name: "Banco de Dados",
    status: "online",
    responseTime: 45,
    uptime: 99.8,
    lastCheck: new Date(),
    description: "Conexão principal Supabase",
    icon: Database
  },
  {
    id: "auth",
    name: "Autenticação",
    status: "online", 
    responseTime: 23,
    uptime: 99.9,
    lastCheck: new Date(),
    description: "Serviço de autenticação",
    icon: CheckCircle
  },
  {
    id: "storage",
    name: "Armazenamento",
    status: "warning",
    responseTime: 156,
    uptime: 98.5,
    lastCheck: new Date(),
    description: "Serviço de arquivos",
    icon: Cloud
  }
]

const mockWebhooks: WebhookActivity[] = [
  {
    id: "1",
    endpoint: "/api/transactions/webhook",
    method: "POST",
    status: 200,
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
    duration: 142
  },
  {
    id: "2", 
    endpoint: "/api/accounts/sync",
    method: "GET",
    status: 200,
    timestamp: new Date(Date.now() - 1000 * 60 * 15),
    duration: 89
  },
  {
    id: "3",
    endpoint: "/api/reports/generate", 
    method: "POST",
    status: 500,
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    duration: 5000
  }
]

interface APIStatusMonitorProps {
  className?: string
}

export function APIStatusMonitor({ className }: APIStatusMonitorProps) {
  const [services, setServices] = React.useState<APIService[]>(mockServices)
  const [webhooks, setWebhooks] = React.useState<WebhookActivity[]>(mockWebhooks)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState<"services" | "webhooks">("services")

  const handleRefresh = async () => {
    setIsRefreshing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    // Update timestamps
    setServices(prev => prev.map(service => ({
      ...service,
      lastCheck: new Date(),
      responseTime: Math.floor(Math.random() * 100) + 20
    })))
    
    setIsRefreshing(false)
  }

  const getStatusColor = (status: APIService["status"]) => {
    switch (status) {
      case "online": return "default"
      case "warning": return "secondary"  
      case "offline": return "destructive"
      default: return "outline"
    }
  }

  const getStatusIcon = (status: APIService["status"]) => {
    switch (status) {
      case "online": return <CheckCircle className="h-4 w-4" />
      case "warning": return <AlertTriangle className="h-4 w-4" />
      case "offline": return <XCircle className="h-4 w-4" />
    }
  }

  const getWebhookStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "default"
    if (status >= 400 && status < 500) return "secondary"
    if (status >= 500) return "destructive"
    return "outline"
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Status das Integrações
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
        
        {/* Tab Selector */}
        <div className="flex gap-2 mt-4">
          {[
            { id: "services", label: "Serviços", count: services.length },
            { id: "webhooks", label: "Webhooks", count: webhooks.length }
          ].map(({ id, label, count }) => (
            <Button
              key={id}
              variant={activeTab === id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTab(id as any)}
              className="gap-2"
            >
              {label}
              <Badge variant="secondary" className="text-xs">
                {count}
              </Badge>
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {/* Services Tab */}
          {activeTab === "services" && (
            <motion.div
              key="services"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {services.map((service, index) => {
                const Icon = service.icon
                
                return (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-4 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          service.status === 'online' ? 'bg-success/10' : 
                          service.status === 'warning' ? 'bg-warning/10' : 'bg-destructive/10'
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        
                        <div>
                          <h4 className="font-semibold">{service.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {service.description}
                          </p>
                        </div>
                      </div>
                      
                      <Badge variant={getStatusColor(service.status)} className="gap-1">
                        {getStatusIcon(service.status)}
                        {service.status === 'online' ? 'Online' : 
                         service.status === 'warning' ? 'Atenção' : 'Offline'}
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Resposta</span>
                        <p className="font-medium">{service.responseTime}ms</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Uptime</span>
                        <p className="font-medium">{service.uptime}%</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Última verificação</span>
                        <p className="font-medium">
                          {format(service.lastCheck, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          )}

          {/* Webhooks Tab */}
          {activeTab === "webhooks" && (
            <motion.div
              key="webhooks"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {webhooks.map((webhook, index) => (
                    <motion.div
                      key={webhook.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <Webhook className="h-4 w-4 text-primary" />
                          </div>
                          
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {webhook.method}
                              </Badge>
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {webhook.endpoint}
                              </code>
                            </div>
                          </div>
                        </div>
                        
                        <Badge variant={getWebhookStatusColor(webhook.status)}>
                          {webhook.status}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(webhook.timestamp, 'HH:mm:ss', { locale: ptBR })}
                        </div>
                        <div>
                          Duração: {webhook.duration}ms
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  )
}