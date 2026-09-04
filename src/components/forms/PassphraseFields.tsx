import { Field } from './Field';

type PassphraseFieldsProps = {
  passphrase: string;
  confirmation: string;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  error?: string | undefined;
  passphraseLabel?: string | undefined;
};

export function PassphraseFields({
  passphrase,
  confirmation,
  onPassphraseChange,
  onConfirmationChange,
  error,
  passphraseLabel = 'Passphrase',
}: PassphraseFieldsProps) {
  return (
    <>
      <Field
        label={passphraseLabel}
        name="passphrase"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={1024}
        value={passphrase}
        onChange={(event) => onPassphraseChange(event.currentTarget.value)}
        description="Use at least 12 characters. It cannot be recovered."
        error={error}
        required
      />
      <Field
        label="Confirm passphrase"
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={1024}
        value={confirmation}
        onChange={(event) => onConfirmationChange(event.currentTarget.value)}
        required
      />
    </>
  );
}
