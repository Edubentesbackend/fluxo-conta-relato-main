import React from 'react';
import { format } from 'date-fns';
import { X, Calendar, Hash, FileText, DollarSign, ArrowRight, Tag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { TransactionWithRunningBalance } from '@/types/database';
import { TRANSACTION_TYPES } from '@/types/database';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/lib/utils';

interface TransactionDetailModalProps {
  transaction: TransactionWithRunningBalance | null;
  isOpen: boolean;
  onClose: () => void;
  sourceName: string;
  destinationName: string;
}

export const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  transaction,
  isOpen,
  onClose,
  sourceName,
  destinationName,
}) => {
  if (!transaction) return null;

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending_return': { label: 'Pendente', className: 'bg-destructive/10 text-destructive' },
      'partially_returned': { label: 'Parcial', className: 'bg-warning/10 text-warning' },
      'fully_returned': { label: 'Quitado', className: 'bg-success/10 text-success' },
      'completed': { label: 'Completo', className: 'bg-muted text-muted-foreground' },
    };
    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.completed;
    return (
      <Badge className={cn('text-xs', statusInfo.className)}>
        {statusInfo.label}
      </Badge>
    );
  };

  const transactionType = TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl">Detalhes da Transação</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Informações completas da movimentação
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Transaction Flow */}
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-4 border">
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Origem</p>
                <p className="font-semibold text-lg">{sourceName}</p>
              </div>
              <div className="flex-shrink-0">
                <ArrowRight className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-muted-foreground mb-1">Destino</p>
                <p className="font-semibold text-lg">{destinationName}</p>
              </div>
            </div>
          </div>

          {/* Amount and Running Balance */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Valor da Transação</p>
              </div>
              <p className="text-2xl font-bold text-primary">
                {formatCurrency(Number(transaction.amount))}
              </p>
            </div>
            <div className="bg-card rounded-lg p-4 border">
              <div className="flex items-center gap-2 mb-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Saldo Acumulado</p>
              </div>
              <p className={cn(
                "text-2xl font-bold",
                transaction.runningBalance > 0 ? "text-success" :
                transaction.runningBalance < 0 ? "text-destructive" :
                "text-muted-foreground"
              )}>
                {formatCurrency(Math.abs(transaction.runningBalance))}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {transaction.balanceChange === 'increase' ? '↗️ Aumentou' : '↘️ Diminuiu'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Informações da Transação</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Identificador</p>
                  <p className="font-mono text-sm font-medium">{transaction.unique_identifier}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground mt-1" />
                <div>
                  <p className="text-xs text-muted-foreground">Data</p>
                  <p className="text-sm font-medium">
                    {format(new Date(transaction.transaction_date), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Tipo e Status</p>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-xs">
                    {transactionType?.label || transaction.transaction_type}
                  </Badge>
                  {getStatusBadge(transaction.status)}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-1" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-sm">{transaction.description}</p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-3">Informações Adicionais</h4>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Criado em:</span>
                <p className="font-medium">{format(new Date(transaction.created_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Atualizado em:</span>
                <p className="font-medium">{format(new Date(transaction.updated_at), 'dd/MM/yyyy HH:mm')}</p>
              </div>
            </div>
            {transaction.parent_transaction_id && (
              <div className="mt-3 pt-3 border-t">
                <span className="text-muted-foreground text-sm">Transação Pai:</span>
                <p className="font-mono text-xs mt-1">{transaction.parent_transaction_id}</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
