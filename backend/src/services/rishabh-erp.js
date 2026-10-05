const { AppError } = require('../lib/errors');
class RishabhErpClient {
  constructor(config) { this.config = config; }
  assertConfigured() { if (!this.config.ERP_ENABLED || !this.config.ERP_BASE_URL) throw new AppError(503, 'ERP_NOT_CONFIGURED', 'Rishabh ERP API contract is not configured'); }
  async request(path, options = {}) {
    this.assertConfigured();
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.config.ERP_TIMEOUT_MS);
    try {
      const response = await fetch(new URL(path, this.config.ERP_BASE_URL), { ...options, signal: controller.signal, headers: { 'content-type': 'application/json', [this.config.ERP_AUTH_HEADER]: this.config.ERP_AUTH_TOKEN || '', ...options.headers } });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new AppError(502, 'ERP_REQUEST_FAILED', `ERP returned ${response.status}`, body);
      return body;
    } finally { clearTimeout(timer); }
  }
  getProducts(cursor) { const path = `${this.config.ERP_PRODUCTS_PATH}${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`; return this.request(path); }
  getStock() { return this.request(this.config.ERP_STOCK_PATH); }
  pushOrder(order) {
    // Final field names must be confirmed against Rishabh Group India's API contract.
    const payload = { externalOrderNo: order.orderNumber, orderDate: order.createdAt, customer: { name: order.shippingAddress.fullName, mobile: order.shippingAddress.phone, email: order.shippingAddress.email }, shippingAddress: order.shippingAddress, items: order.items.map((i) => ({ sku: i.sku, quantity: i.quantity, rate: i.unitPrice, gstRate: i.gstRate })), totals: order.amounts, paymentMode: order.payment.method };
    return this.request(this.config.ERP_ORDERS_PATH, { method: 'POST', body: JSON.stringify(payload), headers: { 'Idempotency-Key': order.orderNumber } });
  }
}
module.exports = { RishabhErpClient };
