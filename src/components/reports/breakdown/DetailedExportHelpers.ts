import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency } from '@/utils/currency';
import { TRANSACTION_TYPES } from '@/types/database';
import { AccountBreakdownData } from '@/hooks/useAccountBreakdown';

export const exportDetailedAccountReport = (
  breakdownData: AccountBreakdownData,
  filename: string = 'relatorio-detalhado-conta'
) => {
  const workbook = XLSX.utils.book_new();
  
  // Sheet 1: Account Summary
  const summaryData = [
    { 'Métrica': 'Conta', 'Valor': breakdownData.account?.name || 'N/A' },
    { 'Métrica': 'Número da Conta', 'Valor': breakdownData.account?.account_number || 'N/A' },
    { 'Métrica': 'Total Enviado', 'Valor': formatCurrency(breakdownData.totalSent) },
    { 'Métrica': 'Total Recebido', 'Valor': formatCurrency(breakdownData.totalReceived) },
    { 'Métrica': 'Saldo Líquido', 'Valor': formatCurrency(Math.abs(breakdownData.netBalance)) },
    { 'Métrica': 'Posição', 'Valor': breakdownData.position.charAt(0).toUpperCase() + breakdownData.position.slice(1) },
    { 'Métrica': 'Total Contrapartes', 'Valor': breakdownData.totalCounterparts },
    { 'Métrica': 'Empréstimos Pendentes', 'Valor': formatCurrency(breakdownData.pendingLoans) },
  ];

  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 30 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumo da Conta');

  // Sheet 2: Counterpart Breakdown
  const counterpartData = breakdownData.counterpartBreakdowns.map(cp => ({
    'Contraparte': cp.counterpart.name,
    'Número': cp.counterpart.account_number || 'N/A',
    'Total Enviado': cp.totalSent,
    'Total Enviado (R$)': formatCurrency(cp.totalSent),
    '% Enviado': cp.sentPercentage.toFixed(2) + '%',
    'Total Recebido': cp.totalReceived,
    'Total Recebido (R$)': formatCurrency(cp.totalReceived),
    '% Recebido': cp.receivedPercentage.toFixed(2) + '%',
    'Saldo Líquido': cp.netBalance,
    'Saldo Líquido (R$)': formatCurrency(Math.abs(cp.netBalance)),
    'Posição': cp.position.charAt(0).toUpperCase() + cp.position.slice(1),
    'Pendente Devolução': formatCurrency(cp.pendingReturns),
    'Qtd Transações': cp.transactions.length,
  }));

  const counterpartSheet = XLSX.utils.json_to_sheet(counterpartData);
  counterpartSheet['!cols'] = [
    { wch: 25 }, // Contraparte
    { wch: 15 }, // Número
    { wch: 15 }, // Total Enviado
    { wch: 18 }, // Total Enviado (R$)
    { wch: 12 }, // % Enviado
    { wch: 15 }, // Total Recebido
    { wch: 18 }, // Total Recebido (R$)
    { wch: 12 }, // % Recebido
    { wch: 15 }, // Saldo Líquido
    { wch: 18 }, // Saldo Líquido (R$)
    { wch: 12 }, // Posição
    { wch: 20 }, // Pendente Devolução
    { wch: 15 }, // Qtd Transações
  ];
  XLSX.utils.book_append_sheet(workbook, counterpartSheet, 'Breakdown Contrapartes');

  // Sheet 3: Individual Transactions
  const allTransactions = breakdownData.counterpartBreakdowns.flatMap(cp => 
    cp.transactions.map(t => ({
      'Identificador': t.unique_identifier,
      'Data': new Date(t.transaction_date).toLocaleDateString('pt-BR'),
      'Contraparte': cp.counterpart.name,
      'Tipo': TRANSACTION_TYPES.find(type => type.value === t.transaction_type)?.label || t.transaction_type,
      'Valor': Number(t.amount),
      'Valor (R$)': formatCurrency(Number(t.amount)),
      'Descrição': t.description,
      'Status': t.status,
      'Direção': t.source_account_id === breakdownData.account?.id ? 'Enviado' : 'Recebido',
      'Criado em': new Date(t.created_at).toLocaleDateString('pt-BR'),
    }))
  );

  const transactionsSheet = XLSX.utils.json_to_sheet(allTransactions);
  transactionsSheet['!cols'] = [
    { wch: 20 }, // Identificador
    { wch: 12 }, // Data
    { wch: 25 }, // Contraparte
    { wch: 20 }, // Tipo
    { wch: 15 }, // Valor
    { wch: 18 }, // Valor (R$)
    { wch: 40 }, // Descrição
    { wch: 20 }, // Status
    { wch: 12 }, // Direção
    { wch: 12 }, // Criado em
  ];
  XLSX.utils.book_append_sheet(workbook, transactionsSheet, 'Transações Individuais');

  // Sheet 4: Pending Returns
  const pendingTransactions = breakdownData.counterpartBreakdowns
    .flatMap(cp => cp.transactions.filter(t => 
      t.status === 'pending_return' || t.status === 'partially_returned'
    ))
    .map(t => {
      const counterpart = breakdownData.counterpartBreakdowns.find(cp => 
        cp.transactions.some(transaction => transaction.id === t.id)
      );
      const daysOld = Math.floor((Date.now() - new Date(t.transaction_date).getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        'Identificador': t.unique_identifier,
        'Data Original': new Date(t.transaction_date).toLocaleDateString('pt-BR'),
        'Dias Pendente': daysOld,
        'Alerta': daysOld > 90 ? 'Crítico' : daysOld > 60 ? 'Atenção' : daysOld > 30 ? 'Alerta' : 'Ok',
        'Contraparte': counterpart?.counterpart.name || 'N/A',
        'Valor Original': Number(t.amount),
        'Valor (R$)': formatCurrency(Number(t.amount)),
        'Status': t.status === 'pending_return' ? 'Pendente' : 'Parcialmente Devolvido',
        'Descrição': t.description,
      };
    });

  if (pendingTransactions.length > 0) {
    const pendingSheet = XLSX.utils.json_to_sheet(pendingTransactions);
    pendingSheet['!cols'] = [
      { wch: 20 }, // Identificador
      { wch: 15 }, // Data Original
      { wch: 15 }, // Dias Pendente
      { wch: 10 }, // Alerta
      { wch: 25 }, // Contraparte
      { wch: 15 }, // Valor Original
      { wch: 18 }, // Valor (R$)
      { wch: 25 }, // Status
      { wch: 40 }, // Descrição
    ];
    XLSX.utils.book_append_sheet(workbook, pendingSheet, 'Empréstimos Pendentes');
  }

  // Sheet 5: Return History (transactions that are returns)
  const returnTransactions = breakdownData.counterpartBreakdowns
    .flatMap(cp => cp.transactions.filter(t => t.transaction_type === 'devolucao'))
    .map(t => {
      const counterpart = breakdownData.counterpartBreakdowns.find(cp => 
        cp.transactions.some(transaction => transaction.id === t.id)
      );
      
      return {
        'Identificador': t.unique_identifier,
        'Data Devolução': new Date(t.transaction_date).toLocaleDateString('pt-BR'),
        'Contraparte': counterpart?.counterpart.name || 'N/A',
        'Valor Devolvido': Number(t.amount),
        'Valor (R$)': formatCurrency(Number(t.amount)),
        'Transação Original': t.parent_transaction_id || 'N/A',
        'Descrição': t.description,
        'Status': t.status,
      };
    });

  if (returnTransactions.length > 0) {
    const returnSheet = XLSX.utils.json_to_sheet(returnTransactions);
    returnSheet['!cols'] = [
      { wch: 20 }, // Identificador
      { wch: 15 }, // Data Devolução
      { wch: 25 }, // Contraparte
      { wch: 15 }, // Valor Devolvido
      { wch: 18 }, // Valor (R$)
      { wch: 20 }, // Transação Original
      { wch: 40 }, // Descrição
      { wch: 20 }, // Status
    ];
    XLSX.utils.book_append_sheet(workbook, returnSheet, 'Histórico Devoluções');
  }

  // Save file
  const accountName = breakdownData.account?.name.replace(/[^a-zA-Z0-9]/g, '-') || 'conta';
  XLSX.writeFile(workbook, `${filename}-${accountName}-${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const exportDetailedAccountReportToPDF = (
  breakdownData: AccountBreakdownData,
  filename: string = 'relatorio-detalhado-conta'
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(46, 125, 50);
  doc.text('Relatório Detalhado por Conta', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth / 2, 28, { align: 'center' });
  
  // Account Summary
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(`Conta: ${breakdownData.account?.name || 'N/A'}`, 14, 40);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Número: ${breakdownData.account?.account_number || 'N/A'}`, 14, 46);
  
  const summaryData = [
    ['Total Enviado', formatCurrency(breakdownData.totalSent)],
    ['Total Recebido', formatCurrency(breakdownData.totalReceived)],
    ['Saldo Líquido', formatCurrency(Math.abs(breakdownData.netBalance))],
    ['Posição', breakdownData.position.charAt(0).toUpperCase() + breakdownData.position.slice(1)],
    ['Total Contrapartes', breakdownData.totalCounterparts.toString()],
    ['Empréstimos Pendentes', formatCurrency(breakdownData.pendingLoans)]
  ];
  
  autoTable(doc, {
    startY: 52,
    head: [['Métrica', 'Valor']],
    body: summaryData,
    theme: 'grid',
    headStyles: { fillColor: [46, 125, 50], textColor: 255 },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 70, fontStyle: 'bold' },
      1: { cellWidth: 110 }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Counterpart Breakdown
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Breakdown por Contraparte', 14, 20);
  
  const counterpartData = breakdownData.counterpartBreakdowns
    .sort((a, b) => Math.abs(b.netBalance) - Math.abs(a.netBalance))
    .map(cp => [
      cp.counterpart.name,
      formatCurrency(cp.totalSent),
      `${cp.sentPercentage.toFixed(1)}%`,
      formatCurrency(cp.totalReceived),
      `${cp.receivedPercentage.toFixed(1)}%`,
      formatCurrency(Math.abs(cp.netBalance)),
      cp.position.charAt(0).toUpperCase() + cp.position.slice(1)
    ]);
  
  autoTable(doc, {
    startY: 25,
    head: [['Contraparte', 'Enviado', '% Env', 'Recebido', '% Rec', 'Saldo Líq.', 'Posição']],
    body: counterpartData,
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40 },
      1: { cellWidth: 28 },
      2: { cellWidth: 15 },
      3: { cellWidth: 28 },
      4: { cellWidth: 15 },
      5: { cellWidth: 28 },
      6: { cellWidth: 20 }
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
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
  
  // Pending Loans (if any)
  const pendingTransactions = breakdownData.counterpartBreakdowns
    .flatMap(cp => cp.transactions.filter(t => 
      t.status === 'pending_return' || t.status === 'partially_returned'
    ))
    .map(t => {
      const counterpart = breakdownData.counterpartBreakdowns.find(cp => 
        cp.transactions.some(transaction => transaction.id === t.id)
      );
      const daysOld = Math.floor((Date.now() - new Date(t.transaction_date).getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        id: t.unique_identifier,
        date: new Date(t.transaction_date).toLocaleDateString('pt-BR'),
        days: daysOld,
        alert: daysOld > 90 ? 'Crítico' : daysOld > 60 ? 'Atenção' : daysOld > 30 ? 'Alerta' : 'Ok',
        counterpart: counterpart?.counterpart.name || 'N/A',
        amount: formatCurrency(Number(t.amount)),
        status: t.status === 'pending_return' ? 'Pendente' : 'Parcial'
      };
    });
  
  if (pendingTransactions.length > 0) {
    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(220, 38, 38);
    doc.text('⚠️ Empréstimos Pendentes de Devolução', 14, 20);
    
    const pendingData = pendingTransactions.map(t => [
      t.id,
      t.date,
      t.days.toString(),
      t.alert,
      t.counterpart,
      t.amount,
      t.status
    ]);
    
    autoTable(doc, {
      startY: 25,
      head: [['Identificador', 'Data', 'Dias', 'Alerta', 'Contraparte', 'Valor', 'Status']],
      body: pendingData,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38], textColor: 255, fontSize: 8 },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 15 },
        3: { cellWidth: 20 },
        4: { cellWidth: 35 },
        5: { cellWidth: 28 },
        6: { cellWidth: 22 }
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 3) {
          const alert = data.cell.raw as string;
          if (alert === 'Crítico') {
            data.cell.styles.fillColor = [220, 38, 38];
            data.cell.styles.textColor = [255, 255, 255];
            data.cell.styles.fontStyle = 'bold';
          } else if (alert === 'Atenção') {
            data.cell.styles.fillColor = [251, 146, 60];
            data.cell.styles.textColor = [255, 255, 255];
          } else if (alert === 'Alerta') {
            data.cell.styles.fillColor = [250, 204, 21];
          }
        }
      }
    });
  }
  
  // Top 10 Transactions by counterpart
  doc.addPage();
  doc.setFontSize(14);
  doc.text('Principais Transações', 14, 20);
  
  const topTransactions = breakdownData.counterpartBreakdowns
    .flatMap(cp => cp.transactions.map(t => ({
      ...t,
      counterpartName: cp.counterpart.name
    })))
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 15)
    .map(t => [
      t.unique_identifier,
      new Date(t.transaction_date).toLocaleDateString('pt-BR'),
      t.counterpartName,
      TRANSACTION_TYPES.find(type => type.value === t.transaction_type)?.label || t.transaction_type,
      formatCurrency(Number(t.amount)),
      t.status
    ]);
  
  autoTable(doc, {
    startY: 25,
    head: [['ID', 'Data', 'Contraparte', 'Tipo', 'Valor', 'Status']],
    body: topTransactions,
    theme: 'striped',
    headStyles: { fillColor: [46, 125, 50], textColor: 255, fontSize: 8 },
    styles: { fontSize: 7, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 25 },
      4: { cellWidth: 28 },
      5: { cellWidth: 27 }
    },
    margin: { left: 14, right: 14 }
  });
  
  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Página ${i} de ${pageCount} | Conta: ${breakdownData.account?.name || 'N/A'}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }
  
  const accountName = breakdownData.account?.name.replace(/[^a-zA-Z0-9]/g, '-') || 'conta';
  doc.save(`${filename}-${accountName}-${new Date().toISOString().split('T')[0]}.pdf`);
};
