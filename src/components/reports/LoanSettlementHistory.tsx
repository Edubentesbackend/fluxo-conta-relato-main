import React, { useMemo, useState } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Loader2,
  Pencil,
  RefreshCcw,
  Search,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLoanSettlements, useReviewLoanSettlement } from '@/hooks/useLoansData';
import { TransactionCorrectionDialog } from '@/components/reports/TransactionCorrectionDialog';
import {
  LoanSettlementDirection,
  LoanSettlementFilters,
  LoanSettlementItem,
  LoanSettlementReviewStatus,
  TransactionWithAccounts,
} from '@/types/database';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/currency';

const directionLabels: Record<LoanSettlementDirection, string> = {
  adm_owes_projects: 'ADM devia ao projeto',
  projects_owe_adm: 'Projeto devia à ADM',
  between_projects: 'Entre projetos',
};

const reviewLabels: Record<LoanSettlementReviewStatus, string> = {
  reviewed: 'Revisado',
  needs_correction: 'Precisa correção',
  corrected: 'Corrigido',
  disputed: 'Contestado',
};

const reviewTone: Record<LoanSettlementReviewStatus, string> = {
  reviewed: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
  needs_correction: 'border-red-500/20 bg-red-500/10 text-red-700',
  corrected: 'border-blue-500/20 bg-blue-500/10 text-blue-700',
  disputed: 'border-amber-500/20 bg-amber-500/10 text-amber-700',
};

function formatDate(value: string) {
  return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
}

function inputDateValue(value?: Date | string) {
  if (!value) return '';
  return format(new Date(value), 'yyyy-MM-dd');
}

function transactionTypeLabel(type: TransactionWithAccounts['transaction_type']) {
  const labels: Record<TransactionWithAccounts['transaction_type'], string> = {
    emprestimo: 'Empréstimo',
    devolucao: 'Devolução',
    ajuste: 'Ajuste',
    rateio: 'Rateio',
    correcao: 'Correção',
    estorno: 'Estorno',
    transferencia_operacional: 'Transferência operacional',
  };
  return labels[type];
}

function ReviewStatusBadge({ status }: { status?: LoanSettlementReviewStatus | null }) {
  if (!status) {
    return <Badge variant="outline">Sem revisão</Badge>;
  }

  return <Badge className={reviewTone[status]}>{reviewLabels[status]}</Badge>;
}

function SummaryCard({
  title,
  value,
  subtitle,
  tone,
}: {
  title: string;
  value: string;
  subtitle: string;
  tone?: 'red' | 'green' | 'blue';
}) {
  const toneClass = {
    red: 'border-red-500/25 bg-red-500/5',
    green: 'border-emerald-500/25 bg-emerald-500/5',
    blue: 'border-blue-500/25 bg-blue-500/5',
  }[tone ?? 'blue'];

  return (
    <Card className={cn('rounded-lg shadow-sm', toneClass)}>
      <CardContent className="p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</p>
        <p className="mt-1 text-lg font-bold leading-tight sm:text-xl">{value}</p>
        <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({
  settlement,
  open,
  onOpenChange,
}: {
  settlement: LoanSettlementItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reviewStatus, setReviewStatus] = useState<LoanSettlementReviewStatus>('reviewed');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const mutation = useReviewLoanSettlement();
  const { toast } = useToast();

  const reset = () => {
    setReviewStatus('reviewed');
    setReason('');
    setNotes('');
  };

  const submit = async () => {
    if (!settlement) return;
    if (!reason.trim()) {
      toast({ title: 'Motivo obrigatório', variant: 'destructive' });
      return;
    }

    try {
      await mutation.mutateAsync({
        loanId: settlement.loan.id,
        body: {
          reviewStatus,
          reason: reason.trim(),
          notes: notes.trim() || undefined,
        },
      });
      toast({ title: 'Revisão registrada', description: 'O histórico da quitação foi atualizado.' });
      reset();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Não foi possível registrar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar revisão da quitação</DialogTitle>
          <DialogDescription>
            Informe o resultado da análise sem alterar as transações originais.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Situação</Label>
            <Select value={reviewStatus} onValueChange={(value) => setReviewStatus(value as LoanSettlementReviewStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="reviewed">Revisado</SelectItem>
                <SelectItem value="needs_correction">Precisa correção</SelectItem>
                <SelectItem value="corrected">Corrigido</SelectItem>
                <SelectItem value="disputed">Contestado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settlement-review-reason">Motivo</Label>
            <Input
              id="settlement-review-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ex.: devolução conferida com extrato"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="settlement-review-notes">Observações</Label>
            <Textarea
              id="settlement-review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Detalhe o que foi verificado ou qual correção deverá ser lançada."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar revisão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettlementTimeline({
  settlement,
  canManage,
  onCorrect,
}: {
  settlement: LoanSettlementItem;
  canManage: boolean;
  onCorrect: (transaction: TransactionWithAccounts, mode: 'edit' | 'void') => void;
}) {
  const timeline = useMemo(() => {
    return [settlement.loan, ...settlement.movements]
      .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date));
  }, [settlement]);

  return (
    <div className="space-y-4 bg-muted/20 p-3 sm:p-4">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Linha do tempo</p>
        <div className="space-y-2">
          {timeline.map((movement) => (
            <div key={movement.id} className="rounded-md border bg-background px-3 py-2 text-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{transactionTypeLabel(movement.transaction_type)}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(movement.transaction_date)} · <span className="font-mono">{movement.unique_identifier}</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-start gap-2 sm:justify-end">
                  <p className="font-semibold">{formatCurrency(Number(movement.amount))}</p>
                  {canManage && !movement.voided_at && (
                    <>
                      <Button size="sm" variant="outline" onClick={() => onCorrect(movement, 'edit')}>
                        <Pencil className="mr-2 h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => onCorrect(movement, 'void')}
                      >
                        <Trash2 className="mr-2 h-3.5 w-3.5" />
                        Cancelar
                      </Button>
                    </>
                  )}
                </div>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{movement.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Revisões registradas</p>
        {settlement.reviews.length === 0 ? (
          <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            Nenhuma revisão registrada para esta quitação.
          </div>
        ) : (
          <div className="space-y-2">
            {settlement.reviews.map((review) => (
              <div key={review.id} className="rounded-md border bg-background px-3 py-2 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <ReviewStatusBadge status={review.review_status} />
                  <span className="text-xs text-muted-foreground">
                    {formatDate(review.created_at)} · {review.created_by_name ?? 'Usuário removido'}
                  </span>
                </div>
                <p className="mt-2 font-medium">{review.reason}</p>
                {review.notes && <p className="mt-1 text-xs text-muted-foreground">{review.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function LoanSettlementHistory({
  filters,
  onFiltersChange,
}: {
  filters: LoanSettlementFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<LoanSettlementFilters>>;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [reviewTarget, setReviewTarget] = useState<LoanSettlementItem | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<TransactionWithAccounts | null>(null);
  const [correctionMode, setCorrectionMode] = useState<'edit' | 'void'>('edit');
  const { user } = useAuth();
  const { data, isLoading, isFetching, error, refetch } = useLoanSettlements(filters);
  const canReview = Boolean(user && ['analyst', 'manager', 'admin'].includes(user.role));
  const canManage = Boolean(user && ['manager', 'admin'].includes(user.role));

  const updateFilters = (patch: Partial<LoanSettlementFilters>) => {
    onFiltersChange((current) => ({ ...current, ...patch }));
  };

  const setDateFilter = (key: 'settledStartDate' | 'settledEndDate', value: string) => {
    if (!value) {
      updateFilters({ [key]: undefined });
      return;
    }
    const date = new Date(`${value}T00:00:00`);
    updateFilters({
      [key]: key === 'settledStartDate' ? startOfDay(date).toISOString() : endOfDay(date).toISOString(),
    });
  };

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>;
  }

  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {(error as Error)?.message || 'Não foi possível carregar o histórico de quitações.'}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Quitações"
          value={String(data.summary.settled_count)}
          subtitle="Empréstimos totalmente devolvidos"
          tone="green"
        />
        <SummaryCard
          title="Valor quitado"
          value={formatCurrency(data.summary.total_borrowed)}
          subtitle={`${formatCurrency(data.summary.total_returned)} devolvido`}
          tone="blue"
        />
        <SummaryCard
          title="Precisam atenção"
          value={String(data.summary.needs_correction_count + data.summary.disputed_count)}
          subtitle="Marcados para correção ou contestação"
          tone="red"
        />
        <SummaryCard
          title="Com correções"
          value={String(data.summary.with_corrections_count)}
          subtitle="Possuem correção ou estorno vinculado"
          tone="blue"
        />
      </div>

      <div className="grid gap-2 rounded-lg border bg-card p-3 md:grid-cols-2 xl:grid-cols-7">
        <div className="relative xl:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por projeto, conta, ID ou descrição"
            value={filters.search ?? ''}
            onChange={(event) => updateFilters({ search: event.target.value || undefined })}
          />
        </div>
        <Select
          value={filters.direction ?? 'all'}
          onValueChange={(value) => updateFilters({
            direction: value === 'all' ? undefined : value as LoanSettlementDirection,
          })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as direções</SelectItem>
            <SelectItem value="adm_owes_projects">ADM devia ao projeto</SelectItem>
            <SelectItem value="projects_owe_adm">Projeto devia à ADM</SelectItem>
            <SelectItem value="between_projects">Entre projetos</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={inputDateValue(filters.settledStartDate)}
          onChange={(event) => setDateFilter('settledStartDate', event.target.value)}
          title="Quitado a partir de"
        />
        <Input
          type="date"
          value={inputDateValue(filters.settledEndDate)}
          onChange={(event) => setDateFilter('settledEndDate', event.target.value)}
          title="Quitado até"
        />
        <Input
          type="number"
          min="0"
          placeholder="Valor mín."
          value={filters.minAmount ?? ''}
          onChange={(event) => updateFilters({ minAmount: event.target.value ? Number(event.target.value) : undefined })}
        />
        <Input
          type="number"
          min="0"
          placeholder="Valor máx."
          value={filters.maxAmount ?? ''}
          onChange={(event) => updateFilters({ maxAmount: event.target.value ? Number(event.target.value) : undefined })}
        />
        <div className="flex gap-2 md:col-span-2 xl:col-span-7">
          <Select
            value={filters.onlyWithCorrections ? 'attention' : 'all'}
            onValueChange={(value) => updateFilters({ onlyWithCorrections: value === 'attention' ? true : undefined })}
          >
            <SelectTrigger className="max-w-[230px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as quitações</SelectItem>
              <SelectItem value="attention">Somente com correção/revisão</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
          <Button variant="ghost" onClick={() => onFiltersChange({})}>Limpar filtros</Button>
        </div>
      </div>

      {data.settlements.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma quitação encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Quitação</TableHead>
                <TableHead>Direção</TableHead>
                <TableHead className="text-right">Valor original</TableHead>
                <TableHead className="text-right">Devolvido</TableHead>
                <TableHead className="text-right">Dias</TableHead>
                <TableHead>Status revisão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.settlements.map((settlement) => {
                const open = expandedId === settlement.loan.id;
                return (
                  <React.Fragment key={settlement.loan.id}>
                    <TableRow className={cn(settlement.needs_attention && 'bg-amber-500/5')}>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => setExpandedId(open ? null : settlement.loan.id)}>
                          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-semibold">{settlement.loan.unique_identifier}</span>
                            {settlement.has_corrections && (
                              <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-700">Com correção</Badge>
                            )}
                            {settlement.latest_review?.review_status === 'needs_correction' && (
                              <Badge className="border-red-500/20 bg-red-500/10 text-red-700">Atenção</Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium">{settlement.project?.name ?? `${settlement.creditor.name} → ${settlement.debtor.name}`}</p>
                          <p className="text-xs text-muted-foreground">
                            Quitado em {formatDate(settlement.settled_at)} · empréstimo em {formatDate(settlement.loan.transaction_date)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{directionLabels[settlement.direction]}</TableCell>
                      <TableCell className="text-right">{formatCurrency(settlement.borrowed)}</TableCell>
                      <TableCell className="text-right text-emerald-700">{formatCurrency(settlement.returned)}</TableCell>
                      <TableCell className="text-right">{settlement.days_to_settlement ?? '-'}</TableCell>
                      <TableCell><ReviewStatusBadge status={settlement.latest_review?.review_status} /></TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!canReview}
                          title={canReview ? 'Registrar revisão' : 'Seu perfil não pode registrar revisão'}
                          onClick={() => setReviewTarget(settlement)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open && (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <SettlementTimeline
                            settlement={settlement}
                            canManage={canManage}
                            onCorrect={(transaction, mode) => {
                              setCorrectionTarget(transaction);
                              setCorrectionMode(mode);
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-start gap-2 rounded-md border border-blue-500/25 bg-blue-500/5 p-3 text-sm text-blue-900">
        <CalendarCheck2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          O histórico é calculado a partir do empréstimo original e das devoluções vinculadas. Correções financeiras devem ser lançadas como
          transações de correção ou estorno, mantendo a trilha original preservada.
        </p>
      </div>

      {data.summary.needs_correction_count > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Existem quitações marcadas como precisando de correção. Priorize a revisão antes de fechar novos relatórios.</p>
        </div>
      )}

      {data.summary.reviewed_count > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-emerald-500/25 bg-emerald-500/5 p-3 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{data.summary.reviewed_count} quitação(ões) já foram revisadas e registradas no histórico administrativo.</p>
        </div>
      )}

      <ReviewDialog settlement={reviewTarget} open={Boolean(reviewTarget)} onOpenChange={(open) => !open && setReviewTarget(null)} />
      <TransactionCorrectionDialog
        transaction={correctionTarget}
        mode={correctionMode}
        open={Boolean(correctionTarget)}
        onOpenChange={(open) => {
          if (!open) setCorrectionTarget(null);
        }}
        onCompleted={() => refetch()}
      />
    </div>
  );
}
