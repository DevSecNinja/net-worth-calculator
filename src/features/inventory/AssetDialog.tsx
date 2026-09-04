import { useEffect, useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { YearValuesEditor } from '@/components/forms/YearValuesEditor';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { Asset } from '@/domain/model';
import { assetTypes, createId, nowIso } from '@/domain/model';
import { assetSchema, moneyPrecisionError } from '@/domain/validation';
import { todayLocalIso } from '@/domain/observations';
import { useDirtyState } from '@/hooks/useDirtyState';
import { useLocale } from '@/features/locale/LocaleProvider';

function freshAsset(order: number): Asset {
  const timestamp = nowIso();
  return {
    id: createId(),
    order,
    classification: 'current',
    type: 'checking',
    name: '',
    notes: '',
    values: [{ date: todayLocalIso(), amount: '0', updatedAt: timestamp }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function AssetDialog({
  open,
  asset,
  order,
  currency,
  busy,
  onClose,
  onSave,
}: {
  open: boolean;
  asset?: Asset | undefined;
  order: number;
  currency: string;
  busy: boolean;
  onClose: () => void;
  onSave: (asset: Asset) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Asset>(() => asset ?? freshAsset(order));
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setLocalDirty] = useState(false);
  const { setDirty } = useDirtyState();
  const { t } = useLocale();
  const dirtyLabel = t('dirty.asset');

  useEffect(() => {
    if (open) {
      setDraft(asset ?? freshAsset(order));
      setErrors([]);
      setLocalDirty(false);
    }
  }, [asset, open, order]);

  useEffect(() => {
    setDirty(dirtyLabel, open && dirty);
    return () => setDirty(dirtyLabel, false);
  }, [dirty, dirtyLabel, open, setDirty]);

  function patch(update: Partial<Asset>) {
    setDraft((current) => ({ ...current, ...update, updatedAt: nowIso() }));
    setLocalDirty(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = {
      ...draft,
      customType: draft.type === 'custom' ? draft.customType : undefined,
      values: draft.values.toSorted((left, right) => left.date.localeCompare(right.date)),
    };
    const parsed = assetSchema.safeParse(normalized);
    if (!parsed.success) {
      setErrors(parsed.error.issues.map(({ message }) => message));
      return;
    }
    const precisionError = parsed.data.values
      .map(({ amount }) => moneyPrecisionError(amount, currency))
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
      setErrors([caught instanceof Error ? caught.message : 'The asset could not be saved.']);
    }
  }

  return (
    <Dialog
      open={open}
      title={asset ? t('inventory.editAsset') : t('inventory.addAsset')}
      onClose={onClose}
    >
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <ErrorSummary errors={errors} />
        <Field
          label={t('inventory.assetName')}
          value={draft.name}
          onChange={(event) => patch({ name: event.currentTarget.value })}
          maxLength={100}
          required
        />
        <div className="form-grid">
          <label className="field">
            <span>{t('inventory.classification')}</span>
            <select
              value={draft.classification}
              onChange={(event) =>
                patch({ classification: event.currentTarget.value as Asset['classification'] })
              }
            >
              <option value="current">{t('inventory.current')}</option>
              <option value="long-term">{t('inventory.longTerm')}</option>
            </select>
          </label>
          <label className="field">
            <span>{t('common.type')}</span>
            <select
              value={draft.type}
              onChange={(event) => patch({ type: event.currentTarget.value as Asset['type'] })}
            >
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`assetType.${type}`)}
                </option>
              ))}
            </select>
          </label>
        </div>
        {draft.type === 'custom' ? (
          <Field
            label={t('common.customType')}
            value={draft.customType ?? ''}
            onChange={(event) => patch({ customType: event.currentTarget.value })}
            maxLength={100}
            required
          />
        ) : null}
        <YearValuesEditor
          label={t('inventory.observations')}
          currency={currency}
          values={draft.values}
          onChange={(values) => patch({ values })}
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
            {busy ? t('inventory.saving') : t('inventory.saveAsset')}
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
