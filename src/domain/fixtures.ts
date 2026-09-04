import type { Asset, AssetType, Liability, LiabilityType, ValueObservation, Vault } from './model';
import { MAX_YEAR, MIN_YEAR, VAULT_SCHEMA_VERSION, createId, nowIso } from './model';
import { todayLocalIso } from './observations';

export const sampleDataLocales = ['en-US', 'en-GB', 'nl-NL'] as const;
export type SampleDataLocale = (typeof sampleDataLocales)[number];

type SampleLabels = {
  note: string;
  assets: {
    checking: string;
    savings: string;
    fund: string;
    retirement: string;
    property: string;
  };
  liabilities: {
    mortgage: string;
    carLoan: string;
    studentLoan: string;
  };
};

export const sampleDataCatalog: Record<SampleDataLocale, SampleLabels> = {
  'en-US': {
    note: 'Fictional household example. Edit or delete any item.',
    assets: {
      checking: 'Everyday checking',
      savings: 'Emergency savings',
      fund: 'Broad-market index fund',
      retirement: 'Retirement account',
      property: 'Home',
    },
    liabilities: {
      mortgage: 'Home mortgage',
      carLoan: 'Car loan',
      studentLoan: 'Student loan',
    },
  },
  'en-GB': {
    note: 'Fictional household example. Edit or delete any item.',
    assets: {
      checking: 'Everyday current account',
      savings: 'Emergency savings',
      fund: 'Broad-market index fund',
      retirement: 'Pension',
      property: 'Home',
    },
    liabilities: {
      mortgage: 'Mortgage',
      carLoan: 'Car loan',
      studentLoan: 'Student loan',
    },
  },
  'nl-NL': {
    note: 'Fictief huishoudvoorbeeld. Bewerk of verwijder elk item.',
    assets: {
      checking: 'Dagelijkse betaalrekening',
      savings: 'Noodbuffer',
      fund: 'Breed indexfonds',
      retirement: 'Pensioen',
      property: 'Woning',
    },
    liabilities: {
      mortgage: 'Hypotheek',
      carLoan: 'Autolening',
      studentLoan: 'Studieschuld',
    },
  },
};

function observation(date: string, amount: string): ValueObservation {
  return {
    date,
    amount,
    updatedAt: `${date}T12:00:00.000Z`,
  };
}

function yearEnd(year: number): string {
  return `${year}-12-31`;
}

function asset(
  order: number,
  type: AssetType,
  classification: Asset['classification'],
  name: string,
  note: string,
  values: ValueObservation[],
  timestamp: string,
): Asset {
  return {
    id: createId(),
    order,
    classification,
    type,
    name,
    notes: note,
    values,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function liability(
  order: number,
  type: LiabilityType,
  name: string,
  note: string,
  schedule: Pick<
    Liability,
    'principal' | 'annualInterestRate' | 'monthlyPayment' | 'startDate' | 'termMonths'
  >,
  manualBalances: ValueObservation[],
  timestamp: string,
): Liability {
  return {
    id: createId(),
    order,
    type,
    name,
    notes: note,
    ...schedule,
    manualBalances,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createEmptyVault(baseCurrency = 'USD'): Vault {
  const timestamp = nowIso();
  return {
    schemaVersion: VAULT_SCHEMA_VERSION,
    id: createId(),
    revision: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
    settings: {
      baseCurrency,
      createdWithSampleData: false,
    },
    assets: [],
    liabilities: [],
  };
}

export function addSampleData(
  vault: Vault,
  locale: SampleDataLocale = 'en-US',
  referenceDate = new Date(),
): Vault {
  if (vault.assets.length > 0 || vault.liabilities.length > 0) {
    throw new Error('Sample data can only be added to an empty vault.');
  }
  const currentDate = todayLocalIso(referenceDate);
  const currentYear = Number(currentDate.slice(0, 4));
  if (currentYear < MIN_YEAR + 4 || currentYear > MAX_YEAR) {
    throw new Error(
      `Sample data requires a reference year from ${MIN_YEAR + 4} through ${MAX_YEAR}.`,
    );
  }
  const years = [currentYear - 4, currentYear - 3, currentYear - 2, currentYear - 1];
  const [firstYear, secondYear, thirdYear, lastYear] = years as [number, number, number, number];
  const midYearDate = `${lastYear}-07-15`;
  const timestamp = referenceDate.toISOString();
  const labels = sampleDataCatalog[locale];

  const assets = [
    asset(
      0,
      'checking',
      'current',
      labels.assets.checking,
      labels.note,
      [
        observation(yearEnd(firstYear), '3500'),
        observation(yearEnd(secondYear), '4200'),
        observation(yearEnd(thirdYear), '4800'),
        observation(yearEnd(lastYear), '5200'),
        observation(currentDate, '5600'),
      ],
      timestamp,
    ),
    asset(
      1,
      'savings',
      'current',
      labels.assets.savings,
      labels.note,
      [
        observation(yearEnd(firstYear), '10000'),
        observation(yearEnd(secondYear), '13000'),
        observation(yearEnd(thirdYear), '16000'),
        observation(yearEnd(lastYear), '19000'),
        observation(currentDate, '21000'),
      ],
      timestamp,
    ),
    asset(
      2,
      'fund',
      'long-term',
      labels.assets.fund,
      labels.note,
      [
        observation(yearEnd(firstYear), '24000'),
        observation(yearEnd(secondYear), '28500'),
        observation(yearEnd(thirdYear), '27000'),
        observation(midYearDate, '31500'),
        observation(yearEnd(lastYear), '35000'),
        observation(currentDate, '38200'),
      ],
      timestamp,
    ),
    asset(
      3,
      'retirement',
      'long-term',
      labels.assets.retirement,
      labels.note,
      [
        observation(yearEnd(firstYear), '62000'),
        observation(yearEnd(secondYear), '70000'),
        observation(yearEnd(thirdYear), '76000'),
        observation(yearEnd(lastYear), '89000'),
      ],
      timestamp,
    ),
    asset(
      4,
      'property',
      'long-term',
      labels.assets.property,
      labels.note,
      [
        observation(yearEnd(firstYear), '310000'),
        observation(yearEnd(secondYear), '315000'),
        observation(yearEnd(thirdYear), '322000'),
        observation(yearEnd(lastYear), '330000'),
      ],
      timestamp,
    ),
  ];

  const liabilities = [
    liability(
      0,
      'mortgage',
      labels.liabilities.mortgage,
      labels.note,
      {
        principal: '260000',
        annualInterestRate: '3.5',
        monthlyPayment: '1250',
        startDate: `${Math.max(MIN_YEAR, currentYear - 8)}-01-01`,
        termMonths: 360,
      },
      [
        observation(yearEnd(firstYear), '238000'),
        observation(yearEnd(secondYear), '228000'),
        observation(yearEnd(thirdYear), '217000'),
        observation(yearEnd(lastYear), '205000'),
        observation(currentDate, '198000'),
      ],
      timestamp,
    ),
    liability(
      1,
      'vehicle-loan',
      labels.liabilities.carLoan,
      labels.note,
      {
        principal: '22000',
        annualInterestRate: '4.2',
        monthlyPayment: '430',
        startDate: `${currentYear - 3}-01-01`,
        termMonths: 60,
      },
      [
        observation(yearEnd(currentYear - 3), '18000'),
        observation(yearEnd(currentYear - 2), '12500'),
        observation(yearEnd(currentYear - 1), '6500'),
      ],
      timestamp,
    ),
    liability(
      2,
      'student-loan',
      labels.liabilities.studentLoan,
      labels.note,
      {
        principal: '18000',
        annualInterestRate: '4',
        monthlyPayment: '200',
        startDate: `${Math.max(MIN_YEAR, currentYear - 5)}-01-01`,
        termMonths: 120,
      },
      [
        observation(yearEnd(firstYear), '16000'),
        observation(yearEnd(secondYear), '14500'),
        observation(yearEnd(thirdYear), '12750'),
        observation(yearEnd(lastYear), '10900'),
      ],
      timestamp,
    ),
  ];

  return {
    ...vault,
    updatedAt: timestamp,
    settings: { ...vault.settings, createdWithSampleData: true },
    assets,
    liabilities,
  };
}
