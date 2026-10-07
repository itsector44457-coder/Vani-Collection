'use strict';

/**
 * GST tax invoice and packing slip rendering, with pdfkit.
 *
 * No headless browser and no HTML-to-PDF step: the document is drawn directly, which keeps the
 * output byte-stable, dependency-light and fast enough to generate inside a request.
 *
 * Two things worth knowing before editing this:
 *
 * 1. **GST here is inclusive.** `items[].taxAmount` is extracted from the line price with
 *    `rate / (100 + rate)` when the order is placed, so `taxableValue = lineTotal − taxAmount` and
 *    the invoice presents tax as included, not added on top. This matches
 *    `GET /api/admin/reports/gst`, which does the same subtraction.
 *
 * 2. **The default font cannot print ₹.** pdfkit's built-in Helvetica is a base-14 font in
 *    WinAnsiEncoding, which has no U+20B9 — and rather than failing it silently emits byte 0xB9,
 *    which is `¹`. So `₹1,23,456` would print as `¹1,23,456` on a legal tax document. The default
 *    output therefore writes `Rs.` and needs no font file at all. Set `INVOICE_FONT_PATH` (and
 *    optionally `INVOICE_FONT_BOLD_PATH`) to TrueType fonts carrying the glyph and the renderer
 *    switches to `₹` automatically. The symbol is always chosen from the font actually loaded, so a
 *    document can never claim a glyph it cannot draw.
 */

const fs = require('fs');
const PDFDocument = require('pdfkit');

/* ------------------------------------------------------------------ palette */

const INK = '#14100f';
const MUTED = '#6b6560';
const LINE = '#d9d2c8';
const HAIRLINE = '#ece6dd';
const SOFT = '#faf7f2';
const ROSE = '#881337';
const GOLD = '#8a6d2f';

const PAGE_MARGIN = 34;
const PAGE_OPTIONS = { size: 'A4', margin: PAGE_MARGIN, bufferPages: true };

/* ------------------------------------------------------------------ numbers */

const round2 = (value) => Math.round((Number(value) || 0) * 100) / 100;

/** Indian digit grouping: 100000 → 1,00,000 (not 100,000). */
function groupIndian(integers) {
  const digits = String(integers);
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}`;
}

/**
 * Formats an amount for the document.
 *
 * `symbol` comes from the caller, which takes it from the font actually loaded — see note 2 above.
 */
function money(value, symbol) {
  const amount = round2(value);
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const integers = Math.floor(abs);
  const paise = Math.round((abs - integers) * 100);
  const body = paise > 0 ? `${groupIndian(integers)}.${String(paise).padStart(2, '0')}` : groupIndian(integers);
  return `${negative ? '-' : ''}${symbol}${body}`;
}

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** 0–999 in words. */
function underThousand(value) {
  const parts = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest >= 20) {
    parts.push(TENS[Math.floor(rest / 10)]);
    if (rest % 10) parts.push(ONES[rest % 10]);
  } else if (rest > 0) {
    parts.push(ONES[rest]);
  }
  return parts.join(' ');
}

/**
 * Integer to words in the Indian numbering system (lakh / crore), which is what an Indian invoice is
 * read against — "Twelve Lakh Thirty Four Thousand", not "One Million Two Hundred…".
 * Recursive per group, so arbitrarily large amounts still read correctly.
 */
function indianWords(value) {
  const n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return '';
  const parts = [];
  let rest = n;
  for (const [size, label] of [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']]) {
    const count = Math.floor(rest / size);
    if (count > 0) {
      parts.push(`${count < 1000 ? underThousand(count) : indianWords(count)} ${label}`);
      rest %= size;
    }
  }
  if (rest > 0) parts.push(underThousand(rest));
  return parts.join(' ');
}

/**
 * "Total amount in words", mandatory on a GST invoice.
 * Rupees and paise are spelled out separately; paise is omitted for a whole amount.
 */
function amountInWords(value) {
  const amount = round2(value);
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  const rupeeWords = rupees === 0 ? '' : indianWords(rupees);
  const paiseWords = paise === 0
    ? ''
    : paise < 20 ? ONES[paise] : `${TENS[Math.floor(paise / 10)]}${paise % 10 ? ` ${ONES[paise % 10]}` : ''}`;
  if (!rupeeWords && !paiseWords) return 'Zero Rupees Only';
  if (!rupeeWords) return `${paiseWords} Paise Only`;
  // "One Rupee", not "One Rupees" — this line is read aloud by accountants.
  return `${rupeeWords} ${rupees === 1 ? 'Rupee' : 'Rupees'}${paiseWords ? ` and ${paiseWords} Paise` : ''} Only`;
}

/* -------------------------------------------------------------- GST geometry */

/** Indian state name → the two-digit code used in a GSTIN and as the place-of-supply code. */
const STATE_CODES = {
  'jammu & kashmir': '01', 'jammu and kashmir': '01', 'himachal pradesh': '02', punjab: '03',
  chandigarh: '04', uttarakhand: '05', uttranchal: '05', haryana: '06', delhi: '07',
  'new delhi': '07', rajasthan: '08', 'uttar pradesh': '09', bihar: '10', sikkim: '11',
  'arunachal pradesh': '12', nagaland: '13', manipur: '14', mizoram: '15', tripura: '16',
  meghalaya: '17', assam: '18', 'west bengal': '19', jharkhand: '20', odisha: '21',
  orissa: '21', chhattisgarh: '22', chattisgarh: '22', 'madhya pradesh': '23', gujarat: '24',
  'dadra & nagar haveli and daman & diu': '26', 'dadra and nagar haveli and daman and diu': '26',
  maharashtra: '27', karnataka: '29', goa: '30', lakshadweep: '31', kerala: '32',
  'tamil nadu': '33', puducherry: '34', pondicherry: '34', 'andaman & nicobar islands': '35',
  'andaman and nicobar islands': '35', telangana: '36', 'andhra pradesh': '37', ladakh: '38',
};

const normaliseState = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

/** Two-digit place-of-supply code for an address, or null when it cannot be determined. */
function stateCodeFor(address) {
  const name = normaliseState(address && address.state);
  return name ? STATE_CODES[name] || null : null;
}

/**
 * Intra-state (CGST + SGST, split evenly) or inter-state (IGST).
 *
 * When the ship-to state cannot be matched we assume inter-state: a seller in one state shipping
 * nationwide is overwhelmingly crossing a border, and IGST is fully creditable so the buyer is not
 * worse off. The document prints both the place of supply and the supply type — and marks an
 * undetermined one as assumed — so a person can verify and correct it rather than trusting a guess
 * that is invisible.
 */
function supplyType(seller, shippingAddress) {
  const sellerCode = seller.stateCode || null;
  const shipCode = stateCodeFor(shippingAddress);
  if (sellerCode && shipCode && sellerCode === shipCode) {
    return { type: 'intra', label: 'Intra-State', shipCode, sellerCode, determined: true };
  }
  return { type: 'inter', label: 'Inter-State', shipCode, sellerCode, determined: Boolean(sellerCode && shipCode) };
}

/**
 * Groups the order's lines by GST rate into the slab table GSTN expects.
 *
 * Built from the order snapshot's own `gstRate`/`taxAmount`, so the invoice always agrees with what
 * was actually charged rather than with today's product master.
 */
function gstSlabs(order, supply) {
  const byRate = new Map();
  for (const item of order.items || []) {
    const rate = Number(item.gstRate) || 0;
    const lineTotal = round2(item.lineTotal ?? (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0));
    const tax = round2(item.taxAmount ?? 0);
    const row = byRate.get(rate) || { rate, taxableValue: 0, tax: 0, quantity: 0, hsn: new Set() };
    row.taxableValue = round2(row.taxableValue + (lineTotal - tax));
    row.tax = round2(row.tax + tax);
    row.quantity += Number(item.quantity) || 0;
    if (item.hsnCode) row.hsn.add(String(item.hsnCode));
    byRate.set(rate, row);
  }
  const intra = supply.type === 'intra';
  return [...byRate.values()].sort((a, b) => a.rate - b.rate).map((row) => ({
    rate: row.rate,
    quantity: row.quantity,
    taxableValue: row.taxableValue,
    tax: row.tax,
    cgst: intra ? round2(row.tax / 2) : 0,
    sgst: intra ? round2(row.tax / 2) : 0,
    igst: intra ? 0 : row.tax,
    hsn: new Set(),
  }));
}

/**
 * Same as `gstSlabs` but also collects the HSN codes seen at each rate. Kept separate from the
 * arithmetic above so the numbers can be unit-tested without touching HSN plumbing.
 */
function gstSlabsWithHsn(order, supply, hsnBySku = {}) {
  const slabs = gstSlabs(order, supply);
  for (const item of order.items || []) {
    const rate = Number(item.gstRate) || 0;
    const slab = slabs.find((row) => row.rate === rate);
    const hsn = item.hsnCode || hsnBySku[item.sku];
    if (slab && hsn) slab.hsn.add(String(hsn));
  }
  return slabs.map((slab) => ({ ...slab, hsn: slab.hsn.size ? [...slab.hsn].sort().join(', ') : '—' }));
}

/** Headline totals from the order snapshot, with the item lines kept as a tie-out check. */
function invoiceTotals(order) {
  const amounts = order.amounts || {};
  const items = order.items || [];
  const lineTotal = round2(items.reduce((sum, item) => sum + round2(item.lineTotal ?? 0), 0));
  const itemTax = round2(items.reduce((sum, item) => sum + round2(item.taxAmount ?? 0), 0));
  return {
    subtotal: round2(amounts.subtotal ?? lineTotal),
    discount: round2(amounts.discount ?? 0),
    shipping: round2(amounts.shipping ?? 0),
    tax: round2(amounts.tax ?? itemTax),
    total: round2(amounts.total ?? 0),
    lineTotal,
    itemTax,
    taxableValue: round2(lineTotal - itemTax),
    currency: amounts.currency || 'INR',
  };
}

/* ------------------------------------------------------------------- fonts */

const readFont = (path) => {
  if (!path) return null;
  try {
    if (!fs.existsSync(path)) return null;
    // Read once and hand pdfkit the buffer, so a font file that disappears later cannot break a
    // subsequent invoice mid-stream.
    return fs.readFileSync(path);
  } catch {
    return null;
  }
};

/**
 * Picks the font stack **and the currency symbol that goes with it**.
 *
 * The symbol is derived from what will actually render, never from what we would like to print — a
 * document showing `¹` where a rupee sign belongs is worse than one that says `Rs.`.
 */
function fontStack(seller) {
  const body = readFont(seller.fontPath);
  if (!body) {
    return { embedded: false, symbol: 'Rs. ', body: 'Helvetica', bold: 'Helvetica-Bold', italic: 'Helvetica-Oblique' };
  }
  const bold = readFont(seller.fontBoldPath);
  return {
    embedded: true,
    symbol: '\u20B9',
    body,
    bold: bold || body,
    // pdfkit cannot synthesise an oblique from a TTF, so the regular face stands in.
    italic: body,
  };
}

/* ------------------------------------------------------------------ drawing */

function makeDoc(fonts, title) {
  const doc = new PDFDocument({ ...PAGE_OPTIONS, info: { Title: title, Author: 'Vani Collection' } });
  if (fonts.embedded) {
    doc.registerFont('InvoiceBody', fonts.body);
    doc.registerFont('InvoiceBold', fonts.bold);
    doc.registerFont('InvoiceItalic', fonts.italic);
  }
  return doc;
}

/** Resolves a face name against the loaded stack. */
const face = (fonts, which) => {
  if (!fonts.embedded) return fonts[which] || fonts.body;
  if (which === 'bold') return 'InvoiceBold';
  if (which === 'italic') return 'InvoiceItalic';
  return 'InvoiceBody';
};

const say = (doc, fonts, which, size) => doc.font(face(fonts, which)).fontSize(size);

const drawRule = (doc, y, color = LINE, width = 0.6) => {
  const right = doc.page.width - PAGE_MARGIN;
  doc.moveTo(PAGE_MARGIN, y).lineTo(right, y).lineWidth(width).strokeColor(color).stroke();
};

const dateLabel = (value) => (value
  ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—');

/**
 * A column layout, shared by the items table and the GST slab summary.
 *
 * `{ key, label, width, align }`. `xOf` gives the left edge of a column so callers never hand-roll
 * offset arithmetic — which is how the first draft of this file ended up with several wrong ones.
 */
class Columns {
  constructor(spec, origin = PAGE_MARGIN + 4) {
    this.spec = spec;
    this.origin = origin;
    this.offsets = [];
    let cursor = origin;
    for (const column of spec) {
      this.offsets.push(cursor);
      cursor += column.width;
    }
    this.totalWidth = cursor - origin;
  }

  xOf(key) {
    const index = this.spec.findIndex((column) => column.key === key);
    return index < 0 ? this.origin : this.offsets[index];
  }

  widthOf(key, pad = 6) {
    const column = this.spec.find((c) => c.key === key);
    return column ? Math.max(10, column.width - pad) : 40;
  }

  alignOf(key) {
    return (this.spec.find((c) => c.key === key) || {}).align || 'left';
  }

  /** Draws the shaded header band and returns the y below it. */
  header(doc, fonts, y, height = 18) {
    doc.rect(PAGE_MARGIN, y, this.totalWidth + 4, height).fill(SOFT);
    this.spec.forEach((column, index) => {
      if (!column.label) return;
      say(doc, fonts, 'bold', 7.2);
      doc.fillColor(GOLD).text(
        String(column.label).toUpperCase(),
        this.offsets[index],
        y + 5.5,
        { width: Math.max(10, column.width - 6), align: column.align || 'left', characterSpacing: 0.3 }
      );
    });
    return y + height;
  }

  /**
   * Draws one row of values and returns its height, so callers can advance by the tallest cell
   * instead of guessing a line height.
   */
  row(doc, fonts, y, values, { size = 8.4, pad = 5 } = {}) {
    let tallest = 12;
    this.spec.forEach((column, index) => {
      const value = values[column.key];
      if (value === undefined || value === null || value === '') return;
      const width = Math.max(10, column.width - 6);
      say(doc, fonts, column.bold ? 'bold' : 'body', column.size || size);
      doc.fillColor(column.color || INK).text(String(value), this.offsets[index], y, {
        width,
        align: column.align || 'left',
        lineGap: 1,
      });
      tallest = Math.max(tallest, doc.heightOfString(String(value), { width, lineGap: 1 }));
    });
    return tallest + pad;
  }
}

/** A labelled value row used for the invoice meta and totals blocks. */
function labelValue(doc, fonts, x, y, width, label, value, { labelWidth = 0.44, size = 8.5, valueWhich = 'bold', valueColor = INK } = {}) {
  say(doc, fonts, 'body', size);
  doc.fillColor(MUTED).text(String(label), x, y, { width: width * labelWidth });
  say(doc, fonts, valueWhich, size);
  doc.fillColor(valueColor).text(String(value), x + width * labelWidth, y, { width: width * (1 - labelWidth), align: 'right' });
  return y + size + 4.5;
}

/** Bill-to / ship-to / deliver-to block. Returns the y below it. */
function addressBlock(doc, fonts, x, y, width, title, address = {}, extra = []) {
  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text(String(title).toUpperCase(), x, y, { width, characterSpacing: 0.6 });
  let cursor = y + 12;

  say(doc, fonts, 'bold', 9.5);
  doc.fillColor(INK).text(address.fullName || '—', x, cursor, { width });
  cursor += doc.heightOfString(address.fullName || '—', { width }) + 2;

  say(doc, fonts, 'body', 8.5);
  const lines = [
    address.line1,
    address.line2,
    address.landmark,
    [address.city, address.state].filter(Boolean).join(', '),
    address.pincode,
    address.country && address.country !== 'IN' ? address.country : null,
  ].filter((line) => line && String(line).trim());
  for (const line of lines) {
    doc.fillColor(MUTED).text(String(line), x, cursor, { width });
    cursor += doc.heightOfString(String(line), { width }) + 1;
  }

  for (const [label, value] of extra) {
    if (!value) continue;
    say(doc, fonts, 'body', 8.5);
    doc.fillColor(MUTED).text(`${label}: `, x, cursor, { continued: true });
    say(doc, fonts, 'bold', 8.5);
    doc.fillColor(INK).text(String(value), x + doc.widthOfString(`${label}: `), cursor, { width: width - doc.widthOfString(`${label}: `) });
    cursor += 12;
  }
  return cursor;
}

/** Adds a page when the remaining space cannot hold `needed` points; returns the y to draw at. */
function ensureSpace(doc, y, needed) {
  if (y + needed <= doc.page.height - PAGE_MARGIN - 24) return { y, broke: false };
  doc.addPage(PAGE_OPTIONS);
  return { y: PAGE_MARGIN, broke: true };
}

/** Page footer on every page, written once the page count is known. */
function stampFooters(doc, fonts, text) {
  const range = doc.bufferedPageRange();
  for (let page = 0; page < range.count; page += 1) {
    doc.switchToPage(page);
    const width = doc.page.width - PAGE_MARGIN * 2;
    const y = doc.page.height - PAGE_MARGIN + 8;
    say(doc, fonts, 'body', 7);
    doc.fillColor(MUTED).text(text, PAGE_MARGIN, y, { width: width * 0.78 });
    doc.fillColor(MUTED).text(`Page ${page + 1} of ${range.count}`, PAGE_MARGIN + width * 0.78, y, { width: width * 0.22, align: 'right' });
  }
}

/** Collects a document into a Buffer. */
function collect(doc) {
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  return new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

/* ------------------------------------------------------------- the invoice */

/**
 * Renders the GST tax invoice for an order.
 *
 * @param {object} order the Order document. Its snapshot is authoritative: prices, rates and tax are
 *   shown as charged, not as the product master is configured today.
 * @param {object} [options]
 * @param {object} [options.seller]       seller identity, normally `config.seller`
 * @param {Record<string,string>} [options.hsnBySku] SKU → HSN. The order snapshot does not carry HSN,
 *   so it is looked up from the product master; a missing code renders as an em dash rather than a
 *   fabricated one.
 * @param {string} [options.customerEmail]
 * @param {string} [options.customerGstin] buyer's GSTIN, when they are a registered business
 * @returns {Promise<Buffer>}
 */
async function renderInvoicePdf(order, options = {}) {
  const seller = options.seller || {};
  const fonts = fontStack(seller);
  const symbol = fonts.symbol;
  const totals = invoiceTotals(order);
  const supply = supplyType(seller, order.shippingAddress);
  const slabs = gstSlabsWithHsn(order, supply, options.hsnBySku);
  const items = order.items || [];
  const legalName = seller.legalName || 'Vani Collection';

  const doc = makeDoc(fonts, `Tax Invoice ${order.orderNumber || ''}`.trim());
  const done = collect(doc);
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  /* ---- title and seller identity ---- */
  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text('ORIGINAL FOR RECIPIENT', PAGE_MARGIN, y + 2, { width: contentWidth, align: 'right', characterSpacing: 0.8 });
  say(doc, fonts, 'bold', 17);
  doc.fillColor(ROSE).text('TAX INVOICE', PAGE_MARGIN, y, { characterSpacing: 0.5 });
  y += 24;

  const sellerTop = y;
  say(doc, fonts, 'bold', 11.5);
  doc.fillColor(INK).text(legalName, PAGE_MARGIN, y, { width: contentWidth * 0.55 });
  y += 15;
  say(doc, fonts, 'body', 8.5);
  doc.fillColor(MUTED).text(seller.address || '', PAGE_MARGIN, y, { width: contentWidth * 0.55 });
  y += doc.heightOfString(seller.address || '', { width: contentWidth * 0.55 }) + 4;

  // A malformed GSTIN is never printed: an invalid registration number on a tax invoice is worse
  // than an obviously blank one, so config drops it and the document says so plainly.
  const gstinValue = seller.gstin || (seller.gstinRejected ? 'INVALID — NOT SHOWN' : 'UNREGISTERED');
  const sellerRows = [
    ['GSTIN', gstinValue],
    seller.pan ? ['PAN', seller.pan] : null,
    seller.phone ? ['Phone', seller.phone] : null,
    ['Email', seller.email || 'care@vanicollection.com'],
  ].filter(Boolean);
  for (const [label, value] of sellerRows) {
    say(doc, fonts, 'body', 8.5);
    doc.fillColor(MUTED).text(`${label}: `, PAGE_MARGIN, y, { continued: true });
    say(doc, fonts, label === 'GSTIN' ? 'bold' : 'body', 8.5);
    doc.fillColor(seller.gstin ? INK : MUTED).text(String(value));
    y += 11.5;
  }

  /* ---- invoice meta, right column, aligned to the top of the seller block ---- */
  const metaX = PAGE_MARGIN + contentWidth * 0.62;
  const metaWidth = contentWidth * 0.38;
  let metaY = sellerTop;
  for (const [label, value] of [
    ['Invoice No.', order.orderNumber || '—'],
    ['Invoice Date', dateLabel(order.invoiceDate || order.createdAt || new Date())],
    ['Order Date', dateLabel(order.createdAt)],
    ['Place of Supply', `${order.shippingAddress?.state || '—'}${supply.shipCode ? ` (${supply.shipCode})` : ''}`],
    ['Supply Type', `${supply.label}${supply.determined ? '' : ' (assumed)'}`],
    ['Reverse Charge', 'No'],
    ['Payment', `${(order.payment?.method || '—').toUpperCase()}${order.payment?.status ? ` · ${order.payment.status}` : ''}`],
  ]) {
    metaY = labelValue(doc, fonts, metaX, metaY, metaWidth, label, value, { labelWidth: 0.42 });
  }

  y = Math.max(y, metaY) + 6;
  drawRule(doc, y);
  y += 10;

  /* ---- billed to / shipped to ---- */
  const halfWidth = contentWidth / 2 - 8;
  const billingEnd = addressBlock(doc, fonts, PAGE_MARGIN, y, halfWidth, 'Billed To', order.billingAddress || order.shippingAddress || {}, [
    ['Email', options.customerEmail || order.billingAddress?.email || order.shippingAddress?.email],
    ['Phone', order.billingAddress?.phone || order.shippingAddress?.phone],
    ['GSTIN', options.customerGstin],
  ]);
  const shippingEnd = addressBlock(doc, fonts, PAGE_MARGIN + halfWidth + 16, y, halfWidth, 'Shipped To', order.shippingAddress || {});
  y = Math.max(billingEnd, shippingEnd) + 12;

  /* ---- items ---- */
  const taxLabel = supply.type === 'intra' ? 'CGST+SGST' : 'IGST';
  const fixed = 18 + 56 + 34 + 62 + 64 + 42 + 66;
  const columns = new Columns([
    { key: 'index', label: '#', width: 18, color: MUTED },
    { key: 'description', label: 'Description of Goods', width: Math.max(90, contentWidth - fixed) },
    { key: 'hsn', label: 'HSN / SAC', width: 56, color: MUTED },
    { key: 'qty', label: 'Qty', width: 34, align: 'right' },
    { key: 'rate', label: 'Rate', width: 62, align: 'right' },
    { key: 'taxable', label: 'Taxable', width: 64, align: 'right' },
    { key: 'gstRate', label: 'GST %', width: 42, align: 'right', color: MUTED },
    { key: 'tax', label: taxLabel, width: 66, align: 'right' },
    { key: 'lineTotal', label: 'Total', width: 66, align: 'right', bold: true },
  ]);

  y = columns.header(doc, fonts, y);
  let rowY = y + 5;

  items.forEach((item, index) => {
    const lineTotal = round2(item.lineTotal ?? (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0));
    const tax = round2(item.taxAmount ?? 0);
    const description = [
      item.name || item.sku || 'Item',
      [item.size && `Size ${item.size}`, item.color].filter(Boolean).join(' · '),
    ].filter(Boolean).join('\n');

    const space = ensureSpace(doc, rowY, 60);
    if (space.broke) rowY = columns.header(doc, fonts, space.y) + 5;
    else rowY = space.y;

    rowY += columns.row(doc, fonts, rowY, {
      index: String(index + 1),
      description,
      hsn: item.hsnCode || options.hsnBySku?.[item.sku] || '—',
      qty: String(item.quantity ?? 0),
      rate: money(item.unitPrice ?? 0, symbol),
      taxable: money(lineTotal - tax, symbol),
      gstRate: `${Number(item.gstRate) || 0}%`,
      tax: money(tax, symbol),
      lineTotal: money(lineTotal, symbol),
    }, { pad: 7 });
    drawRule(doc, rowY - 4, HAIRLINE, 0.4);
  });

  /* ---- totals on the right, amount in words on the left ---- */
  const wordsTop = rowY + 8;
  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text('TOTAL AMOUNT IN WORDS', PAGE_MARGIN, wordsTop, { width: contentWidth * 0.52, characterSpacing: 0.6 });
  say(doc, fonts, 'italic', 9);
  doc.fillColor(INK).text(amountInWords(totals.total), PAGE_MARGIN, wordsTop + 13, { width: contentWidth * 0.52 });
  const wordsEnd = wordsTop + 13 + doc.heightOfString(amountInWords(totals.total), { width: contentWidth * 0.52 });

  const totalsX = PAGE_MARGIN + contentWidth * 0.56;
  const totalsWidth = contentWidth * 0.44;
  let totalsY = rowY + 6;
  for (const [label, value] of [
    ['Taxable value of goods', money(totals.taxableValue, symbol)],
    [`Add: ${supply.type === 'intra' ? 'CGST + SGST' : 'IGST'} on goods`, money(totals.itemTax, symbol)],
    ['Subtotal', money(totals.subtotal, symbol)],
    totals.discount ? ['Less: Discount', `− ${money(totals.discount, symbol)}`] : null,
    totals.shipping ? ['Add: Delivery', money(totals.shipping, symbol)] : null,
  ].filter(Boolean)) {
    totalsY = labelValue(doc, fonts, totalsX, totalsY, totalsWidth, label, value, { labelWidth: 0.6, valueWhich: 'body' });
  }

  drawRule(doc, totalsY, LINE, 0.8);
  totalsY += 7;
  say(doc, fonts, 'bold', 11);
  doc.fillColor(ROSE).text('GRAND TOTAL', totalsX, totalsY, { width: totalsWidth * 0.6 });
  say(doc, fonts, 'bold', 11);
  doc.fillColor(ROSE).text(money(totals.total, symbol), totalsX + totalsWidth * 0.6, totalsY, { width: totalsWidth * 0.4, align: 'right' });
  totalsY += 16;

  y = Math.max(wordsEnd, totalsY) + 10;

  /* ---- GST slab summary ---- */
  if (slabs.length) {
    const space = ensureSpace(doc, y, 34 + slabs.length * 16);
    y = space.broke ? space.y : space.y;
    say(doc, fonts, 'bold', 7.5);
    doc.fillColor(GOLD).text('GST SUMMARY BY RATE SLAB', PAGE_MARGIN, y, { characterSpacing: 0.6 });
    y += 13;

    const intra = supply.type === 'intra';
    const slabColumns = new Columns([
      { key: 'hsn', label: 'HSN / SAC', width: contentWidth * 0.26 },
      { key: 'rate', label: 'Rate', width: contentWidth * 0.08, align: 'right' },
      { key: 'qty', label: 'Qty', width: contentWidth * 0.08, align: 'right', color: MUTED },
      { key: 'taxable', label: 'Taxable Value', width: contentWidth * 0.18, align: 'right' },
      { key: 'cgst', label: intra ? 'CGST' : 'IGST', width: contentWidth * 0.14, align: 'right' },
      ...(intra ? [{ key: 'sgst', label: 'SGST / UTGST', width: contentWidth * 0.14, align: 'right' }] : []),
      { key: 'totalTax', label: 'Total Tax', width: intra ? contentWidth * 0.12 : contentWidth * 0.26, align: 'right', bold: true },
    ]);

    y = slabColumns.header(doc, fonts, y, 16);
    for (const slab of slabs) {
      y += slabColumns.row(doc, fonts, y + 2, {
        hsn: slab.hsn,
        rate: `${slab.rate}%`,
        qty: String(slab.quantity),
        taxable: money(slab.taxableValue, symbol),
        cgst: money(intra ? slab.cgst : slab.igst, symbol),
        ...(intra ? { sgst: money(slab.sgst, symbol) } : {}),
        totalTax: money(slab.tax, symbol),
      }, { pad: 6 });
      drawRule(doc, y - 3, HAIRLINE, 0.4);
    }

    const totalTaxable = round2(slabs.reduce((sum, slab) => sum + slab.taxableValue, 0));
    const totalTax = round2(slabs.reduce((sum, slab) => sum + slab.tax, 0));
    y += 2;
    say(doc, fonts, 'bold', 8.4);
    doc.fillColor(INK).text('Total', slabColumns.xOf('hsn'), y, { width: slabColumns.widthOf('hsn') + slabColumns.widthOf('rate') + slabColumns.widthOf('qty') });
    say(doc, fonts, 'bold', 8.4);
    doc.fillColor(INK).text(money(totalTaxable, symbol), slabColumns.xOf('taxable'), y, { width: slabColumns.widthOf('taxable'), align: 'right' });
    doc.fillColor(INK).text(money(totalTax, symbol), slabColumns.xOf('totalTax'), y, { width: slabColumns.widthOf('totalTax'), align: 'right' });
    y += 14;

    // Rounding to two decimals per slab can drift a paisa from the order snapshot; say so rather
    // than let an accountant find an unexplained difference.
    const drift = round2(totalTax - totals.itemTax);
    say(doc, fonts, 'body', 7.5);
    doc.fillColor(drift === 0 ? MUTED : GOLD).text(
      drift === 0
        ? `Tax charged on this invoice: ${money(totals.itemTax, symbol)} — agrees with the slab summary above.`
        : `Slab summary totals ${money(totalTax, symbol)} against ${money(totals.itemTax, symbol)} charged (a ${money(Math.abs(drift), symbol)} rounding difference). The amount charged governs.`,
      PAGE_MARGIN,
      y,
      { width: contentWidth }
    );
    y += 18;
  }

  /* ---- declaration and signature ---- */
  const space = ensureSpace(doc, y, 96);
  y = space.y;
  drawRule(doc, y);
  y += 10;

  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text('DECLARATION', PAGE_MARGIN, y, { characterSpacing: 0.6 });
  y += 12;
  const declaration = seller.gstin
    ? 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. The goods supplied are liable to GST as indicated above.'
    : 'This document is issued by an unregistered supplier and carries no GSTIN. It records the goods supplied and the amounts charged. It is not a GST tax invoice and no input tax credit is available against it.';
  say(doc, fonts, 'body', 7.8);
  doc.fillColor(MUTED).text(declaration, PAGE_MARGIN, y, { width: contentWidth * 0.58 });
  y += doc.heightOfString(declaration, { width: contentWidth * 0.58 }) + 8;

  say(doc, fonts, 'body', 7.8);
  doc.fillColor(MUTED).text(`Order status: ${String(order.status || '—').replace(/_/g, ' ')}`, PAGE_MARGIN, y, { width: contentWidth * 0.58 });
  if (options.customerGstin) {
    doc.fillColor(MUTED).text(`Buyer GSTIN: ${options.customerGstin}`, PAGE_MARGIN, y + 11, { width: contentWidth * 0.58 });
  }

  // Signature block, right column, aligned to the declaration.
  const sigX = PAGE_MARGIN + contentWidth * 0.62;
  const sigWidth = contentWidth * 0.38;
  say(doc, fonts, 'bold', 8);
  doc.fillColor(INK).text(`For ${legalName}`, sigX, y - 30, { width: sigWidth, align: 'right' });
  drawRule(doc, y - 10, INK, 0.6);
  say(doc, fonts, 'body', 7.2);
  doc.fillColor(MUTED).text('Authorised Signatory', sigX, y - 8, { width: sigWidth, align: 'right' });

  stampFooters(
    doc,
    fonts,
    `${legalName} · Invoice ${order.orderNumber || '—'} · Computer-generated${seller.gstin ? '' : ' · Unregistered supplier'}`
  );

  doc.end();
  return done;
}

/* ------------------------------------------------------------- packing slip */

/**
 * Warehouse packing slip: what to pick and where it goes.
 *
 * Deliberately carries **no prices**. This document travels with the parcel and is handled by
 * couriers and warehouse staff, so exposing what the customer paid is both unnecessary and a privacy
 * problem. It does carry SKU, size, colour, HSN and quantity, plus a tick grid and a packer checklist.
 */
async function renderPackingSlipPdf(order, options = {}) {
  const seller = options.seller || {};
  const fonts = fontStack(seller);
  const legalName = seller.legalName || 'Vani Collection';
  const items = order.items || [];

  const doc = makeDoc(fonts, `Packing Slip ${order.orderNumber || ''}`.trim());
  const done = collect(doc);
  const contentWidth = doc.page.width - PAGE_MARGIN * 2;
  let y = PAGE_MARGIN;

  say(doc, fonts, 'bold', 17);
  doc.fillColor(ROSE).text('PACKING SLIP', PAGE_MARGIN, y, { characterSpacing: 0.5 });
  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text('NO PRICES — WAREHOUSE COPY', PAGE_MARGIN, y + 2, { width: contentWidth, align: 'right', characterSpacing: 0.8 });
  y += 24;

  const headerTop = y;
  say(doc, fonts, 'bold', 9.5);
  doc.fillColor(INK).text(legalName, PAGE_MARGIN, y, { width: contentWidth * 0.5 });
  y += 13;
  say(doc, fonts, 'body', 8.5);
  doc.fillColor(MUTED).text(seller.address || '', PAGE_MARGIN, y, { width: contentWidth * 0.5 });
  y += doc.heightOfString(seller.address || '', { width: contentWidth * 0.5 }) + 4;
  say(doc, fonts, 'body', 8.5);
  doc.fillColor(MUTED).text(seller.phone ? `Phone: ${seller.phone}` : seller.email || '', PAGE_MARGIN, y, { width: contentWidth * 0.5 });
  y += 12;

  const metaX = PAGE_MARGIN + contentWidth * 0.62;
  const metaWidth = contentWidth * 0.38;
  let metaY = headerTop;
  for (const [label, value] of [
    ['Order No.', order.orderNumber || '—'],
    ['Packed On', dateLabel(new Date())],
    ['Payment', (order.payment?.method || '—').toUpperCase()],
    ['Courier', order.shipment?.courier || 'Not booked'],
    ['AWB', order.shipment?.awb || 'Not generated'],
    ['Order Status', String(order.status || '—').replace(/_/g, ' ')],
  ]) {
    metaY = labelValue(doc, fonts, metaX, metaY, metaWidth, label, value, { labelWidth: 0.4 });
  }

  y = Math.max(y, metaY) + 6;
  drawRule(doc, y);
  y += 10;

  const addressEnd = addressBlock(doc, fonts, PAGE_MARGIN, y, contentWidth * 0.6, 'Deliver To', order.shippingAddress || {}, [
    ['Phone', order.shippingAddress?.phone],
    ['Email', order.shippingAddress?.email || options.customerEmail],
  ]);
  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text('HANDLING', PAGE_MARGIN + contentWidth * 0.64, y, { characterSpacing: 0.6 });
  say(doc, fonts, 'body', 8.2);
  doc.fillColor(MUTED).text('Fold in acid-free tissue. Do not compress zari or gota work. Keep away from moisture.', PAGE_MARGIN + contentWidth * 0.64, y + 13, { width: contentWidth * 0.36 });
  y = Math.max(addressEnd, y + 60) + 10;

  /* ---- pick list ---- */
  const columns = new Columns([
    { key: 'pick', label: '✓', width: 26 },
    { key: 'sku', label: 'SKU', width: 112, bold: true },
    { key: 'description', label: 'Item', width: Math.max(80, contentWidth - 26 - 112 - 54 - 62 - 48 - 44) },
    { key: 'size', label: 'Size', width: 54, color: MUTED },
    { key: 'color', label: 'Colour', width: 62, color: MUTED },
    { key: 'hsn', label: 'HSN', width: 48, color: MUTED },
    { key: 'qty', label: 'Qty', width: 44, align: 'right', bold: true, size: 10 },
  ]);

  y = columns.header(doc, fonts, y);
  let rowY = y + 6;
  let units = 0;

  items.forEach((item) => {
    const space = ensureSpace(doc, rowY, 44);
    if (space.broke) rowY = columns.header(doc, fonts, space.y) + 6;
    else rowY = space.y;

    // An empty box the packer ticks off.
    doc.rect(columns.xOf('pick') + 2, rowY + 1, 10, 10).lineWidth(0.7).strokeColor(LINE).stroke();

    const height = columns.row(doc, fonts, rowY, {
      sku: String(item.sku || '—'),
      description: String(item.name || '—'),
      size: item.size || '—',
      color: item.color || '—',
      hsn: item.hsnCode || options.hsnBySku?.[item.sku] || '—',
      qty: String(item.quantity ?? 0),
    }, { pad: 9 });

    units += Number(item.quantity) || 0;
    rowY += height;
    drawRule(doc, rowY - 6, HAIRLINE, 0.4);
  });

  y = rowY + 4;
  doc.rect(PAGE_MARGIN, y, contentWidth, 26).fill(SOFT);
  say(doc, fonts, 'bold', 9.5);
  doc.fillColor(INK).text(`Total units to pack: ${units}`, PAGE_MARGIN + 8, y + 8);
  say(doc, fonts, 'body', 8);
  doc.fillColor(MUTED).text(`${items.length} line${items.length === 1 ? '' : 's'}`, PAGE_MARGIN + contentWidth - 104, y + 9, { width: 96, align: 'right' });
  y += 38;

  const space = ensureSpace(doc, y, 110);
  y = space.y;
  say(doc, fonts, 'bold', 7.5);
  doc.fillColor(GOLD).text('PACKER CHECKLIST', PAGE_MARGIN, y, { characterSpacing: 0.6 });
  y += 14;
  say(doc, fonts, 'body', 8.2);
  for (const step of [
    'Every SKU above is ticked and the quantity matches.',
    'Care card and the customer copy of the invoice are inside the box.',
    'Garment is folded in tissue; zari, gota and embroidery are not creased.',
    'The shipping label matches the delivery address on this slip.',
  ]) {
    doc.rect(PAGE_MARGIN + 2, y + 1, 9, 9).lineWidth(0.7).strokeColor(LINE).stroke();
    doc.fillColor(MUTED).text(step, PAGE_MARGIN + 18, y, { width: contentWidth - 20 });
    y += 16;
  }

  y += 10;
  say(doc, fonts, 'body', 8);
  doc.fillColor(MUTED).text('Packed by: ______________________', PAGE_MARGIN, y);
  doc.fillColor(MUTED).text('Checked by: ______________________', PAGE_MARGIN + contentWidth * 0.42, y);
  doc.fillColor(MUTED).text('Date: ______________', PAGE_MARGIN + contentWidth * 0.8, y, { width: contentWidth * 0.2, align: 'right' });

  stampFooters(doc, fonts, `Packing slip · ${order.orderNumber || '—'} · ${legalName} · No prices shown`);

  doc.end();
  return done;
}

/* ---------------------------------------------------------------- HSN lookup */

/**
 * SKU → HSN/SAC code for an order's lines.
 *
 * HSN is mandatory on a GST invoice but is **not** part of the order snapshot — it lives on the
 * product master — so it has to be looked up. A product that has since been archived or deleted
 * simply does not appear in the map and its row renders as an em dash: better an obviously missing
 * code a person can fill in than a code invented to look complete.
 *
 * Never throws. A failed lookup must not stop an invoice being produced.
 */
async function loadHsnBySku(order, { log } = {}) {
  const skus = [...new Set((order.items || []).map((item) => item.sku).filter(Boolean))];
  if (skus.length === 0) return {};
  try {
    // eslint-disable-next-line global-require
    const Product = require('../../models/Product');
    const rows = await Product.find({ 'variants.sku': { $in: skus } })
      .select('variants.sku variants.hsnCode hsnCode')
      .lean();
    const map = {};
    for (const row of rows) {
      for (const variant of row.variants || []) {
        const hsn = variant.hsnCode || row.hsnCode;
        if (variant.sku && hsn) map[variant.sku] = String(hsn);
      }
    }
    // Lines carry their own HSN when the snapshot has one, which always wins over the master.
    for (const item of order.items || []) {
      if (item.hsnCode) map[item.sku] = String(item.hsnCode);
    }
    return map;
  } catch (error) {
    if (log && typeof log.warn === 'function') log.warn({ error: error.message }, 'HSN lookup failed; invoice will omit codes');
    return {};
  }
}

module.exports = {
  renderInvoicePdf,
  renderPackingSlipPdf,
  loadHsnBySku,
  amountInWords,
  indianWords,
  groupIndian,
  money,
  round2,
  stateCodeFor,
  supplyType,
  gstSlabs,
  gstSlabsWithHsn,
  invoiceTotals,
  fontStack,
  STATE_CODES,
};
