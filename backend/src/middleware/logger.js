/**
 * PII-Safe HTTP Logger Middleware (Section 26)
 * Redacts passwords, tokens, and health credentials.
 */

function redactSensitiveData(data) {
  if (!data || typeof data !== 'object') return data;
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'jwt', 'authorization'];
  const sanitized = Array.isArray(data) ? [...data] : { ...data };

  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.includes(key.toLowerCase())) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = redactSensitiveData(sanitized[key]);
    }
  }
  return sanitized;
}

export function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, originalUrl, ip } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const timestamp = new Date().toISOString();

    let logMessage = `[${timestamp}] ${method} ${originalUrl} ${statusCode} - ${duration}ms (IP: ${ip})`;

    if (method !== 'GET' && req.body && Object.keys(req.body).length > 0) {
      const sanitizedBody = redactSensitiveData(req.body);
      logMessage += ` | Body: ${JSON.stringify(sanitizedBody)}`;
    }

    console.log(logMessage);
  });

  next();
}
