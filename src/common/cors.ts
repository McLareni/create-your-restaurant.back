export const getAllowedCorsOrigins = () => {
  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== 'production') {
    configuredOrigins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return [...new Set(configuredOrigins)];
};
