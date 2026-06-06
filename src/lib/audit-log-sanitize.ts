const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'refreshtoken',
  'refresh_token',
  'accesstoken',
  'access_token',
  'token',
]);

export const sanitizeAuditData = (data: unknown): unknown => {
  if (data === null || data === undefined) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeAuditData(item));
  }

  if (typeof data === 'object') {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.has(key.toLowerCase())) {
        result[key] = '***REDACTED***';
      } else {
        result[key] = sanitizeAuditData(value);
      }
    }

    return result;
  }

  return data;
};
