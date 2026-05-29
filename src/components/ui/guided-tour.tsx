import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, ArrowRight, ArrowLeft, Play, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"

interface TourStep {
  id: string
  title: string
  content: string
  target: string
  position: "top" | "bottom" | "left" | "right"
  highlight?: boolean
}

interface GuidedTourProps {
  steps: TourStep[]
  isOpen: boolean
  onClose: () => void
  onComplete?: () => void
}

export function GuidedTour({ steps, isOpen, onClose, onComplete }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = React.useState(0)
  const [targetPosition, setTargetPosition] = React.useState({ x: 0, y: 0, width: 0, height: 0 })

  React.useEffect(() => {
    if (!isOpen || !steps[currentStep]) return

    const updatePosition = () => {
      const targetElement = document.querySelector(steps[currentStep].target)
      if (targetElement) {
        const rect = targetElement.getBoundingClientRect()
        setTargetPosition({
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height
        })

        // Smooth scroll to target element
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'center'
        })

        if (steps[currentStep].highlight) {
          targetElement.classList.add('tour-highlight')
        }
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
      document.querySelectorAll('.tour-highlight').forEach(el => {
        el.classList.remove('tour-highlight')
      })
    }
  }, [currentStep, isOpen, steps])

  // Keyboard navigation
  React.useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        nextStep()
      } else if (e.key === 'ArrowLeft') {
        prevStep()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentStep])

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete?.()
      onClose()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const getTooltipPosition = () => {
    const step = steps[currentStep]
    const offset = 20

    switch (step.position) {
      case "top":
        return {
          left: targetPosition.x + targetPosition.width / 2,
          top: targetPosition.y - offset,
          transform: "translate(-50%, -100%)"
        }
      case "bottom":
        return {
          left: targetPosition.x + targetPosition.width / 2,
          top: targetPosition.y + targetPosition.height + offset,
          transform: "translate(-50%, 0%)"
        }
      case "left":
        return {
          left: targetPosition.x - offset,
          top: targetPosition.y + targetPosition.height / 2,
          transform: "translate(-100%, -50%)"
        }
      case "right":
        return {
          left: targetPosition.x + targetPosition.width + offset,
          top: targetPosition.y + targetPosition.height / 2,
          transform: "translate(0%, -50%)"
        }
      default:
        return {
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)"
        }
    }
  }

  if (!isOpen) return null

  const progress = ((currentStep + 1) / steps.length) * 100

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50">
        {/* Overlay with backdrop blur */}
        <motion.div
          initial={{ opacity: 0, backdropFilter: "blur(0px)" }}
          animate={{ opacity: 1, backdropFilter: "blur(4px)" }}
          exit={{ opacity: 0, backdropFilter: "blur(0px)" }}
          className="absolute inset-0 bg-black/70"
          onClick={onClose}
        />
        
        {/* Spotlight with pulse animation */}
        {steps[currentStep]?.highlight && (
          <>
            <motion.div
              key={`spotlight-${currentStep}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="absolute pointer-events-none"
              style={{
                left: targetPosition.x - 8,
                top: targetPosition.y - 8,
                width: targetPosition.width + 16,
                height: targetPosition.height + 16,
                boxShadow: "0 0 0 4px hsl(var(--primary) / 0.5), 0 0 20px 8px hsl(var(--primary) / 0.2), 0 0 0 9999px rgba(0, 0, 0, 0.75)",
                borderRadius: "12px",
                background: "transparent"
              }}
            />
            <motion.div
              animate={{ 
                scale: [1, 1.02, 1],
                opacity: [0.5, 0.3, 0.5]
              }}
              transition={{ 
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute pointer-events-none"
              style={{
                left: targetPosition.x - 12,
                top: targetPosition.y - 12,
                width: targetPosition.width + 24,
                height: targetPosition.height + 24,
                border: "2px solid hsl(var(--primary) / 0.4)",
                borderRadius: "14px"
              }}
            />
          </>
        )}

        {/* Tooltip */}
        <motion.div
          key={`tooltip-${currentStep}`}
          initial={{ opacity: 0, scale: 0.9, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: -10 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="absolute z-10"
          style={getTooltipPosition()}
        >
          <Card className="w-80 shadow-2xl border-primary/30 bg-gradient-to-br from-card to-card/95 backdrop-blur-sm">
            <CardContent className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <motion.div 
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    {currentStep === steps.length - 1 ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      currentStep + 1
                    )}
                  </motion.div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">{steps[currentStep].title}</h3>
                    <p className="text-xs text-muted-foreground">
                      Passo {currentStep + 1} de {steps.length}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10">
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Progress bar */}
              <div className="mb-4">
                <Progress value={progress} className="h-1.5" />
              </div>
              
              {/* Content */}
              <p className="text-muted-foreground mb-6 leading-relaxed text-sm">
                {steps[currentStep].content}
              </p>
              
              {/* Navigation */}
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {steps.map((_, index) => (
                    <motion.button
                      key={index}
                      onClick={() => setCurrentStep(index)}
                      className={cn(
                        "rounded-full transition-all cursor-pointer",
                        index === currentStep 
                          ? "w-8 h-2 bg-primary" 
                          : "w-2 h-2 bg-muted hover:bg-muted-foreground/30"
                      )}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>
                
                <div className="flex gap-2">
                  {currentStep > 0 && (
                    <Button variant="outline" size="sm" onClick={prevStep} className="gap-1">
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Anterior
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    onClick={nextStep}
                    className="gap-1 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                  >
                    {currentStep === steps.length - 1 ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Concluir
                      </>
                    ) : (
                      <>
                        Próximo
                        <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Keyboard hints */}
              <div className="mt-4 pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground text-center">
                  Use <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">←</kbd> <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">→</kbd> para navegar • <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">ESC</kbd> para sair
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export function TourTrigger({ onStart }: { onStart: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onStart}
      className="gap-2 hover:bg-primary/10 hover:border-primary/50 transition-all group"
    >
      <Play className="h-4 w-4 group-hover:scale-110 transition-transform" />
      Tour Guiado
    </Button>
  )
}