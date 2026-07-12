import { jsPDF } from 'jspdf';
import { Customer, Lead, Project, InventoryItem, FinanceRecord, CompanySettings, SupportTicket, AgronomyVisit } from '../types';

// Helper to format currency in INR style
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(value);
};

// Standard styling variables for HydroGreen PDF Theme (Emerald & Slate)
const PRIMARY_RGB = [16, 185, 129]; // Emerald Green (#10B981)
const SECONDARY_RGB = [15, 23, 42]; // Dark Slate (#0F172A)
const TEXT_RGB = [51, 65, 85]; // Slate 700 (#334155)
const LIGHT_BG_RGB = [248, 250, 252]; // Slate 50 (#F8FAFC)
const MUTED_RGB = [100, 116, 139]; // Slate 500 (#64748B)

// Helper to draw a consistent document header
function drawDocumentHeader(
  doc: jsPDF,
  title: string,
  settings: CompanySettings | null,
  currentY: number
): number {
  const pageWidth = doc.internal.pageSize.width;
  
  // Header background band
  doc.setFillColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Left border decorative band in Emerald
  doc.setFillColor(PRIMARY_RGB[0], PRIMARY_RGB[1], PRIMARY_RGB[2]);
  doc.rect(0, 40, pageWidth, 4, 'F');

  // Company Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text(settings?.companyName || 'HYDROGREEN IRRIGATION SOLUTIONS', 15, 18);

  // Document Title
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129); // Accent color
  doc.text(title.toUpperCase(), 15, 30);

  // Date and Metadata on the right
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Generated: ${dateStr}`, pageWidth - 15, 18, { align: 'right' });
  
  if (settings?.gstNumber) {
    doc.text(`GSTIN: ${settings.gstNumber}`, pageWidth - 15, 25, { align: 'right' });
  } else {
    doc.text('Operations Control Ledger', pageWidth - 15, 25, { align: 'right' });
  }

  if (settings?.phone) {
    doc.text(`Support: ${settings.phone}`, pageWidth - 15, 32, { align: 'right' });
  }

  return 55; // Return next Y position
}

// Helper to draw structured footer with page numbers
function drawDocumentFooter(doc: jsPDF, pageNum: number, totalPages: number) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  
  doc.text('HydroGreen Automated Operations Platform • System Generated Audit Report', 15, pageHeight - 10);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
}

// Helper to truncate text to fit a specific width in PDF units (mm)
function truncateText(doc: jsPDF, text: string, maxWidth: number): string {
  if (!text) return '';
  if (doc.getTextWidth(text) <= maxWidth) return text;
  
  let truncated = text;
  while (truncated.length > 0 && doc.getTextWidth(truncated + '...') > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated ? truncated + '...' : '';
}

// Helper to draw custom tabular data
function drawTable(
  doc: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  colWidths: number[],
  alignments: ('left' | 'center' | 'right')[] = []
): number {
  let y = startY;
  const totalWidth = colWidths.reduce((sum, w) => sum + w, 0);
  const startX = 15;
  const pageHeight = doc.internal.pageSize.height;

  // Header styling
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(startX, y, totalWidth, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);

  let currentX = startX;
  headers.forEach((header, index) => {
    const align = alignments[index] || 'left';
    let textX = currentX + 3;
    if (align === 'right') textX = currentX + colWidths[index] - 3;
    if (align === 'center') textX = currentX + colWidths[index] / 2;

    const maxTextWidth = colWidths[index] - 4;
    const textVal = truncateText(doc, header, maxTextWidth);

    doc.text(textVal, textX, y + 5.5, { align: align });
    currentX += colWidths[index];
  });

  y += 8;

  // Row styling
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_RGB[0], TEXT_RGB[1], TEXT_RGB[2]);

  rows.forEach((row, rowIndex) => {
    // Check page boundaries
    if (y > pageHeight - 25) {
      doc.addPage();
      drawDocumentFooter(doc, 1, 1); // Temporary footer placeholder, handled on complete
      y = 20; // top padding on new page
      
      // Redraw Table Headers on new page
      doc.setFillColor(30, 41, 59);
      doc.rect(startX, y, totalWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      
      let headerX = startX;
      headers.forEach((header, idx) => {
        const align = alignments[idx] || 'left';
        let textX = headerX + 3;
        if (align === 'right') textX = headerX + colWidths[idx] - 3;
        if (align === 'center') textX = headerX + colWidths[idx] / 2;

        const maxTextWidth = colWidths[idx] - 4;
        const textVal = truncateText(doc, header, maxTextWidth);

        doc.text(textVal, textX, y + 5.5, { align: align });
        headerX += colWidths[idx];
      });
      y += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(TEXT_RGB[0], TEXT_RGB[1], TEXT_RGB[2]);
    }

    // Zebra striping
    if (rowIndex % 2 === 0) {
      doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
    } else {
      doc.setFillColor(255, 255, 255);
    }
    doc.rect(startX, y, totalWidth, 7, 'F');

    // Row borders
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.line(startX, y + 7, startX + totalWidth, y + 7);

    let rowX = startX;
    row.forEach((cell, cellIndex) => {
      const align = alignments[cellIndex] || 'left';
      let textX = rowX + 3;
      if (align === 'right') textX = rowX + colWidths[cellIndex] - 3;
      if (align === 'center') textX = rowX + colWidths[cellIndex] / 2;

      // Truncate cell text dynamically based on actual rendered width in mm
      const maxTextWidth = colWidths[cellIndex] - 4;
      const textVal = truncateText(doc, cell, maxTextWidth);

      doc.text(textVal, textX, y + 4.5, { align: align });
      rowX += colWidths[cellIndex];
    });

    y += 7;
  });

  return y + 10; // Return Y space after table
}

// -------------------------------------------------------------
// 1. EXECUTIVE OPERATIONS SUMMARY PDF REPORT
// -------------------------------------------------------------
export const generateExecutiveSummaryPDF = (
  data: {
    customers: Customer[];
    leads: Lead[];
    projects: Project[];
    inventory: InventoryItem[];
    finance: FinanceRecord[];
  },
  settings: CompanySettings | null
) => {
  const doc = new jsPDF();
  let y = drawDocumentHeader(doc, 'Executive Business Summary', settings, 0);
  const pageWidth = doc.internal.pageSize.width;

  // KPIs Calculations
  const activeProjects = data.projects.filter(p => p.currentStage !== 'Handover & Sign-off');
  const completedProjectsCount = data.projects.length - activeProjects.length;
  
  const totalInvoiced = data.finance
    .filter(f => f.type === 'Invoice' && f.status !== 'Void')
    .reduce((sum, f) => sum + f.amount, 0);

  const paymentsReceived = data.finance
    .filter(f => f.type === 'PaymentReceived' && f.status === 'Cleared')
    .reduce((sum, f) => sum + f.amount, 0);

  const totalExpenses = data.finance
    .filter(f => f.type === 'Expense' && f.status !== 'Void')
    .reduce((sum, f) => sum + f.amount, 0);

  const inventoryValuationCost = data.inventory.reduce((sum, item) => sum + (item.availableQty * item.purchasePrice), 0);

  // Section: Business Overview
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Key Performance Indicators', 15, y);
  y += 5;

  // KPI Boxes Layout
  // Draw card container
  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, y, 180, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  doc.text('TOTAL CUSTOMERS', 20, y + 7);
  doc.text('ACTIVE PROJECTS', 60, y + 7);
  doc.text('INVENTORY VALUATION', 105, y + 7);
  doc.text('NET OUTSTANDING', 150, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text(`${data.customers.length}`, 20, y + 16);
  doc.text(`${activeProjects.length} Active / ${completedProjectsCount} Done`, 60, y + 16);
  doc.text(formatCurrency(inventoryValuationCost), 105, y + 16);
  doc.text(formatCurrency(Math.max(0, totalInvoiced - paymentsReceived)), 150, y + 16);

  y += 35;

  // Section: Financial Position
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Financial Position', 15, y);
  y += 5;

  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.roundedRect(15, y, 180, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  doc.text('TOTAL INVOICED REVENUE', 20, y + 7);
  doc.text('TOTAL PAYMENTS REALIZED', 75, y + 7);
  doc.text('PROCUREMENT & EXPENSES', 135, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text(formatCurrency(totalInvoiced), 20, y + 16);
  doc.text(formatCurrency(paymentsReceived), 75, y + 16);
  doc.text(formatCurrency(totalExpenses), 135, y + 16);

  y += 35;

  // Section: Active Projects Summary
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Major Installation Sites', 15, y);
  y += 6;

  const projectRows = data.projects.slice(0, 8).map(p => {
    return [
      p.customerName || 'None',
      p.projectName || 'Drip/Hydro Install',
      p.currentStage || 'Trenching',
      formatCurrency(p.totalValue)
    ];
  });

  y = drawTable(
    doc,
    ['Customer Name', 'Project Scope', 'Current Progress Stage', 'Deal Value'],
    projectRows,
    y,
    [50, 45, 55, 30],
    ['left', 'left', 'left', 'right']
  );

  // Clean layout - check page fit before drawing inventory
  if (y > 220) {
    doc.addPage();
    y = 20;
  }

  // Section: High Risk Stock Thresholds
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Procurement Inventory Status', 15, y);
  y += 6;

  const stockRows = data.inventory.slice(0, 6).map(item => {
    const status = item.availableQty <= item.minStockLevel ? 'REORDER WARNING' : 'STOCK ADEQUATE';
    return [
      item.productName,
      item.category,
      `${item.availableQty} ${item.unit}`,
      formatCurrency(item.purchasePrice),
      status
    ];
  });

  y = drawTable(
    doc,
    ['Item Name', 'Category', 'Current Stock', 'Unit Cost', 'Procurement Alert'],
    stockRows,
    y,
    [50, 35, 30, 30, 35],
    ['left', 'left', 'center', 'right', 'center']
  );

  // Apply Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawDocumentFooter(doc, i, totalPages);
  }

  doc.save(`hydrogreen_executive_summary_${new Date().toISOString().split('T')[0]}.pdf`);
};

// -------------------------------------------------------------
// 2. PROJECT HANDOVER CERTIFICATE / TECHNICAL PDF REPORT
// -------------------------------------------------------------
export const generateHandoverPDF = (
  project: Project,
  customer: Customer | undefined,
  settings: CompanySettings | null
) => {
  const doc = new jsPDF();
  let y = drawDocumentHeader(doc, 'Project Completion & Handover Certificate', settings, 0);
  const pageWidth = doc.internal.pageSize.width;

  // Certification statement block
  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.setDrawColor(16, 185, 129); // Accent Emerald
  doc.roundedRect(15, y, 180, 22, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(16, 185, 129);
  doc.text('OFFICIAL COMPLETION HANDOVER SUMMARY', 20, y + 7);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(TEXT_RGB[0], TEXT_RGB[1], TEXT_RGB[2]);
  doc.text('This document certifies that the commercial irrigation and microgrid installation listed below is completed', 20, y + 13);
  doc.text('and has been functionally verified, commissioned, and successfully handed over to the stakeholder.', 20, y + 17);

  y += 32;

  // Project and Customer Information (Two Columns)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Customer & Site Profile', 15, y);
  doc.text('Installation Parameters', 110, y);
  
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.line(15, y + 2, 95, y + 2);
  doc.line(110, y + 2, 195, y + 2);
  
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Beneficiary Name:', 15, y);
  doc.text('Contact Mobile:', 15, y + 6);
  doc.text('Village / Site:', 15, y + 12);
  doc.text('Project District:', 15, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(customer?.name || project.customerName, 45, y);
  doc.text(customer?.phone || 'N/A', 45, y + 6);
  doc.text(customer?.village || 'N/A', 45, y + 12);
  doc.text(customer?.district || 'N/A', 45, y + 18);

  // Right Column
  doc.setFont('helvetica', 'bold');
  doc.text('Project Reference:', 110, y);
  doc.text('Installation Scope:', 110, y + 6);
  doc.text('Farm Area Covered:', 110, y + 12);
  doc.text('Total Valuation:', 110, y + 18);

  doc.setFont('helvetica', 'normal');
  doc.text(project.id.substring(0, 8).toUpperCase(), 145, y);
  doc.text(project.projectName || 'Drip Irrigation Install', 145, y + 6);
  doc.text(project.areaCovered ? `${project.areaCovered} Acres` : 'N/A', 145, y + 12);
  doc.text(formatCurrency(project.totalValue), 145, y + 18);

  y += 30;

  // Stage Verification Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Commissioning Phase Verification Logs', 15, y);
  y += 5;

  const stageRows: string[][] = [];
  if (project.stages) {
    Object.keys(project.stages).forEach(stageName => {
      const s = project.stages[stageName];
      stageRows.push([
        stageName,
        `${s.percentage}%`,
        s.status,
        s.remarks || 'Standard compliance verified'
      ]);
    });
  } else {
    stageRows.push(['Excavation & Trenching', '100%', 'Completed', 'Depth specification checked']);
    stageRows.push(['Mainline Piping Laying', '100%', 'Completed', 'Pressure holding test passed']);
    stageRows.push(['Sand & Disc Filters setup', '100%', 'Completed', 'Flow bypass functional']);
    stageRows.push(['Drip Laterals installation', '100%', 'Completed', 'Dripper discharge uniformity checked']);
    stageRows.push(['Automation Controller commissioning', '100%', 'Completed', 'Solenoid cycles tested successfully']);
  }

  y = drawTable(
    doc,
    ['Phase / Stage Title', 'Milestone', 'Operational Status', 'Field Inspection Remarks'],
    stageRows,
    y,
    [55, 20, 35, 70],
    ['left', 'center', 'center', 'left']
  );

  // Warranty and System Maintenance Advice
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Technical Maintenance Guidelines', 15, y);
  y += 4;
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(TEXT_RGB[0], TEXT_RGB[1], TEXT_RGB[2]);
  const tips = [
    '1. Filter Backwash Cycles: Perform automatic or manual backwashes daily for river-source pumps.',
    '2. Lateral Flushing: Flush lateral submain ends once every 15 days to expel micro-slime deposits.',
    '3. Pressure Regulators: Keep inlet pressure below 2.5 kg/sq.cm to prevent lateral wall ruptures.',
    '4. Solenoid Dry run protection: Do not operate irrigation solenoids without dynamic water feed.'
  ];
  tips.forEach(tip => {
    doc.text(tip, 15, y);
    y += 5;
  });

  y += 10;

  // Handover Signature blocks
  if (y > 240) {
    doc.addPage();
    y = 30;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.line(15, y + 25, 75, y + 25);
  doc.line(120, y + 25, 180, y + 25);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Authorized Site Engineer Sign', 15, y + 29);
  doc.text('Client Acceptance Signature', 120, y + 29);

  doc.setFont('helvetica', 'normal');
  doc.text('For HydroGreen Operations', 15, y + 33);
  doc.text(`Beneficiary: ${customer?.name || project.customerName}`, 120, y + 33);

  // Apply Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawDocumentFooter(doc, i, totalPages);
  }

  doc.save(`hydrogreen_handover_project_${project.id.substring(0, 8)}.pdf`);
};

// -------------------------------------------------------------
// 3. FINANCIAL STATEMENT & CASH LEDGER PDF REPORT
// -------------------------------------------------------------
export const generateFinancialPDF = (
  financeRecords: FinanceRecord[],
  settings: CompanySettings | null
) => {
  const doc = new jsPDF();
  let y = drawDocumentHeader(doc, 'Cash Ledger & Statement of Accounts', settings, 0);
  const pageWidth = doc.internal.pageSize.width;

  // Summary Metrics
  const invoices = financeRecords.filter(f => f.type === 'Invoice' && f.status !== 'Void');
  const payments = financeRecords.filter(f => f.type === 'PaymentReceived' && f.status === 'Cleared');
  const expenses = financeRecords.filter(f => f.type === 'Expense' && f.status !== 'Void');

  const totalInvoiced = invoices.reduce((sum, f) => sum + f.amount, 0);
  const totalPayments = payments.reduce((sum, f) => sum + f.amount, 0);
  const totalExpenses = expenses.reduce((sum, f) => sum + f.amount, 0);
  const outstandingRevenue = Math.max(0, totalInvoiced - totalPayments);
  const netEarnings = totalPayments - totalExpenses;

  // Summary Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Financial Highlights Summary', 15, y);
  y += 5;

  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, y, 180, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  doc.text('TOTAL REVENUE INVOICED', 18, y + 7);
  doc.text('CASH REALIZED', 65, y + 7);
  doc.text('BUSINESS EXPENSES', 110, y + 7);
  doc.text('NET OPERATING BALANCE', 152, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text(formatCurrency(totalInvoiced), 18, y + 16);
  doc.text(formatCurrency(totalPayments), 65, y + 16);
  doc.text(formatCurrency(totalExpenses), 110, y + 16);
  
  if (netEarnings >= 0) {
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`+${formatCurrency(netEarnings)}`, 152, y + 16);
  } else {
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(formatCurrency(netEarnings), 152, y + 16);
  }

  y += 35;

  // Detailed Ledger Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('All Operations Ledger Transactions', 15, y);
  y += 6;

  const ledgerRows = financeRecords.map(rec => {
    let typeLabel: string = rec.type;
    if (rec.type === 'PaymentReceived') typeLabel = 'Payment Recv';
    
    return [
      rec.date,
      typeLabel,
      rec.number,
      rec.customerName || 'N/A',
      formatCurrency(rec.amount),
      rec.status.toUpperCase()
    ];
  });

  y = drawTable(
    doc,
    ['Record Date', 'Type', 'Record ID #', 'Customer / Payee Details', 'Amount', 'Settlement Status'],
    ledgerRows,
    y,
    [25, 25, 30, 50, 25, 25],
    ['left', 'left', 'left', 'left', 'right', 'center']
  );

  // Apply Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawDocumentFooter(doc, i, totalPages);
  }

  doc.save(`hydrogreen_financial_ledger_${new Date().toISOString().split('T')[0]}.pdf`);
};

// -------------------------------------------------------------
// 4. INVENTORY PROCUREMENT STATUS PDF REPORT
// -------------------------------------------------------------
export const generateInventoryPDF = (
  inventoryItems: InventoryItem[],
  settings: CompanySettings | null
) => {
  const doc = new jsPDF();
  let y = drawDocumentHeader(doc, 'Procurement & Inventory Stock Balance', settings, 0);
  const pageWidth = doc.internal.pageSize.width;

  // Calculations
  const uniqueItems = inventoryItems.length;
  const totalQuantity = inventoryItems.reduce((sum, item) => sum + item.availableQty, 0);
  const totalValueAtCost = inventoryItems.reduce((sum, item) => sum + (item.availableQty * item.purchasePrice), 0);
  const lowStockCount = inventoryItems.filter(item => item.availableQty <= item.minStockLevel).length;

  // KPI Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Inventory Stock Metrics', 15, y);
  y += 5;

  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, y, 180, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  doc.text('UNIQUE SKUS', 20, y + 7);
  doc.text('TOTAL UNITS HELD', 60, y + 7);
  doc.text('TOTAL VALUATION (COST)', 105, y + 7);
  doc.text('REORDER ALERTS', 155, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text(`${uniqueItems} Products`, 20, y + 16);
  doc.text(`${totalQuantity} units`, 60, y + 16);
  doc.text(formatCurrency(totalValueAtCost), 105, y + 16);
  
  if (lowStockCount > 0) {
    doc.setTextColor(239, 68, 68); // red-500
    doc.text(`${lowStockCount} Items Low`, 155, y + 16);
  } else {
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text('All Stock OK', 155, y + 16);
  }

  y += 35;

  // Stock table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Product Stock Balance List', 15, y);
  y += 6;

  const stockRows = inventoryItems.map(item => {
    const totalCostVal = item.availableQty * item.purchasePrice;
    const isLow = item.availableQty <= item.minStockLevel;
    const reorderText = isLow ? `REORDER (Min ${item.minStockLevel})` : 'Adequate';
    
    return [
      item.productName,
      item.category,
      `${item.availableQty} ${item.unit}`,
      formatCurrency(item.purchasePrice),
      formatCurrency(totalCostVal),
      reorderText
    ];
  });

  y = drawTable(
    doc,
    ['Product / Part Name', 'Category', 'Stock On Hand', 'Purchase Price', 'Asset Valuation', 'Reorder Action'],
    stockRows,
    y,
    [45, 25, 25, 25, 30, 30],
    ['left', 'left', 'center', 'right', 'right', 'center']
  );

  // Apply Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawDocumentFooter(doc, i, totalPages);
  }

  doc.save(`hydrogreen_inventory_stock_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const generateSystemSnapshotPDF = (
  data: {
    customers: Customer[];
    leads: Lead[];
    projects: Project[];
    finance: FinanceRecord[];
    support: SupportTicket[];
    agronomy: AgronomyVisit[];
  },
  settings: CompanySettings | null
) => {
  const doc = new jsPDF();
  let y = drawDocumentHeader(doc, 'System Database Backup Snapshot', settings, 0);
  const pageWidth = doc.internal.pageSize.width;

  // Let's add KPIs
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('System Backup Meta-data & Statistics', 15, y);
  y += 5;

  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, y, 180, 24, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  doc.text('CUSTOMERS', 20, y + 7);
  doc.text('LEADS PIPELINE', 55, y + 7);
  doc.text('ACTIVE PROJECTS', 90, y + 7);
  doc.text('LEDGER RECORDS', 125, y + 7);
  doc.text('SUPPORT / AGRONOMY', 155, y + 7);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text(`${data.customers.length}`, 20, y + 16);
  doc.text(`${data.leads.length}`, 55, y + 16);
  doc.text(`${data.projects.length}`, 90, y + 16);
  doc.text(`${data.finance.length}`, 125, y + 16);
  doc.text(`${data.support.length} Cases / ${data.agronomy.length} Visits`, 155, y + 16);

  y += 33;

  const checkPageBreak = (neededY: number) => {
    if (y > 220 || y + neededY > 260) {
      doc.addPage();
      y = 20;
    }
  };

  // Section 1: Customers
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('1. Client & Customer Registry', 15, y);
  y += 6;

  const customerRows = data.customers.map(c => [
    c.id,
    c.name,
    c.phone,
    c.projectType || 'N/A',
    c.status || 'Active'
  ]);
  
  if (customerRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No customer records found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['ID', 'Customer Name', 'Contact Phone', 'Project Type', 'Status'],
      customerRows,
      y,
      [25, 50, 35, 45, 25],
      ['left', 'left', 'left', 'left', 'center']
    );
  }

  // Section 2: Leads Pipeline
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('2. Inbound Leads Pipeline', 15, y);
  y += 6;

  const leadRows = data.leads.map(l => [
    l.id,
    l.name,
    l.phone,
    l.product || 'N/A',
    l.status || 'New',
    l.whatsapp || l.phone,
    l.email || 'N/A'
  ]);

  if (leadRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No lead records found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['ID', 'Lead Name', 'Phone', 'Product', 'Status', 'WhatsApp', 'Email'],
      leadRows,
      y,
      [22, 35, 25, 25, 20, 25, 28],
      ['left', 'left', 'left', 'left', 'center', 'left', 'left']
    );
  }

  // Section 3: Active Installation Projects
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('3. Projects & Stages Lifecycle', 15, y);
  y += 6;

  const projectRows = data.projects.map(p => [
    p.id,
    p.customerName || 'N/A',
    p.projectName || 'Installation',
    p.currentStage || 'Pending',
    formatCurrency(p.totalValue)
  ]);

  if (projectRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No active project records found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['ID', 'Customer', 'Project Name', 'Current Stage', 'Contract Value'],
      projectRows,
      y,
      [22, 45, 43, 45, 25],
      ['left', 'left', 'left', 'left', 'right']
    );
  }

  // Section 4: Finance Ledger
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('4. Financial Ledger & Documents', 15, y);
  y += 6;

  const financeRows = data.finance.map(f => [
    f.date,
    f.type,
    f.number,
    f.customerName || 'N/A',
    formatCurrency(f.amount),
    f.status
  ]);

  if (financeRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No finance records found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['Date', 'Type', 'Doc Number', 'Client Name', 'Amount', 'Status'],
      financeRows,
      y,
      [25, 30, 30, 45, 25, 25],
      ['left', 'left', 'left', 'left', 'right', 'center']
    );
  }

  // Section 5: After-sales Support
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('5. After-Sales Support Tickets', 15, y);
  y += 6;

  const supportRows = data.support.map(s => [
    s.complaintNumber,
    s.customerName,
    s.complaint,
    s.status,
    s.warrantyStatus
  ]);

  if (supportRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No active support tickets found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['Ticket #', 'Client Name', 'Complaint Details', 'Status', 'Warranty'],
      supportRows,
      y,
      [25, 45, 65, 25, 20],
      ['left', 'left', 'left', 'center', 'center']
    );
  }

  // Section 6: Agronomy Visits
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('6. Agronomy Field Consultancy Logs', 15, y);
  y += 6;

  const agronomyRows = data.agronomy.map(a => [
    a.visitDate,
    a.customerName,
    a.cropName,
    a.observation,
    a.nextVisitDate || 'N/A'
  ]);

  if (agronomyRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No agronomy visit records found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['Visit Date', 'Client Name', 'Target Crop', 'Core Observation', 'Next Visit'],
      agronomyRows,
      y,
      [25, 40, 30, 60, 25],
      ['left', 'left', 'left', 'left', 'center']
    );
  }

  // Apply Footers to all pages
  const totalPagesPDF = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPagesPDF; i++) {
    doc.setPage(i);
    drawDocumentFooter(doc, i, totalPagesPDF);
  }

  doc.save(`hydrogreen_complete_database_snapshot_${new Date().toISOString().split('T')[0]}.pdf`);
};

// -------------------------------------------------------------
// 7. INBOUND LEADS PIPELINE COMPREHENSIVE PDF REPORT
// -------------------------------------------------------------
export const generateLeadsReportPDF = (
  leads: Lead[],
  settings: CompanySettings | null
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  let y = drawDocumentHeader(doc, 'Comprehensive Inbound Leads Dossier', settings, 0);
  const pageWidth = doc.internal.pageSize.width;

  // Overview stats container
  doc.setFillColor(LIGHT_BG_RGB[0], LIGHT_BG_RGB[1], LIGHT_BG_RGB[2]);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(15, y, 267, 20, 2, 2, 'FD');

  const totalLeads = leads.length;
  const statusCounts = leads.reduce((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(MUTED_RGB[0], MUTED_RGB[1], MUTED_RGB[2]);
  doc.text('TOTAL LEADS PIPELINE', 20, y + 6);
  doc.text('NEW INQUIRIES', 75, y + 6);
  doc.text('FOLLOW-UPS ACTIVE', 130, y + 6);
  doc.text('INTERESTED / PROSPECTS', 190, y + 6);
  doc.text('WON / DEALS CLOSED', 240, y + 6);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text(`${totalLeads} Contacts`, 20, y + 14);
  doc.text(`${statusCounts['New'] || 0} Leads`, 75, y + 14);
  doc.text(`${statusCounts['Follow-up'] || 0} Active`, 130, y + 14);
  doc.text(`${statusCounts['Interested'] || 0} Hot`, 190, y + 14);
  doc.text(`${statusCounts['Won'] || 0} Won`, 240, y + 14);

  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(SECONDARY_RGB[0], SECONDARY_RGB[1], SECONDARY_RGB[2]);
  doc.text('Leads Pipe Audit Register (Full Details)', 15, y);
  y += 6;

  const leadRows = leads.map(l => {
    const contactInfo = [l.phone, l.whatsapp ? `WA: ${l.whatsapp}` : '', l.email].filter(Boolean).join(' | ');
    const budgetStr = l.budget ? `INR ${(l.budget / 100000).toFixed(1)}L` : 'N/A';
    const prodBudget = `${l.product || 'N/A'} (${budgetStr})`;
    const areaCrop = [l.area ? `Area: ${l.area}` : '', l.crop ? `Crop: ${l.crop}` : ''].filter(Boolean).join(', ') || 'N/A';
    const addressParts = [l.address, l.village, l.district, l.state, l.pinCode].filter(Boolean).join(', ') || 'N/A';
    const statusDate = `${l.status || 'New'} (${l.date || 'N/A'})`;

    return [
      l.name || 'N/A',
      contactInfo,
      prodBudget,
      areaCrop,
      addressParts,
      statusDate
    ];
  });

  if (leadRows.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.text('No active lead records found.', 18, y);
    y += 10;
  } else {
    y = drawTable(
      doc,
      ['Prospect Name', 'Contact & Media Coordinates', 'Product & Est Budget', 'Crop & Farm Area', 'Full Geographic Site Address', 'Pipeline Status'],
      leadRows,
      y,
      [40, 45, 42, 35, 65, 40],
      ['left', 'left', 'left', 'left', 'left', 'center']
    );
  }

  // Apply Footers to all pages
  const totalPagesPDF = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPagesPDF; i++) {
    doc.setPage(i);
    drawDocumentFooter(doc, i, totalPagesPDF);
  }

  doc.save(`hydrogreen_leads_full_details_${new Date().toISOString().split('T')[0]}.pdf`);
};
