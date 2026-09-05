import { useLocale } from '@/features/locale/LocaleProvider';

export function RangeFilter({
  years,
  startYear,
  endYear,
  onChange,
}: {
  years: number[];
  startYear: number;
  endYear: number;
  onChange: (start: number, end: number) => void;
}) {
  const { t } = useLocale();
  return (
    <fieldset className="range-filter">
      <legend>{t('dashboard.range')}</legend>
      <label>
        {t('dashboard.from')}
        <select
          value={startYear}
          onChange={(event) => onChange(Number(event.currentTarget.value), endYear)}
        >
          {years
            .filter((year) => year <= endYear)
            .map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
        </select>
      </label>
      <label>
        {t('dashboard.to')}
        <select
          value={endYear}
          onChange={(event) => onChange(startYear, Number(event.currentTarget.value))}
        >
          {years
            .filter((year) => year >= startYear)
            .map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
        </select>
      </label>
    </fieldset>
  );
}
