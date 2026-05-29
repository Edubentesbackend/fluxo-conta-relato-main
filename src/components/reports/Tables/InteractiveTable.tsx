import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/currency";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, Settings, Download, Eye, EyeOff } from "lucide-react";

interface Column<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, item: T) => React.ReactNode;
}

interface InteractiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  title?: string;
  searchable?: boolean;
  selectable?: boolean;
  onExport?: (selectedItems: T[]) => void;
  isLoading?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

export function InteractiveTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  searchable = true,
  selectable = true,
  onExport,
  isLoading
}: InteractiveTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof T>>(
    new Set(columns.map(col => col.key))
  );

  // Filter data based on search
  const filteredData = search
    ? data.filter(item =>
        Object.values(item).some(value =>
          String(value).toLowerCase().includes(search.toLowerCase())
        )
      )
    : data;

  // Sort data
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const aValue = a[sortColumn];
        const bValue = b[sortColumn];
        
        if (aValue === bValue) return 0;
        
        const result = aValue < bValue ? -1 : 1;
        return sortDirection === 'desc' ? -result : result;
      })
    : filteredData;

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortColumn(null);
        setSortDirection(null);
      } else {
        setSortDirection('asc');
      }
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedItems.size === sortedData.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedData.map((_, index) => index)));
    }
  };

  const toggleSelectItem = (index: number) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedItems(newSelected);
  };

  const toggleColumnVisibility = (column: keyof T) => {
    const newVisible = new Set(visibleColumns);
    if (newVisible.has(column)) {
      newVisible.delete(column);
    } else {
      newVisible.add(column);
    }
    setVisibleColumns(newVisible);
  };

  const handleExport = () => {
    if (onExport) {
      const selected = Array.from(selectedItems).map(index => sortedData[index]);
      onExport(selected.length > 0 ? selected : sortedData);
    }
  };

  const getSortIcon = (column: keyof T) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    
    if (sortDirection === 'asc') {
      return <ArrowUp className="h-4 w-4 text-primary" />;
    } else {
      return <ArrowDown className="h-4 w-4 text-primary" />;
    }
  };

  if (isLoading) {
    return (
      <Card>
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded animate-pulse"></div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const visibleColumnsArray = columns.filter(col => visibleColumns.has(col.key));

  return (
    <Card>
      {title && (
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{title}</CardTitle>
            <div className="flex items-center gap-2">
              {selectable && selectedItems.size > 0 && (
                <Badge variant="secondary">
                  {selectedItems.size} selecionados
                </Badge>
              )}
              
              {onExport && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Colunas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {columns.map((column) => (
                    <DropdownMenuItem
                      key={String(column.key)}
                      onClick={() => toggleColumnVisibility(column.key)}
                      className="flex items-center gap-2"
                    >
                      {visibleColumns.has(column.key) ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                      {column.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      )}
      
      <CardContent>
        {searchable && (
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.size === sortedData.length && sortedData.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                {visibleColumnsArray.map((column) => (
                  <TableHead
                    key={String(column.key)}
                    className={column.width}
                  >
                    {column.sortable ? (
                      <Button
                        variant="ghost"
                        className="h-auto p-0 font-semibold hover:bg-transparent"
                        onClick={() => handleSort(column.key)}
                      >
                        {column.label}
                        {getSortIcon(column.key)}
                      </Button>
                    ) : (
                      column.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedData.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={visibleColumnsArray.length + (selectable ? 1 : 0)} 
                    className="text-center py-8 text-muted-foreground"
                  >
                    Nenhum resultado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                sortedData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/50">
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedItems.has(index)}
                          onCheckedChange={() => toggleSelectItem(index)}
                        />
                      </TableCell>
                    )}
                    {visibleColumnsArray.map((column) => (
                      <TableCell key={String(column.key)}>
                        {column.render
                          ? column.render(item[column.key], item)
                          : String(item[column.key])
                        }
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {sortedData.length > 0 && (
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <span>
              Mostrando {sortedData.length} de {data.length} resultados
            </span>
            {search && (
              <span>
                Filtrado por: "{search}"
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}