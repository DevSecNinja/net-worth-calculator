import { useId } from 'react';

import type { ValueObservation } from '@/domain/model';
import { nowIso } from '@/domain/model';
import { todayLocalIso } from '@/domain/observations';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/features/locale/LocaleProvider';
import { Field } from './Field';
import { MoneyField } from './MoneyField';

type YearValuesEditorProps = {
  label: string;
  currency: string;
  values: ValueObservation[];
  onChange: (values: ValueObservation[]) => void;
};

export function YearValuesEditor({ label, currency, values, onChange }: YearValuesEditorProps) {
  const { t } = useLocale();
  const editorId = useId().replaceAll(':', '');
  function update(index: number, patch: Partial<ValueObservation>) {
    onChange(
      values.map((value, current) =>
        current === index ? { ...value, ...patch, updatedAt: nowIso() } : value,
      ),
    );
  }

  return (
    <fieldset className="year-editor">
      <legend>{label}</legend>
      {values.map((value, index) => (
        <div className="year-editor__row" key={`${editorId}-${index}`}>
          <Field
            id={`${editorId}-${index}-date`}
            label={t('common.date')}
            type="date"
            min="1900-01-01"
            max="2200-12-31"
            value={value.date}
            onChange={(event) => update(index, { date: event.currentTarget.value })}
            required
          />
          <MoneyField
            label={t('common.amount')}
            currency={currency}
            value={value.amount}
            onChange={(amount) => update(index, { amount })}
            required
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(values.filter((_, current) => current !== index))}
            aria-label={t('form.removeObservation', { date: value.date })}
          >
            {t('common.remove')}
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([...values, { date: todayLocalIso(), amount: '0', updatedAt: nowIso() }])
        }
      >
        {t('form.addObservation')}
      </Button>
    </fieldset>
  );
}
