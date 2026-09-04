import { useId } from 'react';

import type { YearValue } from '@/domain/model';
import { MAX_YEAR, MIN_YEAR, nowIso } from '@/domain/model';

import { Button } from '@/components/ui/Button';
import { Field } from './Field';

type YearValuesEditorProps = {
  label: string;
  values: YearValue[];
  onChange: (values: YearValue[]) => void;
};

export function YearValuesEditor({ label, values, onChange }: YearValuesEditorProps) {
  const editorId = useId().replaceAll(':', '');
  function update(index: number, patch: Partial<YearValue>) {
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
        <div className="year-editor__row" key={`${value.year}-${index}`}>
          <Field
            id={`${editorId}-${index}-year`}
            label="Year"
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={value.year}
            onChange={(event) => update(index, { year: Number(event.currentTarget.value) })}
            required
          />
          <Field
            id={`${editorId}-${index}-amount`}
            label="Amount"
            inputMode="decimal"
            value={value.amount}
            onChange={(event) => update(index, { amount: event.currentTarget.value })}
            required
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(values.filter((_, current) => current !== index))}
            aria-label={`Remove ${value.year} value`}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() =>
          onChange([
            ...values,
            { year: new Date().getFullYear(), amount: '0', updatedAt: nowIso() },
          ])
        }
      >
        Add year
      </Button>
    </fieldset>
  );
}
