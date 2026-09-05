import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { ValueObservation } from '@/domain/model';
import { LocaleProvider } from '@/features/locale/LocaleProvider';

import { YearValuesEditor } from './YearValuesEditor';

function Harness() {
  const [values, setValues] = useState<ValueObservation[]>([
    { date: '2026-12-31', amount: '100', updatedAt: '2026-01-01T00:00:00.000Z' },
  ]);
  return (
    <LocaleProvider>
      <YearValuesEditor label="Values" currency="USD" values={values} onChange={setValues} />
    </LocaleProvider>
  );
}

describe('YearValuesEditor', () => {
  it('keeps the editable date input mounted and focused while typing', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const date = screen.getByLabelText('Date');
    await user.clear(date);
    await user.type(date, '2030-07-15');
    expect(date).toHaveValue('2030-07-15');
    expect(date).toHaveFocus();
  });
});
