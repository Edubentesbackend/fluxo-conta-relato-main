import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu"
import { 
  Download, 
  FileText, 
  FileSpreadsheet, 
  Presentation,
  Image,
  Mail,
  Printer,
  Settings,
  Calendar,
  Filter
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ExportOption {
  id: string
  label: string
  description: string
  format: string
  icon: React.ComponentType<any>
  color: string
  premium?: boolean
}

const exportOptions: ExportOption[] = [
  {
    id: "pdf-executive",
    label: "PDF Executivo",
    description: "Relatório otimizado para apresentações C-Level",
    format: "PDF",
    icon: FileText,
    color: "text-primary",
    premium: true
  },
  {
    id: "excel-detailed", 
    label: "Excel Detalhado",
    description: "Planilha com dados completos e análises",
    format: "XLSX",
    icon: FileSpreadsheet,
    color: "text-success"
  },
  {
    id: "powerpoint",
    label: "PowerPoint",
    description: "Apresentação pronta para reuniões",
    format: "PPTX", 
    icon: Presentation,
    color: "text-warning",
    premium: true
  },
  {
    id: "image-high",
    label: "Imagem HD",
    description: "PNG de alta resolução dos gráficos",
    format: "PNG",
    icon: Image,
    color: "text-accent"
  }
]

const quickActions = [
  {
    id: "email",
    label: "Enviar por Email", 
    icon: Mail,
    color: "text-support"
  },
  {
    id: "print",
    label: "Imprimir",
    icon: Printer,
    color: "text-muted-foreground"
  },
  {
    id: "schedule",
    label: "Agendar Envio",
    icon: Calendar,
    color: "text-accent"
  }
]

interface ExportOptionsProps {
  className?: string
  onExport?: (option: ExportOption) => void
  onQuickAction?: (action: string) => void
}

export function ExportOptions({ className, onExport, onQuickAction }: ExportOptionsProps) {
  const [isExporting, setIsExporting] = React.useState<string | null>(null)

  const handleExport = async (option: ExportOption) => {
    setIsExporting(option.id)
    
    // Simulate export process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    onExport?.(option)
    setIsExporting(null)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={cn("gap-2", className)} disabled={!!isExporting}>
          {isExporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Exportando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Exportar
            </>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-2">
        <DropdownMenuLabel className="flex items-center gap-2 px-2 py-1.5">
          <Download className="h-4 w-4 text-primary" />
          Opções de Exportação
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {/* Export Formats */}
        <div className="space-y-1 mb-2">
          {exportOptions.map((option) => {
            const Icon = option.icon
            
            return (
              <DropdownMenuItem 
                key={option.id}
                className="p-0 focus:bg-transparent"
                onSelect={(e) => e.preventDefault()}
              >
                <div 
                  className="w-full p-3 rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => handleExport(option)}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-br from-background to-accent/10"
                    )}>
                      <Icon className={cn("h-5 w-5", option.color)} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{option.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {option.format}
                        </Badge>
                        {option.premium && (
                          <Badge className="text-xs bg-gradient-to-r from-primary to-accent text-white">
                            Premium
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </div>

        <DropdownMenuSeparator />

        {/* Quick Actions */}
        <DropdownMenuLabel className="text-xs font-medium text-muted-foreground px-2 py-1">
          Ações Rápidas
        </DropdownMenuLabel>
        
        {quickActions.map((action) => {
          const Icon = action.icon
          
          return (
            <DropdownMenuItem 
              key={action.id}
              className="gap-3 px-2 py-2 cursor-pointer"
              onClick={() => onQuickAction?.(action.id)}
            >
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Icon className={cn("h-4 w-4", action.color)} />
              </div>
              <span className="text-sm">{action.label}</span>
            </DropdownMenuItem>
          )
        })}

        <DropdownMenuSeparator />

        {/* Export Settings */}
        <DropdownMenuItem className="gap-3 px-2 py-2 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
            <Settings className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm">Configurações de Export</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Export format configurations
export const exportFormats = {
  "pdf-executive": {
    mimeType: "application/pdf",
    extension: ".pdf",
    options: {
      orientation: "portrait",
      format: "A4",
      margin: "1cm",
      headerTemplate: true,
      footerTemplate: true
    }
  },
  "excel-detailed": {
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", 
    extension: ".xlsx",
    options: {
      sheetName: "Relatório Financeiro",
      includeCharts: true,
      includePivotTables: true
    }
  },
  "powerpoint": {
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    extension: ".pptx", 
    options: {
      template: "corporate",
      includeNotes: true,
      slidesPerChart: 1
    }
  },
  "image-high": {
    mimeType: "image/png",
    extension: ".png",
    options: {
      width: 1920,
      height: 1080,
      quality: 100,
      backgroundColor: "white"
    }
  }
}