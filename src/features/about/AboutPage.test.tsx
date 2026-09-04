import { render, screen } from '@testing-library/react';

import packageMetadata from '../../../package.json';
import { AppFooter } from '@/components/ui/AppFooter';

import { AboutPage } from './AboutPage';

const testCommit = '0123456789abcdef0123456789abcdef01234567';

describe('AboutPage', () => {
  it('states the local-only privacy boundaries and exact package/build identity', () => {
    render(
      <>
        <AboutPage />
        <AppFooter />
      </>,
    );

    expect(screen.getByText(/no account system, database server/i)).toHaveTextContent(
      /analytics, advertising, telemetry, remote fonts, or runtime third-party requests/i,
    );
    expect(screen.getByText(/complete vault is authenticated and encrypted/i)).toHaveTextContent(
      /Cache Storage contains the app shell, never vault data/i,
    );
    expect(screen.getByText(`v${packageMetadata.version}`, { selector: 'strong' })).toBeVisible();

    const buildLinks = screen.getAllByRole('link', {
      name: new RegExp(`${packageMetadata.version}|${testCommit.slice(0, 7)}`),
    });
    expect(buildLinks).toHaveLength(2);
    for (const link of buildLinks) {
      expect(link).toHaveAttribute(
        'href',
        `https://github.com/DevSecNinja/net-worth-calculator/commit/${testCommit}`,
      );
    }
    expect(
      screen.getByText(`v${packageMetadata.version} (${testCommit.slice(0, 7)})`),
    ).toBeVisible();
  });
});
