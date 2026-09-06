import { render, screen } from '@testing-library/react';

import { catalogs, type MessageKey, type SupportedLocale } from '@/features/locale/catalog';

import {
  ChartDetailSurface,
  chartDatumAtIndex,
  formatAllocationPercent,
  localizedCompletenessLabel,
  localizedProjectionStatusLabel,
  localizedSourceLabel,
  type ChartTranslate,
} from './tooltip';

function translator(locale: SupportedLocale): ChartTranslate {
  return (key: MessageKey, variables = {}) =>
    Object.entries(variables).reduce(
      (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
      catalogs[locale][key],
    );
}

describe('chart tooltip helpers', () => {
  it('does not select the first datum when the chart has no active index', () => {
    expect(chartDatumAtIndex(['first'], null)).toBeUndefined();
    expect(chartDatumAtIndex(['first'], undefined)).toBeUndefined();
  });

  it('uses Decimal arithmetic and locale-aware precision for allocation ratios', () => {
    expect(formatAllocationPercent('1', '3', 'en-US')).toBe('33.33%');
    expect(formatAllocationPercent('1', '3', 'nl-NL')).toBe('33,33%');
    expect(formatAllocationPercent('999999999999.99', '2999999999999.97', 'en-GB')).toBe('33.33%');
    expect(formatAllocationPercent('0', '0', 'nl-NL')).toBe('0%');
  });

  it.each([
    ['en-US', 'Carried forward', 'Incomplete', 'Paid off'],
    ['en-GB', 'Carried forward', 'Incomplete', 'Paid off'],
    ['nl-NL', 'Meegenomen', 'Onvolledig', 'Afgelost'],
  ] as const)('localizes source and status labels for %s', (locale, source, complete, status) => {
    const t = translator(locale);
    expect(localizedSourceLabel('carry-forward', t)).toBe(source);
    expect(localizedCompletenessLabel('incomplete', t)).toBe(complete);
    expect(localizedProjectionStatusLabel('paid-off', t)).toBe(status);
  });

  it('renders a compact detail grid with exact values, metadata, and long labels', () => {
    render(
      <ChartDetailSurface
        detail={{
          title: 'A very long custom retirement investment account category',
          rows: [
            {
              label: 'Value',
              value: '$498,999,999,999,995.01',
              meta: 'December 31, 2026 | Projected',
            },
          ],
        }}
      />,
    );

    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent(
      'A very long custom retirement investment account category',
    );
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('$498,999,999,999,995.01');
    expect(screen.getByTestId('chart-tooltip')).toHaveTextContent('December 31, 2026 | Projected');
  });
});
