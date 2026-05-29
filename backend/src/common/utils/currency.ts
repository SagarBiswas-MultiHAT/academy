export const BDT_TO_USD_RATE = 0.00816473;

const toNumber = (value: number | string) => {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const bdtToUsd = (value: number | string) => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return NaN;
  return amount * BDT_TO_USD_RATE;
};

export const usdToBdt = (value: number | string) => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return NaN;
  return Number((amount / BDT_TO_USD_RATE).toFixed(2));
};

export const formatUsd = (value: number | string) => {
  const amount = toNumber(value);
  if (!Number.isFinite(amount)) return '$0.00';
  return `$${amount.toFixed(2)}`;
};

export const formatUsdFromBdt = (value: number | string) => formatUsd(bdtToUsd(value));
