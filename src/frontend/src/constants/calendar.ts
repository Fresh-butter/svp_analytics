// Shared calendar labels/options
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const NTH_LABELS = ['1st', '2nd', '3rd', '4th'];
export const HOLIDAYS = [{ date: '2026-02-15', name: 'Mahasivaratri' }];

// Initial states
export const INITIAL_APP_STATE = {
  meeting_type: '',
  meeting_date: '',
  planned_start: '09:00',
  planned_end: '10:00',
  group_id: '',
  investee_id: '',
  chapter_id: '',
  status: 'PENDING'
};

export const INITIAL_REC_STATE = {
  meeting_type: '',
  rec_app_start_date: '',
  rec_app_end_date: '',
  frequency: 'Weekly',
  group_id: '',
  investee_id: '',
  chapter_id: '',
  frequency_json: JSON.stringify({ day_of_week: 1, nth_occurrence: 1 }),
  planned_start: '09:00',
  planned_end: '10:00',
};
