import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { X, Download, Smartphone, Monitor } from "lucide-react"
import { cn } from "@/lib/utils"

interface PWAInstallerProps {
  className?: string
}

export function PWAInstaller({ className }: PWAInstallerProps) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null)
  const [showInstallPrompt, setShowInstallPrompt] = React.useState(false)
  const [isInstallable, setIsInstallable] = React.useState(false)

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
      
      // Show install prompt after a delay
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 5000)
    }

    const handleAppInstalled = () => {
      setShowInstallPrompt(false)
      setIsInstallable(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setShowInstallPrompt(false)
      setIsInstallable(false)
    }
    
    setDeferredPrompt(null)
  }

  const dismissPrompt = () => {
    setShowInstallPrompt(false)
  }

  if (!isInstallable || !showInstallPrompt) {
    return null
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        className={cn(
          "fixed bottom-4 right-4 z-50 max-w-sm",
          className
        )}
      >
        <Card className="shadow-2xl border-primary/20 bg-gradient-to-br from-background to-primary/5">
          <CardContent className="p-6 relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="absolute top-2 right-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">
                  Instalar App
                </h3>
                <p className="text-muted-foreground text-sm">
                  Instale nosso app para acesso rápido e experiência premium
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 bg-success/10 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-success rounded-full" />
                </div>
                <span>Acesso offline completo</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center">
                  <Monitor className="w-2.5 h-2.5 text-primary" />
                </div>
                <span>Interface otimizada</span>
              </div>
              
              <div className="flex items-center gap-3 text-sm">
                <div className="w-5 h-5 bg-accent/10 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-accent rounded-full" />
                </div>
                <span>Notificações push</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleInstall}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Instalar
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={dismissPrompt}
                className="px-3"
              >
                Depois
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}

// Hook para controlar PWA
export function usePWA() {
  const [isInstalled, setIsInstalled] = React.useState(false)
  const [isInstallable, setIsInstallable] = React.useState(false)

  React.useEffect(() => {
    // Check if already installed
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    const isInWebAppMode = (window.navigator as any).standalone === true
    
    setIsInstalled(isInStandaloneMode || isInWebAppMode)

    // Check if installable
    const handleBeforeInstallPrompt = () => {
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  return {
    isInstalled,
    isInstallable
  }
}