import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Search, Building2, Users, X, RotateCcw, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { accountsApi } from "@/lib/apiClient";
import { useAccounts } from "@/hooks/useAccounts";
import { useAuth } from "@/contexts/AuthContext";
import { Account, ProjectCoordinator, ACCOUNT_TYPE_LABELS, AccountType } from "@/types/database";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ── Schemas ──────────────────────────────────────────────────────────────────

const accountEditSchema = z.object({
  name: z.string().min(1, "Nome obrigatório"),
  account_number: z.string().min(2, "Número deve ter ao menos 2 caracteres"),
  account_type: z.enum(["projeto", "adm", "transitoria"]),
  coordinator_name: z.string().regex(/^[\p{L}\s]*$/u, "Apenas letras e espaços").optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
});

const coordinatorEditSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatório").regex(/^[\p{L}\s]+$/u, "Apenas letras e espaços"),
});

type AccountEditValues = z.infer<typeof accountEditSchema>;
type CoordinatorEditValues = z.infer<typeof coordinatorEditSchema>;

// ── Badge de tipo ─────────────────────────────────────────────────────────────

const typeBadgeClass: Record<AccountType, string> = {
  projeto: "bg-primary/10 text-primary border-primary/20",
  adm: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  transitoria: "bg-secondary text-muted-foreground border-border",
};

function AccountTypeBadge({ type }: { type: AccountType }) {
  return (
    <Badge variant="outline" className={typeBadgeClass[type]}>
      {ACCOUNT_TYPE_LABELS[type]}
    </Badge>
  );
}

interface DeleteConfirmationDialogProps {
  open: boolean;
  title: string;
  description: string;
  itemName: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

function DeleteConfirmationDialog({
  open,
  title,
  description,
  itemName,
  isPending,
  onOpenChange,
  onConfirm,
}: DeleteConfirmationDialogProps) {
  const [confirmation, setConfirmation] = useState("");
  const handleOpenChange = (nextOpen: boolean) => {
    setConfirmation("");
    onOpenChange(nextOpen);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Digite <strong className="text-foreground">{itemName}</strong> para confirmar.
          </p>
          <Input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            placeholder={itemName}
            autoComplete="off"
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={confirmation.trim() !== itemName || isPending}
            onClick={onConfirm}
          >
            {isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ── Dialog de edição de Conta ─────────────────────────────────────────────────

interface EditAccountDialogProps {
  account: Account | null;
  coordinators: ProjectCoordinator[];
  onClose: () => void;
}

function EditAccountDialog({ account, coordinators, onClose }: EditAccountDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<AccountEditValues>({
    resolver: zodResolver(accountEditSchema),
    values: account
      ? {
          name: account.name,
          account_number: account.account_number ?? "",
          account_type: account.account_type,
          coordinator_name: account.coordinator_name ?? "",
          description: account.description ?? "",
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: AccountEditValues) =>
      accountsApi.update<Account>(account!.id, {
        name: data.name,
        account_number: data.account_number,
        account_type: data.account_type,
        coordinator_name: data.coordinator_name || null,
        description: data.description || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({ title: "Conta atualizada com sucesso." });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar conta", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={!!account} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Conta</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="account_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número da Conta</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="account_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="projeto">Projeto</SelectItem>
                      <SelectItem value="adm">ADM</SelectItem>
                      <SelectItem value="transitoria">Transitória</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="coordinator_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Coordenador</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "__none__" ? "" : val)}
                    value={field.value || "__none__"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Nenhum" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">Nenhum</SelectItem>
                      {coordinators.map((c) => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog de edição de Coordenador ──────────────────────────────────────────

interface EditCoordinatorDialogProps {
  coordinator: ProjectCoordinator | null;
  onClose: () => void;
}

function EditCoordinatorDialog({ coordinator, onClose }: EditCoordinatorDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CoordinatorEditValues>({
    resolver: zodResolver(coordinatorEditSchema),
    values: coordinator ? { name: coordinator.name } : undefined,
  });

  const mutation = useMutation({
    mutationFn: (data: CoordinatorEditValues) =>
      accountsApi.updateCoordinator<ProjectCoordinator>(coordinator!.id, { name: data.name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["coordinators"] });
      toast({ title: "Coordenador atualizado com sucesso." });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao atualizar coordenador", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={!!coordinator} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Editar Coordenador</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ── Aba de Contas ─────────────────────────────────────────────────────────────

function ContasTab() {
  const { data: accounts = [], isLoading } = useAccounts(true);
  const { data: coordinators = [] } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => accountsApi.coordinators<ProjectCoordinator[]>(),
  });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = user?.role === "manager" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const deleteMutation = useMutation({
    mutationFn: (account: Account) =>
      accountsApi.delete<{ outcome: "archived" | "deleted"; linked_transactions: number }>(account.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({
        title: result.outcome === "archived" ? "Conta arquivada." : "Conta excluída.",
        description: result.outcome === "archived"
          ? "A conta possui movimentações e foi preservada para manter o histórico."
          : "A conta não possuía movimentações e foi removida definitivamente.",
      });
      setDeleting(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir conta", description: err.message, variant: "destructive" });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => accountsApi.restore<{ outcome: "restored" }>(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      toast({ title: "Conta restaurada com sucesso." });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao restaurar conta", description: err.message, variant: "destructive" });
    },
  });

  const filtered = accounts.filter((a) => {
    const q = search.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.account_number ?? "").toLowerCase().includes(q) ||
      (a.coordinator_name ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, número ou coordenador…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground shrink-0">
          {filtered.length} conta{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead>Nome</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Coordenador</TableHead>
              {canEdit && <TableHead className="w-28 text-right">Ação</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-10 text-muted-foreground">
                  Carregando contas…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 5 : 4} className="text-center py-10 text-muted-foreground">
                  {search ? "Nenhuma conta encontrada para essa busca." : "Nenhuma conta cadastrada."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((account) => (
                <TableRow key={account.id} className={account.archived_at ? "bg-muted/30 text-muted-foreground" : "hover:bg-secondary/20"}>
                  <TableCell className="font-medium">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{account.name}</span>
                      {account.archived_at && <Badge variant="secondary">Arquivada</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">
                    {account.account_number ?? "—"}
                  </TableCell>
                  <TableCell>
                    <AccountTypeBadge type={account.account_type} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.coordinator_name ?? <span className="text-muted-foreground/50 italic text-xs">Sem coordenador</span>}
                  </TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!account.archived_at && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Editar conta"
                            onClick={() => setEditing(account)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && !account.archived_at && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            title={account.account_number === "12671-3" ? "A conta ADM fixa não pode ser excluída" : "Excluir conta"}
                            disabled={account.account_number === "12671-3"}
                            onClick={() => setDeleting(account)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {isAdmin && account.archived_at && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Restaurar conta"
                            disabled={restoreMutation.isPending}
                            onClick={() => restoreMutation.mutate(account.id)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EditAccountDialog
        account={editing}
        coordinators={coordinators}
        onClose={() => setEditing(null)}
      />
      <DeleteConfirmationDialog
        open={!!deleting}
        title="Excluir conta"
        description="Contas com movimentações serão arquivadas para preservar o histórico. Contas sem movimentações serão removidas definitivamente."
        itemName={deleting?.name ?? ""}
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  );
}

// ── Aba de Coordenadores ──────────────────────────────────────────────────────

function CoordinadoresTab() {
  const { data: accounts = [] } = useAccounts(true);
  const { data: coordinators = [], isLoading } = useQuery({
    queryKey: ["coordinators"],
    queryFn: () => accountsApi.coordinators<ProjectCoordinator[]>(),
  });
  const [editing, setEditing] = useState<ProjectCoordinator | null>(null);
  const [deleting, setDeleting] = useState<ProjectCoordinator | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canEdit = user?.role === "manager" || user?.role === "admin";
  const isAdmin = user?.role === "admin";

  const deleteMutation = useMutation({
    mutationFn: (coordinator: ProjectCoordinator) =>
      accountsApi.deleteCoordinator<{ unlinked_accounts: number }>(coordinator.id),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["coordinators"] });
      toast({
        title: "Coordenador excluído.",
        description: result.unlinked_accounts > 0
          ? `${result.unlinked_accounts} conta(s) ficaram sem coordenador.`
          : "Nenhuma conta estava vinculada a este coordenador.",
      });
      setDeleting(null);
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao excluir coordenador", description: err.message, variant: "destructive" });
    },
  });

  const countByCoordinator = (coordinatorId: string) =>
    accounts.filter((a) => a.coordinator_id === coordinatorId).length;

  return (
    <>
      <div className="rounded-xl border border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/30 hover:bg-secondary/30">
              <TableHead>Nome</TableHead>
              <TableHead>Contas vinculadas</TableHead>
              {canEdit && <TableHead className="w-28 text-right">Ação</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 3 : 2} className="text-center py-10 text-muted-foreground">
                  Carregando coordenadores…
                </TableCell>
              </TableRow>
            ) : coordinators.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 3 : 2} className="text-center py-10 text-muted-foreground">
                  Nenhum coordenador cadastrado.
                </TableCell>
              </TableRow>
            ) : (
              coordinators.map((coord) => {
                const count = countByCoordinator(coord.id);
                return (
                  <TableRow key={coord.id} className="hover:bg-secondary/20">
                    <TableCell className="font-medium">{coord.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {count} conta{count !== 1 ? "s" : ""}
                      </Badge>
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Editar coordenador"
                            onClick={() => setEditing(coord)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Excluir coordenador"
                              onClick={() => setDeleting(coord)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <EditCoordinatorDialog
        coordinator={editing}
        onClose={() => setEditing(null)}
      />
      <DeleteConfirmationDialog
        open={!!deleting}
        title="Excluir coordenador"
        description="O coordenador será removido definitivamente. As contas vinculadas continuarão existindo, mas ficarão sem coordenador."
        itemName={deleting?.name ?? ""}
        isPending={deleteMutation.isPending}
        onOpenChange={(open) => !open && setDeleting(null)}
        onConfirm={() => deleting && deleteMutation.mutate(deleting)}
      />
    </>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

type SubTab = "contas" | "coordenadores";

const subTabs: { id: SubTab; label: string; icon: React.ElementType }[] = [
  { id: "contas", label: "Contas", icon: Building2 },
  { id: "coordenadores", label: "Coordenadores", icon: Users },
];

export function CadastrosPanel() {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("contas");

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Sub-tab selector */}
      <div className="flex items-center gap-1 rounded-xl border border-border/60 bg-secondary/40 p-1 w-fit">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150
                ${active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeSubTab === "contas" && <ContasTab />}
      {activeSubTab === "coordenadores" && <CoordinadoresTab />}
    </motion.div>
  );
}
