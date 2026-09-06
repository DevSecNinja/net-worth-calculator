import { Field } from './Field';
import { useLocale } from '@/features/locale/LocaleProvider';

type PassphraseFieldsProps = {
  passphrase: string;
  confirmation: string;
  onPassphraseChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  error?: string | undefined;
  passphraseLabel?: string | undefined;
  disabled?: boolean | undefined;
};

export function PassphraseFields({
  passphrase,
  confirmation,
  onPassphraseChange,
  onConfirmationChange,
  error,
  passphraseLabel,
  disabled = false,
}: PassphraseFieldsProps) {
  const { t } = useLocale();
  return (
    <>
      <Field
        label={passphraseLabel ?? t('vault.passphrase')}
        name="passphrase"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={1024}
        value={passphrase}
        onChange={(event) => onPassphraseChange(event.currentTarget.value)}
        description={t('vault.passphraseHelp')}
        error={error}
        disabled={disabled}
        required
      />
      <Field
        label={t('vault.confirmPassphrase')}
        name="confirmation"
        type="password"
        autoComplete="new-password"
        minLength={12}
        maxLength={1024}
        value={confirmation}
        onChange={(event) => onConfirmationChange(event.currentTarget.value)}
        disabled={disabled}
        required
      />
    </>
  );
}
