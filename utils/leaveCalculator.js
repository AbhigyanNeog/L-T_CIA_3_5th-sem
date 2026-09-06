const Holiday = require('../models/Holiday');

/**
 * Normalizes Date object to midnight UTC
 */
const toMidnightUTC = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

/**
 * Calculates net working days between startDate and endDate (inclusive),
 * excluding weekends (Saturday, Sunday) and official company holidays.
 * @param {Date|string} startDate
 * @param {Date|string} endDate
 * @returns {Promise<{ netWorkingDays: number, totalCalendarDays: number, holidaysEncountered: Array }>}
 */
const calculateWorkingDays = async (startDate, endDate) => {
  const start = toMidnightUTC(startDate);
  const end = toMidnightUTC(endDate);

  if (start > end) {
    throw new Error('Start date cannot be after end date.');
  }

  // Fetch all holidays within the date range
  const holidays = await Holiday.find({
    date: { $gte: start, $lte: end }
  });

  const holidayTimeSet = new Set(
    holidays.map((h) => toMidnightUTC(h.date).getTime())
  );

  let netWorkingDays = 0;
  let totalCalendarDays = 0;
  const holidaysEncountered = [];

  const current = new Date(start);
  while (current <= end) {
    totalCalendarDays++;
    const dayOfWeek = current.getUTCDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const currentTime = current.getTime();
    const isHoliday = holidayTimeSet.has(currentTime);

    if (isHoliday) {
      const hDoc = holidays.find((h) => toMidnightUTC(h.date).getTime() === currentTime);
      if (hDoc) holidaysEncountered.push(hDoc);
    }

    // Only count as consumed working day if NOT weekend AND NOT holiday
    if (!isWeekend && !isHoliday) {
      netWorkingDays++;
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    netWorkingDays,
    totalCalendarDays,
    holidaysEncountered
  };
};

module.exports = {
  calculateWorkingDays,
  toMidnightUTC
};
