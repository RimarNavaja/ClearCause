import { format } from 'date-fns';

export interface TransactionExportData {
  id: string;
  date: Date;
  type: string;
  campaignTitle: string;
  amount: number;
  status: string;
  reference: string;
}

/**
 * Convert transaction data to CSV format
 */
const transactionsToCSV = (transactions: TransactionExportData[]): string => {
  // CSV Headers
  const headers = ['Date', 'Type', 'Campaign', 'Amount (PHP)', 'Status', 'Reference'];

  // CSV Rows
  const rows = transactions.map(t => [
    format(new Date(t.date), 'MMM dd, yyyy HH:mm'),
    t.type,
    `"${t.campaignTitle.replace(/"/g, '""')}"`, // Escape quotes in campaign titles
    t.amount.toFixed(2),
    t.status,
    t.reference
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  return csvContent;
};

/**
 * Download transactions as CSV file
 */
export const downloadTransactionsCSV = (
  transactions: TransactionExportData[],
  charityName: string
): void => {
  if (transactions.length === 0) {
    throw new Error('No transactions to export');
  }

  // Generate CSV content
  const csvContent = transactionsToCSV(transactions);

  // Create blob
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

  // Generate filename with charity name and date
  const fileName = `ClearCause_Transactions_${charityName.replace(/[^a-z0-9]/gi, '_')}_${format(
    new Date(),
    'yyyyMMdd_HHmmss'
  )}.csv`;

  // Create download link and trigger download
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.href = url;
  link.download = fileName;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
