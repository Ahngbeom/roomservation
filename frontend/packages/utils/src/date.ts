import { format, parseISO, isAfter, isBefore, addMinutes, isWithinInterval } from 'date-fns';

/**
 * Format ISO date string to readable format
 */
export const formatDate = (dateString: string, formatStr: string = 'yyyy-MM-dd'): string => {
  return format(parseISO(dateString), formatStr);
};

/**
 * Format ISO date string to time
 */
export const formatTime = (dateString: string): string => {
  return format(parseISO(dateString), 'HH:mm');
};

/**
 * Format ISO date string to datetime
 */
export const formatDateTime = (dateString: string): string => {
  return format(parseISO(dateString), 'yyyy-MM-dd HH:mm');
};

/**
 * Check if a date is in the past
 */
export const isPast = (dateString: string): boolean => {
  return isBefore(parseISO(dateString), new Date());
};

/**
 * Check if a date is in the future
 */
export const isFuture = (dateString: string): boolean => {
  return isAfter(parseISO(dateString), new Date());
};

/**
 * Check if current time is within a time range
 */
export const isWithinTimeRange = (startTime: string, endTime: string): boolean => {
  const now = new Date();
  return isWithinInterval(now, {
    start: parseISO(startTime),
    end: parseISO(endTime),
  });
};

/**
 * Calculate remaining time in minutes
 */
export const getRemainingMinutes = (dateString: string): number => {
  const target = parseISO(dateString);
  const now = new Date();
  return Math.max(0, Math.floor((target.getTime() - now.getTime()) / 60000));
};

/**
 * Get time until date in human readable format
 */
export const getTimeUntil = (dateString: string): string => {
  const minutes = getRemainingMinutes(dateString);

  if (minutes === 0) return 'Now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};
