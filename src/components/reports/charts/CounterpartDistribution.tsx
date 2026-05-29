import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/utils/currency';
import { cn } from '@/lib/utils';

interface CounterpartData {
  name: string;
  amount: number;
  percentage: number;
  color: string;
}

interface CounterpartDistributionProps {
  sentData: CounterpartData[];
  receivedData: CounterpartData[];
  totalSent: number;
  totalReceived: number;
}

export const CounterpartDistribution: React.FC<CounterpartDistributionProps> = ({
  sentData,
  receivedData,
  totalSent,
  totalReceived,
}) => {
  const renderDistributionBar = (data: CounterpartData[], total: number, type: 'sent' | 'received') => {
    if (data.length === 0) return null;

    const topItems = data.slice(0, 5); // Top 5
    const othersAmount = data.slice(5).reduce((sum, item) => sum + item.amount, 0);
    const othersPercentage = (othersAmount / total) * 100;

    return (
      <div className="space-y-3">
        {/* Visual bar */}
        <div className="flex h-8 rounded-lg overflow-hidden border shadow-sm">
          {topItems.map((item, index) => (
            <div
              key={index}
              style={{ width: `${item.percentage}%` }}
              className={cn(
                "relative group transition-all hover:opacity-80",
                type === 'sent' ? 'bg-destructive/70' : 'bg-success/70'
              )}
              title={`${item.name}: ${formatCurrency(item.amount)} (${item.percentage.toFixed(1)}%)`}
            >
              {item.percentage > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white">
                  {item.percentage.toFixed(0)}%
                </span>
              )}
            </div>
          ))}
          {othersAmount > 0 && (
            <div
              style={{ width: `${othersPercentage}%` }}
              className={cn(
                "relative group",
                type === 'sent' ? 'bg-destructive/30' : 'bg-success/30'
              )}
              title={`Outros: ${formatCurrency(othersAmount)} (${othersPercentage.toFixed(1)}%)`}
            >
              {othersPercentage > 8 && (
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-medium text-foreground">
                  +{data.length - 5}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="space-y-2">
          {topItems.map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div 
                  className={cn(
                    "w-3 h-3 rounded-full flex-shrink-0",
                    type === 'sent' ? 'bg-destructive/70' : 'bg-success/70'
                  )}
                />
                <span className="truncate font-medium">{item.name}</span>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <span className="font-bold">{formatCurrency(item.amount)}</span>
                <span className="text-muted-foreground">({item.percentage.toFixed(1)}%)</span>
              </div>
            </div>
          ))}
          {othersAmount > 0 && (
            <div className="flex items-center justify-between text-xs pt-2 border-t">
              <div className="flex items-center gap-2">
                <div 
                  className={cn(
                    "w-3 h-3 rounded-full",
                    type === 'sent' ? 'bg-destructive/30' : 'bg-success/30'
                  )}
                />
                <span className="text-muted-foreground">Outros ({data.length - 5})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatCurrency(othersAmount)}</span>
                <span className="text-muted-foreground">({othersPercentage.toFixed(1)}%)</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card className="shadow-lg border-0 rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Distribuição por Contrapartida</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sent Distribution */}
        {sentData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <h4 className="font-semibold text-sm text-destructive">
                Enviado ({formatCurrency(totalSent)})
              </h4>
            </div>
            {renderDistributionBar(sentData, totalSent, 'sent')}
          </div>
        )}

        {/* Received Distribution */}
        {receivedData.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-4 w-4 text-success" />
              <h4 className="font-semibold text-sm text-success">
                Recebido ({formatCurrency(totalReceived)})
              </h4>
            </div>
            {renderDistributionBar(receivedData, totalReceived, 'received')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
