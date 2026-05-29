import React, { useState, useRef } from 'react';
import { Upload, FileText, Plus, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

interface AccountData {
  account_number: string;
  name: string;
  description?: string;
}

export const AccountImport: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

        const importedAccounts: AccountData[] = [];
        
        // Pula o cabeçalho (primeira linha) se existir
        const startRow = jsonData[0] && typeof jsonData[0][0] === 'string' && 
                        (jsonData[0][0].includes('PROJETO') || jsonData[0][0].includes('Projeto')) ? 1 : 0;

        for (let i = startRow; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row[0]) {
            const account_number = String(row[0]).trim();
            const name = row[1] ? String(row[1]).trim() : '';
            const description = row[2] ? String(row[2]).trim() : undefined;
            
            if (account_number && name && account_number.length > 0 && name.length > 0) {
              importedAccounts.push({
                account_number,
                name,
                description
              });
            }
          }
        }

        setAccounts(importedAccounts);
        toast({
          title: 'Arquivo carregado',
          description: `${importedAccounts.length} contas encontradas`,
        });
      } catch (error) {
        toast({
          title: 'Erro',
          description: 'Erro ao processar arquivo. Verifique se o formato está correto.',
          variant: 'destructive',
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTextImport = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    const importedAccounts: AccountData[] = [];

    lines.forEach(line => {
      const parts = line.split('\t'); // Separado por tab
      if (parts.length >= 2) {
        const account_number = parts[0].trim();
        const name = parts[1].trim();
        const description = parts[2] ? parts[2].trim() : undefined;
        
        if (account_number && name && account_number.length > 0 && name.length > 0) {
          importedAccounts.push({
            account_number,
            name,
            description
          });
        }
      }
    });

    setAccounts(importedAccounts);
    toast({
      title: 'Dados carregados',
      description: `${importedAccounts.length} contas encontradas`,
    });
  };

  const addManualAccount = () => {
    setAccounts([...accounts, { account_number: '', name: '', description: '' }]);
  };

  const updateAccount = (index: number, field: keyof AccountData, value: string) => {
    const newAccounts = [...accounts];
    newAccounts[index] = { ...newAccounts[index], [field]: value };
    setAccounts(newAccounts);
  };

  const removeAccount = (index: number) => {
    setAccounts(accounts.filter((_, i) => i !== index));
  };

  const importAccounts = async () => {
    if (accounts.length === 0) {
      toast({
        title: 'Erro',
        description: 'Nenhuma conta para importar',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Filtrar contas válidas
      const validAccounts = accounts.filter(acc => acc.account_number.trim() !== '' && acc.name.trim() !== '');
      
      if (validAccounts.length === 0) {
        throw new Error('Nenhuma conta válida encontrada');
      }

      // Verificar duplicatas no banco
      const { data: existingAccounts } = await supabase
        .from('accounts')
        .select('account_number')
        .in('account_number', validAccounts.map(acc => acc.account_number));

      const existingNumbers = existingAccounts?.map(acc => acc.account_number) || [];
      const newAccounts = validAccounts.filter(acc => !existingNumbers.includes(acc.account_number));

      if (newAccounts.length === 0) {
        toast({
          title: 'Aviso',
          description: 'Todas as contas já existem no banco de dados',
          variant: 'destructive',
        });
        return;
      }

      // Inserir novas contas
      const { error } = await supabase
        .from('accounts')
        .insert(newAccounts.map(acc => ({
          account_number: acc.account_number,
          name: acc.name,
          description: acc.description || null
        })));

      if (error) throw error;

      // Atualizar cache
      queryClient.invalidateQueries({ queryKey: ['accounts'] });

      toast({
        title: 'Sucesso',
        description: `${newAccounts.length} contas importadas com sucesso! ${existingNumbers.length > 0 ? `(${existingNumbers.length} duplicatas ignoradas)` : ''}`,
      });

      // Limpar dados
      setAccounts([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Contas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload de arquivo */}
          <div>
            <label className="text-sm font-medium mb-2 block">Upload de Arquivo Excel/CSV</label>
            <div className="flex items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                Selecionar Arquivo
              </Button>
              <span className="text-sm text-muted-foreground">
                Formatos: Excel (.xlsx, .xls) ou CSV
              </span>
            </div>
          </div>

          {/* Importação via texto */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Ou cole os dados aqui (número da conta [TAB] nome da conta, um por linha)
            </label>
            <Textarea
              placeholder="Cole aqui os dados das contas, separados por TAB&#10;Exemplo:&#10;3000-1[TAB]TC N° 026/2023-LEA - PAESV&#10;3001-2[TAB]TC N° 017/2023 LP4 - PAEPX&#10;..."
              className="min-h-32"
              onChange={(e) => {
                if (e.target.value.trim()) {
                  handleTextImport(e.target.value);
                }
              }}
            />
          </div>

          {/* Adicionar conta manual */}
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Ou adicione contas manualmente:</span>
            <Button
              variant="outline"
              size="sm"
              onClick={addManualAccount}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Adicionar Conta
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview das contas */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Contas a Importar ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Número da Conta</TableHead>
                    <TableHead>Nome da Conta</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="w-16">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          value={account.account_number}
                          onChange={(e) => updateAccount(index, 'account_number', e.target.value)}
                          placeholder="Ex: 3000-1"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={account.name}
                          onChange={(e) => updateAccount(index, 'name', e.target.value)}
                          placeholder="Nome da conta"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={account.description || ''}
                          onChange={(e) => updateAccount(index, 'description', e.target.value)}
                          placeholder="Descrição (opcional)"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeAccount(index)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            
            <div className="flex justify-end mt-4">
              <Button
                onClick={importAccounts}
                disabled={isLoading || accounts.length === 0}
                className="flex items-center gap-2"
              >
                {isLoading ? 'Importando...' : `Importar ${accounts.length} Contas`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};