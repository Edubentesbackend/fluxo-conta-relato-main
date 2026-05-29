import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  Hash,
  Plus,
  Save,
  Trash2,
  UserRound,
  XCircle,
  ClipboardPaste,
  FileSpreadsheet,
  ArrowRight,
  ChevronLeft,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { accountsApi } from '@/lib/apiClient';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AccountData {
  local_id: string;
  account_number: string;
  name: string;
  coordinator_name: string;
  description?: string;
}

interface ProjectCoordinatorOption {
  id: string;
  name: string;
  normalized_name: string;
}

interface ImportAccountsResponse {
  batch_id: string;
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const coordinatorNamePattern = /^[\p{L}\s]+$/u;

function newLocalId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function emptyAccount(): AccountData {
  return { local_id: newLocalId(), account_number: '', name: '', coordinator_name: '', description: '' };
}

function formatAccountNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 1) return digits;
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
}

function normalizeCoordinatorLookup(value: string) {
  return value.normalize('NFD').replace(/\p{M}/gu, '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

function formatCoordinatorName(value: string) {
  return value.trim().replace(/\s+/g, ' ').split(' ').filter(Boolean)
    .map((p) => p.charAt(0).toLocaleUpperCase('pt-BR') + p.slice(1).toLocaleLowerCase('pt-BR'))
    .join(' ');
}

function sanitizeCoordinatorName(value: string) {
  return value.replace(/[^\p{L}\s]/gu, '').replace(/\s{2,}/g, ' ');
}

function isValidAccountNumber(value: string) {
  return /^\d+-\d$/.test(value.trim());
}

function isValidCoordinatorName(value: string) {
  const formatted = formatCoordinatorName(value);
  return formatted.length > 0 && coordinatorNamePattern.test(formatted);
}

// ─── Step bar ─────────────────────────────────────────────────────────────────

const STEPS = ['Upload', 'Revisar', 'Confirmar'];

const StepBar: React.FC<{ current: number }> = ({ current }) => (
  <div className="flex items-center gap-0 mb-6">
    {STEPS.map((label, i) => (
      <React.Fragment key={i}>
        <div className="flex flex-col items-center gap-1">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all duration-300',
            i < current ? 'gradient-import border-transparent text-white' :
            i === current ? 'border-accent bg-accent/10 text-accent' :
            'border-border bg-muted text-muted-foreground',
          )}>
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </div>
          <span className={cn('text-xs font-medium', i === current ? 'text-accent' : 'text-muted-foreground')}>
            {label}
          </span>
        </div>
        {i < STEPS.length - 1 && (
          <div className={cn('h-0.5 flex-1 mx-1 mb-4 rounded transition-all duration-300', i < current ? 'gradient-import' : 'bg-border')} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export const AccountImport: React.FC = () => {
  const [step, setStep] = useState(0);
  const [accounts, setAccounts] = useState<AccountData[]>([emptyAccount()]);
  const [pastedText, setPastedText] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: projectCoordinators = [] } = useQuery({
    queryKey: ['project-coordinators'],
    queryFn: async (): Promise<ProjectCoordinatorOption[]> => accountsApi.coordinators<ProjectCoordinatorOption[]>(),
  });

  const coordinatorOptions = useMemo(() => {
    const byNormalized = new Map<string, string>();
    for (const c of projectCoordinators) byNormalized.set(c.normalized_name, c.name);
    for (const a of accounts) {
      if (!isValidCoordinatorName(a.coordinator_name)) continue;
      const name = formatCoordinatorName(a.coordinator_name);
      byNormalized.set(normalizeCoordinatorLookup(name), name);
    }
    return [...byNormalized.entries()]
      .map(([normalized, name]) => ({ normalized, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [accounts, projectCoordinators]);

  const getRowError = (account: AccountData) => {
    if (!isValidAccountNumber(account.account_number)) return 'Número inválido (ex: 12671-2)';
    if (!account.name.trim()) return 'Nome obrigatório';
    if (!isValidCoordinatorName(account.coordinator_name)) return 'Coordenador aceita só letras';
    return '';
  };

  const validRows = accounts.filter((a) => !getRowError(a));
  const invalidRows = accounts.filter((a) => getRowError(a));

  const updateAccount = (localId: string, field: keyof AccountData, value: string) => {
    setAccounts((cur) => cur.map((a) => {
      if (a.local_id !== localId) return a;
      if (field === 'account_number') return { ...a, account_number: formatAccountNumber(value) };
      if (field === 'coordinator_name') return { ...a, coordinator_name: sanitizeCoordinatorName(value) };
      return { ...a, [field]: value };
    }));
  };

  const applyCoordinatorSuggestion = (localId: string) => {
    setAccounts((cur) => cur.map((a) => {
      if (a.local_id !== localId) return a;
      const normalized = normalizeCoordinatorLookup(a.coordinator_name);
      const suggestion = coordinatorOptions.find((o) => o.normalized === normalized || o.normalized.startsWith(normalized));
      return { ...a, coordinator_name: suggestion?.name || formatCoordinatorName(a.coordinator_name) };
    }));
  };

  const addManualAccount = () => setAccounts((cur) => [...cur, emptyAccount()]);
  const removeAccount = (localId: string) => {
    setAccounts((cur) => {
      const next = cur.filter((a) => a.local_id !== localId);
      return next.length > 0 ? next : [emptyAccount()];
    });
  };

  const parseRows = (rows: unknown[][]) => {
    const firstCell = String(rows[0]?.[0] ?? '').toLocaleLowerCase('pt-BR');
    const startRow = firstCell.includes('numero') || firstCell.includes('número') || firstCell.includes('conta') ? 1 : 0;
    return rows.slice(startRow).flatMap((row) => {
      const accountNumber = formatAccountNumber(String(row[0] ?? '').trim());
      const name = String(row[1] ?? '').trim();
      const coordinatorName = sanitizeCoordinatorName(String(row[2] ?? '').trim());
      const description = String(row[3] ?? '').trim();
      if (!accountNumber && !name && !coordinatorName && !description) return [];
      return [{ account_number: accountNumber, name, coordinator_name: coordinatorName, description }];
    });
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        const imported = parseRows(rows);
        setAccounts(imported.length > 0 ? imported.map((a) => ({ ...a, local_id: newLocalId() })) : [emptyAccount()]);
        toast({ title: 'Arquivo carregado', description: `${imported.length} contas encontradas` });
        setStep(1);
      } catch {
        toast({ title: 'Erro', description: 'Erro ao processar arquivo. Verifique o formato.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleTextImport = () => {
    const rows = pastedText.split('\n').filter((l) => l.trim()).map((l) => l.split(/\t|;/));
    const imported = parseRows(rows);
    setAccounts(imported.length > 0 ? imported.map((a) => ({ ...a, local_id: newLocalId() })) : [emptyAccount()]);
    toast({ title: 'Dados carregados', description: `${imported.length} contas encontradas` });
    setStep(1);
  };

  const importAccounts = async () => {
    setIsLoading(true);
    try {
      const result = await accountsApi.importAccounts<ImportAccountsResponse>({
        accounts: accounts.map((a) => ({
          account_number: a.account_number,
          name: a.name.trim(),
          coordinator_name: formatCoordinatorName(a.coordinator_name),
          description: a.description?.trim() || null,
        })),
      });

      if (result.imported === 0) {
        toast({ title: 'Aviso', description: 'Todas as contas já existem no banco de dados', variant: 'destructive' });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['project-coordinators'] });
      toast({
        title: 'Importação concluída!',
        description: `${result.imported} contas importadas com sucesso!${result.skipped > 0 ? ` (${result.skipped} ignoradas)` : ''}`,
        className: 'bg-success text-success-foreground border-success',
      });

      setAccounts([emptyAccount()]);
      setPastedText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStep(0);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message || 'Erro ao importar contas', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 30 : -30, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -30 : 30, opacity: 0 }),
  };

  return (
    <Card className="w-full border border-border/60 shadow-card rounded-2xl overflow-hidden">
      <CardContent className="p-7">
        <StepBar current={step} />

        <datalist id="coordinator-suggestions">
          {coordinatorOptions.map((o) => <option key={o.normalized} value={o.name} />)}
        </datalist>

        <AnimatePresence mode="wait" custom={step}>
          <motion.div
            key={step}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {/* ── Step 0: Upload ─────────────────────────────────────────── */}
            {step === 0 && (
              <div className="space-y-6">
                <p className="text-sm text-muted-foreground">
                  Faça upload de uma planilha ou cole os dados diretamente.
                </p>

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    'drop-zone cursor-pointer rounded-2xl p-10 text-center transition-all duration-200 select-none',
                    isDragOver ? 'drag-over' : 'hover:border-primary/40 hover:bg-secondary/30',
                  )}
                >
                  <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" />
                  <div className={cn('mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl gradient-import shadow-medium', isDragOver && 'animate-float')}>
                    <CloudUpload className="h-7 w-7 text-white" />
                  </div>
                  <p className="font-semibold text-foreground mb-1">
                    {isDragOver ? 'Solte o arquivo aqui' : 'Arraste o arquivo ou clique para selecionar'}
                  </p>
                  <p className="text-sm text-muted-foreground mb-3">
                    Planilha com: número da conta, nome, coordenador e descrição (opcional)
                  </p>
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary" className="text-xs"><FileSpreadsheet className="h-3 w-3 mr-1" />XLSX</Badge>
                    <Badge variant="secondary" className="text-xs"><FileSpreadsheet className="h-3 w-3 mr-1" />XLS</Badge>
                    <Badge variant="secondary" className="text-xs">CSV</Badge>
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 border-t border-border" />
                  <span className="text-xs font-medium text-muted-foreground">ou cole os dados</span>
                  <div className="flex-1 border-t border-border" />
                </div>

                {/* Área de colar */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5 text-sm font-medium">
                    <ClipboardPaste className="h-4 w-4 text-accent" />
                    Colar dados (separado por TAB ou ponto-e-vírgula)
                  </Label>
                  <Textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={'126712\tTC N 026/2023 - Projeto\tMarcus Lacerda\n300012\tTC N 017/2023 - Projeto\tAna Silva'}
                    className="min-h-28 rounded-xl text-sm font-mono"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => { setAccounts([emptyAccount()]); setStep(1); }}
                    className="flex-1 rounded-xl border-2 gap-2"
                  >
                    <Plus className="h-4 w-4" /> Adicionar manualmente
                  </Button>
                  <Button
                    type="button"
                    disabled={!pastedText.trim()}
                    onClick={handleTextImport}
                    className="flex-1 rounded-xl gradient-import text-white gap-2 shadow-medium hover:opacity-90"
                  >
                    <ClipboardPaste className="h-4 w-4" /> Carregar dados colados
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 1: Revisar ────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-4">
                {/* Summary badges */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Revise e corrija os dados antes de importar.</p>
                  <div className="flex gap-2">
                    <Badge variant="secondary" className="bg-success/10 text-success border-success/20 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {validRows.length} válidas
                    </Badge>
                    {invalidRows.length > 0 && (
                      <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 gap-1">
                        <AlertCircle className="h-3 w-3" /> {invalidRows.length} com erro
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Account rows */}
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {accounts.map((account, index) => {
                    const rowError = getRowError(account);
                    return (
                      <div
                        key={account.local_id}
                        className={cn(
                          'rounded-xl border p-4 transition-all duration-200',
                          rowError
                            ? 'bg-warning/5 border-l-2 border-warning/40 border-r-border/60 border-t-border/60 border-b-border/60'
                            : 'bg-background border-border hover:bg-secondary/20',
                        )}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {index + 1}
                            </span>
                            {rowError ? (
                              <span className="flex items-center gap-1 text-xs text-warning">
                                <AlertCircle className="h-3 w-3" /> {rowError}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-success">
                                <CheckCircle2 className="h-3 w-3" /> Válida
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={() => removeAccount(account.local_id)}
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid gap-3 lg:grid-cols-[140px_1fr_1fr]">
                          <div>
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <Hash className="h-3 w-3" /> Número
                            </Label>
                            <Input
                              inputMode="numeric"
                              value={account.account_number}
                              onChange={(e) => updateAccount(account.local_id, 'account_number', e.target.value)}
                              placeholder="126712"
                              className="h-9 rounded-lg text-sm border"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground mb-1 block">Nome da conta</Label>
                            <Input
                              value={account.name}
                              onChange={(e) => updateAccount(account.local_id, 'name', e.target.value)}
                              placeholder="TC N 026/2023 - Projeto"
                              className="h-9 rounded-lg text-sm border"
                            />
                          </div>
                          <div>
                            <Label className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                              <UserRound className="h-3 w-3" /> Coordenador
                            </Label>
                            <Input
                              list="coordinator-suggestions"
                              value={account.coordinator_name}
                              onChange={(e) => updateAccount(account.local_id, 'coordinator_name', e.target.value)}
                              onBlur={() => applyCoordinatorSuggestion(account.local_id)}
                              placeholder="Marcus Lacerda"
                              className="h-9 rounded-lg text-sm border"
                            />
                          </div>
                        </div>
                        <div className="mt-2">
                          <Input
                            value={account.description || ''}
                            onChange={(e) => updateAccount(account.local_id, 'description', e.target.value)}
                            placeholder="Descrição opcional"
                            className="h-8 rounded-lg text-xs border"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full rounded-xl border-dashed border-2 gap-2 h-10"
                  onClick={addManualAccount}
                >
                  <Plus className="h-4 w-4" /> Adicionar outra conta
                </Button>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(0)} className="flex-1 rounded-xl border-2 h-11">
                    <ChevronLeft className="mr-1 h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={validRows.length === 0 || invalidRows.length > 0}
                    className="flex-1 gradient-import text-white rounded-xl h-11 font-semibold gap-2 hover:opacity-90"
                  >
                    Confirmar <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Step 2: Confirmar ─────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5">
                <p className="text-sm text-muted-foreground">Revise o resumo antes de importar.</p>

                <div className="glass-card p-5 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl gradient-import shadow-medium">
                      <FileSpreadsheet className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{validRows.length} conta{validRows.length !== 1 ? 's' : ''} para importar</p>
                      <p className="text-sm text-muted-foreground">Todas as entradas foram validadas</p>
                    </div>
                  </div>

                  <div className="divide-y divide-border/60 max-h-52 overflow-y-auto rounded-xl border border-border/60 bg-secondary/20">
                    {accounts.map((a, i) => (
                      <div key={a.local_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-mono text-muted-foreground w-5 shrink-0">{i + 1}.</span>
                          <Trash2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                          <span className="font-medium truncate">{a.name}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{a.account_number}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-success">
                      <CheckCircle2 className="h-4 w-4" />
                      <span><strong>{validRows.length}</strong> contas prontas</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      <span>Contas já existentes serão ignoradas</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-xl border-2 h-11" disabled={isLoading}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Revisar
                  </Button>
                  <Button
                    type="button"
                    onClick={importAccounts}
                    disabled={isLoading || validRows.length === 0}
                    className="flex-1 gradient-import text-white rounded-xl h-11 font-semibold shadow-medium hover:opacity-90"
                  >
                    {isLoading ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Importando...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Importar {validRows.length} conta{validRows.length !== 1 ? 's' : ''}</>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
