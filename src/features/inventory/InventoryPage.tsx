import { AssetsPanel } from './AssetsPanel';
import { LiabilitiesPanel } from './LiabilitiesPanel';

export function InventoryPage({ kind }: { kind: 'assets' | 'liabilities' }) {
  return (
    <main id="main-content" className="page">
      {kind === 'assets' ? <AssetsPanel /> : <LiabilitiesPanel />}
    </main>
  );
}
