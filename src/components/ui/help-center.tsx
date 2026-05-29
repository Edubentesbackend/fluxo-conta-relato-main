import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { 
  HelpCircle, 
  Search, 
  Book, 
  Video, 
  MessageSquare, 
  Phone, 
  Mail,
  ChevronRight,
  ExternalLink
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FAQItem {
  id: string
  question: string
  answer: string
  category: string
  tags: string[]
}

const faqData: FAQItem[] = [
  {
    id: "1",
    question: "Como interpretar os gráficos de fluxo de caixa?",
    answer: "Os gráficos mostram entradas (verde) e saídas (vermelho) de dinheiro ao longo do tempo. A linha azul representa o saldo acumulado. Valores positivos indicam lucro, negativos indicam déficit.",
    category: "Relatórios",
    tags: ["gráfico", "fluxo", "caixa", "análise"]
  },
  {
    id: "2", 
    question: "O que significa o Score de Performance?",
    answer: "O Score é calculado com base na consistência de entradas, controle de gastos e crescimento do saldo. Scores acima de 80 indicam saúde financeira excelente.",
    category: "Dashboard",
    tags: ["score", "performance", "kpi", "métrica"]
  },
  {
    id: "3",
    question: "Como configurar alertas de segurança?",
    answer: "Acesse Configurações > Segurança para definir limites de transação e ativar notificações para atividades suspeitas ou valores acima do limite estabelecido.",
    category: "Segurança",
    tags: ["alerta", "segurança", "notificação", "limite"]
  },
  {
    id: "4",
    question: "Como exportar relatórios para apresentação?",
    answer: "Use o botão 'Exportar' nos relatórios e escolha o formato desejado: PDF Executivo para apresentações, Excel para análise detalhada, ou PowerPoint para reuniões.",
    category: "Exportação",
    tags: ["exportar", "pdf", "excel", "powerpoint"]
  }
]

const categories = ["Todos", "Dashboard", "Relatórios", "Segurança", "Exportação"]

const videoTutorials = [
  {
    id: "1",
    title: "Introdução ao Dashboard",
    duration: "3:45",
    thumbnail: "/api/placeholder/300/200",
    description: "Aprenda a navegar pelo dashboard e interpretar os principais KPIs"
  },
  {
    id: "2", 
    title: "Análise Avançada de Relatórios",
    duration: "7:22",
    description: "Como usar filtros avançados e interpretar gráficos complexos"
  }
]

interface HelpCenterProps {
  trigger?: React.ReactNode | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function HelpCenter({ trigger, open: controlledOpen, onOpenChange }: HelpCenterProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const [searchTerm, setSearchTerm] = React.useState("")
  const [selectedCategory, setSelectedCategory] = React.useState("Todos")
  const [activeTab, setActiveTab] = React.useState<"faq" | "videos" | "contact">("faq")
  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  const filteredFAQs = React.useMemo(() => {
    return faqData.filter(item => {
      const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      const matchesCategory = selectedCategory === "Todos" || item.category === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [searchTerm, selectedCategory])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="ghost" size="sm" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              Central de Ajuda
            </Button>
          )}
        </DialogTrigger>
      )}
      
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Book className="h-5 w-5 text-primary" />
            Central de Ajuda
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[70vh]">
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 p-1 bg-muted rounded-lg">
            {[
              { id: "faq", label: "FAQ", icon: MessageSquare },
              { id: "videos", label: "Vídeos", icon: Video },
              { id: "contact", label: "Contato", icon: Phone }
            ].map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(id as any)}
                className="gap-2 flex-1"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>

          {/* Search Bar */}
          {(activeTab === "faq" || activeTab === "videos") && (
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Buscar ${activeTab === "faq" ? "perguntas" : "vídeos"}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          <ScrollArea className="flex-1">
            <AnimatePresence mode="wait">
              {/* FAQ Tab */}
              {activeTab === "faq" && (
                <motion.div
                  key="faq"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  {/* Category Filters */}
                  <div className="flex gap-2 flex-wrap mb-6">
                    {categories.map(category => (
                      <Badge
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategory(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>

                  {/* FAQ Items */}
                  <div className="space-y-3">
                    {filteredFAQs.map((faq, index) => (
                      <motion.div
                        key={faq.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <Card className="border-l-4 border-l-primary/50 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h4 className="font-semibold text-foreground">{faq.question}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {faq.category}
                              </Badge>
                            </div>
                            <p className="text-muted-foreground leading-relaxed mb-3">
                              {faq.answer}
                            </p>
                            <div className="flex gap-1 flex-wrap">
                              {faq.tags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Videos Tab */}
              {activeTab === "videos" && (
                <motion.div
                  key="videos"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid gap-4 md:grid-cols-2"
                >
                  {videoTutorials.map(video => (
                    <Card key={video.id} className="overflow-hidden hover:shadow-md transition-shadow">
                      <div className="aspect-video bg-muted flex items-center justify-center">
                        <Video className="h-12 w-12 text-muted-foreground" />
                      </div>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold">{video.title}</h4>
                          <Badge variant="outline">{video.duration}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">
                          {video.description}
                        </p>
                        <Button size="sm" className="gap-2">
                          Assistir
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>
              )}

              {/* Contact Tab */}
              {activeTab === "contact" && (
                <motion.div
                  key="contact"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="grid gap-4 md:grid-cols-2"
                >
                  <Card className="p-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="font-semibold mb-2">Email</h3>
                      <p className="text-muted-foreground mb-4">
                        Resposta em até 24 horas
                      </p>
                      <Button className="gap-2">
                        <Mail className="h-4 w-4" />
                        Enviar Email
                      </Button>
                    </div>
                  </Card>

                  <Card className="p-6">
                    <div className="text-center">
                      <div className="w-12 h-12 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-6 w-6 text-accent" />
                      </div>
                      <h3 className="font-semibold mb-2">Chat</h3>
                      <p className="text-muted-foreground mb-4">
                        Suporte online em tempo real
                      </p>
                      <Button variant="outline" className="gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Iniciar Chat
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}
