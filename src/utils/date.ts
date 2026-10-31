import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function addDaysISO(base: string, days: number): string {
  return format(addDays(parseISO(base), days), 'yyyy-MM-dd');
}

export function combineDateTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00`);
}

export function bookingHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function intervalsOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(bStart) < timeToMinutes(aEnd);
}

export function dateGroups(startDate: string, startTime: string, endTime: string): boolean {
  const start = combineDateTime(startDate, startTime);
  const end = combineDateTime(startDate, endTime);
  return isBefore(start, end);
}

export function isPastDate(date: string): boolean {
  return isBefore(parseISO(date), startOfDay(new Date()));
}

export function isPastBooking(date: string, endTime: string): boolean {
  return isAfter(new Date(), combineDateTime(date, endTime));
}

export function formatSlot(date: string, startTime: string, endTime: string): string {
  const d = parseISO(date);
  return `${format(d, 'eee, dd MMM yyyy')} · ${startTime} – ${endTime}`;
}

export function weekdayName(day: number): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day] ?? '';
}

export function shortWeekday(day: number): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day] ?? '';
}

export function toLocalInputDateTime(date: Date): string {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}
