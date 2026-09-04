import type { Asset, Liability, Vault } from '@/domain/model';
import { nowIso } from '@/domain/model';

function reindex<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, order) => ({ ...item, order }));
}

function normalize<T extends { order: number }>(items: T[]): T[] {
  return reindex(items.toSorted((left, right) => left.order - right.order));
}

export function upsertAsset(vault: Vault, asset: Asset): Vault {
  const exists = vault.assets.some(({ id }) => id === asset.id);
  const assets = exists
    ? vault.assets.map((current) => (current.id === asset.id ? asset : current))
    : [...vault.assets, { ...asset, order: vault.assets.length }];
  return { ...vault, assets: normalize(assets), updatedAt: nowIso() };
}

export function upsertLiability(vault: Vault, liability: Liability): Vault {
  const exists = vault.liabilities.some(({ id }) => id === liability.id);
  const liabilities = exists
    ? vault.liabilities.map((current) => (current.id === liability.id ? liability : current))
    : [...vault.liabilities, { ...liability, order: vault.liabilities.length }];
  return { ...vault, liabilities: normalize(liabilities), updatedAt: nowIso() };
}

export function deleteAsset(vault: Vault, id: string): Vault {
  return {
    ...vault,
    assets: normalize(vault.assets.filter((asset) => asset.id !== id)),
    updatedAt: nowIso(),
  };
}

export function deleteLiability(vault: Vault, id: string): Vault {
  return {
    ...vault,
    liabilities: normalize(vault.liabilities.filter((liability) => liability.id !== id)),
    updatedAt: nowIso(),
  };
}

function move<T extends { id: string; order: number }>(
  items: T[],
  id: string,
  direction: -1 | 1,
): T[] {
  const ordered = normalize(items);
  const index = ordered.findIndex((item) => item.id === id);
  const destination = index + direction;
  if (index < 0 || destination < 0 || destination >= ordered.length) return ordered;
  const copy = [...ordered];
  const [item] = copy.splice(index, 1);
  if (!item) return ordered;
  copy.splice(destination, 0, item);
  return reindex(copy);
}

export function moveAsset(vault: Vault, id: string, direction: -1 | 1): Vault {
  return { ...vault, assets: move(vault.assets, id, direction), updatedAt: nowIso() };
}

export function moveLiability(vault: Vault, id: string, direction: -1 | 1): Vault {
  return { ...vault, liabilities: move(vault.liabilities, id, direction), updatedAt: nowIso() };
}
