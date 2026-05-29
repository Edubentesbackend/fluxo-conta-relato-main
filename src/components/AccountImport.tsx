import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Hash,
  Plus,
  Save,
  Trash2,
  Upload,
  UserRound,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { accountsApi } from '@/lib/apiClient';

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

const coordinatorNamePattern = /^[\p{L}\s]+$/u;

function newLocalId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function emptyAccount(): AccountData {
  return {
    local_id: newLocalId(),
    account_number: '',
    name: '',
    coordinator_name: '',
    description: '',
  };
}

function formatAccountNumber(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 1) return digits;
  return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
}

function normalizeCoordinatorLookup(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

function formatCoordinatorName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1).toLocaleLowerCase('pt-BR'))
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

export const AccountImport: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountData[]>([emptyAccount()]);
  const [pastedText, setPastedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: projectCoordinators = [] } = useQuery({
    queryKey: ['project-coordinators'],
    queryFn: async (): Promise<ProjectCoordinatorOption[]> => {
      return accountsApi.coordinators<ProjectCoordinatorOption[]>();
    },
  });

  const coordinatorOptions = useMemo(() => {
    const byNormalized = new Map<string, string>();

    for (const coordinator of projectCoordinators) {
      byNormalized.set(coordinator.normalized_name, coordinator.name);
    }

    for (const account of accounts) {
      if (!isValidCoordinatorName(account.coordinator_name)) continue;
      const name = formatCoordinatorName(account.coordinator_name);
      byNormalized.set(normalizeCoordinatorLookup(name), name);
    }

    return [...byNormalized.entries()]
      .map(([normalized, name]) => ({ normalized, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [accounts, projectCoordinators]);

  const validRows = accounts.filter(
    (account) =>
      isValidAccountNumber(account.account_number) &&
      account.name.trim().length > 0 &&
      isValidCoordinatorName(account.coordinator_name),
  );

  const updateAccount = (localId: string, field: keyof AccountData, value: string) => {
    setAccounts((current) =>
      current.map((account) => {
        if (account.local_id !== localId) return account;

        if (field === 'account_number') {
          return { ...account, account_number: formatAccountNumber(value) };
        }

        if (field === 'coordinator_name') {
          return { ...account, coordinator_name: sanitizeCoordinatorName(value) };
        }

        return { ...account, [field]: value };
      }),
    );
  };

  const applyCoordinatorSuggestion = (localId: string) => {
    setAccounts((current) =>
      current.map((account) => {
        if (account.local_id !== localId) return account;

        const normalized = normalizeCoordinatorLookup(account.coordinator_name);
        const suggestion = coordinatorOptions.find(
          (option) => option.normalized === normalized || option.normalized.startsWith(normalized),
        );

        return {
          ...account,
          coordinator_name: suggestion?.name || formatCoordinatorName(account.coordinator_name),
        };
      }),
    );
  };

  const addManualAccount = () => {
    setAccounts((current) => [...current, emptyAccount()]);
  };

  const removeAccount = (localId: string) => {
    setAccounts((current) => {
      const next = current.filter((account) => account.local_id !== localId);
      return next.length > 0 ? next : [emptyAccount()];
    });
  };

  const replaceAccounts = (nextAccounts: Omit<AccountData, 'local_id'>[]) => {
    setAccounts(nextAccounts.length > 0 ? nextAccounts.map((account) => ({ ...account, local_id: newLocalId() })) : [emptyAccount()]);
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

      return [{
        account_number: accountNumber,
        name,
        coordinator_name: coordinatorName,
        description,
      }];
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        const importedAccounts = parseRows(rows);

        replaceAccounts(importedAccounts);
        toast({
          title: 'Arquivo carregado',
          description: `${importedAccounts.length} contas encontradas`,
        });
      } catch {
        toast({
          title: 'Erro',
          description: 'Erro ao processar arquivo. Verifique se o formato esta correto.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTextImport = () => {
    const rows = pastedText
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.split(/\t|;/));

    const importedAccounts = parseRows(rows);
    replaceAccounts(importedAccounts);

    toast({
      title: 'Dados carregados',
      description: `${importedAccounts.length} contas encontradas`,
    });
  };

  const getRowError = (account: AccountData) => {
    if (!isValidAccountNumber(account.account_number)) return 'Informe o numero com base e digito.';
    if (!account.name.trim()) return 'Informe o nome da conta.';
    if (!isValidCoordinatorName(account.coordinator_name)) return 'Coordenador aceita somente letras e espacos.';
    return '';
  };

  const importAccounts = async () => {
    const invalidRow = accounts.find((account) => getRowError(account));
    if (invalidRow) {
      toast({
        title: 'Revise as contas',
        description: getRowError(invalidRow),
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const result = await accountsApi.importAccounts<ImportAccountsResponse>({
        accounts: accounts.map((account) => ({
          account_number: account.account_number,
          name: account.name.trim(),
          coordinator_name: formatCoordinatorName(account.coordinator_name),
          description: account.description?.trim() || null,
        })),
      });

      if (result.imported === 0) {
        toast({
          title: 'Aviso',
          description: 'Todas as contas ja existem no banco de dados',
          variant: 'destructive',
        });
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['project-coordinators'] });

      toast({
        title: 'Sucesso',
        description: `${result.imported} contas importadas com sucesso! ${result.skipped > 0 ? `(${result.skipped} ignoradas)` : ''}`,
      });

      setAccounts([emptyAccount()]);
      setPastedText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao importar contas',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-0 shadow-medium">
        <CardHeader className="border-b border-primary/10 bg-gradient-to-r from-primary/10 via-accent/10 to-support/10">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <ClipboardList className="h-5 w-5" />
                Cadastro de Contas
              </CardTitle>
              <CardDescription className="mt-2">
                Adicione numero, conta e coordenador com padronizacao automatica.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="w-fit">
              {validRows.length}/{accounts.length} prontas
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-5 sm:p-6">
          <datalist id="coordinator-suggestions">
            {coordinatorOptions.map((option) => (
              <option key={option.normalized} value={option.name} />
            ))}
          </datalist>

          <div className="space-y-3">
            {accounts.map((account, index) => {
              const rowError = getRowError(account);

              return (
                <div
                  key={account.local_id}
                  className="rounded-xl border bg-background/80 p-4 shadow-soft transition-colors hover:bg-background"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium">Conta</span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAccount(account.local_id)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remover conta</span>
                    </Button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[160px_1fr_1fr]">
                    <div className="space-y-2">
                      <Label htmlFor={`account-number-${account.local_id}`} className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-primary" />
                        Numero da conta
                      </Label>
                      <Input
                        id={`account-number-${account.local_id}`}
                        inputMode="numeric"
                        value={account.account_number}
                        onChange={(event) => updateAccount(account.local_id, 'account_number', event.target.value)}
                        placeholder="126712"
                        className="h-11 rounded-xl border-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`account-name-${account.local_id}`}>Nome da conta</Label>
                      <Input
                        id={`account-name-${account.local_id}`}
                        value={account.name}
                        onChange={(event) => updateAccount(account.local_id, 'name', event.target.value)}
                        placeholder="TC N 026/2023 - Projeto"
                        className="h-11 rounded-xl border-2"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`coordinator-${account.local_id}`} className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-primary" />
                        Coordenador do projeto
                      </Label>
                      <Input
                        id={`coordinator-${account.local_id}`}
                        list="coordinator-suggestions"
                        value={account.coordinator_name}
                        onChange={(event) => updateAccount(account.local_id, 'coordinator_name', event.target.value)}
                        onBlur={() => applyCoordinatorSuggestion(account.local_id)}
                        placeholder="Marcus Lacerda"
                        className="h-11 rounded-xl border-2"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                    <Input
                      value={account.description || ''}
                      onChange={(event) => updateAccount(account.local_id, 'description', event.target.value)}
                      placeholder="Descricao opcional"
                      className="h-10 rounded-xl"
                    />
                    <div className="flex items-center gap-2 text-sm">
                      {rowError ? (
                        <>
                          <AlertCircle className="h-4 w-4 text-warning" />
                          <span className="text-muted-foreground">{rowError}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-success" />
                          <span className="font-medium text-success">Pronta para salvar</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" className="gap-2 rounded-xl" onClick={addManualAccount}>
              <Plus className="h-4 w-4" />
              Adicionar outra conta
            </Button>

            <Button
              type="button"
              className="gap-2 rounded-xl px-6"
              disabled={isLoading || accounts.length === 0 || validRows.length !== accounts.length}
              onClick={importAccounts}
            >
              <Save className="h-4 w-4" />
              {isLoading ? 'Salvando...' : `Salvar ${accounts.length} conta${accounts.length === 1 ? '' : 's'}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-dashed shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Importacao em lote
          </CardTitle>
          <CardDescription>
            Colunas: numero da conta, nome da conta, coordenador e descricao opcional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2 rounded-xl"
            >
              <FileText className="h-4 w-4" />
              Selecionar arquivo
            </Button>
            <span className="text-sm text-muted-foreground">Excel, CSV ou texto separado por TAB.</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-accounts">Colar dados</Label>
            <Textarea
              id="bulk-accounts"
              value={pastedText}
              onChange={(event) => setPastedText(event.target.value)}
              placeholder={'126712\tTC N 026/2023 - Projeto\tMarcus Lacerda\n300012\tTC N 017/2023 - Projeto\tAna Silva'}
              className="min-h-28 rounded-xl"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-xl"
              disabled={!pastedText.trim()}
              onClick={handleTextImport}
            >
              <ClipboardList className="h-4 w-4" />
              Carregar dados colados
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
