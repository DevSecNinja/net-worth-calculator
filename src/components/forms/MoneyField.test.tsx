import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider } from '@/features/locale/LocaleProvider';

import { MoneyField } from './MoneyField';

function Harness({ currency = 'USD' }: { currency?: string }) {
  const [value, setValue] = useState('1234.56');
  return (
    <LocaleProvider>
      <MoneyField label="Balance" currency={currency} value={value} onChange={setValue} />
      <output>{value}</output>
    </LocaleProvider>
  );
}

describe('MoneyField', () => {
  it('shows visible and accessible currency context and formats on blur', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const input = screen.getByLabelText('Balance');
    expect(screen.getByText('USD')).toBeVisible();
    expect(input).toHaveAccessibleDescription('Amount in USD');
    await user.clear(input);
    await user.type(input, '2,345.67');
    expect(input).toHaveValue('2,345.67');
    await user.tab();
    expect(screen.getByText('2345.67')).toBeVisible();
    expect(input).toHaveValue('2,345.67');
  });

  it('blocks form submission while the visible draft is malformed', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(
      <LocaleProvider>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <MoneyField label="Balance" currency="USD" value="1" onChange={() => undefined} />
          <button type="submit">Save</button>
        </form>
      </LocaleProvider>,
    );
    const input = screen.getByLabelText('Balance');
    await user.clear(input);
    await user.type(input, '12,34.56');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(submit).not.toHaveBeenCalled();
    expect(input).toBeInvalid();
  });
});
