import { useState } from 'react';

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { formatMoney } from '@/domain/currency';
import type { Asset } from '@/domain/model';
import { formatObservationDate } from '@/domain/observations';
import { useVault } from '@/features/vault/useVault';
import { useLocale } from '@/features/locale/LocaleProvider';

import { AssetDialog } from './AssetDialog';
import { deleteAsset, moveAsset, upsertAsset } from './inventory';

export function AssetsPanel() {
  const { vault, mutate, busy } = useVault();
  const [editing, setEditing] = useState<Asset | 'new'>();
  const [deleting, setDeleting] = useState<Asset>();
  const { locale, t } = useLocale();
  if (!vault) return null;
  const assets = vault.assets.toSorted((left, right) => left.order - right.order);

  return (
    <section aria-labelledby="assets-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('inventory.assetsEyebrow')}</p>
          <h1 id="assets-heading">{t('nav.assets')}</h1>
          <p>{t('inventory.assetsHelp')}</p>
        </div>
        <Button type="button" onClick={() => setEditing('new')} disabled={busy}>
          {t('inventory.addAsset')}
        </Button>
      </div>

      {assets.length === 0 ? (
        <div className="empty-state">
          <h2>{t('inventory.noAssets')}</h2>
          <p>{t('inventory.noAssetsHelp')}</p>
          <Button type="button" onClick={() => setEditing('new')} disabled={busy}>
            {t('inventory.firstAsset')}
          </Button>
        </div>
      ) : (
        <div className="item-list">
          {assets.map((asset, index) => {
            const latest = asset.values.toSorted((a, b) => b.date.localeCompare(a.date))[0];
            return (
              <article className="item-card" key={asset.id}>
                <div className="item-card__main">
                  <span className="badge">{asset.classification}</span>
                  <h2>{asset.name}</h2>
                  <p className="muted">
                    {asset.type === 'custom' ? asset.customType : t(`assetType.${asset.type}`)}
                  </p>
                  {latest ? (
                    <p className="item-card__amount">
                      {formatMoney(latest.amount, vault.settings.baseCurrency, locale)}
                      <span>
                        {' '}
                        {t('inventory.onDate', {
                          date: formatObservationDate(latest.date, locale),
                        })}
                      </span>
                    </p>
                  ) : (
                    <p className="muted">{t('common.unavailable')}</p>
                  )}
                </div>
                <div
                  className="item-card__actions"
                  aria-label={t('inventory.actionsFor', { name: asset.name })}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === 0}
                    onClick={() =>
                      void mutate((current) => moveAsset(current, asset.id, -1)).catch(
                        () => undefined,
                      )
                    }
                  >
                    {t('inventory.moveUp')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === assets.length - 1}
                    onClick={() =>
                      void mutate((current) => moveAsset(current, asset.id, 1)).catch(
                        () => undefined,
                      )
                    }
                  >
                    {t('inventory.moveDown')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditing(asset)}
                    disabled={busy}
                  >
                    {t('inventory.edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeleting(asset)}
                    disabled={busy}
                  >
                    {t('inventory.delete')}
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
        busy={busy}
        onClose={() => setEditing(undefined)}
        onSave={(asset) => mutate((current) => upsertAsset(current, asset))}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('inventory.delete')}
        confirmLabel={t('inventory.delete')}
        dangerous
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (!deleting) return;
          void mutate((current) => deleteAsset(current, deleting.id))
            .then(() => setDeleting(undefined))
            .catch(() => undefined);
        }}
      >
        <p>{t('inventory.deleteAssetConfirm', { name: deleting?.name ?? '' })}</p>
      </ConfirmDialog>
    </section>
  );
}
