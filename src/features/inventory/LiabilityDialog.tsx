import { useEffect, useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { YearValuesEditor } from '@/components/forms/YearValuesEditor';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { Liability } from '@/domain/model';
import { createId, liabilityTypes, nowIso } from '@/domain/model';
import { liabilitySchema, moneyPrecisionError } from '@/domain/validation';
import { useDirtyState } from '@/hooks/useDirtyState';

function freshLiability(order: number): Liability {
  const timestamp = nowIso();
  return {
    id: createId(),
    order,
    type: 'mortgage',
    name: '',
    principal: '0',
    annualInterestRate: '0',
    monthlyPayment: '0',
    notes: '',
    manualBalances: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function LiabilityDialog({
  open,
  liability,
  order,
  currency,
  onClose,
  onSave,
}: {
  open: boolean;
  liability?: Liability | undefined;
  order: number;
  currency: string;
  onClose: () => void;
  onSave: (liability: Liability) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Liability>(() => liability ?? freshLiability(order));
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setLocalDirty] = useState(false);
  const { setDirty } = useDirtyState();

  useEffect(() => {
    if (open) {
      setDraft(liability ?? freshLiability(order));
      setErrors([]);
      setLocalDirty(false);
    }
  }, [liability, open, order]);

  useEffect(() => {
    setDirty('Liability editor', open && dirty);
    return () => setDirty('Liability editor', false);
  }, [dirty, open, setDirty]);

  function patch(update: Partial<Liability>) {
    setDraft((current) => ({ ...current, ...update, updatedAt: nowIso() }));
    setLocalDirty(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = {
      ...draft,
      customType: draft.type === 'custom' ? draft.customType : undefined,
      startDate: draft.startDate || undefined,
      termMonths: draft.termMonths || undefined,
      manualBalances: draft.manualBalances.toSorted((left, right) => left.year - right.year),
    };
    const parsed = liabilitySchema.safeParse(normalized);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map(({ message }) => message));
      return;
    }
    const amounts = [
      parsed.data.principal,
      parsed.data.monthlyPayment,
      ...parsed.data.manualBalances.map(({ amount }) => amount),
    ];
    const precisionError = amounts
      .map((amount) => moneyPrecisionError(amount, currency))
      .find(Boolean);
    if (precisionError) {
      setErrors([precisionError]);
      return;
    }
    await onSave(parsed.data);
    setDirty('Liability editor', false);
    onClose();
  }

  return (
    <Dialog open={open} title={liability ? 'Edit liability' : 'Add liability'} onClose={onClose}>
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <ErrorSummary errors={errors} />
        <Field
          label="Liability name"
          value={draft.name}
          onChange={(event) => patch({ name: event.currentTarget.value })}
          maxLength={100}
          required
        />
        <label className="field">
          <span>Type</span>
          <select
            value={draft.type}
            onChange={(event) => patch({ type: event.currentTarget.value as Liability['type'] })}
          >
            {liabilityTypes.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll('-', ' ')}
              </option>
            ))}
          </select>
        </label>
        {draft.type === 'custom' ? (
          <Field
            label="Custom liability type"
            value={draft.customType ?? ''}
            onChange={(event) => patch({ customType: event.currentTarget.value })}
            maxLength={100}
            required
          />
        ) : null}
        <div className="form-grid form-grid--three">
          <Field
            label="Current or principal amount"
            inputMode="decimal"
            value={draft.principal}
            onChange={(event) => patch({ principal: event.currentTarget.value })}
            required
          />
          <Field
            label="Annual interest rate"
            inputMode="decimal"
            value={draft.annualInterestRate}
            onChange={(event) => patch({ annualInterestRate: event.currentTarget.value })}
            required
          />
          <Field
            label="Monthly payment"
            inputMode="decimal"
            value={draft.monthlyPayment}
            onChange={(event) => patch({ monthlyPayment: event.currentTarget.value })}
            required
          />
        </div>
        <div className="form-grid">
          <Field
            label="Start date (optional)"
            type="date"
            value={draft.startDate ?? ''}
            onChange={(event) => patch({ startDate: event.currentTarget.value || undefined })}
          />
          <Field
            label="Term in months (optional)"
            type="number"
            min={1}
            max={1200}
            value={draft.termMonths ?? ''}
            onChange={(event) =>
              patch({
                termMonths: event.currentTarget.value
                  ? Number(event.currentTarget.value)
                  : undefined,
              })
            }
          />
        </div>
        <YearValuesEditor
          label="Manual December 31 balances"
          values={draft.manualBalances}
          onChange={(manualBalances) => patch({ manualBalances })}
        />
        <label className="field">
          <span>Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => patch({ notes: event.currentTarget.value })}
            maxLength={2000}
            rows={4}
          />
        </label>
        <div className="button-row">
          <Button type="submit">Save liability</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
