type PdfTableOptions = {
  title: string;
  columns: string[];
  rows: Array<Array<string | number>>;
  fileName: string;
  generatedOn?: string;
  startY?: number;
  headStyles?: { fillColor?: [number, number, number]; textColor?: number };
};

export async function exportJsonToXlsx(rows: Array<Record<string, unknown>>, sheetName: string, fileName: string): Promise<void> {
  const xlsx = await import('xlsx');
  const worksheet = xlsx.utils.json_to_sheet(rows);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
  xlsx.writeFile(workbook, fileName);
}

export async function exportTableToPdf(options: PdfTableOptions): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(options.title, 14, 15);

  let startY = options.startY ?? 20;
  if (options.generatedOn) {
    doc.setFontSize(10);
    doc.text(`Generated on: ${options.generatedOn}`, 14, 22);
    startY = Math.max(startY, 30);
  }

  autoTable(doc, {
    head: [options.columns],
    body: options.rows,
    startY,
    ...(options.headStyles ? { headStyles: options.headStyles } : {}),
  });

  doc.save(options.fileName);
}

export function exportJsonToCsv(rows: Array<Record<string, unknown>>, fileName = 'export.csv') {
  if (!rows || rows.length === 0) {
    const blob = new Blob([""], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    return;
  }

  const headers = Object.keys(rows[0]);
  const csvRows = [headers.join(',')];

  for (const row of rows) {
    const vals = headers.map(h => {
      const v = row[h];
      if (v == null) return '';
      const s = typeof v === 'string' ? v : String(v);
      // escape quotes
      return `"${s.replace(/"/g, '""')}"`;
    });
    csvRows.push(vals.join(','));
  }

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}
