import { useEffect, useRef } from 'react';

export function ErrorSummary({ errors }: { errors: readonly string[] }) {
  const reference = useRef<HTMLDivElement>(null);
  const signature = errors.join('\u0000');

  useEffect(() => {
    if (signature) reference.current?.focus();
  }, [signature]);

  if (errors.length === 0) return null;
  return (
    <div ref={reference} className="error-summary" role="alert" tabIndex={-1}>
      <strong>Check the form</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
