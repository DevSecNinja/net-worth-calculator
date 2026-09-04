import { useEffect, useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { MoneyField } from '@/components/forms/MoneyField';
import { YearValuesEditor } from '@/components/forms/YearValuesEditor';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { Liability } from '@/domain/model';
import { createId, liabilityTypes, nowIso } from '@/domain/model';
import { liabilitySchema, moneyPrecisionError } from '@/domain/validation';
import { useLocale } from '@/features/locale/LocaleProvider';
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
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  liability?: Liability | undefined;
  order: number;
  currency: string;
  busy: boolean;
  onClose: () => void;
  onSave: (liability: Liability) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Liability>(() => liability ?? freshLiability(order));
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setLocalDirty] = useState(false);
  const { setDirty } = useDirtyState();
  const { t } = useLocale();
  const dirtyLabel = t('dirty.liability');

  useEffect(() => {
    if (open) {
      setDraft(liability ?? freshLiability(order));
      setErrors([]);
      setLocalDirty(false);
    }
  }, [liability, open, order]);

  useEffect(() => {
    setDirty(dirtyLabel, open && dirty);
    return () => setDirty(dirtyLabel, false);
  }, [dirty, dirtyLabel, open, setDirty]);

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
      termMonths: draft.termMonths,
      manualBalances: draft.manualBalances.toSorted((left, right) =>
        left.date.localeCompare(right.date),
      ),
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
    try {
      await onSave(parsed.data);
      setDirty(dirtyLabel, false);
      onClose();
    } catch (caught) {
      setErrors([caught instanceof Error ? caught.message : t('form.errorSaveLiability')]);
    }
  }

  return (
    <Dialog
      open={open}
      title={liability ? t('inventory.editLiability') : t('inventory.addLiability')}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <ErrorSummary errors={errors} />
        <Field
          label={t('inventory.liabilityName')}
          value={draft.name}
          onChange={(event) => patch({ name: event.currentTarget.value })}
          maxLength={100}
          required
        />
        <label className="field">
          <span>{t('common.type')}</span>
          <select
            value={draft.type}
            onChange={(event) => patch({ type: event.currentTarget.value as Liability['type'] })}
          >
            {liabilityTypes.map((type) => (
              <option key={type} value={type}>
                {t(`liabilityType.${type}`)}
              </option>
            ))}
          </select>
        </label>
        {draft.type === 'custom' ? (
          <Field
            label={t('common.customType')}
            value={draft.customType ?? ''}
            onChange={(event) => patch({ customType: event.currentTarget.value })}
            maxLength={100}
            required
          />
        ) : null}
        <div className="form-grid form-grid--three">
          <MoneyField
            label={t('inventory.principal')}
            currency={currency}
            value={draft.principal}
            onChange={(principal) => patch({ principal })}
            required
          />
          <Field
            label={t('inventory.interest')}
            inputMode="decimal"
            value={draft.annualInterestRate}
            onChange={(event) => patch({ annualInterestRate: event.currentTarget.value })}
            required
          />
          <MoneyField
            label={t('inventory.payment')}
            currency={currency}
            value={draft.monthlyPayment}
            onChange={(monthlyPayment) => patch({ monthlyPayment })}
            required
          />
        </div>
        <div className="form-grid">
          <Field
            label={t('inventory.startDate')}
            type="date"
            value={draft.startDate ?? ''}
            onChange={(event) => patch({ startDate: event.currentTarget.value || undefined })}
          />
          <Field
            label={t('inventory.term')}
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
          label={t('inventory.manualBalances')}
          currency={currency}
          values={draft.manualBalances}
          onChange={(manualBalances) => patch({ manualBalances })}
        />
        <label className="field">
          <span>{t('common.notes')}</span>
          <textarea
            value={draft.notes}
            onChange={(event) => patch({ notes: event.currentTarget.value })}
            maxLength={2000}
            rows={4}
          />
        </label>
        <div className="button-row">
          <Button type="submit" disabled={busy}>
            {busy ? t('inventory.saving') : t('inventory.saveLiability')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
