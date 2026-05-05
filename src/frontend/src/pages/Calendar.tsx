import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  isBefore,
  startOfDay
} from 'date-fns';
import { CreateAppointmentModal } from '../components/CreateAppointmentModal';
import { CreateRecurringModal } from '../components/CreateRecurringModal';
import {
  useAppointmentForm,
  useRecurringForm,
  AppointmentFormState,
  RecurringFormState,
} from '../hooks/useAppointmentForm';
import { parseLocalDate } from '../utils/appointmentHelpers';
import { CalendarToolbar } from '../components/calendar/CalendarToolbar.tsx';
import { CalendarGridView } from '../components/calendar/CalendarGridView';
import { CalendarListView } from '../components/calendar/CalendarListView';
import { Appointment, AppointmentType, Group, GroupType, Investee, RecurringAppointment } from '../types';
import { appointmentService } from '../services/appointmentService';
import { recurringAppointmentService } from '../services/recurringAppointmentService';
import { groupService } from '../services/groupService';
import { investeeService } from '../services/investeeService';
import { partnerService } from '../services/partnerService';
import { lookupService } from '../services/lookupService';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { buildRRuleFromUiState, isRecurringOccurrence, parseRecurrenceUiStateFromLegacy } from '../utils/recurrence';
import { getAppointmentId, getRecurringId, normalizeAppointmentForCalendar, normalizeRecurringForCalendar } from '../utils/calendarLegacy';
import { HOLIDAYS, INITIAL_APP_STATE, INITIAL_REC_STATE } from '../constants/calendar';
import { DASHBOARD_AUTO_REFRESH_MS } from '../constants/refresh';

type CalendarView = 'grid' | 'list';

type AppointmentUpsertPayload = {
  occurrence_date?: string;
  start_at: string;
  end_at: string;
  appointment_name?: string;
  appointment_type_id?: string;
  group_type_id?: string;
  investee_id?: string;
  partners?: string[];
};

const TODAY = new Date();

export const CalendarPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isPartner = user?.user_type === 'PARTNER';
  const chapterId = user?.chapter_id || 1;
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentMonth, setCurrentMonth] = useState(startOfMonth(TODAY));
  const [selectedDate, setSelectedDate] = useState<Date>(TODAY);
  const [calendarView, setCalendarView] = useState<CalendarView>('grid');

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recurringApps, setRecurringApps] = useState<RecurringAppointment[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [investees, setInvestees] = useState<Investee[]>([]);
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([]);
  const [groupTypes, setGroupTypes] = useState<GroupType[]>([]);
  const [allPartners, setAllPartners] = useState<Array<{ partner_id: string; partner_name: string; email?: string }>>([]);
  const [, setLoading] = useState(true);

  const appointmentTypeNameById = useMemo(
    () => new Map(appointmentTypes.map((t) => [String(t.appointment_type_id), t.type_name])),
    [appointmentTypes]
  );

  const resolveMeetingTypeName = useCallback(
    (appName?: string | null, meetingType?: string | null, appointmentTypeId?: string | null, fallback = 'Appointment') => {
      if (appName && appName.trim()) {
        return appName.trim();
      }
      const rawMeetingType = (meetingType || '').trim();
      if (rawMeetingType && appointmentTypeNameById.has(rawMeetingType)) {
        return appointmentTypeNameById.get(rawMeetingType) || fallback;
      }

      const typeId = appointmentTypeId ? String(appointmentTypeId) : '';
      if (typeId && appointmentTypeNameById.has(typeId)) {
        return appointmentTypeNameById.get(typeId) || fallback;
      }

      // If meeting_type is just the same stored ID value, never show it in UI.
      if (typeId && rawMeetingType && rawMeetingType === typeId) {
        return fallback;
      }

      const looksLikeUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawMeetingType);
      if (rawMeetingType && !looksLikeUuid) return rawMeetingType;

      return fallback;
    },
    [appointmentTypeNameById]
  );

  const normalizeAppointmentWithNames = useCallback(
    (app: Appointment): Appointment => {
      const normalized = normalizeAppointmentForCalendar(app);
      return {
        ...normalized,
        meeting_type: resolveMeetingTypeName(
          normalized.appointment_name,
          normalized.meeting_type,
          normalized.appointment_type_id,
          'Appointment'
        ),
      };
    },
    [resolveMeetingTypeName]
  );

  const normalizeRecurringWithNames = useCallback(
    (rec: RecurringAppointment): RecurringAppointment => {
      const normalized = normalizeRecurringForCalendar(rec);
      return {
        ...normalized,
        meeting_type: resolveMeetingTypeName(
          normalized.appointment_name,
          normalized.meeting_type,
          normalized.appointment_type_id,
          'Recurring'
        ),
      };
    },
    [resolveMeetingTypeName]
  );

  // Modals
  const [isAppModalOpen, setIsAppModalOpen] = useState(false);
  const [isRecModalOpen, setIsRecModalOpen] = useState(false);

  // Appointment/Recurring form state via hooks
  const appointmentForm = useAppointmentForm();
  const recurringForm = useRecurringForm();

  // List view search
  const [listSearch, setListSearch] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      const data = await appointmentService.getAll();
      const normalized = data.map(normalizeAppointmentWithNames);
      setAppointments(normalized);
    } catch (err) {
      console.error('Failed to fetch appointments:', err);
    } finally {
      setLoading(false);
    }
  }, [normalizeAppointmentWithNames]);

  const fetchRecurring = useCallback(async () => {
    try {
      const data = await recurringAppointmentService.getAll();
      const normalized = data.map(normalizeRecurringWithNames);
      setRecurringApps(normalized);
    } catch (err) {
      console.error('Failed to fetch recurring appointments:', err);
    }
  }, [normalizeRecurringWithNames]);

  const fetchGroups = useCallback(async () => {
    if (isPartner) return;
    try { setGroups(await groupService.getAll()); } catch (err) { console.error('Failed to fetch groups:', err); }
  }, [isPartner]);

  const fetchInvestees = useCallback(async () => {
    if (isPartner) return;
    try { setInvestees(await investeeService.getAll()); } catch (err) { console.error('Failed to fetch investees:', err); }
  }, [isPartner]);

  const fetchLookupOptions = useCallback(async () => {
    try {
      const [apptTypes, grpTypes, partners] = await Promise.all([
        lookupService.listAppointmentTypes().catch(() => []),
        lookupService.listGroupTypes().catch(() => []),
        isPartner ? Promise.resolve([]) : partnerService.getAll().catch(() => []),
      ]);
      setAppointmentTypes(apptTypes);
      setGroupTypes(grpTypes);
      setAllPartners(partners.map((p) => ({ partner_id: p.partner_id, partner_name: p.partner_name, email: p.email })));
    } catch (err) {
      console.error('Failed to fetch lookup options:', err);
    }
  }, [isPartner]);

  useEffect(() => {
    fetchAppointments();
    fetchRecurring();
    fetchGroups();
    fetchInvestees();
    fetchLookupOptions();
  }, [fetchAppointments, fetchRecurring, fetchGroups, fetchInvestees, fetchLookupOptions]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchAppointments();
      void fetchRecurring();
      void fetchGroups();
      void fetchInvestees();
      void fetchLookupOptions();
    }, DASHBOARD_AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [fetchAppointments, fetchRecurring, fetchGroups, fetchInvestees, fetchLookupOptions]);

  // Handle URL params for group pre-selection (from Groups page)
  useEffect(() => {
    const groupId = searchParams.get('group_id');
    const mode = searchParams.get('mode');
    if (groupId && groups.length > 0) {
      // Clear search params to avoid re-triggering
      setSearchParams({}, { replace: true });
      if (mode === 'recurring') {
        recurringForm.setForm({
          ...INITIAL_REC_STATE,
          chapter_id: String(chapterId),
          group_id: groupId,
          rec_app_start_date: format(selectedDate, 'yyyy-MM-dd'),
          rec_app_end_date: format(addMonths(selectedDate, 3), 'yyyy-MM-dd'),
        });
        setIsRecModalOpen(true);
      } else {
        const today = startOfDay(new Date());
        const defaultDate = isBefore(selectedDate, today) ? new Date() : selectedDate;
        appointmentForm.setForm({
          ...INITIAL_APP_STATE,
          chapter_id: String(chapterId),
          meeting_date: format(defaultDate, 'yyyy-MM-dd'),
          group_id: groupId,
        });
        setIsAppModalOpen(true);
      }
    }
  }, [searchParams, groups]);  // eslint-disable-line react-hooks/exhaustive-deps

  // Returns true if `date` is a valid occurrence of the recurring template
  // (uses shared utility from utils/recurrence.ts)

  const getRecurringEventsForDay = useCallback((date: Date): RecurringAppointment[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return recurringApps.filter((rec) => {
      if (!isRecurringOccurrence(rec, date)) return false;
      return !appointments.some((app) => app.rec_app_id === rec.rec_app_id && app.meeting_date === dateStr);
    });
  }, [appointments, recurringApps]);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const resetToToday = () => {
    setCurrentMonth(startOfMonth(TODAY));
    setSelectedDate(TODAY);
  }

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({
    start: startDate,
    end: endDate
  });

  const getEventsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(e => e.meeting_date === dateStr);
  };

  const getHolidayForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return HOLIDAYS.find(h => h.date === dateStr);
  }

  // --- Logic ---

  const handleOpenAddApp = () => {
    if (isPartner) return;
    const today = startOfDay(new Date());
    const defaultDate = isBefore(selectedDate, today) ? new Date() : selectedDate;
    appointmentForm.setForm({
      ...INITIAL_APP_STATE,
      chapter_id: String(chapterId),
      meeting_date: format(defaultDate, 'yyyy-MM-dd'),
    });
    setIsAppModalOpen(true);
  };

  const handleOpenAddRec = () => {
    if (isPartner) return;
    const today = startOfDay(new Date());
    const defaultDate = isBefore(selectedDate, today) ? new Date() : selectedDate;
    recurringForm.setForm({
      ...INITIAL_REC_STATE,
      chapter_id: String(chapterId),
      rec_app_start_date: format(defaultDate, 'yyyy-MM-dd'),
      rec_app_end_date: format(addMonths(defaultDate, 3), 'yyyy-MM-dd'),
    });
    setIsRecModalOpen(true);
  };

  const handleCreateAppointment = async (formData: AppointmentFormState, selectedPartnerIds: string[] = []) => {
    if (isPartner) return;
    try {
      const occurrenceDate = formData.meeting_date || formData.occurrence_date;

      const normalizeTime = (value?: string): string => {
        if (!value) return '';
        return value.length === 5 ? `${value}:00` : value;
      };

      const startAt = normalizeTime(formData.start_at || formData.planned_start);
      const endAt = normalizeTime(formData.end_at || formData.planned_end);
      if (!startAt || !endAt) {
        alert('Start and end times are required');
        return;
      }

      const payload: AppointmentUpsertPayload = {
        occurrence_date: occurrenceDate,
        start_at: startAt,
        end_at: endAt,
        appointment_name: formData.appointment_name || undefined,
        appointment_type_id: formData.appointment_type_id || formData.meeting_type || undefined,
        group_type_id: formData.group_type_id || undefined,
        investee_id: formData.investee_id || undefined,
        partners: selectedPartnerIds.length > 0 ? selectedPartnerIds : (formData.partner_ids || undefined),
      };

      const appointmentId = formData.app_id || formData.appointment_id;
      if (appointmentId) {
        await appointmentService.update(appointmentId, payload, String(chapterId));
      } else {
        await appointmentService.create({
          chapter_id: String(chapterId),
          ...payload,
        });
      }
      // Preserve selected date on the meeting's date
      if (occurrenceDate) {
        const eventDate = parseLocalDate(occurrenceDate);
        setSelectedDate(eventDate);
        if (!isSameMonth(eventDate, currentMonth)) {
          setCurrentMonth(startOfMonth(eventDate));
        }
      }
      await fetchAppointments();
      setIsAppModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save appointment');
    }
  };

  const handleCreateRecurring = async (formData: RecurringFormState, selectedPartnerIds: string[] = []) => {
    if (isPartner) return;
    try {
      const recurrenceUi = parseRecurrenceUiStateFromLegacy(formData.frequency, formData.frequency_json);
      const plannedStart = formData.planned_start || '09:00';
      const [sh, sm] = (formData.planned_start || '09:00').split(':').map(Number);
      const [eh, em] = (formData.planned_end || '10:00').split(':').map(Number);
      const durationMinutes = Math.max(15, (eh * 60 + em) - (sh * 60 + sm));
      const payload = {
        appointment_name: formData.appointment_name || undefined,
        appointment_type_id: formData.appointment_type_id || formData.meeting_type,
        start_time: `${plannedStart}:00`,
        duration_minutes: durationMinutes,
        rrule: buildRRuleFromUiState(recurrenceUi),
        start_date: formData.rec_app_start_date,
        end_date: formData.rec_app_end_date,
        group_id: formData.group_id || undefined,
        investee_id: formData.investee_id || undefined,
      };

      const partnerIdsForSubmit = selectedPartnerIds;

      if (formData.rec_app_id) {
        await recurringAppointmentService.update(formData.rec_app_id, payload, String(chapterId), partnerIdsForSubmit);
      } else {
        await recurringAppointmentService.create(payload, String(chapterId), partnerIdsForSubmit);
      }
      await fetchRecurring();
      await fetchAppointments();
      setIsRecModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save recurring appointment');
    }
  };

  const handleViewDetail = (app: Appointment) => {
    const appointmentId = getAppointmentId(app);
    if (!appointmentId) return;
    navigate(isPartner ? `/my-appointments/appointment/${appointmentId}` : `/appointments/${appointmentId}`);
  };

  const handleViewRecurringDetail = (rec: RecurringAppointment, _occurrenceDate?: Date) => {
    const recurringId = getRecurringId(rec);
    if (!recurringId) return;
    if (isPartner) {
      const occurrenceDate = _occurrenceDate ? format(_occurrenceDate, 'yyyy-MM-dd') : undefined;
      navigate(`/my-appointments/recurring/${recurringId}${occurrenceDate ? `?occurrence_date=${occurrenceDate}` : ''}`);
      return;
    }
    navigate(`/recurring-appointments/${recurringId}`);
  };

  // Export handlers
  const handleExportEventsExcel = () => {
    const monthEvents = appointments.filter(e => {
      if (!e.meeting_date) return false;
      const d = parseLocalDate(e.meeting_date);
      return isSameMonth(d, currentMonth);
    });
    const data: Array<Record<string, string>> = monthEvents.map(e => ({
      'Meeting Type': e.meeting_type || 'Appointment',
      'Date': e.meeting_date || '',
      'Start': e.start_at || e.planned_start || '',
      'End': e.end_at || e.planned_end || '',
      'Status': e.status || '',
      'Group': groups.find(g => g.group_id === e.group_id)?.group_name || '-',
      'Investee': investees.find(iv => iv.investee_id === e.investee_id)?.investee_name || '-',
    }));
    // Also add recurring events for this month
    const monthStart2 = startOfMonth(currentMonth);
    const monthEnd2 = endOfMonth(currentMonth);
    const monthDays = eachDayOfInterval({ start: monthStart2, end: monthEnd2 });
    recurringApps.forEach(rec => {
      monthDays.forEach(day => {
        if (isRecurringOccurrence(rec, day)) {
          data.push({
            'Meeting Type': `${rec.meeting_type} (Recurring)`,
            'Date': format(day, 'yyyy-MM-dd'),
            'Start': '-',
            'End': '-',
            'Status': 'Recurring',
            'Group': groups.find(g => g.group_id === rec.group_id)?.group_name || '-',
            'Investee': investees.find(iv => iv.investee_id === rec.investee_id)?.investee_name || '-',
          });
        }
      });
    });
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calendar Events");
    XLSX.writeFile(workbook, `calendar_${format(currentMonth, 'yyyy-MM')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <CalendarToolbar
        currentMonth={currentMonth}
        selectedDate={selectedDate}
        calendarView={calendarView}
        onToggleView={setCalendarView}
        onToday={resetToToday}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onExportExcel={handleExportEventsExcel}
        onOpenAddEvent={handleOpenAddApp}
        onOpenAddRecurring={handleOpenAddRec}
        canEdit={!isPartner}
      />

      {/* =================== GRID VIEW =================== */}
      {calendarView === 'grid' && (
        <CalendarGridView
          isPartner={isPartner}
          days={days}
          monthStart={monthStart}
          selectedDate={selectedDate}
          today={TODAY}
          groups={groups}
          investees={investees}
          getHolidayForDay={getHolidayForDay}
          getEventsForDay={getEventsForDay}
          getRecurringEventsForDay={getRecurringEventsForDay}
          onSelectDate={setSelectedDate}
          onViewDetail={handleViewDetail}
          onViewRecurringDetail={handleViewRecurringDetail}
        />
      )}

      {/* =================== LIST VIEW =================== */}
      {calendarView === 'list' && (
        <CalendarListView
          isPartner={isPartner}
          currentMonth={currentMonth}
          appointments={appointments}
          recurringApps={recurringApps}
          groups={groups}
          investees={investees}
          listSearch={listSearch}
          onListSearchChange={setListSearch}
          onViewDetail={handleViewDetail}
          onViewRecurringDetail={handleViewRecurringDetail}
        />
      )}

      {/* Appointment Creation/Edit Modal */}
      {!isPartner && (
        <>
          <CreateAppointmentModal
            isOpen={isAppModalOpen}
            onClose={() => setIsAppModalOpen(false)}
            onSubmit={handleCreateAppointment}
            appointmentTypes={appointmentTypes}
            groupTypes={groupTypes}
            investees={investees}
            allPartners={allPartners}
            initialData={appointmentForm.form.app_id ? appointmentForm.form : undefined}
          />

          {/* Recurring Creation/Edit Modal */}
          <CreateRecurringModal
            isOpen={isRecModalOpen}
            onClose={() => setIsRecModalOpen(false)}
            onSubmit={handleCreateRecurring}
            appointmentTypes={appointmentTypes}
            groups={groups}
            investees={investees}
            allPartners={allPartners}
            initialData={recurringForm.form.rec_app_id ? recurringForm.form : undefined}
          />
        </>
      )}

    </div>
  );
};