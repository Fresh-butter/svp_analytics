function validationError(res, message) {
  return res.status(400).json({
    success: false,
    error: { code: 'VALIDATION', message },
  });
}

function requireChapterIdFromToken(req, res) {
  const chapterId = req.user?.chapter_id;
  if (!chapterId) {
    validationError(res, 'chapter_id is required (from token)');
    return null;
  }
  return chapterId;
}

function hasInvalidDateRange(startDate, endDate) {
  if (!startDate || !endDate) return false;
  return new Date(endDate) < new Date(startDate);
}

function validateDateRange(res, startDate, endDate, message = 'End date cannot be less than Start date') {
  if (hasInvalidDateRange(startDate, endDate)) {
    validationError(res, message);
    return false;
  }
  return true;
}

function parseMonthYear(query = {}, res) {
  const now = new Date();
  const rawMonth = query.month ?? now.getMonth() + 1;
  const rawYear = query.year ?? now.getFullYear();
  const month = Number(rawMonth);
  const year = Number(rawYear);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    validationError(res, 'month must be an integer between 1 and 12');
    return null;
  }

  if (!Number.isInteger(year) || year < 1000) {
    validationError(res, 'year must be a valid four-digit integer');
    return null;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0));

  return { month, year, startDate, endDate };
}

function isDateWithinMonthYear(dateValue, month, year) {
  if (!dateValue) return false;
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCFullYear() === year && date.getUTCMonth() + 1 === month;
}

function monthYearPagination(month, year, total) {
  return { month, year, total };
}

module.exports = {
  validationError,
  requireChapterIdFromToken,
  hasInvalidDateRange,
  validateDateRange,
  parseMonthYear,
  isDateWithinMonthYear,
  monthYearPagination,
};
