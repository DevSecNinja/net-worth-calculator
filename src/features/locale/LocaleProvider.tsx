import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { catalogs, supportedLocales, type MessageKey, type SupportedLocale } from './catalog';

const LOCALE_KEY = 'nwc-locale';
const storageAccessErrors = new Set(['QuotaExceededError', 'SecurityError']);

function isStorageAccessError(error: unknown): boolean {
  return error instanceof DOMException && storageAccessErrors.has(error.name);
}

export function negotiateLocale(languages: readonly string[]): SupportedLocale {
  for (const language of languages) {
    const normalized = language.toLowerCase();
    if (normalized.startsWith('nl')) return 'nl-NL';
    if (normalized === 'en-gb' || normalized.startsWith('en-gb-')) return 'en-GB';
    if (normalized.startsWith('en')) return 'en-US';
  }
  return 'en-US';
}

function storedLocale(): SupportedLocale | undefined {
  try {
    const value = localStorage.getItem(LOCALE_KEY);
    return supportedLocales.find((locale) => locale === value);
  } catch (error) {
    if (isStorageAccessError(error)) return undefined;
    throw error;
  }
}

type LocaleContextValue = {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: MessageKey, variables?: Record<string, string | number>) => string;
  translateError: (message: string) => string;
};

function translate(
  locale: SupportedLocale,
  key: MessageKey,
  variables: Record<string, string | number> = {},
): string {
  return Object.entries(variables).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    catalogs[locale][key],
  );
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en-US',
  setLocale: () => undefined,
  t: (key, variables) => translate('en-US', key, variables),
  translateError: (message) => message,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<SupportedLocale>(
    () => storedLocale() ?? negotiateLocale(navigator.languages),
  );
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setLocale = useCallback((next: SupportedLocale) => {
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch (error) {
      if (!isStorageAccessError(error)) throw error;
    }
    updateLocale(next);
  }, []);
  const t = useCallback(
    (key: MessageKey, variables: Record<string, string | number> = {}) =>
      translate(locale, key, variables),
    [locale],
  );
  const translateError = useCallback(
    (message: string) => {
      if (/name is required/i.test(message)) return t('error.nameRequired');
      if (/at least 12|between 12/i.test(message)) return t('error.passphraseLength');
      if (/passphrases do not match/i.test(message)) return t('error.passphraseMismatch');
      if (/amount|fraction digits|grouping separators|decimal amount/i.test(message)) {
        return t('error.invalidAmount');
      }
      if (/annual rate/i.test(message)) return t('error.invalidRate');
      if (
        /\b(?:asset observation |manual balance |observation )?date must be unique\b/i.test(message)
      ) {
        return t('error.duplicateDate');
      }
      if (/monthly payment must be greater/i.test(message)) return t('error.paymentRequired');
      if (/type DELETE exactly/i.test(message)) return t('error.typeDelete');
      if (/type REPLACE exactly/i.test(message)) return t('error.typeReplace');
      if (/passphrase is incorrect|cannot be authenticated/i.test(message)) {
        return t('error.authentication');
      }
      if (/no vault exists|stored vault no longer exists/i.test(message)) return t('error.noVault');
      if (/vault already exists/i.test(message)) return t('error.vaultExists');
      if (/already unlocked in another tab|writable vault session was lost/i.test(message)) {
        return t('error.otherTab');
      }
      if (/vault changed|encrypted vault changed|another vault change/i.test(message)) {
        return t('error.conflict');
      }
      if (/10 MiB|supported local backup size/i.test(message)) return t('error.backupSize');
      if (/cancelled/i.test(message)) return t('error.cancelled');
      if (/backup|unsupported version/i.test(message)) return t('error.backup');
      return message;
    },
    [t],
  );
  const value = useMemo(
    () => ({ locale, setLocale, t, translateError }),
    [locale, setLocale, t, translateError],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

export const localeStorageKey = LOCALE_KEY;
