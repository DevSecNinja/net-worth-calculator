import { useLocale } from '@/features/locale/LocaleProvider';

export function AboutPage() {
  const { t } = useLocale();
  const shortSha = __COMMIT_SHA__ === 'dev' ? 'dev' : __COMMIT_SHA__.slice(0, 7);
  const sourceUrl =
    __COMMIT_SHA__ === 'dev'
      ? __REPOSITORY_URL__
      : `${__REPOSITORY_URL__}/commit/${__COMMIT_SHA__}`;

  return (
    <main id="main-content" className="page prose-page">
      <p className="eyebrow">{t('about.eyebrow')}</p>
      <h1>{t('about.title')}</h1>
      <p className="lede">{t('about.lede')}</p>
      <section>
        <h2>{t('about.privacyTitle')}</h2>
        <p>{t('about.privacyText')}</p>
      </section>
      <section>
        <h2>{t('about.limitationsTitle')}</h2>
        <ul>
          <li>{t('about.noReset')}</li>
          <li>{t('about.clearData')}</li>
          <li>{t('about.compromised')}</li>
          <li>{t('about.notAdvice')}</li>
          <li>{t('about.noMarket')}</li>
        </ul>
      </section>
      <section>
        <h2>{t('about.buildTitle')}</h2>
        <p>
          {t('about.buildText', { version: __APP_VERSION__, build: shortSha })}{' '}
          <a href={sourceUrl} rel="noreferrer">
            {shortSha}
          </a>
        </p>
      </section>
      <section>
        <h2>{t('about.sourceTitle')}</h2>
        <p>
          <a href={__REPOSITORY_URL__}>{t('about.sourceText')}</a>
        </p>
      </section>
    </main>
  );
}
