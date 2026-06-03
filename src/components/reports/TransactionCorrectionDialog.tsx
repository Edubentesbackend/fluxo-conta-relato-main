import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useUpdateTransaction, useVoidTransaction } from '@/hooks/useTransactions';
import { Transaction } from '@/types/database';
import { formatCurrencyInput, parseCurrencyInput } from '@/utils/currency';

type CorrectionMode = 'edit' | 'void';

export function TransactionCorrectionDialog({
  transaction,
  mode,
  open,
  onOpenChange,
  onCompleted,
}: {
  transaction: Transaction | null;
  mode: CorrectionMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompleted?: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const updateMutation = useUpdateTransaction();
  const voidMutation = useVoidTransaction();
  const { toast } = useToast();

  useEffect(() => {
    if (!transaction || !open) return;
    setAmount(formatCurrencyInput(String(Math.round(Number(transaction.amount) * 100))));
    setDescription(transaction.description || '');
    setReason('');
  }, [open, transaction]);

  const reset = () => {
    setAmount('');
    setDescription('');
    setReason('');
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const submit = async () => {
    if (!transaction) return;
    if (!reason.trim()) {
      toast({ title: 'Motivo obrigatorio', variant: 'destructive' });
      return;
    }

    try {
      if (mode === 'edit') {
        const parsedAmount = parseCurrencyInput(amount);
        if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
          toast({ title: 'Valor invalido', variant: 'destructive' });
          return;
        }

        await updateMutation.mutateAsync({
          id: transaction.id,
          payload: {
            amount: parsedAmount,
            description: description.trim() || undefined,
            reason: reason.trim(),
          },
        });
        toast({ title: 'Transacao corrigida', description: 'Os relatorios foram atualizados.' });
      } else {
        await voidMutation.mutateAsync({
          id: transaction.id,
          payload: { reason: reason.trim() },
        });
        toast({ title: 'Transacao cancelada', description: 'O registro foi mantido na auditoria.' });
      }

      onCompleted?.();
      close();
    } catch (error) {
      toast({
        title: mode === 'edit' ? 'Nao foi possivel corrigir' : 'Nao foi possivel cancelar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  const pending = updateMutation.isPending || voidMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Editar valor da transacao' : 'Cancelar transacao'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? 'Corrija apenas o valor e, se necessario, a descricao. A auditoria guardara antes e depois.'
              : 'A transacao sera ignorada nos relatorios, mas permanecera registrada para auditoria.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {mode === 'edit' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="transaction-correction-amount">Novo valor</Label>
                <Input
                  id="transaction-correction-amount"
                  value={amount}
                  onChange={(event) => setAmount(formatCurrencyInput(event.target.value))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transaction-correction-description">Descricao</Label>
                <Input
                  id="transaction-correction-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="transaction-correction-reason">
              {mode === 'edit' ? 'Motivo da correcao' : 'Motivo do cancelamento'}
            </Label>
            <Textarea
              id="transaction-correction-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explique o que foi lancado incorretamente."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>Fechar</Button>
          <Button onClick={submit} disabled={pending} variant={mode === 'void' ? 'destructive' : 'default'}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'edit' ? 'Salvar correcao' : 'Cancelar transacao'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
