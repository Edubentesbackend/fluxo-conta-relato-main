import * as React from "react";
import { useTheme } from "next-themes";
import {
  ChevronDown,
  CircleHelp,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Settings,
  Sun,
  UserRound,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HelpCenter } from "@/components/ui/help-center";
import { useAuth } from "@/contexts/AuthContext";

const roleLabels = {
  admin: "Administrador",
  manager: "Gestor",
  analyst: "Analista",
  viewer: "Visualizador",
};

function getInitials(name?: string, email?: string) {
  const source = (name || email || "Usuario").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) return "US";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function UserAccountMenu() {
  const { user, logout } = useAuth();
  const { setTheme } = useTheme();
  const [profileOpen, setProfileOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  const displayName = user?.name || "Usuario";
  const initials = getInitials(user?.name, user?.email);
  const roleLabel = user ? roleLabels[user.role] : "Usuario";

  const handleLogout = React.useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    await logout();
  }, [isLoggingOut, logout]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full justify-start gap-3 rounded-xl border bg-card/95 px-3 py-2 text-left shadow-soft transition-all hover:bg-card hover:shadow-medium sm:w-[250px]"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-warning text-[11px] font-semibold text-warning-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium leading-5 text-foreground">
                {displayName}
              </span>
              <span className="block truncate text-xs leading-4 text-muted-foreground">
                Conta pessoal
              </span>
            </span>

            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-[250px] rounded-xl p-2 shadow-large">
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-warning text-[11px] font-semibold text-warning-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-foreground">
                {displayName}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Conta pessoal
              </span>
            </span>
          </DropdownMenuLabel>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-3 rounded-lg px-3 py-2">
              <Palette className="h-4 w-4" />
              <span>Personaliza{"\u00e7\u00e3o"}</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="rounded-lg p-1">
              <DropdownMenuItem className="gap-3 rounded-md" onSelect={() => setTheme("light")}>
                <Sun className="h-4 w-4" />
                Claro
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 rounded-md" onSelect={() => setTheme("dark")}>
                <Moon className="h-4 w-4" />
                Escuro
              </DropdownMenuItem>
              <DropdownMenuItem className="gap-3 rounded-md" onSelect={() => setTheme("system")}>
                <Monitor className="h-4 w-4" />
                Sistema
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2" onSelect={() => setProfileOpen(true)}>
            <UserRound className="h-4 w-4" />
            Perfil
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2" onSelect={() => setSettingsOpen(true)}>
            <Settings className="h-4 w-4" />
            Defini{"\u00e7\u00f5es"}
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-3 rounded-lg px-3 py-2" onSelect={() => setHelpOpen(true)}>
            <CircleHelp className="h-4 w-4" />
            Ajuda
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2" />

          <DropdownMenuItem
            className="gap-3 rounded-lg px-3 py-2 text-destructive focus:text-destructive"
            disabled={isLoggingOut}
            onSelect={() => void handleLogout()}
          >
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Saindo..." : "Terminar sess\u00e3o"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Perfil</DialogTitle>
            <DialogDescription>Informa{"\u00e7\u00f5es"} da conta conectada.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 text-sm">
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Nome</div>
              <div className="font-medium">{displayName}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Email</div>
              <div className="font-medium">{user?.email || "N\u00e3o informado"}</div>
            </div>
            <div>
              <div className="text-xs font-medium uppercase text-muted-foreground">Permiss{"\u00e3o"}</div>
              <div className="font-medium">{roleLabel}</div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Defini{"\u00e7\u00f5es"}</DialogTitle>
            <DialogDescription>Controle r{"\u00e1"}pido de sess{"\u00e3o"} e apar{"\u00eancia"}.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid grid-cols-3 gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setTheme("light")}>
                <Sun className="h-4 w-4" />
                Claro
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setTheme("dark")}>
                <Moon className="h-4 w-4" />
                Escuro
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setTheme("system")}>
                <Monitor className="h-4 w-4" />
                Sistema
              </Button>
            </div>
            <Button
              variant="outline"
              className="justify-start gap-2 text-destructive hover:text-destructive"
              disabled={isLoggingOut}
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Saindo..." : "Terminar sess\u00e3o"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <HelpCenter trigger={null} open={helpOpen} onOpenChange={setHelpOpen} />
    </>
  );
}
