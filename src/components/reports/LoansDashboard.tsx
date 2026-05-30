import React, { useMemo, useState } from 'react';
import { differenceInDays, endOfDay, format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CalendarIcon,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Loader2,
  RefreshCcw,
  TrendingDown,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAdmPosition, useAdmProjectDetails, useInterProjectLoans } from '@/hooks/useLoansData';
import { useCreateReturn } from '@/hooks/useTransactions';
import { reportsApi } from '@/lib/apiClient';
import { cn } from '@/lib/utils';
import {
  AdmLoanDetail,
  AdmPositionExportReport,
  InterProjectLoanPair,
  LoanProjectDebt,
  LoanReportFilters,
  LoanVisibility,
} from '@/types/database';
import { formatCurrency } from '@/utils/currency';

const ADM_NUMBER = '12671-3';

function formatDate(value: string) {
  return format(new Date(value), 'dd/MM/yyyy', { locale: ptBR });
}

function getOldestDate(...dates: Array<string | null>) {
  return dates.filter(Boolean).sort()[0] ?? null;
}

function statusBadge(pending: number, returned: number) {
  if (pending <= 0) {
    return <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-700">Quitado</Badge>;
  }
  if (returned > 0) {
    return <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-700">Parcial</Badge>;
  }
  return <Badge className="border-red-500/20 bg-red-500/10 text-red-700">Pendente</Badge>;
}

const KpiCard: React.FC<{
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  tone?: 'red' | 'amber' | 'blue' | 'neutral';
}> = ({ title, value, subtitle, icon, tone = 'neutral' }) => {
  const toneClass = {
    red: 'border-red-500/25 bg-red-500/5',
    amber: 'border-amber-500/25 bg-amber-500/5',
    blue: 'border-blue-500/25 bg-blue-500/5',
    neutral: 'border-border bg-card',
  }[tone];

  return (
    <Card className={cn('rounded-lg shadow-sm', toneClass)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">{title}</p>
            <p className="mt-1 break-words text-lg font-bold leading-tight sm:text-xl">{value}</p>
          </div>
          <div className="shrink-0 rounded-md border border-border/60 bg-background p-1.5">{icon}</div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
};

const ReturnDialog: React.FC<{
  detail: AdmLoanDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ detail, open, onOpenChange }) => {
  const createReturn = useCreateReturn();
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const reset = () => {
    setAmount('');
    setDescription('');
    setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const submit = async () => {
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > detail.pending) {
      toast({
        title: 'Valor inválido',
        description: `Informe um valor entre R$ 0,01 e ${formatCurrency(detail.pending)}.`,
        variant: 'destructive',
      });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Descrição obrigatória', variant: 'destructive' });
      return;
    }

    try {
      await createReturn.mutateAsync({
        loanId: detail.loan.id,
        payload: {
          amount: parsedAmount,
          description: description.trim(),
          transaction_date: new Date(`${transactionDate}T12:00:00`).toISOString(),
        },
      });
      toast({ title: 'Devolução registrada', description: 'O saldo devedor foi atualizado.' });
      reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Não foi possível registrar', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) reset();
      onOpenChange(nextOpen);
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar devolução</DialogTitle>
          <DialogDescription>
            Empréstimo {detail.loan.unique_identifier}. Saldo disponível: {formatCurrency(detail.pending)}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`return-amount-${detail.loan.id}`}>Valor</Label>
            <Input
              id={`return-amount-${detail.loan.id}`}
              type="number"
              min="0.01"
              max={detail.pending}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`return-date-${detail.loan.id}`}>Data</Label>
            <Input
              id={`return-date-${detail.loan.id}`}
              type="date"
              min={detail.loan.transaction_date.slice(0, 10)}
              max={format(new Date(), 'yyyy-MM-dd')}
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`return-description-${detail.loan.id}`}>Descrição</Label>
            <Textarea
              id={`return-description-${detail.loan.id}`}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Informe a referência da devolução"
              maxLength={200}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={createReturn.isPending}>
            {createReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const LoanItem: React.FC<{ detail: AdmLoanDetail; historical: boolean }> = ({ detail, historical }) => {
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  return (
    <div className="border-b border-border/70 px-3 py-3 last:border-b-0 sm:px-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold">{detail.loan.unique_identifier}</span>
            {statusBadge(detail.pending, detail.returned)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatDate(detail.loan.transaction_date)} · {detail.loan.source_account_number} → {detail.loan.destination_account_number}
          </p>
          <p className="mt-1 break-words text-sm">{detail.loan.description}</p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-3 text-right text-xs sm:min-w-[340px]">
          <div>
            <p className="text-muted-foreground">Emprestado</p>
            <p className="font-semibold">{formatCurrency(detail.borrowed)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Devolvido</p>
            <p className="font-semibold text-emerald-700">{formatCurrency(detail.returned)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Saldo</p>
            <p className="font-semibold text-red-700">{formatCurrency(detail.pending)}</p>
          </div>
        </div>
      </div>

      {detail.returns.length > 0 && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Devoluções vinculadas</p>
          <div className="space-y-2">
            {detail.returns.map((item) => (
              <div key={item.id} className="flex flex-col gap-1 rounded-md bg-muted/40 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
                <span>{formatDate(item.transaction_date)} · <span className="font-mono">{item.unique_identifier}</span></span>
                <span className="font-semibold text-emerald-700">{formatCurrency(Number(item.amount))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {detail.pending > 0 && (
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={historical}
            title={historical ? 'Volte para a posição atual para registrar uma devolução' : 'Registrar devolução'}
            onClick={() => setReturnDialogOpen(true)}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            Registrar devolução
          </Button>
        </div>
      )}
      <ReturnDialog detail={detail} open={returnDialogOpen} onOpenChange={setReturnDialogOpen} />
    </div>
  );
};

const ProjectDetails: React.FC<{
  projectId: string;
  direction: 'adm_owes_projects' | 'projects_owe_adm';
  filters: LoanReportFilters;
  historical: boolean;
}> = ({ projectId, direction, filters, historical }) => {
  const { data, isLoading, error } = useAdmProjectDetails(projectId, filters);
  const loans = data?.[direction] ?? [];

  if (isLoading) return <Skeleton className="m-3 h-24" />;
  if (error) return <p className="p-3 text-sm text-destructive">{(error as Error).message}</p>;
  if (loans.length === 0) return <p className="p-3 text-sm text-muted-foreground">Nenhum empréstimo neste filtro.</p>;

  return (
    <div className="bg-muted/20">
      {loans.map((detail) => <LoanItem key={detail.loan.id} detail={detail} historical={historical} />)}
    </div>
  );
};

const ProjectRow: React.FC<{
  entry: LoanProjectDebt;
  direction: 'adm_owes_projects' | 'projects_owe_adm';
  filters: LoanReportFilters;
  historical: boolean;
}> = ({ entry, direction, filters, historical }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setOpen((value) => !value)}>
        <TableCell className="w-10">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </TableCell>
        <TableCell>
          <p className="font-medium">{entry.account.name}</p>
          <p className="text-xs text-muted-foreground">{entry.account.account_number}</p>
        </TableCell>
        <TableCell className="text-right">{formatCurrency(entry.borrowed)}</TableCell>
        <TableCell className="text-right text-emerald-700">{formatCurrency(entry.returned)}</TableCell>
        <TableCell className="text-right font-semibold text-red-700">{formatCurrency(entry.pending)}</TableCell>
        <TableCell className="text-right">{statusBadge(entry.pending, entry.returned)}</TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <ProjectDetails projectId={entry.account.id} direction={direction} filters={filters} historical={historical} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const MobileProjectRow: React.FC<{
  entry: LoanProjectDebt;
  direction: 'adm_owes_projects' | 'projects_owe_adm';
  filters: LoanReportFilters;
  historical: boolean;
}> = ({ entry, direction, filters, historical }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/70 last:border-b-0">
      <button type="button" className="w-full p-3 text-left" onClick={() => setOpen((value) => !value)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="break-words text-sm font-semibold">{entry.account.name}</p>
            <p className="text-xs text-muted-foreground">{entry.account.account_number}</p>
          </div>
          {open ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div><p className="text-muted-foreground">Emprestado</p><p className="font-semibold">{formatCurrency(entry.borrowed)}</p></div>
          <div><p className="text-muted-foreground">Devolvido</p><p className="font-semibold text-emerald-700">{formatCurrency(entry.returned)}</p></div>
          <div><p className="text-muted-foreground">Saldo</p><p className="font-semibold text-red-700">{formatCurrency(entry.pending)}</p></div>
        </div>
      </button>
      {open && <ProjectDetails projectId={entry.account.id} direction={direction} filters={filters} historical={historical} />}
    </div>
  );
};

const DebtGroup: React.FC<{
  title: string;
  entries: LoanProjectDebt[];
  direction: 'adm_owes_projects' | 'projects_owe_adm';
  filters: LoanReportFilters;
  historical: boolean;
  tone: 'red' | 'amber';
}> = ({ title, entries, direction, filters, historical, tone }) => (
  <section>
    <div className="mb-2 flex items-center gap-2">
      {tone === 'red' ? <AlertTriangle className="h-4 w-4 text-red-700" /> : <Building2 className="h-4 w-4 text-amber-700" />}
      <h3 className={cn('text-sm font-semibold', tone === 'red' ? 'text-red-700' : 'text-amber-700')}>{title}</h3>
    </div>
    {entries.length === 0 ? (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhum projeto neste filtro.</div>
    ) : (
      <div className="overflow-hidden rounded-md border">
        <div className="md:hidden">
          {entries.map((entry) => (
            <MobileProjectRow key={entry.account.id} entry={entry} direction={direction} filters={filters} historical={historical} />
          ))}
        </div>
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10" />
                <TableHead>Projeto</TableHead>
                <TableHead className="text-right">Emprestado</TableHead>
                <TableHead className="text-right">Devolvido</TableHead>
                <TableHead className="text-right">Saldo devedor</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry) => (
                <ProjectRow key={entry.account.id} entry={entry} direction={direction} filters={filters} historical={historical} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )}
  </section>
);

const AdmSection: React.FC<{ filters: LoanReportFilters; historical: boolean }> = ({ filters, historical }) => {
  const { data, isLoading, error } = useAdmPosition(filters);

  if (isLoading) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-20" />)}</div>;
  }
  if (error || !data) {
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {(error as Error)?.message || `Não foi possível carregar a conta ADM ${ADM_NUMBER}.`}
      </div>
    );
  }

  const oldestDate = getOldestDate(data.adm_owes_projects.oldest_loan_date, data.projects_owe_adm.oldest_loan_date);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="ADM deve aos projetos"
          value={formatCurrency(data.adm_owes_projects.total)}
          subtitle={`${data.adm_owes_projects.count} projeto(s) credor(es)`}
          icon={<TrendingDown className="h-4 w-4 text-red-700" />}
          tone="red"
        />
        <KpiCard
          title="Projetos devem à ADM"
          value={formatCurrency(data.projects_owe_adm.total)}
          subtitle={`${data.projects_owe_adm.count} projeto(s) devedor(es)`}
          icon={<TrendingDown className="h-4 w-4 text-amber-700" />}
          tone="amber"
        />
        <KpiCard
          title="Posição líquida"
          value={formatCurrency(Math.abs(data.net_position))}
          subtitle={data.net_position > 0 ? 'ADM devedora' : data.net_position < 0 ? 'ADM credora' : 'Equilibrada'}
          icon={<ArrowLeftRight className="h-4 w-4 text-blue-700" />}
          tone="blue"
        />
        <KpiCard
          title="Dívida mais antiga"
          value={oldestDate ? formatDate(oldestDate) : 'Sem pendências'}
          subtitle={oldestDate ? `${differenceInDays(new Date(data.as_of), new Date(oldestDate))} dias em aberto` : 'Nenhuma dívida no filtro'}
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <DebtGroup
        title={`Fundação (ADM ${ADM_NUMBER}) deve aos projetos`}
        entries={data.adm_owes_projects.by_project}
        direction="adm_owes_projects"
        filters={filters}
        historical={historical}
        tone="red"
      />
      <DebtGroup
        title={`Projetos devem à Fundação (ADM ${ADM_NUMBER})`}
        entries={data.projects_owe_adm.by_project}
        direction="projects_owe_adm"
        filters={filters}
        historical={historical}
        tone="amber"
      />
    </div>
  );
};

const InterProjectSection: React.FC<{ filters: LoanReportFilters }> = ({ filters }) => {
  const { data, isLoading, error } = useInterProjectLoans(filters);

  if (isLoading) return <Skeleton className="h-40" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  const pairs = data?.by_pair ?? [];
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard title="Saldo em circulação" value={formatCurrency(data?.total_circulating ?? 0)} subtitle="Entre projetos" icon={<ArrowLeftRight className="h-4 w-4 text-blue-700" />} tone="blue" />
        <KpiCard title="Relações ativas" value={String(data?.active_pairs_count ?? 0)} subtitle="Pares de projetos" icon={<Building2 className="h-4 w-4" />} />
        <KpiCard title="Mais antigo" value={data?.oldest_loan_date ? formatDate(data.oldest_loan_date) : 'Sem pendências'} subtitle="Data do primeiro empréstimo" icon={<Clock className="h-4 w-4" />} />
      </div>
      {pairs.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">Nenhum empréstimo entre projetos neste filtro.</div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader><TableRow><TableHead>Credor</TableHead><TableHead>Devedor</TableHead><TableHead className="text-right">Emprestado</TableHead><TableHead className="text-right">Devolvido</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
            <TableBody>
              {pairs.map((pair: InterProjectLoanPair) => (
                <TableRow key={`${pair.creditor.id}-${pair.debtor.id}`}>
                  <TableCell>{pair.creditor.name}<p className="text-xs text-muted-foreground">{pair.creditor.account_number}</p></TableCell>
                  <TableCell>{pair.debtor.name}<p className="text-xs text-muted-foreground">{pair.debtor.account_number}</p></TableCell>
                  <TableCell className="text-right">{formatCurrency(pair.borrowed)}</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(pair.returned)}</TableCell>
                  <TableCell className="text-right font-semibold text-red-700">{formatCurrency(pair.pending)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export const LoansDashboard: React.FC = () => {
  const [asOf, setAsOf] = useState<Date>();
  const [loanStatus, setLoanStatus] = useState<LoanVisibility>('open');
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const filters = useMemo<LoanReportFilters>(() => ({
    asOf: asOf ? endOfDay(asOf).toISOString() : undefined,
    loanStatus,
  }), [asOf, loanStatus]);
  const historical = Boolean(asOf && !isToday(asOf));

  const exportReport = async () => {
    setExporting(true);
    try {
      const report = await reportsApi.admPositionExport<AdmPositionExportReport>(filters);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.consolidated), 'Consolidado ADM');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(report.movements), 'Movimentacoes');
      XLSX.writeFile(workbook, `emprestimos-adm-${format(new Date(report.as_of), 'yyyy-MM-dd')}.xlsx`);
    } catch (error: any) {
      toast({ title: 'Não foi possível exportar', description: error.message, variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <TrendingDown className="h-5 w-5 text-primary" />
            Relatório de empréstimos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Posição consolidada da Fundação ADM {ADM_NUMBER}.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Select value={loanStatus} onValueChange={(value) => setLoanStatus(value as LoanVisibility)}>
            <SelectTrigger className="w-full sm:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Somente pendentes</SelectItem>
              <SelectItem value="settled">Somente quitados</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="min-w-0 flex-1 justify-start sm:w-[190px]">
                  <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{asOf ? format(asOf, 'dd/MM/yyyy') : 'Posição atual'}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={asOf} onSelect={setAsOf} disabled={(date) => date > new Date()} initialFocus />
              </PopoverContent>
            </Popover>
            {asOf && <Button variant="ghost" size="icon" title="Voltar para posição atual" onClick={() => setAsOf(undefined)}><X className="h-4 w-4" /></Button>}
          </div>
          <Button variant="outline" onClick={exportReport} disabled={exporting}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar Excel
          </Button>
        </div>
      </div>

      {historical && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-800">
          <Clock className="mt-0.5 h-4 w-4 shrink-0" />
          Esta é uma posição histórica. Volte para a posição atual para registrar devoluções.
        </div>
      )}

      <Tabs defaultValue="adm">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-1 sm:w-auto sm:grid-cols-2">
          <TabsTrigger value="adm" className="gap-2 px-3 py-2"><Building2 className="h-4 w-4" />ADM / Fundação</TabsTrigger>
          <TabsTrigger value="projects" className="gap-2 px-3 py-2"><ArrowLeftRight className="h-4 w-4" />Entre projetos</TabsTrigger>
        </TabsList>
        <TabsContent value="adm" className="mt-5"><AdmSection filters={filters} historical={historical} /></TabsContent>
        <TabsContent value="projects" className="mt-5"><InterProjectSection filters={filters} /></TabsContent>
      </Tabs>
    </div>
  );
};
