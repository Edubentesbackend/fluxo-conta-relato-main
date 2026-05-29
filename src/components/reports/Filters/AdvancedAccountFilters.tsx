import React from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { TRANSACTION_TYPES } from '@/types/database';

export interface AccountFilters {
  status: string;
  type: string;
  minValue: string;
  maxValue: string;
  age: string;
  search: string;
}

interface AdvancedAccountFiltersProps {
  filters: AccountFilters;
  onFiltersChange: (filters: AccountFilters) => void;
  onReset: () => void;
}

export const AdvancedAccountFilters: React.FC<AdvancedAccountFiltersProps> = ({
  filters,
  onFiltersChange,
  onReset,
}) => {
  const updateFilter = (key: keyof AccountFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== 'all');

  return (
    <Card className="shadow-lg border-0 rounded-2xl animate-fade-in">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Filtros Avançados
          </h3>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar Filtros
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status" className="text-sm font-medium">Status</Label>
            <Select value={filters.status} onValueChange={(value) => updateFilter('status', value)}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending_return">Pendente</SelectItem>
                <SelectItem value="partially_returned">Parcial</SelectItem>
                <SelectItem value="fully_returned">Quitado</SelectItem>
                <SelectItem value="completed">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">Tipo</Label>
            <Select value={filters.type} onValueChange={(value) => updateFilter('type', value)}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minValue" className="text-sm font-medium">Valor Mínimo</Label>
            <Input
              id="minValue"
              type="number"
              placeholder="R$ 0,00"
              value={filters.minValue}
              onChange={(e) => updateFilter('minValue', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxValue" className="text-sm font-medium">Valor Máximo</Label>
            <Input
              id="maxValue"
              type="number"
              placeholder="R$ 0,00"
              value={filters.maxValue}
              onChange={(e) => updateFilter('maxValue', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="age" className="text-sm font-medium">Antiguidade</Label>
            <Select value={filters.age} onValueChange={(value) => updateFilter('age', value)}>
              <SelectTrigger id="age">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="30">Mais de 30 dias</SelectItem>
                <SelectItem value="60">Mais de 60 dias</SelectItem>
                <SelectItem value="90">Mais de 90 dias</SelectItem>
                <SelectItem value="180">Mais de 180 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                type="text"
                placeholder="Descrição..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {filters.status !== 'all' && filters.status && (
              <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs">
                Status: {filters.status}
                <button onClick={() => updateFilter('status', 'all')} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.type !== 'all' && filters.type && (
              <div className="flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent rounded-full text-xs">
                Tipo: {TRANSACTION_TYPES.find(t => t.value === filters.type)?.label}
                <button onClick={() => updateFilter('type', 'all')} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.minValue && (
              <div className="flex items-center gap-1 px-3 py-1 bg-success/10 text-success rounded-full text-xs">
                Min: R$ {filters.minValue}
                <button onClick={() => updateFilter('minValue', '')} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.maxValue && (
              <div className="flex items-center gap-1 px-3 py-1 bg-warning/10 text-warning rounded-full text-xs">
                Max: R$ {filters.maxValue}
                <button onClick={() => updateFilter('maxValue', '')} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {filters.age !== 'all' && filters.age && (
              <div className="flex items-center gap-1 px-3 py-1 bg-destructive/10 text-destructive rounded-full text-xs">
                Mais de {filters.age} dias
                <button onClick={() => updateFilter('age', 'all')} className="ml-1 hover:opacity-70">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
