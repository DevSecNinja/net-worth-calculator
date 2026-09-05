export function exactTooltipValue(item: unknown, key: string, fallback: unknown): string {
  if (
    typeof item === 'object' &&
    item !== null &&
    'payload' in item &&
    typeof item.payload === 'object' &&
    item.payload !== null &&
    key in item.payload
  ) {
    const value = item.payload[key as keyof typeof item.payload];
    if (typeof value === 'string') return value;
  }
  return String(fallback);
}
