'use strict';
const crypto = require('crypto');

// Webhook receiver — verify signatures and route events to handlers

class WebhookHandler {
  constructor(options) {
    options = options || {};
    this.secret = options.secret || null;
    this._handlers = new Map();
    this._middleware = [];
  }

  on(event, fn) {
    if (!this._handlers.has(event)) this._handlers.set(event, []);
    this._handlers.get(event).push(fn);
    return this;
  }

  use(fn) {
    this._middleware.push(fn);
    return this;
  }

  verify(payload, signature) {
    if (!this.secret) return true;
    const expected = 'sha256=' + crypto.createHmac('sha256', this.secret)
      .update(typeof payload === 'string' ? payload : JSON.stringify(payload))
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  async handle(event, payload, signature) {
    if (signature && !this.verify(payload, signature)) {
      throw new Error('Webhook signature verification failed');
    }
    const body = typeof payload === 'string' ? JSON.parse(payload) : payload;
    for (const mw of this._middleware) { await mw(event, body); }
    const handlers = [
      ...(this._handlers.get(event) || []),
      ...(this._handlers.get('*') || []),
    ];
    const results = await Promise.allSettled(handlers.map((h) => h(body)));
    return results.map((r, i) => ({ handler: i, status: r.status, value: r.value || r.reason }));
  }

  removeHandler(event, fn) {
    const list = this._handlers.get(event) || [];
    this._handlers.set(event, list.filter((h) => h !== fn));
    return this;
  }
}

module.exports = WebhookHandler;
