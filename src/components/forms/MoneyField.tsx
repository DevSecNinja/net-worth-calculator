import { useEffect, useId, useRef, useState } from 'react';

import { formatEditableMoney, parseLocalizedMoney } from '@/domain/localizedMoney';
import { useLocale } from '@/features/locale/LocaleProvider';

type MoneyFieldProps = {
  label: string;
  value: string;
  currency: string;
  onChange: (canonical: string) => void;
  required?: boolean;
  error?: string;
};

export function MoneyField({
  label,
  value,
  currency,
  onChange,
  required = false,
  error,
}: MoneyFieldProps) {
  const { locale, t, translateError } = useLocale();
  const id = useId().replaceAll(':', '');
  const inputRef = useRef<HTMLInputElement>(null);
  const focused = useRef(false);
  const [draft, setDraft] = useState(() => formatEditableMoney(value, locale, currency));
  const [localError, setLocalError] = useState<string>();
  useEffect(() => {
    if (!focused.current) setDraft(formatEditableMoney(value, locale, currency));
  }, [currency, locale, value]);
  const message = localError ?? error;
  const translatedMessage = message ? translateError(message) : undefined;
  useEffect(() => {
    inputRef.current?.setCustomValidity(translatedMessage ?? '');
  }, [translatedMessage]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <span className="field__description" id={`${id}-currency`}>
        {t('common.currencyContext', { currency })}
      </span>
      <div className="field__control">
        <span className="currency-prefix" aria-hidden="true">
          {currency}
        </span>
        <input
          ref={inputRef}
          id={id}
          inputMode="decimal"
          value={draft}
          aria-invalid={Boolean(message)}
          aria-describedby={`${id}-currency${message ? ` ${id}-error` : ''}`}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setDraft(next);
            try {
              const canonical = parseLocalizedMoney(next, locale, currency);
              onChange(canonical);
              setLocalError(undefined);
            } catch (caught) {
              setLocalError(caught instanceof Error ? caught.message : 'Invalid amount.');
            }
          }}
          onFocus={() => {
            focused.current = true;
          }}
          onBlur={() => {
            try {
              const canonical = parseLocalizedMoney(draft, locale, currency);
              onChange(canonical);
              setDraft(formatEditableMoney(canonical, locale, currency));
              setLocalError(undefined);
            } catch (caught) {
              setLocalError(caught instanceof Error ? caught.message : 'Invalid amount.');
            } finally {
              focused.current = false;
            }
          }}
          required={required}
        />
      </div>
      {message ? (
        <p className="field__error" id={`${id}-error`}>
          {translatedMessage}
        </p>
      ) : null}
    </div>
  );
}
