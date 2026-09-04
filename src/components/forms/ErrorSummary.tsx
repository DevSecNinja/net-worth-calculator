import { useEffect, useRef } from 'react';

import { useLocale } from '@/features/locale/LocaleProvider';

export function ErrorSummary({ errors }: { errors: readonly string[] }) {
  const { t, translateError } = useLocale();
  const reference = useRef<HTMLDivElement>(null);
  const signature = errors.join('\u0000');

  useEffect(() => {
    if (signature) reference.current?.focus();
  }, [signature]);

  if (errors.length === 0) return null;
  return (
    <div ref={reference} className="error-summary" role="alert" tabIndex={-1}>
      <strong>{t('form.check')}</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{translateError(error)}</li>
        ))}
      </ul>
    </div>
  );
}
