const { AppError } = require('../lib/errors');
class ShiprocketClient {
  constructor(config) { this.config = config; this.token = null; this.tokenUntil = 0; }
  async authenticate() {
    if (!this.config.SHIPROCKET_EMAIL || !this.config.SHIPROCKET_PASSWORD) throw new AppError(503, 'SHIPPING_NOT_CONFIGURED', 'Shiprocket is not configured');
    if (this.token && Date.now() < this.tokenUntil) return this.token;
    const r = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: this.config.SHIPROCKET_EMAIL, password: this.config.SHIPROCKET_PASSWORD }) });
    if (!r.ok) throw new AppError(502, 'SHIPROCKET_AUTH_FAILED', 'Shiprocket authentication failed');
    this.token = (await r.json()).token; this.tokenUntil = Date.now() + 9 * 86400000; return this.token;
  }
  async request(path, options = {}) { const token = await this.authenticate(); const r = await fetch(`https://apiv2.shiprocket.in/v1/external${path}`, { ...options, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...options.headers } }); const body = await r.json().catch(() => null); if (!r.ok) throw new AppError(502, 'SHIPROCKET_ERROR', 'Shiprocket request failed', body); return body; }
  createOrder(order) { const a = order.shippingAddress; return this.request('/orders/create/adhoc', { method: 'POST', body: JSON.stringify({ order_id: order.orderNumber, order_date: order.createdAt.toISOString().slice(0, 16).replace('T',' '), pickup_location: this.config.SHIPROCKET_PICKUP_LOCATION, billing_customer_name: a.fullName, billing_last_name: '', billing_address: a.line1, billing_address_2: a.line2 || '', billing_city: a.city, billing_pincode: a.pincode, billing_state: a.state, billing_country: 'India', billing_email: a.email, billing_phone: a.phone, shipping_is_billing: true, order_items: order.items.map((i) => ({ name: i.name, sku: i.sku, units: i.quantity, selling_price: i.unitPrice, hsn: '' })), payment_method: order.payment.method === 'cod' ? 'COD' : 'Prepaid', sub_total: order.amounts.total, length: 30, breadth: 25, height: 5, weight: order.items.reduce((s,i) => s + i.quantity * 0.5, 0) }) }); }
}
module.exports = { ShiprocketClient };
