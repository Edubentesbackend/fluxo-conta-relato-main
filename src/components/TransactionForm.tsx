import React, { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  CalendarIcon,
  ArrowRight,
  Banknote,
  ArrowLeftRight,
  SlidersHorizontal,
  Split,
  Wrench,
  Undo2,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAccounts } from '@/hooks/useAccounts';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { TransactionType } from '@/types/database';
import { useToast } from '@/hooks/use-toast';
import { SearchableSelect, SearchableSelectItem } from '@/components/ui/searchable-select';
import { formatCurrencyInput, parseCurrencyInput } from '@/utils/currency';

// ─── Schema ───────────────────────────────────────────────────────────────────

const formSchema = z
  .object({
    source_account_id: z.string().min(1, 'Conta de origem é obrigatória'),
    destination_account_id: z.string().min(1, 'Conta de destino é obrigatória'),
    transaction_date: z.date({ required_error: 'Data da transação é obrigatória' }),
    amount: z.number().min(0.01, 'Valor deve ser maior que zero'),
    transaction_type: z.enum([
      'emprestimo',
      'devolucao',
      'ajuste',
      'rateio',
      'correcao',
      'estorno',
      'transferencia_operacional',
    ] as const),
    description: z.string().min(1, 'Descrição é obrigatória'),
  })
  .refine((d) => d.source_account_id !== d.destination_account_id, {
    message: 'A conta de origem deve ser diferente da conta de destino',
    path: ['destination_account_id'],
  });

type FormData = z.infer<typeof formSchema>;

// ─── Transaction types config ─────────────────────────────────────────────────

const TX_TYPES: {
  value: TransactionType;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { value: 'emprestimo',                  label: 'Empréstimo',          icon: Banknote,          color: 'text-primary',     bg: 'bg-primary/10 border-primary/20' },
  { value: 'transferencia_operacional',   label: 'Transferência',       icon: ArrowLeftRight,    color: 'text-accent',      bg: 'bg-accent/10 border-accent/20' },
  { value: 'ajuste',                      label: 'Ajuste',              icon: SlidersHorizontal, color: 'text-support',     bg: 'bg-support/10 border-support/20' },
  { value: 'rateio',                      label: 'Rateio',              icon: Split,             color: 'text-warning',     bg: 'bg-warning/10 border-warning/20' },
  { value: 'correcao',                    label: 'Correção',            icon: Wrench,            color: 'text-muted-foreground', bg: 'bg-muted border-border' },
  { value: 'estorno',                     label: 'Estorno',             icon: Undo2,             color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
];

// ─── Step bar ─────────────────────────────────────────────────────────────────

const STEPS = ['Contas', 'Detalhes', 'Confirmar'];

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0 mb-8">
    {STEPS.map((label, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1">
          <div
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
              i < current
                ? 'gradient-hero border-transparent text-white'
                : i === current
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted text-muted-foreground',
            )}
          >
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span
            className={cn(
              'text-xs font-medium',
              i === current ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {label}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div
            className={cn(
              'h-0.5 flex-1 mx-1 mb-4 rounded transition-all duration-300',
              i < current ? 'gradient-hero' : 'bg-border',
            )}
          />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Props ────────────────────────────────────────────────────────────────────

interface TransactionFormProps {
  onSuccess?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSuccess }) => {
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const { data: accounts = [] } = useAccounts();
  const createTransaction = useCreateTransaction();
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      source_account_id: '',
      destination_account_id: '',
      amount: 0,
      description: '',
      transaction_type: 'emprestimo',
      transaction_date: new Date(),
    },
  });

  const accountOptions: SearchableSelectItem[] = accounts.map((acc) => ({
    value: acc.id,
    label: `${acc.account_number ? acc.account_number + ' — ' : ''}${acc.name}${acc.coordinator_name ? ' (' + acc.coordinator_name + ')' : ''}`,
    searchLabel: `${acc.account_number || ''} ${acc.name} ${acc.coordinator_name || ''}`.toLowerCase(),
  }));

  const getAccount = (id: string) => accounts.find((a) => a.id === id);

  const goNext = async () => {
    let valid = false;
    if (step === 0) {
      valid = await form.trigger(['source_account_id', 'destination_account_id']);
    } else if (step === 1) {
      valid = await form.trigger(['amount', 'transaction_type', 'transaction_date', 'description']);
    }
    if (!valid) return;
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleConfirm = async () => {
    const data = form.getValues();
    try {
      await createTransaction.mutateAsync({
        source_account_id: data.source_account_id,
        destination_account_id: data.destination_account_id,
        transaction_date: data.transaction_date.toISOString(),
        amount: data.amount,
        transaction_type: data.transaction_type,
        description: data.description,
        parent_transaction_id: null,
      });

      toast({
        title: 'Transação criada!',
        description: 'A movimentação foi registrada com sucesso.',
        className: 'bg-success text-success-foreground border-success',
      });

      form.reset();
      setStep(0);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao criar transação', variant: 'destructive' });
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0 }),
  };

  const values = form.watch();
  const srcAccount = getAccount(values.source_account_id);
  const dstAccount = getAccount(values.destination_account_id);
  const selectedType = TX_TYPES.find((t) => t.value === values.transaction_type);

  return (
    <Card className="w-full border border-border/60 shadow-card rounded-2xl overflow-hidden">
      <CardContent className="p-4 sm:p-6 lg:p-8">
        <StepBar current={step} />

        <Form {...form}>
          <form>
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: 'easeInOut' }}
              >
                {/* ── Step 0: Contas ─────────────────────────────────────── */}
                {step === 0 && (
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">Selecione a conta de origem e destino da transação.</p>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_44px_1fr] items-end">
                      <FormField
                        control={form.control}
                        name="source_account_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              De (Origem)
                            </FormLabel>
                            <div
                              className={cn(
                                'rounded-xl border-2 transition-all duration-200',
                                field.value ? 'border-primary/40 bg-primary/5' : 'border-border',
                              )}
                            >
                              <FormControl>
                                <SearchableSelect
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  items={accountOptions}
                                  placeholder="Buscar conta..."
                                  searchPlaceholder="Número ou nome"
                                  emptyMessage="Nenhuma conta encontrada."
                                  className="border-0 shadow-none bg-transparent rounded-xl"
                                />
                              </FormControl>
                            </div>
                            {field.value && (
                              <p className="flex items-center gap-1 text-xs text-primary mt-1">
                                <Building2 className="h-3 w-3" />
                                {srcAccount?.account_number || 'Conta selecionada'}
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="flex items-center justify-center pb-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-hero shadow-medium">
                          <ArrowRight className="h-4 w-4 text-white" />
                        </div>
                      </div>

                      <FormField
                        control={form.control}
                        name="destination_account_id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Para (Destino)
                            </FormLabel>
                            <div
                              className={cn(
                                'rounded-xl border-2 transition-all duration-200',
                                field.value ? 'border-accent/40 bg-accent/5' : 'border-border',
                              )}
                            >
                              <FormControl>
                                <SearchableSelect
                                  value={field.value}
                                  onValueChange={field.onChange}
                                  items={accountOptions}
                                  placeholder="Buscar conta..."
                                  searchPlaceholder="Número ou nome"
                                  emptyMessage="Nenhuma conta encontrada."
                                  className="border-0 shadow-none bg-transparent rounded-xl"
                                />
                              </FormControl>
                            </div>
                            {field.value && (
                              <p className="flex items-center gap-1 text-xs text-accent mt-1">
                                <Building2 className="h-3 w-3" />
                                {dstAccount?.account_number || 'Conta selecionada'}
                              </p>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button type="button" onClick={goNext} className="w-full gradient-transaction text-white py-3 rounded-xl font-semibold shadow-medium hover:opacity-90">
                      Continuar <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* ── Step 1: Detalhes ───────────────────────────────────── */}
                {step === 1 && (
                  <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">Informe o valor, tipo e data da transação.</p>

                    {/* Valor em destaque */}
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Valor
                          </FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">R$</span>
                              <Input
                                type="text"
                                placeholder="0,00"
                                value={field.value > 0 ? formatCurrencyInput(Math.round(field.value * 100).toString()) : ''}
                                onChange={(e) => {
                                  const formatted = formatCurrencyInput(e.target.value);
                                  field.onChange(parseCurrencyInput(formatted));
                                }}
                                className="pl-12 pr-4 text-right text-3xl font-bold h-16 rounded-xl border-2 focus:border-primary"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Tipo como icon cards */}
                    <FormField
                      control={form.control}
                      name="transaction_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Tipo de Transação
                          </FormLabel>
                          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                            {TX_TYPES.map((type) => {
                              const Icon = type.icon;
                              const active = field.value === type.value;
                              return (
                                <button
                                  type="button"
                                  key={type.value}
                                  onClick={() => field.onChange(type.value)}
                                  className={cn(
                                    'flex flex-col items-center gap-1.5 rounded-xl border-2 p-2.5 text-center transition-all duration-200',
                                    active
                                      ? `${type.bg} ${type.color} border-current scale-105 shadow-medium`
                                      : 'border-border hover:border-primary/30 hover:bg-secondary/50',
                                  )}
                                >
                                  <Icon className={cn('h-5 w-5', active ? type.color : 'text-muted-foreground')} />
                                  <span className={cn('text-[10px] font-medium leading-tight', active ? type.color : 'text-muted-foreground')}>
                                    {type.label}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Data e Descrição */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="transaction_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Data
                            </FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      'w-full pl-3 text-left font-normal rounded-xl border-2 h-11',
                                      !field.value && 'text-muted-foreground',
                                    )}
                                  >
                                    {field.value
                                      ? format(field.value, "dd 'de' MMMM, yyyy", { locale: ptBR })
                                      : 'Selecione a data'}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0 rounded-xl" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  locale={ptBR}
                                  disabled={(d) => d > new Date() || d < new Date('1900-01-01')}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              Descrição
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Textarea
                                  placeholder="Descreva a transação..."
                                  className="resize-none h-[88px] rounded-xl border-2 py-2.5 text-sm"
                                  maxLength={200}
                                  {...field}
                                />
                                <span className="absolute bottom-1.5 right-2 text-[10px] text-muted-foreground">
                                  {field.value?.length ?? 0}/200
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={goBack} className="flex-1 rounded-xl border-2 h-11">
                        <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                      </Button>
                      <Button type="button" onClick={goNext} className="flex-1 gradient-transaction text-white rounded-xl h-11 font-semibold hover:opacity-90">
                        Revisar <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 2: Confirmação ────────────────────────────────── */}
                {step === 2 && (
                  <div className="space-y-5">
                    <p className="text-sm text-muted-foreground">Confira os dados antes de confirmar a transação.</p>

                    {/* Card glassmorphism com resumo */}
                    <div className="glass-card p-4 sm:p-5 space-y-4">
                      {/* DE → PARA — empilha em mobile, lado a lado em sm+ */}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center text-sm">
                        <div className="flex-1 rounded-lg bg-primary/8 border border-primary/20 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">De (Origem)</p>
                          <p className="font-semibold text-foreground leading-tight text-sm break-words">
                            {srcAccount?.name ?? '—'}
                          </p>
                          {srcAccount?.account_number && (
                            <p className="text-xs text-muted-foreground">{srcAccount.account_number}</p>
                          )}
                        </div>
                        <div className="flex sm:flex-col items-center justify-center gap-1">
                          <div className="h-px w-8 bg-border sm:h-8 sm:w-px" />
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-hero shadow-sm">
                            <ArrowRight className="h-3.5 w-3.5 text-white sm:hidden" />
                            <ArrowRight className="hidden h-3.5 w-3.5 text-white sm:block rotate-90" />
                          </div>
                          <div className="h-px w-8 bg-border sm:h-8 sm:w-px" />
                        </div>
                        <div className="flex-1 rounded-lg bg-accent/8 border border-accent/20 p-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Para (Destino)</p>
                          <p className="font-semibold text-foreground leading-tight text-sm break-words">
                            {dstAccount?.name ?? '—'}
                          </p>
                          {dstAccount?.account_number && (
                            <p className="text-xs text-muted-foreground">{dstAccount.account_number}</p>
                          )}
                        </div>
                      </div>

                      {/* Valor */}
                      <div className="text-center py-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Valor</p>
                        <p className="text-4xl font-bold text-success">
                          {values.amount
                            ? values.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'R$ 0,00'}
                        </p>
                      </div>

                      {/* Tipo + Data */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Tipo</p>
                          <div className={cn('inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border', selectedType?.bg, selectedType?.color)}>
                            {selectedType && React.createElement(selectedType.icon, { className: 'h-3 w-3' })}
                            {selectedType?.label}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Data</p>
                          <p className="font-medium text-sm">
                            {values.transaction_date
                              ? format(values.transaction_date, "dd/MM/yyyy", { locale: ptBR })
                              : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Descrição */}
                      {values.description && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Descrição</p>
                          <p className="text-sm text-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/60">
                            {values.description}
                          </p>
                        </div>
                      )}
                    </div>

                    <p className="text-[11px] text-center text-muted-foreground">
                      O identificador único será gerado automaticamente após salvar.
                    </p>

                    <div className="flex gap-3">
                      <Button type="button" variant="outline" onClick={goBack} className="flex-1 rounded-xl border-2 h-11" disabled={createTransaction.isPending}>
                        <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                      </Button>
                      <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={createTransaction.isPending}
                        className="flex-1 gradient-transaction text-white rounded-xl h-11 font-semibold shadow-medium hover:opacity-90"
                      >
                        {createTransaction.isPending ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                        ) : (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Confirmar Transação</>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
