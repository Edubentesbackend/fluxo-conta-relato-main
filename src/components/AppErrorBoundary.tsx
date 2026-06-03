import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Interface rendering failed", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="max-w-md space-y-4 rounded-xl border border-destructive/30 bg-card p-6 text-center shadow-lg">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <h1 className="text-xl font-semibold">Nao foi possivel exibir esta tela</h1>
          <p className="text-sm text-muted-foreground">
            Recarregue o sistema. Se o problema continuar, execute o diagnostico do servidor.
          </p>
          <Button onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Recarregar
          </Button>
        </div>
      </div>
    );
  }
}
