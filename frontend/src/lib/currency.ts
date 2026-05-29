const DEFAULT_BDT_TO_USD_RATE = 0.00816473;

const parsedRate = Number(process.env.NEXT_PUBLIC_BDT_TO_USD_RATE ?? DEFAULT_BDT_TO_USD_RATE.toString());

export const BDT_TO_USD_RATE = Number.isFinite(parsedRate) && parsedRate > 0
  ? parsedRate
  : DEFAULT_BDT_TO_USD_RATE;

export const GOOGLE_DORKS_BASE_PRICE_USD = 5;
export const GOOGLE_DORKS_PRINTABLE_ADDON_USD = 10;

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const toNumber = (value: number | string) => {
  const parsed = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const bdtToUsdAmount = (value: number | string) => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return NaN;
  return amount * BDT_TO_USD_RATE;
};

export const usdToBdtAmount = (value: number | string) => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return NaN;
  return Number((amount / BDT_TO_USD_RATE).toFixed(2));
};

export const formatUsd = (value: number | string) => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return "$0.00";
  return usdFormatter.format(amount);
};

export const formatUsdFromBdt = (value: number | string) => {
  const usd = bdtToUsdAmount(value);
  if (!Number.isFinite(usd)) return "$0.00";
  return formatUsd(usd);
};
