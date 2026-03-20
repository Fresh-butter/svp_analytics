/**
 * Shared helpers for the Prisma-based repository layer.
 *
 * - Date / Time formatting (Prisma returns JS Date objects for @db.Date & @db.Time)
 * - is_active computation
 * - Prisma pagination conversion
 */

// ─── Date / Time formatting ──────────────────────────────────────────────────

/** Prisma @db.Date → 'YYYY-MM-DD' string (or null).
 *  Prisma returns DATE columns as UTC-midnight JS Date objects,
 *  so we use UTC accessors to avoid timezone-induced day shifts. */
function fmtDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.split('T')[0];
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Prisma @db.Time → 'HH:MM:SS' string (or null) */
function fmtTime(d) {
  if (!d) return null;
  if (typeof d === 'string') return d;
  // Prisma returns TIME as Date(1970-01-01T...)
  const h = String(d.getUTCHours()).padStart(2, '0');
  const m = String(d.getUTCMinutes()).padStart(2, '0');
  const s = String(d.getUTCSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

/** Prisma @db.Timestamp → ISO string */
function fmtTimestamp(d) {
  if (!d) return null;
  if (typeof d === 'string') return d;
  return d.toISOString();
}

// ─── Row formatting ──────────────────────────────────────────────────────────

/**
 * Format a single row from Prisma, converting Date objects to strings
 * and adding computed `is_active` where applicable.
 */
function formatRow(row, opts = {}) {
  if (!row) return row;
  const r = { ...row };

  // Automatically format outputs
  if (r.start_date !== undefined) r.start_date = fmtDate(r.start_date);
  if (r.end_date !== undefined) r.end_date = fmtDate(r.end_date);
  if (r.occurrence_date !== undefined) r.occurrence_date = fmtDate(r.occurrence_date);
  if (r.appointment_date !== undefined) r.appointment_date = fmtDate(r.appointment_date); // keep for backward compatibility
  if (r.start_time !== undefined) r.start_time = fmtTime(r.start_time);
  if (r.start_at !== undefined) r.start_at = fmtTimestamp(r.start_at);
  if (r.end_time !== undefined) r.end_time = fmtTime(r.end_time);
  if (r.end_at !== undefined) r.end_at = fmtTimestamp(r.end_at);
  if (r.created_at !== undefined) r.created_at = fmtTimestamp(r.created_at);
  if (r.modified_at !== undefined) r.modified_at = fmtTimestamp(r.modified_at);

  // Computed is_active
  if (opts.computeActive && r.start_date != null) {
    const today = utcToday();
    const sd = parseLocalDate(r.start_date);
    const ed = r.end_date ? parseLocalDate(r.end_date) : new Date(Date.UTC(9999, 11, 31));
    r.is_active = sd <= today && ed >= today;
  }

  // Strip Prisma relation objects (e.g. chapters, investees, partners)
  for (const key of (opts.stripRelations || [])) {
    delete r[key];
  }

  return r;
}

function formatRows(rows, opts = {}) {
  return rows.map(row => formatRow(row, opts));
}

// ─── is_active WHERE filter ────────────────────────────────────────────────

/**
 * Build a Prisma-compatible date-range WHERE for is_active filtering.
 * @param {boolean|undefined} active  true → currently active, false → inactive
 * @returns {object} Prisma where clause fragment
 */
function activeFilter(active) {
  if (active === undefined) return {};
  const today = utcToday();
  if (active) {
    return {
      start_date: { lte: today },
      OR: [
        { end_date: null },
        { end_date: { gte: today } },
      ],
    };
  }
  // inactive: either hasn't started yet, or has already ended
  return {
    OR: [
      { start_date: { gt: today } },
      { end_date: { lt: today } },
    ],
  };
}

// ─── Time arithmetic ────────────────────────────────────────────────────────

/**
 * Add minutes to a time string or Date and return 'HH:MM:SS'.
 * @param {string|Date} time
 * @param {number} minutes
 * @returns {string}
 */
function addMinutesToTime(time, minutes) {
  let h, m, s;
  if (time instanceof Date) {
    h = time.getUTCHours();
    m = time.getUTCMinutes();
    s = time.getUTCSeconds();
  } else {
    [h, m, s] = time.split(':').map(Number);
  }
  const total = (((h * 60 + m + (minutes || 0)) % 1440) + 1440) % 1440;
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
}

/**
 * Parse a time string 'HH:MM:SS' into a Date (1970-01-01 UTC).
 */
function parseTime(timeStr) {
  if (timeStr instanceof Date) return timeStr;
  const [h, m, s] = timeStr.split(':').map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, m, s || 0));
}

/**\n * Parse a 'YYYY-MM-DD' string into a UTC-midnight Date.\n * Using UTC midnight ensures the date is not shifted when\n * Prisma serialises it for PostgreSQL DATE columns.\n */
function parseLocalDate(str) {
  if (str instanceof Date) return str;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/**
 * Get today's date as a UTC-midnight Date.
 * Uses the server's local calendar date but represents it at UTC midnight,
 * matching how parseLocalDate stores dates.
 */
function utcToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Combine an occurrence_date (Date or 'YYYY-MM-DD') and a time string ('HH:MM:SS')
 * or Date into a proper UTC timestamp, treating the time as IST (UTC+5:30).
 *
 * Per SRS: `start_at = (occurrence_date + start_time) AT TIME ZONE 'Asia/Kolkata'`
 *
 * @param {Date|string} occurrenceDate  The date portion
 * @param {Date|string} time            The time portion (HH:MM:SS or Date)
 * @returns {Date}  Full UTC timestamp
 */
function buildTimestampIST(occurrenceDate, time) {
  const occ = occurrenceDate instanceof Date ? occurrenceDate : parseLocalDate(occurrenceDate);
  let h, m, s;
  if (time instanceof Date) {
    h = time.getUTCHours();
    m = time.getUTCMinutes();
    s = time.getUTCSeconds();
  } else {
    [h, m, s] = (time || '00:00:00').split(':').map(Number);
  }
  // The time is in IST (UTC+5:30), so subtract 5h30m to get UTC
  return new Date(Date.UTC(
    occ.getUTCFullYear(), occ.getUTCMonth(), occ.getUTCDate(),
    h - 5, (m || 0) - 30, s || 0
  ));
}

module.exports = {
  fmtDate,
  fmtTime,
  fmtTimestamp,
  formatRow,
  formatRows,
  activeFilter,
  addMinutesToTime,
  parseTime,
  parseLocalDate,
  utcToday,
  buildTimestampIST,
};
