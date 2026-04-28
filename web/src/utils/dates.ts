/** Formatea una fecha en hora local (Guatemala UTC-6) como YYYY-MM-DD.
 *  Evita el desfase de toISOString() que convierte a UTC antes de formatear. */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function localToday(): string {
  return formatLocalDate(new Date());
}

export function localTomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatLocalDate(d);
}

export function localDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return formatLocalDate(d);
}
