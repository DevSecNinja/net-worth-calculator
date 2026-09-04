import { useEffect, useState, type FormEvent } from 'react';

import { ErrorSummary } from '@/components/forms/ErrorSummary';
import { Field } from '@/components/forms/Field';
import { YearValuesEditor } from '@/components/forms/YearValuesEditor';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import type { Asset } from '@/domain/model';
import { assetTypes, createId, nowIso } from '@/domain/model';
import { assetSchema, moneyPrecisionError } from '@/domain/validation';
import { useDirtyState } from '@/hooks/useDirtyState';

function freshAsset(order: number): Asset {
  const timestamp = nowIso();
  return {
    id: createId(),
    order,
    classification: 'current',
    type: 'checking',
    name: '',
    notes: '',
    values: [{ year: new Date().getFullYear(), amount: '0', updatedAt: timestamp }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function AssetDialog({
  open,
  asset,
  order,
  currency,
  onClose,
  onSave,
}: {
  open: boolean;
  asset?: Asset | undefined;
  order: number;
  currency: string;
  onClose: () => void;
  onSave: (asset: Asset) => Promise<void>;
}) {
  const [draft, setDraft] = useState<Asset>(() => asset ?? freshAsset(order));
  const [errors, setErrors] = useState<string[]>([]);
  const [dirty, setLocalDirty] = useState(false);
  const { setDirty } = useDirtyState();

  useEffect(() => {
    if (open) {
      setDraft(asset ?? freshAsset(order));
      setErrors([]);
      setLocalDirty(false);
    }
  }, [asset, open, order]);

  useEffect(() => {
    setDirty('Asset editor', open && dirty);
    return () => setDirty('Asset editor', false);
  }, [dirty, open, setDirty]);

  function patch(update: Partial<Asset>) {
    setDraft((current) => ({ ...current, ...update, updatedAt: nowIso() }));
    setLocalDirty(true);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = {
      ...draft,
      customType: draft.type === 'custom' ? draft.customType : undefined,
      values: draft.values.toSorted((left, right) => left.year - right.year),
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
    await onSave(parsed.data);
    setDirty('Asset editor', false);
    onClose();
  }

  return (
    <Dialog open={open} title={asset ? 'Edit asset' : 'Add asset'} onClose={onClose}>
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <ErrorSummary errors={errors} />
        <Field
          label="Asset name"
          value={draft.name}
          onChange={(event) => patch({ name: event.currentTarget.value })}
          maxLength={100}
          required
        />
        <div className="form-grid">
          <label className="field">
            <span>Classification</span>
            <select
              value={draft.classification}
              onChange={(event) =>
                patch({ classification: event.currentTarget.value as Asset['classification'] })
              }
            >
              <option value="current">Current</option>
              <option value="long-term">Long-term</option>
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select
              value={draft.type}
              onChange={(event) => patch({ type: event.currentTarget.value as Asset['type'] })}
            >
              {assetTypes.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll('-', ' ')}
                </option>
              ))}
            </select>
          </label>
        </div>
        {draft.type === 'custom' ? (
          <Field
            label="Custom asset type"
            value={draft.customType ?? ''}
            onChange={(event) => patch({ customType: event.currentTarget.value })}
            maxLength={100}
            required
          />
        ) : null}
        <YearValuesEditor
          label="Year-specific values"
          values={draft.values}
          onChange={(values) => patch({ values })}
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
          <Button type="submit">Save asset</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
