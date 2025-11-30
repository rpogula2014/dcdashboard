// Colors for chart bars
export const CHART_COLORS = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
];

// Calculate aging in days from schedule_ship_date
export function calculateAging(scheduleShipDate: string | null): number {
  if (!scheduleShipDate) return 0;
  const shipDate = new Date(scheduleShipDate);
  const today = new Date();
  const diffTime = today.getTime() - shipDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

// Format date for display
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

// Custom bar label renderer - uses explicit any to satisfy Recharts' flexible label prop types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function renderBarLabel(props: any) {
  const x = Number(props.x) || 0;
  const y = Number(props.y) || 0;
  const width = Number(props.width) || 0;
  const value = Number(props.value) || 0;
  return (
    <text x={x + width + 5} y={y + 12} fill="#666" fontSize={11}>
      {value}
    </text>
  );
}
