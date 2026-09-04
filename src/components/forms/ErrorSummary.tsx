export function ErrorSummary({ errors }: { errors: readonly string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="error-summary" role="alert" tabIndex={-1}>
      <strong>Check the form</strong>
      <ul>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
