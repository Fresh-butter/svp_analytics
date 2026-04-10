import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportJsonToCsv, exportTableToPdf } from '../../utils/exporters';
import { exportAppointmentRows } from '../../services/analyticsService';

export const ExportAnalytics = () => {
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);

  const [fromDate] = useState(defaultFrom);
  const [toDate] = useState(defaultTo);
  const [loading, setLoading] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const fetchRows = async () => {
    const res = await exportAppointmentRows(fromDate, toDate);
    return res;
  };

  const handleExportExcel = async () => {
    setLoading(true);
    try {
      const rows = await fetchRows();
      // map to friendly column names
      const exportData = rows.map((r: any) => ({
        'Appointment Date': r.appointment_date || '',
        'Appointment Name': r.appointment_name || '',
        'Appointment Type': r.appointment_type || '',
        'Partner Name': r.partner_name || '',
        'Investee': r.investee || '',
        'Duration (min)': r.duration_minutes ?? '',
        'Present': r.present ? 'Yes' : 'No',
        'Absent But Informed': r.absent_but_informed ? 'Yes' : 'No',
        'Absent after Accepting': r.absent_after_accepting ? 'Yes' : 'No',
        'Modified Date': r.modified_at || '',
      }));

      exportJsonToCsv(exportData, `analytics_appointments_${fromDate}_to_${toDate}.csv`);
      setShowExportOptions(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      const rows = await fetchRows();
      // Build rows for PDF
      const columns = ['Appointment Date','Appointment Name','Appointment Type','Partner Name','Investee','Duration (min)','Present','Absent But Informed','Absent after Accepting','Modified Date'];
      const dataRows = rows.map((r: any) => [
        r.appointment_date || '',
        r.appointment_name || '',
        r.appointment_type || '',
        r.partner_name || '',
        r.investee || '',
        String(r.duration_minutes ?? ''),
        r.present ? 'Yes' : 'No',
        r.absent_but_informed ? 'Yes' : 'No',
        r.absent_after_accepting ? 'Yes' : 'No',
        r.modified_at || '',
      ]);

      await exportTableToPdf({
        title: `Analytics Export ${fromDate} → ${toDate}`,
        columns,
        rows: dataRows,
        fileName: `analytics_${fromDate}_to_${toDate}.pdf`,
        generatedOn: new Date().toLocaleDateString(),
      });
      setShowExportOptions(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <button
          onClick={() => setShowExportOptions(prev => !prev)}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg ${showExportOptions ? 'bg-surfaceHighlight text-text border-primary' : 'bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight'}`}
        >
          <Download size={16} />
          Export
        </button>
        {showExportOptions && (
          <div className="absolute right-0 mt-2 w-48 bg-surface border border-surfaceHighlight rounded-lg shadow-lg z-10 py-1">
            <button
              onClick={handleExportExcel}
              disabled={loading}
              className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surfaceHighlight transition-colors"
            >
              {loading ? 'Exporting...' : 'Export as Excel'}
            </button>
            <button
              onClick={handleExportPDF}
              disabled={loading}
              className="w-full text-left px-4 py-2 text-sm text-text hover:bg-surfaceHighlight transition-colors"
            >
              Export as PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
