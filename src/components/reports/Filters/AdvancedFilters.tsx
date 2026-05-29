import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { TRANSACTION_TYPES, TransactionType } from "@/types/database";
import { formatCurrency } from "@/utils/currency";
import { CalendarIcon, Filter, X, Search, DollarSign, Clock } from "lucide-react";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface AdvancedFiltersData {
  startDate?: Date;
  endDate?: Date;
  transactionType?: TransactionType;
  accountId?: string;
  minAmount?: number;
  maxAmount?: number;
  description?: string;
}

interface AdvancedFiltersProps {
  filters: AdvancedFiltersData;
  onFiltersChange: (filters: AdvancedFiltersData) => void;
  accountOptions: { value: string; label: string }[];
  onClearFilters: () => void;
}

export const AdvancedFilters = ({ 
  filters, 
  onFiltersChange, 
  accountOptions,
  onClearFilters 
}: AdvancedFiltersProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Quick filter presets
  const quickFilters = [
    {
      label: "Hoje",
      icon: Clock,
      apply: () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        onFiltersChange({ ...filters, startDate: today, endDate: new Date() });
      }
    },
    {
      label: "Últimos 7 dias",
      icon: Clock,
      apply: () => {
        onFiltersChange({ 
          ...filters, 
          startDate: subDays(new Date(), 7), 
          endDate: new Date() 
        });
      }
    },
    {
      label: "Último mês",
      icon: Clock,
      apply: () => {
        const lastMonth = subMonths(new Date(), 1);
        onFiltersChange({ 
          ...filters, 
          startDate: startOfMonth(lastMonth), 
          endDate: endOfMonth(lastMonth) 
        });
      }
    },
    {
      label: "Últimos 30 dias",
      icon: Clock,
      apply: () => {
        onFiltersChange({ 
          ...filters, 
          startDate: subDays(new Date(), 30), 
          endDate: new Date() 
        });
      }
    }
  ];

  // Debounced filter updates for description search
  const [searchTerm, setSearchTerm] = useState(filters.description || '');
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm !== filters.description) {
        updateFilter('description', searchTerm || undefined);
      }
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('reportFilters', JSON.stringify(filters));
  }, [filters]);

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('reportFilters');
    if (savedFilters) {
      try {
        const parsed = JSON.parse(savedFilters);
        if (parsed.startDate) parsed.startDate = new Date(parsed.startDate);
        if (parsed.endDate) parsed.endDate = new Date(parsed.endDate);
        onFiltersChange(parsed);
      } catch (error) {
        console.warn('Could not load saved filters:', error);
      }
    }
  }, []);

  const updateFilter = (key: keyof AdvancedFiltersData, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const removeFilter = (key: keyof AdvancedFiltersData) => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  const getFilterBadges = () => {
    const badges = [];
    
    if (filters.startDate) {
      badges.push({
        key: 'startDate',
        label: `Desde: ${format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })}`,
      });
    }
    
    if (filters.endDate) {
      badges.push({
        key: 'endDate',
        label: `Até: ${format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR })}`,
      });
    }
    
    if (filters.transactionType) {
      const typeLabel = TRANSACTION_TYPES.find(t => t.value === filters.transactionType)?.label;
      badges.push({
        key: 'transactionType',
        label: `Tipo: ${typeLabel}`,
      });
    }
    
    if (filters.accountId) {
      const accountLabel = accountOptions.find(a => a.value === filters.accountId)?.label;
      badges.push({
        key: 'accountId',
        label: `Conta: ${accountLabel}`,
      });
    }
    
    if (filters.minAmount) {
      badges.push({
        key: 'minAmount',
        label: `Min: ${formatCurrency(filters.minAmount)}`,
      });
    }
    
    if (filters.maxAmount) {
      badges.push({
        key: 'maxAmount',
        label: `Max: ${formatCurrency(filters.maxAmount)}`,
      });
    }
    
    if (filters.description) {
      badges.push({
        key: 'description',
        label: `Descrição: "${filters.description}"`,
      });
    }
    
    return badges;
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avançados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Recolher' : 'Expandir'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={onClearFilters}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4 mr-1" />
                Limpar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Filters */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((quickFilter) => (
            <Button
              key={quickFilter.label}
              variant="outline"
              size="sm"
              onClick={quickFilter.apply}
              className="flex items-center gap-1"
            >
              <quickFilter.icon className="h-3 w-3" />
              {quickFilter.label}
            </Button>
          ))}
        </div>
        
        {/* Active Filters Badges */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            {getFilterBadges().map((badge) => (
              <Badge key={badge.key} variant="secondary" className="flex items-center gap-1">
                {badge.label}
                <X 
                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                  onClick={() => removeFilter(badge.key as keyof AdvancedFiltersData)}
                />
              </Badge>
            ))}
          </div>
        )}
        
        {isExpanded && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Date Range */}
            <div className="space-y-2">
              <Label>Data Inicial</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.startDate ? (
                      format(filters.startDate, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.startDate}
                    onSelect={(date) => updateFilter('startDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Data Final</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {filters.endDate ? (
                      format(filters.endDate, 'dd/MM/yyyy', { locale: ptBR })
                    ) : (
                      <span>Selecionar data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={filters.endDate}
                    onSelect={(date) => updateFilter('endDate', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Tipo de Transação</Label>
              <SearchableSelect
                value={filters.transactionType || ''}
                onValueChange={(value) => updateFilter('transactionType', value as TransactionType)}
                items={TRANSACTION_TYPES}
                placeholder="Selecionar tipo"
              />
            </div>

            {/* Account */}
            <div className="space-y-2">
              <Label>Conta</Label>
              <SearchableSelect
                value={filters.accountId || ''}
                onValueChange={(value) => updateFilter('accountId', value)}
                items={accountOptions}
                placeholder="Selecionar conta"
              />
            </div>

            {/* Amount Range */}
            <div className="space-y-2">
              <Label>Valor Mínimo</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0,00"
                  value={filters.minAmount || ''}
                  onChange={(e) => updateFilter('minAmount', parseFloat(e.target.value) || undefined)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Valor Máximo</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0,00"
                  value={filters.maxAmount || ''}
                  onChange={(e) => updateFilter('maxAmount', parseFloat(e.target.value) || undefined)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Description Search */}
            <div className="space-y-2">
              <Label>Buscar Descrição</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar na descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};