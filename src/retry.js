'use strict';

async function withRetry(fn, options) {
  options = options || {};
  const maxAttempts = options.maxAttempts || 3;
  const baseDelay = options.baseDelayMs || 1000;
  const factor = options.factor || 2;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        const delay = baseDelay * Math.pow(factor, attempt - 1);
        const jitter = Math.random() * 200;
        await new Promise((r) => setTimeout(r, delay + jitter));
      }
    }
  }
  throw lastError;
}

module.exports = withRetry;
