import { useState } from 'react';

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/domain/currency';
import type { Asset } from '@/domain/model';
import { useVault } from '@/features/vault/useVault';

import { AssetDialog } from './AssetDialog';
import { deleteAsset, moveAsset, upsertAsset } from './inventory';

export function AssetsPanel() {
  const { vault, mutate, busy } = useVault();
  const [editing, setEditing] = useState<Asset | 'new'>();
  const [deleting, setDeleting] = useState<Asset>();
  if (!vault) return null;
  const assets = vault.assets.toSorted((left, right) => left.order - right.order);

  return (
    <section aria-labelledby="assets-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">What you own</p>
          <h1 id="assets-heading">Assets</h1>
          <p>Record explicit calendar-year values. Missing years are marked incomplete.</p>
        </div>
        <Button type="button" onClick={() => setEditing('new')}>
          Add asset
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <h2>No assets yet</h2>
          <p>Add an account, property, investment, or custom asset to start a net worth history.</p>
          <Button type="button" onClick={() => setEditing('new')}>
            Add your first asset
          </Button>
        </div>
      ) : (
        <div className="item-list">
          {assets.map((asset, index) => {
            const latest = asset.values.toSorted((a, b) => b.year - a.year)[0];
            return (
              <article className="item-card" key={asset.id}>
                <div className="item-card__main">
                  <span className="badge">{asset.classification}</span>
                  <h2>{asset.name}</h2>
                  <p className="muted">
                    {asset.type === 'custom' ? asset.customType : asset.type.replaceAll('-', ' ')}
                  </p>
                  {latest ? (
                    <p className="item-card__amount">
                      {formatMoney(
                        latest.amount,
                        vault.settings.baseCurrency,
                        vault.settings.locale,
                      )}
                      <span> in {latest.year}</span>
                    </p>
                  ) : (
                    <p className="muted">No yearly value recorded</p>
                  )}
                </div>
                <div className="item-card__actions" aria-label={`Actions for ${asset.name}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === 0}
                    onClick={() => void mutate((current) => moveAsset(current, asset.id, -1))}
                  >
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === assets.length - 1}
                    onClick={() => void mutate((current) => moveAsset(current, asset.id, 1))}
                  >
                    Move down
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(asset)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setDeleting(asset)}>
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AssetDialog
        open={Boolean(editing)}
        asset={editing === 'new' ? undefined : editing}
        order={assets.length}
        currency={vault.settings.baseCurrency}
        onClose={() => setEditing(undefined)}
        onSave={(asset) => mutate((current) => upsertAsset(current, asset))}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete asset"
        confirmLabel="Delete asset"
        dangerous
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (!deleting) return;
          void mutate((current) => deleteAsset(current, deleting.id)).then(() =>
            setDeleting(undefined),
          );
        }}
      >
        <p>Delete {deleting?.name}? Its yearly values will be removed from every insight.</p>
      </ConfirmDialog>
    </section>
  );
}
