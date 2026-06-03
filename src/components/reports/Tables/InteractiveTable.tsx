import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  Settings,
  Download,
  Eye,
  EyeOff,
  X,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  onDeleteSelected?: (selectedItems: T[], clearSelection: () => void) => void;
  deleteLabel?: string;
  selectionDescription?: string;
  isLoading?: boolean;
}

type SortDirection = 'asc' | 'desc' | null;

// ─── Loading skeleton ──────────────────────────────────────────────────────────

const TableSkeleton: React.FC<{ cols: number; rows?: number }> = ({ cols, rows = 5 }) => (
  <div className="space-y-0">
    {/* Header */}
    <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-3 skeleton flex-1 max-w-[120px]" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={cn('flex items-center gap-3 px-4 py-3.5', i % 2 === 0 ? '' : 'bg-secondary/20')}>
        <div className="h-4 w-4 skeleton rounded" />
        {Array.from({ length: cols - 1 }).map((_, j) => (
          <div key={j} className={cn('h-3 skeleton', j === 0 ? 'flex-1 max-w-[160px]' : 'flex-1 max-w-[100px]')} />
        ))}
      </div>
    ))}
  </div>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function InteractiveTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  searchable = true,
  selectable = true,
  onExport,
  onDeleteSelected,
  deleteLabel = 'Apagar',
  selectionDescription,
  isLoading,
}: InteractiveTableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortColumn, setSortColumn] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState<Set<keyof T>>(new Set(columns.map((c) => c.key)));
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(0);

  // Filter
  const filteredData = search
    ? data.filter((item) =>
        Object.values(item).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
      )
    : data;

  // Sort
  const sortedData = sortColumn
    ? [...filteredData].sort((a, b) => {
        const av = a[sortColumn];
        const bv = b[sortColumn];
        if (av === bv) return 0;
        const r = av < bv ? -1 : 1;
        return sortDirection === 'desc' ? -r : r;
      })
    : filteredData;

  // Paginate
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);
  const pageData = sortedData.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const pageStart = safePage * pageSize + 1;
  const pageEnd = Math.min((safePage + 1) * pageSize, sortedData.length);

  const handleSort = (col: keyof T) => {
    if (sortColumn === col) {
      if (sortDirection === 'asc') setSortDirection('desc');
      else { setSortColumn(null); setSortDirection(null); }
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
    setPage(0);
  };

  const handleSearch = (v: string) => { setSearch(v); setPage(0); setSelectedItems(new Set()); };

  const toggleSelectAll = () => {
    if (selectedItems.size === pageData.length) setSelectedItems(new Set());
    else setSelectedItems(new Set(pageData.map((_, i) => safePage * pageSize + i)));
  };

  const toggleSelectItem = (globalIndex: number) => {
    const s = new Set(selectedItems);
    if (s.has(globalIndex)) s.delete(globalIndex);
    else s.add(globalIndex);
    setSelectedItems(s);
  };

  const handleExport = () => {
    if (!onExport) return;
    const selected = Array.from(selectedItems).map((i) => sortedData[i]);
    onExport(selected.length > 0 ? selected : sortedData);
  };

  const handleDeleteSelected = () => {
    if (!onDeleteSelected || selectedItems.size === 0) return;
    const selected = Array.from(selectedItems).map((i) => sortedData[i]).filter(Boolean);
    onDeleteSelected(selected, () => setSelectedItems(new Set()));
  };

  const getSortIcon = (col: keyof T) => {
    if (sortColumn !== col) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-primary" />
      : <ArrowDown className="h-3.5 w-3.5 text-primary" />;
  };

  const visibleCols = columns.filter((c) => visibleColumns.has(c.key));
  const allOnPageSelected = pageData.length > 0 && pageData.every((_, i) => selectedItems.has(safePage * pageSize + i));

  return (
    <Card className="border border-border/60 shadow-card overflow-hidden">
      {/* Header */}
      {title && (
        <CardHeader className="border-b border-border/60 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base font-semibold">{title}</CardTitle>
            <div className="flex items-center gap-2">
              {onExport && (
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 h-8 text-xs rounded-lg">
                  <Download className="h-3.5 w-3.5" />
                  {selectedItems.size > 0 ? `Exportar (${selectedItems.size})` : 'Exportar'}
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-8 text-xs rounded-lg">
                    <Settings className="h-3.5 w-3.5" /> Colunas
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-xl">
                  {columns.map((col) => (
                    <DropdownMenuItem
                      key={String(col.key)}
                      onClick={() => {
                        const s = new Set(visibleColumns);
                        if (s.has(col.key)) s.delete(col.key);
                        else s.add(col.key);
                        setVisibleColumns(s);
                      }}
                      className="gap-2 text-xs"
                    >
                      {visibleColumns.has(col.key) ? <Eye className="h-3.5 w-3.5 text-primary" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                      {col.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-0">
        {/* Search + bulk bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-secondary/20">
          {searchable && (
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 text-xs rounded-lg border"
              />
              {search && (
                <button onClick={() => handleSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
          )}

          {selectedItems.size > 0 && (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                {selectedItems.size} selecionados
              </Badge>
              {selectionDescription && (
                <span className="max-w-sm truncate text-xs text-muted-foreground">
                  {selectionDescription}
                </span>
              )}
              {onDeleteSelected && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteSelected}
                  className="h-7 gap-1.5 rounded-lg px-2.5 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {deleteLabel} ({selectedItems.size})
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedItems(new Set())} className="h-6 w-6 p-0">
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
            {isLoading ? '' : `${sortedData.length} resultado${sortedData.length !== 1 ? 's' : ''}`}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <TableSkeleton cols={visibleCols.length + (selectable ? 1 : 0)} />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-secondary/30 hover:bg-secondary/30">
                  {selectable && (
                    <TableHead className="w-10 pl-4">
                      <Checkbox
                        checked={allOnPageSelected}
                        onCheckedChange={toggleSelectAll}
                        className="border-muted-foreground/40"
                      />
                    </TableHead>
                  )}
                  {visibleCols.map((col) => (
                    <TableHead key={String(col.key)} className={cn('text-xs font-semibold uppercase tracking-wide', col.width)}>
                      {col.sortable ? (
                        <button
                          onClick={() => handleSort(col.key)}
                          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                        >
                          {col.label}
                          {getSortIcon(col.key)}
                        </button>
                      ) : (
                        col.label
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={visibleCols.length + (selectable ? 1 : 0)}
                      className="text-center py-16 text-muted-foreground text-sm"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Search className="h-8 w-8 opacity-30" />
                        <span>Nenhum resultado encontrado</span>
                        {search && (
                          <Button variant="ghost" size="sm" onClick={() => handleSearch('')} className="text-xs h-7">
                            Limpar busca
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  pageData.map((item, rowIdx) => {
                    const globalIdx = safePage * pageSize + rowIdx;
                    const isSelected = selectedItems.has(globalIdx);
                    return (
                      <TableRow
                        key={globalIdx}
                        className={cn(
                          'transition-colors duration-100',
                          isSelected ? 'bg-primary/5 hover:bg-primary/8' : 'hover:bg-secondary/30',
                        )}
                      >
                        {selectable && (
                          <TableCell className="pl-4 w-10">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelectItem(globalIdx)}
                              className="border-muted-foreground/40"
                            />
                          </TableCell>
                        )}
                        {visibleCols.map((col) => (
                          <TableCell key={String(col.key)} className="text-sm py-3">
                            {col.render ? col.render(item[col.key], item) : String(item[col.key] ?? '')}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && sortedData.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-secondary/20">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Linhas por página:</span>
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(0); }}>
                <SelectTrigger className="h-7 w-16 text-xs rounded-lg border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 25, 50, 100].map((n) => (
                    <SelectItem key={n} value={String(n)} className="text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <span className="text-xs text-muted-foreground">
              {pageStart}–{pageEnd} de {sortedData.length}
            </span>

            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => setPage(0)} disabled={safePage === 0}>
                <ChevronsLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => setPage((p) => p - 1)} disabled={safePage === 0}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs px-2 text-muted-foreground">
                {safePage + 1}/{totalPages}
              </span>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => setPage((p) => p + 1)} disabled={safePage >= totalPages - 1}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={() => setPage(totalPages - 1)} disabled={safePage >= totalPages - 1}>
                <ChevronsRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
