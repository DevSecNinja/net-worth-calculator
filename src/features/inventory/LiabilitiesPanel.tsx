import { useState } from 'react';

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { projectLiability } from '@/domain/amortization';
import { formatMoney } from '@/domain/currency';
import type { Liability } from '@/domain/model';
import { useVault } from '@/features/vault/useVault';
import { useLocale } from '@/features/locale/LocaleProvider';

import { deleteLiability, moveLiability, upsertLiability } from './inventory';
import { LiabilityDialog } from './LiabilityDialog';

export function LiabilitiesPanel() {
  const { vault, mutate, busy } = useVault();
  const [editing, setEditing] = useState<Liability | 'new'>();
  const [deleting, setDeleting] = useState<Liability>();
  const { locale, t } = useLocale();
  if (!vault) return null;
  const liabilities = vault.liabilities.toSorted((left, right) => left.order - right.order);
  const currentYear = new Date().getFullYear();

  return (
    <section aria-labelledby="liabilities-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{t('inventory.liabilitiesEyebrow')}</p>
          <h1 id="liabilities-heading">{t('nav.liabilities')}</h1>
          <p>{t('inventory.liabilitiesHelp')}</p>
        </div>
        <Button type="button" onClick={() => setEditing('new')} disabled={busy}>
          {t('inventory.addLiability')}
        </Button>
      </div>

      {liabilities.length === 0 ? (
        <div className="empty-state">
          <h2>{t('inventory.noLiabilities')}</h2>
          <p>{t('inventory.noLiabilitiesHelp')}</p>
          <Button type="button" onClick={() => setEditing('new')} disabled={busy}>
            {t('inventory.firstLiability')}
          </Button>
        </div>
      ) : (
        <div className="item-list">
          {liabilities.map((liability, index) => {
            const projection = projectLiability(liability, {
              startYear: currentYear,
              endYear: currentYear,
            })[0];
            const projectionStatus = projection?.status ?? 'projected';
            const statusLabel =
              projectionStatus === 'paid-off'
                ? t('common.paidOff')
                : projectionStatus === 'non-amortizing'
                  ? t('common.nonAmortizing')
                  : projectionStatus === 'invalid'
                    ? t('common.invalid')
                    : projectionStatus === 'actual'
                      ? t('common.actual')
                      : t('common.projected');
            return (
              <article className="item-card" key={liability.id}>
                <div className="item-card__main">
                  <span className={`badge badge--${projectionStatus}`}>{statusLabel}</span>
                  <h2>{liability.name}</h2>
                  <p className="muted">
                    {liability.type === 'custom'
                      ? liability.customType
                      : t(`liabilityType.${liability.type}`)}
                  </p>
                  <p className="item-card__amount">
                    {formatMoney(
                      projection?.amount ?? liability.principal,
                      vault.settings.baseCurrency,
                      locale,
                    )}
                    <span> {t('inventory.atYearEnd')}</span>
                  </p>
                </div>
                <div
                  className="item-card__actions"
                  aria-label={t('inventory.actionsFor', { name: liability.name })}
                >
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === 0}
                    onClick={() =>
                      void mutate((current) => moveLiability(current, liability.id, -1)).catch(
                        () => undefined,
                      )
                    }
                  >
                    {t('inventory.moveUp')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === liabilities.length - 1}
                    onClick={() =>
                      void mutate((current) => moveLiability(current, liability.id, 1)).catch(
                        () => undefined,
                      )
                    }
                  >
                    {t('inventory.moveDown')}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditing(liability)}
                    disabled={busy}
                  >
                    {t('inventory.edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDeleting(liability)}
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

      <LiabilityDialog
        open={Boolean(editing)}
        liability={editing === 'new' ? undefined : editing}
        order={liabilities.length}
        currency={vault.settings.baseCurrency}
        busy={busy}
        onClose={() => setEditing(undefined)}
        onSave={(liability) => mutate((current) => upsertLiability(current, liability))}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title={t('inventory.delete')}
        confirmLabel={t('inventory.delete')}
        dangerous
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (!deleting) return;
          void mutate((current) => deleteLiability(current, deleting.id))
            .then(() => setDeleting(undefined))
            .catch(() => undefined);
        }}
      >
        <p>{t('inventory.deleteLiabilityConfirm', { name: deleting?.name ?? '' })}</p>
      </ConfirmDialog>
    </section>
  );
}
