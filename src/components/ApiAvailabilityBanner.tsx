import { useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { probeApiAvailability } from "@/lib/apiClient";

const API_UNAVAILABLE_EVENT = "fluxo-api-unavailable";
const API_AVAILABLE_EVENT = "fluxo-api-available";

export function ApiAvailabilityBanner() {
  const [message, setMessage] = useState("");
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleUnavailable = (event: Event) => {
      const detail = (event as CustomEvent<{ message?: string }>).detail;
      setMessage(detail?.message || "Servidor temporariamente indisponivel.");
    };
    const handleAvailable = () => setMessage("");

    window.addEventListener(API_UNAVAILABLE_EVENT, handleUnavailable);
    window.addEventListener(API_AVAILABLE_EVENT, handleAvailable);
    return () => {
      window.removeEventListener(API_UNAVAILABLE_EVENT, handleUnavailable);
      window.removeEventListener(API_AVAILABLE_EVENT, handleAvailable);
    };
  }, []);

  if (!message) return null;

  const retry = async () => {
    setIsRetrying(true);
    try {
      await probeApiAvailability();
      window.location.reload();
    } catch {
      // The request layer keeps the current diagnostic message visible.
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="sticky top-0 z-[100] flex items-center justify-between gap-3 border-b border-destructive/30 bg-destructive px-4 py-3 text-sm text-destructive-foreground shadow-md">
      <span className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        {message}
      </span>
      <Button size="sm" variant="secondary" onClick={retry} disabled={isRetrying} className="shrink-0 gap-2">
        <RefreshCw className={`h-4 w-4 ${isRetrying ? "animate-spin" : ""}`} />
        Tentar novamente
      </Button>
    </div>
  );
}
