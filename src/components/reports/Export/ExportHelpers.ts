import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Transaction } from '@/types/database';
import { formatCurrency } from '@/utils/currency';
import { TRANSACTION_TYPES } from '@/types/database';

export interface ExportAccountSummary {
  account: {
    name: string;
    account_number?: string;
    description?: string;
  };
  total_entries: number;
  total_exits: number;
  net_balance: number;
  position: string;
  total_transactions: number;
}

export const exportAccountSummariesToExcel = (data: ExportAccountSummary[], filename: string = 'relatorio-contas') => {
  const workbook = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData = data.map(item => ({
    'Conta': item.account.name,
    'Número': item.account.account_number || 'N/A',
    'Descrição': item.account.description || 'N/A',
    'Entradas': item.total_entries,
    'Saídas': item.total_exits,
    'Saldo Líquido': item.net_balance,
    'Posição': item.position === 'devedora' ? 'Devedora' : 
               item.position === 'credora' ? 'Credora' : 'Equilibrada',
    'Total Transações': item.total_transactions
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const colWidths = [
    { wch: 25 }, // Conta
    { wch: 15 }, // Número
    { wch: 30 }, // Descrição
    { wch: 15 }, // Entradas
    { wch: 15 }, // Saídas
    { wch: 15 }, // Saldo Líquido
    { wch: 12 }, // Posição
    { wch: 15 }  // Total Transações
  ];
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Resumo por Conta');
  
  // Add summary sheet
  const summaryData = [
    { 'Métrica': 'Total de Contas', 'Valor': data.length },
    { 'Métrica': 'Contas Devedoras', 'Valor': data.filter(d => d.position === 'devedora').length },
    { 'Métrica': 'Contas Credoras', 'Valor': data.filter(d => d.position === 'credora').length },
    { 'Métrica': 'Contas Equilibradas', 'Valor': data.filter(d => d.position === 'equilibrada').length },
    { 'Métrica': 'Volume Total Entradas', 'Valor': data.reduce((sum, d) => sum + d.total_entries, 0) },
    { 'Métrica': 'Volume Total Saídas', 'Valor': data.reduce((sum, d) => sum + d.total_exits, 0) }
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo Geral');

  // Save file
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportTransactionsToExcel = (data: Transaction[], filename: string = 'transacoes-detalhadas') => {
  const workbook = XLSX.utils.book_new();
  
  // Prepare data for Excel
  const excelData = data.map(transaction => ({
    'Identificador': transaction.unique_identifier,
    'Data': new Date(transaction.transaction_date).toLocaleDateString('pt-BR'),
    'Valor': transaction.amount,
    'Tipo': TRANSACTION_TYPES.find(t => t.value === transaction.transaction_type)?.label || transaction.transaction_type,
    'Descrição': transaction.description,
    'Conta Origem': transaction.source_account_id,
    'Conta Destino': transaction.destination_account_id,
    'Criado em': new Date(transaction.created_at).toLocaleDateString('pt-BR')
  }));

  const worksheet = XLSX.utils.json_to_sheet(excelData);
  
  // Set column widths
  const colWidths = [
    { wch: 20 }, // Identificador
    { wch: 12 }, // Data
    { wch: 15 }, // Valor
    { wch: 20 }, // Tipo
    { wch: 40 }, // Descrição
    { wch: 15 }, // Conta Origem
    { wch: 15 }, // Conta Destino
    { wch: 12 }  // Criado em
  ];
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Transações');
  
  // Add summary by type
  const typesSummary = TRANSACTION_TYPES.map(type => ({
    'Tipo': type.label,
    'Quantidade': data.filter(t => t.transaction_type === type.value).length,
    'Volume Total': data
      .filter(t => t.transaction_type === type.value)
      .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0)
  }));

  const typesSheet = XLSX.utils.json_to_sheet(typesSummary);
  typesSheet['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(workbook, typesSheet, 'Resumo por Tipo');

  // Save file
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportInsightsToExcel = (insights: any, monthlyData: any[], filename: string = 'insights-dashboard') => {
  const workbook = XLSX.utils.book_new();
  
  // KPIs Sheet
  const kpisData = [
    { 'Métrica': 'Volume Total', 'Valor': insights.total_volume, 'Formatado': formatCurrency(insights.total_volume) },
    { 'Métrica': 'Total de Transações', 'Valor': insights.transaction_count, 'Formatado': insights.transaction_count },
    { 'Métrica': 'Ticket Médio', 'Valor': insights.avg_transaction_amount, 'Formatado': formatCurrency(insights.avg_transaction_amount) },
    { 'Métrica': 'Conta Mais Ativa', 'Valor': insights.most_active_account_name, 'Formatado': insights.most_active_account_name },
    { 'Métrica': 'Transações da Conta Mais Ativa', 'Valor': insights.most_active_account_transactions, 'Formatado': insights.most_active_account_transactions },
    { 'Métrica': 'Maior Transação', 'Valor': insights.highest_value_transaction_amount, 'Formatado': formatCurrency(insights.highest_value_transaction_amount) },
    { 'Métrica': 'Tipo Mais Comum', 'Valor': insights.most_common_transaction_type, 'Formatado': TRANSACTION_TYPES.find(t => t.value === insights.most_common_transaction_type)?.label || insights.most_common_transaction_type }
  ];

  const kpisSheet = XLSX.utils.json_to_sheet(kpisData);
  kpisSheet['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, kpisSheet, 'KPIs');

  // Monthly Evolution Sheet
  const monthlyExcelData = monthlyData.map(item => ({
    'Mês/Ano': item.month_year,
    'Volume Total': item.total_volume,
    'Volume Formatado': formatCurrency(item.total_volume),
    'Quantidade de Transações': item.transaction_count
  }));

  const monthlySheet = XLSX.utils.json_to_sheet(monthlyExcelData);
  monthlySheet['!cols'] = [{ wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(workbook, monthlySheet, 'Evolução Mensal');

  // Save file
  XLSX.writeFile(workbook, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportAccountSummariesToPDF = (data: ExportAccountSummary[], filename: string = 'relatorio-contas') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(34, 139, 34);
  doc.text('Relatório de Contas', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Summary metrics
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text('Resumo Geral', 14, 40);
  
  const summaryData = [
    ['Total de Contas', data.length.toString()],
    ['Contas Devedoras', data.filter(d => d.position === 'devedora').length.toString()],
    ['Contas Credoras', data.filter(d => d.position === 'credora').length.toString()],
    ['Contas Equilibradas', data.filter(d => d.position === 'equilibrada').length.toString()],
    ['Volume Total Entradas', formatCurrency(data.reduce((sum, d) => sum + d.total_entries, 0))],
    ['Volume Total Saídas', formatCurrency(data.reduce((sum, d) => sum + d.total_exits, 0))]
  ];
  
  autoTable(doc, {
    startY: 45,
    head: [['Métrica', 'Valor']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 10 },
    margin: { left: 14, right: 14 }
  });
  
  // Account details table
  doc.addPage();
  doc.setFontSize(12);
  doc.text('Detalhamento por Conta', 14, 20);
  
  const tableData = data.map(item => [
    item.account.name,
    item.account.account_number || 'N/A',
    formatCurrency(item.total_entries),
    formatCurrency(item.total_exits),
    formatCurrency(item.net_balance),
    item.position === 'devedora' ? 'Devedora' : item.position === 'credora' ? 'Credora' : 'Equilibrada',
    item.total_transactions.toString()
  ]);
  
  autoTable(doc, {
    startY: 25,
    head: [['Conta', 'Número', 'Entradas', 'Saídas', 'Saldo Líquido', 'Posição', 'Transações']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 8, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 20 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
      5: { cellWidth: 22 },
      6: { cellWidth: 18 }
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const position = data.cell.raw as string;
        if (position === 'Devedora') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        } else if (position === 'Credora') {
          data.cell.styles.textColor = [34, 139, 34];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });
  
  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportInsightsToPDF = (insights: any, monthlyData: any[], filename: string = 'insights-dashboard') => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(46, 125, 50);
  doc.text('Dashboard de Insights', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
  
  // KPIs Section
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text('Indicadores Principais (KPIs)', 14, 40);
  
  const kpisData = [
    ['Volume Total', formatCurrency(insights.total_volume)],
    ['Total de Transações', insights.transaction_count.toLocaleString('pt-BR')],
    ['Ticket Médio', formatCurrency(insights.avg_transaction_amount)],
    ['Conta Mais Ativa', insights.most_active_account_name],
    ['Transações da Conta Mais Ativa', insights.most_active_account_transactions.toString()],
    ['Maior Transação', formatCurrency(insights.highest_value_transaction_amount)],
    ['Tipo Mais Comum', TRANSACTION_TYPES.find(t => t.value === insights.most_common_transaction_type)?.label || insights.most_common_transaction_type]
  ];
  
  autoTable(doc, {
    startY: 45,
    head: [['Métrica', 'Valor']],
    body: kpisData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 11 },
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold' },
      1: { cellWidth: 100 }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Monthly Evolution
  if (monthlyData && monthlyData.length > 0) {
    const finalY = (doc as any).lastAutoTable.finalY || 45;
    
    doc.setFontSize(14);
    doc.text('Evolução Mensal', 14, finalY + 15);
    
    const monthlyTableData = monthlyData.map(item => [
      item.month_year,
      formatCurrency(item.total_volume),
      item.transaction_count.toLocaleString('pt-BR')
    ]);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Mês/Ano', 'Volume Total', 'Quantidade de Transações']],
      body: monthlyTableData,
      theme: 'striped',
      headStyles: { fillColor: [46, 125, 50], textColor: 255 },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 70 },
        2: { cellWidth: 70 }
      },
      margin: { left: 14, right: 14 }
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  doc.save(`${filename}-${new Date().toISOString().split('T')[0]}.pdf`);
};