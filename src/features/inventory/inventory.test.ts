import { asset, liability, vault } from '../../../tests/fixtures/vault';
import {
  deleteAsset,
  deleteLiability,
  moveAsset,
  moveLiability,
  upsertAsset,
  upsertLiability,
} from './inventory';

describe('inventory commands', () => {
  it('adds, edits, moves, and deletes assets with dense ordering', () => {
    const first = asset({ order: 0, name: 'First' });
    const second = asset({ order: 1, name: 'Second' });
    let current = upsertAsset(vault(), first);
    current = upsertAsset(current, second);
    current = moveAsset(current, second.id, -1);
    expect(current.assets.map(({ name, order }) => ({ name, order }))).toEqual([
      { name: 'Second', order: 0 },
      { name: 'First', order: 1 },
    ]);
    current = upsertAsset(current, { ...first, name: 'Edited' });
    expect(current.assets.find(({ id }) => id === first.id)?.name).toBe('Edited');
    current = deleteAsset(current, second.id);
    expect(current.assets).toHaveLength(1);
    expect(current.assets[0]?.order).toBe(0);
  });

  it('adds, moves, and deletes liabilities with dense ordering', () => {
    const first = liability({ order: 0, name: 'First' });
    const second = liability({ order: 1, name: 'Second' });
    let current = upsertLiability(vault(), first);
    current = upsertLiability(current, second);
    current = moveLiability(current, second.id, -1);
    expect(current.liabilities[0]?.name).toBe('Second');
    current = deleteLiability(current, second.id);
    expect(current.liabilities).toEqual([{ ...first, order: 0 }]);
  });
});
