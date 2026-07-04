const REQUIRED_PRODUCTION_KEYS = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'AAMARPAY_STORE_ID',
  'AAMARPAY_SIGNATURE_KEY',
  'AAMARPAY_BASE_URL',
  'RESEND_API_KEY',
  'SENDER_EMAIL',
  'FRONTEND_URL',
  'API_URL',
];

const DEFAULT_SECRET_MARKERS = [
  'change-me',
  'super-secret',
  'any-local-secret',
  'any-other-local-secret',
  're_123456789',
  'aamarpaytest',
  'dbb74894e82415a2f7ff0ec3a97e4183',
];

export function validateEnvironment(config: Record<string, unknown>) {
  const nodeEnv = typeof config.NODE_ENV === 'string' ? config.NODE_ENV : 'development';
  if (nodeEnv !== 'production') return config;

  const missing = REQUIRED_PRODUCTION_KEYS.filter((key) => {
    const v = config[key];
    return !String(typeof v === 'string' ? v : '').trim();
  });
  const defaults = REQUIRED_PRODUCTION_KEYS.filter((key) => {
    const v = config[key];
    const value = typeof v === 'string' ? v : '';
    return DEFAULT_SECRET_MARKERS.some((marker) => value.includes(marker));
  });

  if (missing.length || defaults.length) {
    const parts = [
      missing.length ? `missing: ${missing.join(', ')}` : '',
      defaults.length ? `replace default values: ${defaults.join(', ')}` : '',
    ].filter(Boolean);
    throw new Error(`Invalid production environment (${parts.join('; ')})`);
  }

  const apiUrl = String(config.API_URL);
  const frontendUrl = String(config.FRONTEND_URL);
  const gatewayUrl = String(config.AAMARPAY_BASE_URL);
  if (!apiUrl.startsWith('https://') || !frontendUrl.startsWith('https://')) {
    throw new Error('Production API_URL and FRONTEND_URL must use HTTPS');
  }
  if (gatewayUrl !== 'https://secure.aamarpay.com') {
    throw new Error('Production AAMARPAY_BASE_URL must be https://secure.aamarpay.com');
  }

  return config;
}
