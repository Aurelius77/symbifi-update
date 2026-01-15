// CSV Export Utility

export function exportToCSV(data: Record<string, unknown>[], filename: string, headers?: Record<string, string>) {
  if (data.length === 0) return;

  // Get column keys from first row or headers
  const keys = headers ? Object.keys(headers) : Object.keys(data[0]);
  const headerRow = headers ? Object.values(headers) : keys;

  // Create CSV content
  const csvContent = [
    headerRow.join(','),
    ...data.map(row =>
      keys.map(key => {
        const value = row[key];
        // Handle values that contain commas, quotes, or newlines
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value ?? '';
      }).join(',')
    ),
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatDateForCSV(date: string | Date): string {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

export function formatCurrencyForCSV(amount: number): string {
  return amount.toFixed(2);
}
