import { useState } from 'react';
import { Download } from 'lucide-react';
import { exportJsonToXlsx } from '../../utils/exporters';
import { exportAppointmentRows } from '../../services/analyticsService';

const toLocalIsoDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ExportAnalytics = () => {
  const today = new Date();
  const defaultTo = toLocalIsoDate(today);
  const defaultFrom = toLocalIsoDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const [fromDate] = useState(defaultFrom);
  const [toDate] = useState(defaultTo);
  const [loading, setLoading] = useState(false);

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

      exportJsonToXlsx(exportData, 'Analytics', `analytics_appointments_${fromDate}_to_${toDate}.xlsx`);
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
          onClick={handleExportExcel}
          disabled={loading}
          className={`flex items-center gap-2 px-3 py-2 text-sm font-medium transition-colors border rounded-lg bg-surfaceHighlight/30 text-text border-surfaceHighlight hover:bg-surfaceHighlight disabled:opacity-50`}
        >
          <Download size={16} />
          {loading ? 'Exporting...' : 'Export Excel'}
        </button>
      </div>
    </div>
  );
};
