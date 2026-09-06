import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { useLocale } from '@/features/locale/LocaleProvider';
import { formatMoney } from '@/domain/currency';

export function AboutPage({ currency }: { currency?: string }) {
  const { locale, t } = useLocale();
  const { hash } = useLocation();
  const shortSha = __COMMIT_SHA__ === 'dev' ? 'dev' : __COMMIT_SHA__.slice(0, 7);
  const exampleCurrency =
    currency ?? (locale === 'nl-NL' ? 'EUR' : locale === 'en-GB' ? 'GBP' : 'USD');
  const sourceUrl =
    __COMMIT_SHA__ === 'dev'
      ? __REPOSITORY_URL__
      : `${__REPOSITORY_URL__}/commit/${__COMMIT_SHA__}`;

  useEffect(() => {
    if (hash !== '#methodology') return;
    const heading = document.getElementById('methodology-heading');
    heading?.scrollIntoView?.({ block: 'start' });
    heading?.focus({ preventScroll: true });
  }, [hash]);

  return (
    <main id="main-content" className="page prose-page">
      <p className="eyebrow">{t('about.eyebrow')}</p>
      <h1>{t('about.title')}</h1>
      <p className="lede">{t('about.lede')}</p>
      <section id="methodology" aria-labelledby="methodology-heading">
        <h2 id="methodology-heading" tabIndex={-1}>
          {t('about.methodologyTitle')}
        </h2>
        <p>{t('about.methodologyIntro')}</p>
        <dl className="definition-list">
          <div>
            <dt>{t('about.assetsTitle')}</dt>
            <dd>{t('about.assetsDefinition')}</dd>
          </div>
          <div>
            <dt>{t('about.liabilitiesTitle')}</dt>
            <dd>{t('about.liabilitiesDefinition')}</dd>
          </div>
          <div>
            <dt>{t('about.equityTitle')}</dt>
            <dd>{t('about.equityDefinition')}</dd>
          </div>
        </dl>
        <p className="methodology-equation">
          {t('about.homeExample', {
            home: formatMoney('500000', exampleCurrency, locale),
            mortgage: formatMoney('250000', exampleCurrency, locale),
            equity: formatMoney('250000', exampleCurrency, locale),
          })}
        </p>
        <h3>{t('about.expensesTitle')}</h3>
        <p>{t('about.expensesText')}</p>
        <h3>{t('about.liquidityTitle')}</h3>
        <p>{t('about.liquidityText')}</p>
        <h3>{t('about.valuationTitle')}</h3>
        <p>{t('about.valuationText')}</p>
        <h3>{t('about.cashFlowTitle')}</h3>
        <p>{t('about.cashFlowText')}</p>
        <p>{t('about.cashFlowHeuristic')}</p>
      </section>
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
