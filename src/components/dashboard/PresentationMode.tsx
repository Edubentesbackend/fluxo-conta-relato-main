import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Presentation, Maximize2, Minimize2, X } from "lucide-react"

interface PresentationModeProps {
  children: React.ReactNode
  isActive: boolean
  onToggle: () => void
}

export function PresentationMode({ children, isActive, onToggle }: PresentationModeProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isActive) {
        onToggle()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isActive, onToggle])

  React.useEffect(() => {
    if (isActive) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }, [isActive])

  return (
    <>
      <Button
        variant={isActive ? "destructive" : "outline"}
        size="sm"
        onClick={onToggle}
        className="gap-2"
      >
        {isActive ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        {isActive ? "Sair" : "Apresentação"}
      </Button>

      <AnimatePresence>
        {isActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background overflow-auto"
          >
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Presentation className="h-3 w-3" />
                Modo Apresentação
              </Badge>
              <Button variant="ghost" size="sm" onClick={onToggle}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-8 max-w-7xl mx-auto">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}