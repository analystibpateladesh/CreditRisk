import type { Borrower, Sector, Region } from "./risk-models";

// Deterministic PRNG so the portfolio is stable across renders / SSR.
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SECTORS: Sector[] = [
  "Manufacturing", "Technology", "Retail", "Real Estate", "Energy",
  "Healthcare", "Financials", "Agriculture", "Transport", "Construction",
];
const REGIONS: Region[] = ["North America", "EMEA", "APAC", "LATAM"];
const COUNTRIES: Record<Region, string[]> = {
  "North America": ["United States", "Canada", "Mexico"],
  EMEA: ["United Kingdom", "Germany", "France", "UAE", "South Africa"],
  APAC: ["India", "Japan", "Singapore", "Australia"],
  LATAM: ["Brazil", "Chile", "Colombia"],
};
const RM_OWNERS = [
  "M. Alvarez", "K. Yamamoto", "S. Patel", "L. Andersen", "D. Okafor",
  "R. Cohen", "J. Martins", "H. Khan", "T. Nakamura", "E. Romano",
];
const NAME_PREFIX = [
  "Aurora", "Northwind", "Helios", "Meridian", "Vanguard", "Cobalt",
  "Pinnacle", "Atlas", "Sterling", "Beacon", "Ironclad", "Solstice",
  "Crestview", "Harbor", "Summit", "Verdant", "Quanta", "Nimbus",
  "Argent", "Bellwether", "Cardinal", "Drayton", "Everline", "Foundry",
];
const NAME_SUFFIX = ["Industries", "Holdings", "Group", "Capital", "Partners", "Logistics", "Energy", "Health", "Systems", "Robotics", "Trading", "Foods"];

export const buildPortfolio = (n = 48): Borrower[] => {
  const rand = mulberry32(42);
  const pick = <T>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const between = (a: number, b: number) => a + rand() * (b - a);

  const list: Borrower[] = [];
  for (let i = 0; i < n; i++) {
    const region = pick(REGIONS);
    const sector = pick(SECTORS);
    const revenue = Math.round(between(8e6, 4.2e9));
    const ebitdaMargin = between(-0.05, 0.32);
    const ebitda = Math.round(revenue * ebitdaMargin);
    const totalAssets = Math.round(revenue * between(0.6, 2.2));
    const totalDebt = Math.round(totalAssets * between(0.15, 0.78));
    const equity = Math.max(0, totalAssets - totalDebt - Math.round(totalAssets * between(0.05, 0.2)));
    const interestExpense = Math.round(totalDebt * between(0.035, 0.095));
    const netIncome = Math.round(ebitda - interestExpense - totalAssets * 0.04);
    const exposure = Math.round(totalDebt * between(0.08, 0.35) + 2e6);
    const collateralCov = between(0.2, 1.4);
    const seniority = pick(["Senior Secured", "Senior Unsecured", "Subordinated"] as const);
    const facility = pick(["Term Loan", "Revolver", "Bond", "Trade Finance"] as const);
    const bureau = Math.round(between(420, 820));
    const util = Math.round(between(5, 92));
    const dpd30 = Math.floor(between(0, bureau < 600 ? 6 : 2.2));
    const dpd90 = Math.floor(between(0, bureau < 550 ? 3 : 1.2));

    const name = `${pick(NAME_PREFIX)} ${pick(NAME_SUFFIX)}`;
    const id = `BRW-${(10000 + i).toString()}`;

    list.push({
      id,
      legalName: name,
      ticker: rand() > 0.55 ? name.split(" ")[0].slice(0, 4).toUpperCase() : undefined,
      sector, region,
      country: pick(COUNTRIES[region]),
      rmOwner: pick(RM_OWNERS),
      onboardedAt: new Date(Date.now() - Math.floor(between(60, 2200)) * 86400000).toISOString().slice(0, 10),
      exposure,
      collateralValue: Math.round(exposure * collateralCov),
      seniority, facilityType: facility,
      tenorMonths: Math.round(between(12, 84)),
      financials: {
        annualRevenue: revenue, ebitda, totalDebt,
        cashAndEquivalents: Math.round(totalAssets * between(0.02, 0.18)),
        currentAssets: Math.round(totalAssets * between(0.2, 0.55)),
        currentLiabilities: Math.round(totalAssets * between(0.1, 0.4)),
        interestExpense, netIncome, totalAssets, totalEquity: equity,
      },
      behavior: {
        utilizationPct: util,
        daysPastDue30Last12m: dpd30,
        daysPastDue90Last24m: dpd90,
        inquiriesLast6m: Math.floor(between(0, 7)),
        accountAgeYears: Math.round(between(0.5, 14)),
        bureauScore: bureau,
      },
    });
  }
  return list;
};

export const portfolio = buildPortfolio();
export const getBorrower = (id: string) => portfolio.find((b) => b.id === id);
