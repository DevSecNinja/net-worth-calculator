import { useState } from 'react';

import { ConfirmDialog } from '@/components/dialogs/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { projectLiability } from '@/domain/amortization';
import { formatMoney } from '@/domain/currency';
import type { Liability } from '@/domain/model';
import { useVault } from '@/features/vault/useVault';

import { deleteLiability, moveLiability, upsertLiability } from './inventory';
import { LiabilityDialog } from './LiabilityDialog';

export function LiabilitiesPanel() {
  const { vault, mutate, busy } = useVault();
  const [editing, setEditing] = useState<Liability | 'new'>();
  const [deleting, setDeleting] = useState<Liability>();
  if (!vault) return null;
  const liabilities = vault.liabilities.toSorted((left, right) => left.order - right.order);
  const currentYear = new Date().getFullYear();

  return (
    <section aria-labelledby="liabilities-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">What you owe</p>
          <h1 id="liabilities-heading">Liabilities</h1>
          <p>Actual December 31 balances override clearly labeled monthly projections.</p>
        </div>
        <Button type="button" onClick={() => setEditing('new')}>
          Add liability
        </Button>
      </div>

      {liabilities.length === 0 ? (
        <div className="empty-state">
          <h2>No liabilities yet</h2>
          <p>Add a mortgage, card, loan, tax debt, or custom liability.</p>
          <Button type="button" onClick={() => setEditing('new')}>
            Add your first liability
          </Button>
        </div>
      ) : (
        <div className="item-list">
          {liabilities.map((liability, index) => {
            const projection = projectLiability(liability, {
              startYear: currentYear,
              endYear: currentYear,
            })[0];
            return (
              <article className="item-card" key={liability.id}>
                <div className="item-card__main">
                  <span className={`badge badge--${projection?.status ?? 'projected'}`}>
                    {projection?.status ?? 'projected'}
                  </span>
                  <h2>{liability.name}</h2>
                  <p className="muted">
                    {liability.type === 'custom'
                      ? liability.customType
                      : liability.type.replaceAll('-', ' ')}
                  </p>
                  <p className="item-card__amount">
                    {formatMoney(
                      projection?.amount ?? liability.principal,
                      vault.settings.baseCurrency,
                      vault.settings.locale,
                    )}
                    <span> at year end</span>
                  </p>
                </div>
                <div className="item-card__actions" aria-label={`Actions for ${liability.name}`}>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === 0}
                    onClick={() =>
                      void mutate((current) => moveLiability(current, liability.id, -1))
                    }
                  >
                    Move up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy || index === liabilities.length - 1}
                    onClick={() =>
                      void mutate((current) => moveLiability(current, liability.id, 1))
                    }
                  >
                    Move down
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditing(liability)}>
                    Edit
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setDeleting(liability)}>
                    Delete
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
        onClose={() => setEditing(undefined)}
        onSave={(liability) => mutate((current) => upsertLiability(current, liability))}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete liability"
        confirmLabel="Delete liability"
        dangerous
        onClose={() => setDeleting(undefined)}
        onConfirm={() => {
          if (!deleting) return;
          void mutate((current) => deleteLiability(current, deleting.id)).then(() =>
            setDeleting(undefined),
          );
        }}
      >
        <p>Delete {deleting?.name}? Its actual balances and projections will be removed.</p>
      </ConfirmDialog>
    </section>
  );
}
