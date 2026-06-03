import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, ShieldCheck } from "lucide-react";
import { usersApi, UserListItem } from "@/lib/apiClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  manager: "Gestor",
  analyst: "Analista",
  viewer: "Visualizador",
};

const ROLE_BADGE_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  admin: "default",
  manager: "secondary",
  analyst: "outline",
  viewer: "outline",
};

export function UserManagementPanel() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => usersApi.list(),
  });

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { role?: string; isActive?: boolean } }) =>
      usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({ title: "Usuário atualizado com sucesso." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar usuário", description: err.message, variant: "destructive" });
    },
    onSettled: () => setUpdating(null),
  });

  const handleRoleChange = (user: UserListItem, role: string) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Você não pode alterar seu próprio papel.", variant: "destructive" });
      return;
    }
    setUpdating(user.id + "-role");
    mutation.mutate({ id: user.id, data: { role } });
  };

  const handleActiveToggle = (user: UserListItem, isActive: boolean) => {
    if (user.id === currentUser?.id) {
      toast({ title: "Você não pode desativar sua própria conta.", variant: "destructive" });
      return;
    }
    setUpdating(user.id + "-active");
    mutation.mutate({ id: user.id, data: { isActive } });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 p-1">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <ShieldCheck className="h-4 w-4" />
        <span>
          Novos usuários entram como <strong>Visualizador</strong>. Altere o papel para liberar acesso às funcionalidades.
        </span>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">E-mail</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead className="text-center">Ativo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhum usuário encontrado.
                </TableCell>
              </TableRow>
            )}
            {users.map((u) => {
              const isCurrentUser = u.id === currentUser?.id;
              return (
                <TableRow key={u.id} className={!u.is_active ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-sm font-medium">
                    @{u.username}
                    {isCurrentUser && (
                      <Badge variant="outline" className="ml-2 text-xs">você</Badge>
                    )}
                  </TableCell>
                  <TableCell>{u.name}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={u.role}
                      onValueChange={(value) => handleRoleChange(u, value)}
                      disabled={isCurrentUser || updating === u.id + "-role"}
                    >
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue>
                          <Badge variant={ROLE_BADGE_VARIANT[u.role]} className="text-xs">
                            {ROLE_LABELS[u.role] ?? u.role}
                          </Badge>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Visualizador</SelectItem>
                        <SelectItem value="analyst">Analista</SelectItem>
                        <SelectItem value="manager">Gestor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={u.is_active}
                      onCheckedChange={(checked) => handleActiveToggle(u, checked)}
                      disabled={isCurrentUser || updating === u.id + "-active"}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
