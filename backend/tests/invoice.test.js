'use strict';

/**
 * GST invoice and packing slip coverage.
 *
 * Mostly pure: the arithmetic, the state/supply-type logic and the number-to-words conversion need no
 * database. The render tests assert against the *decoded PDF text*, because a tax invoice is only
 * correct if the document actually says the right thing — testing the helper functions alone would
 * pass even if the layout drew the wrong column.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const zlib = require('node:zlib');

const invoice = require('../src/services/invoice');

/* --------------------------------------------------------- PDF text decoding */

/**
 * Extracts the text a pdfkit document drew.
 *
 * pdfkit writes base-14 text as WinAnsi hex strings inside `BT … ET` blocks (and embedded-font text
 * as 2-byte glyph ids, which need the /ToUnicode CMap — so this covers the default font path, which
 * is what ships without configuration).
 */
const BT_ET = /BT([\s\S]*?)ET/g;
const HEX_GROUP = /<([0-9A-Fa-f]+)>/g;

/**
 * WinAnsi decoder.
 *
 * `Buffer.toString('latin1')` is *not* equivalent: base-14 PDF text is WinAnsiEncoding, where 0x97 is
 * an em dash — latin1 turns that into a C1 control character, so a missing HSN code would have read
 * as blank instead of a dash. Node has no 'cp1252' Buffer encoding, but TextDecoder does.
 */
const WINANSI = new TextDecoder('windows-1252');
const decodeWinAnsi = (buffer) => WINANSI.decode(buffer);

function pdfText(buffer) {
  const blocks = [];
  for (const match of buffer.toString('latin1').matchAll(/stream\r?\n/g)) {
    const start = match.index + match[0].length;
    const end = buffer.indexOf('endstream', start);
    if (end < 0) continue;
    let raw = buffer.subarray(start, end);
    try {
      raw = zlib.inflateSync(raw);
    } catch {
      continue; // an embedded font program, not page content
    }
    blocks.push(raw.toString('latin1'));
  }
  const parts = [];
  for (const stream of blocks) {
    for (const block of stream.matchAll(BT_ET)) {
      for (const hex of block[1].matchAll(HEX_GROUP)) {
        if (hex[1].length % 2) continue;
        parts.push(decodeWinAnsi(Buffer.from(hex[1], 'hex')));
      }
      parts.push('\n');
    }
  }
  return parts.join('');
}

const flat = (text) => text.replace(/\s+/g, ' ');

/* --------------------------------------------------------------- fixtures */

const SELLER_MP = {
  gstin: '23AABCV1234F1Z5',
  gstinRejected: false,
  pan: 'AABCV1234F',
  legalName: 'Vani Collection',
  address: 'Vani Collection Atelier, Guna, Madhya Pradesh 473001, India',
  stateCode: '23',
  state: 'Madhya Pradesh',
  phone: '+91 98290 00000',
  email: 'care@vanicollection.test',
};

const orderFixture = (overrides = {}) => ({
  _id: '6650f1a2c3d4e5f6a7b8c901',
  orderNumber: 'VC17200000001',
  createdAt: '2026-09-28T10:15:00.000Z',
  status: 'delivered',
  payment: { method: 'upi', status: 'paid' },
  shipment: { courier: 'Delhivery', awb: 'DLV9988776655' },
  items: [
    // taxAmount is the inclusive extraction: 3999 * 5/105 = 190.43
    { sku: 'VC-SR-02-DW', name: 'Chunri Bandhani Saree in Deep Wine', size: 'Free Size', color: 'Deep Wine', quantity: 1, unitPrice: 3999, mrp: 5499, gstRate: 5, taxAmount: 190.43, lineTotal: 3999 },
    { sku: 'VC-KT-05-AJ-M', name: 'Ajrakh Handblock Mul Cotton Kurti', size: 'M', color: 'Indigo', quantity: 2, unitPrice: 2099, mrp: 2499, gstRate: 12, taxAmount: 449.79, lineTotal: 4198 },
    { sku: 'VC-DP-01-ZG', name: 'Zari Woven Silk Dupatta', quantity: 1, unitPrice: 1299, gstRate: 18, taxAmount: 198.16, lineTotal: 1299 },
  ],
  shippingAddress: { fullName: 'Meera Joshi', phone: '9800000001', email: 'meera@example.test', line1: '12 Freeganj Road', line2: 'Near Clock Tower', city: 'Guna', state: 'Madhya Pradesh', pincode: '473001', country: 'IN' },
  billingAddress: { fullName: 'Meera Joshi', line1: '12 Freeganj Road', city: 'Guna', state: 'Madhya Pradesh', pincode: '473001' },
  amounts: { subtotal: 9496, discount: 500, shipping: 0, tax: 838.38, total: 8996, currency: 'INR' },
  ...overrides,
});

const HSN = { 'VC-SR-02-DW': '5208', 'VC-KT-05-AJ-M': '6206', 'VC-DP-01-ZG': '6214' };

/* ===========================================================================
   Number formatting
   =========================================================================== */

test('Indian digit grouping, not Western', () => {
  assert.equal(invoice.groupIndian(0), '0');
  assert.equal(invoice.groupIndian(999), '999');
  assert.equal(invoice.groupIndian(1000), '1,000');
  assert.equal(invoice.groupIndian(100000), '1,00,000', 'one lakh groups as 1,00,000');
  assert.equal(invoice.groupIndian(1000000), '10,00,000');
  assert.equal(invoice.groupIndian(12345678), '1,23,45,678');
});

test('amounts render with paise only when there are paise', () => {
  const symbol = invoice.fontStack({}).symbol;
  assert.equal(invoice.money(1299, symbol), 'Rs. 1,299');
  assert.equal(invoice.money(1299.4, symbol), 'Rs. 1,299.40');
  assert.equal(invoice.money(100000, symbol), 'Rs. 1,00,000');
  assert.equal(invoice.money(0, symbol), 'Rs. 0');
  assert.equal(invoice.money(-250, symbol), '-Rs. 250');
  assert.equal(invoice.money('not-a-number', symbol), 'Rs. 0', 'a corrupt amount must not print NaN');
  assert.equal(invoice.money(undefined, symbol), 'Rs. 0');
});

test('amount in words uses lakh/crore and correct singular/plural', () => {
  assert.equal(invoice.amountInWords(0), 'Zero Rupees Only');
  assert.equal(invoice.amountInWords(1), 'One Rupee Only', 'singular');
  assert.equal(invoice.amountInWords(21), 'Twenty One Rupees Only');
  assert.equal(invoice.amountInWords(100), 'One Hundred Rupees Only');
  assert.equal(invoice.amountInWords(1234), 'One Thousand Two Hundred Thirty Four Rupees Only');
  assert.equal(invoice.amountInWords(100000), 'One Lakh Rupees Only');
  assert.equal(invoice.amountInWords(1234567), 'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees Only');
  assert.equal(invoice.amountInWords(10000000), 'One Crore Rupees Only');
  assert.equal(invoice.amountInWords(1250000000), 'One Hundred Twenty Five Crore Rupees Only');
  assert.equal(invoice.amountInWords(1234567.89), 'Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Rupees and Eighty Nine Paise Only');
  assert.equal(invoice.amountInWords(99.5), 'Ninety Nine Rupees and Fifty Paise Only');
  assert.equal(invoice.amountInWords(0.5), 'Fifty Paise Only', 'paise alone still reads sensibly');
  assert.equal(invoice.amountInWords(8996), 'Eight Thousand Nine Hundred Ninety Six Rupees Only');
  assert.equal(invoice.amountInWords(-50), 'Fifty Rupees Only', 'magnitude only; the sign is shown numerically');
  assert.equal(invoice.amountInWords('garbage'), 'Zero Rupees Only');
});

/* ===========================================================================
   Fonts and the rupee symbol
   =========================================================================== */

test('the default stack embeds no font and writes "Rs." rather than a glyph it cannot draw', () => {
  const fonts = invoice.fontStack({});
  assert.equal(fonts.embedded, false);
  assert.equal(fonts.symbol, 'Rs. ');
  assert.equal(fonts.body, 'Helvetica');
  assert.equal(fonts.bold, 'Helvetica-Bold');
  // pdfkit's base-14 Helvetica is WinAnsi, which has no U+20B9 and silently emits 0xB9 — a
  // superscript one. Printing ₹ with it would put "¹1,23,456" on a legal tax document.
  assert.ok(!fonts.symbol.includes('\u20B9'));
});

test('an embedded font switches the symbol to ₹, and a missing file falls back safely', () => {
  const missing = invoice.fontStack({ fontPath: '/definitely/not/a/font.ttf' });
  assert.equal(missing.embedded, false, 'an unreadable font must not break invoice generation');
  assert.equal(missing.symbol, 'Rs. ');

  const dejavu = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  let fonts;
  try {
    require('node:fs').accessSync(dejavu);
    fonts = invoice.fontStack({ fontPath: dejavu });
  } catch {
    return; // not installed in this environment; the fallback case above still covers the contract
  }
  assert.equal(fonts.embedded, true);
  assert.equal(fonts.symbol, '\u20B9');
  // No separate bold file supplied: the regular face stands in rather than failing.
  assert.deepEqual(fonts.bold, fonts.body);
});

/* ===========================================================================
   GST geometry
   =========================================================================== */

test('state names resolve to the GSTIN place-of-supply codes', () => {
  assert.equal(invoice.stateCodeFor({ state: 'Madhya Pradesh' }), '23');
  assert.equal(invoice.stateCodeFor({ state: 'madhya  pradesh' }), '23', 'case and whitespace insensitive');
  assert.equal(invoice.stateCodeFor({ state: 'Maharashtra' }), '27');
  assert.equal(invoice.stateCodeFor({ state: 'Orissa' }), '21', 'the older spelling still resolves');
  assert.equal(invoice.stateCodeFor({ state: 'New Delhi' }), '07');
  assert.equal(invoice.stateCodeFor({ state: 'Jammu & Kashmir' }), '01');
  assert.equal(invoice.stateCodeFor({ state: 'Atlantis' }), null, 'unknown states are not guessed');
  assert.equal(invoice.stateCodeFor({}), null);
  assert.equal(invoice.stateCodeFor(null), null);
});

test('intra-state splits CGST+SGST, inter-state is IGST, undetermined says so', () => {
  const mp = { state: 'Madhya Pradesh' };
  assert.deepEqual(invoice.supplyType(SELLER_MP, mp), { type: 'intra', label: 'Intra-State', shipCode: '23', sellerCode: '23', determined: true });

  const inter = invoice.supplyType(SELLER_MP, { state: 'Maharashtra' });
  assert.equal(inter.type, 'inter');
  assert.equal(inter.determined, true);

  // An unmatched ship-to state assumes inter-state (a single-state seller shipping nationwide usually
  // crosses a border, and IGST is fully creditable) but is flagged as not determined so the document
  // can say "assumed" instead of presenting a guess as fact.
  const assumed = invoice.supplyType(SELLER_MP, { state: 'Somewhere Else' });
  assert.equal(assumed.type, 'inter');
  assert.equal(assumed.determined, false);
  assert.equal(assumed.shipCode, null);

  const noSeller = invoice.supplyType({}, mp);
  assert.equal(noSeller.type, 'inter');
  assert.equal(noSeller.determined, false, 'without a seller state code nothing is determined');
});

test('GST slabs treat tax as inclusive and split it correctly', () => {
  const order = orderFixture();

  const intra = invoice.gstSlabs(order, { type: 'intra' });
  assert.equal(intra.length, 3, 'one slab per rate: 5%, 12%, 18%');
  assert.deepEqual(intra.map((slab) => slab.rate), [5, 12, 18], 'sorted by rate');

  const five = intra.find((slab) => slab.rate === 5);
  assert.equal(five.taxableValue, 3808.57, 'taxable = lineTotal − taxAmount, because GST is inclusive here');
  assert.equal(five.tax, 190.43);
  assert.equal(five.cgst, 95.22, 'half of the tax');
  assert.equal(five.sgst, 95.22);
  assert.equal(five.igst, 0);
  assert.equal(invoice.round2(five.cgst + five.sgst), 190.44, 'each half is rounded to paise');

  const twelve = intra.find((slab) => slab.rate === 12);
  assert.equal(twelve.taxableValue, 3748.21);
  assert.equal(twelve.tax, 449.79);
  assert.equal(twelve.quantity, 2, 'quantities are summed within the slab');

  const inter = invoice.gstSlabs(order, { type: 'inter' });
  const fiveInter = inter.find((slab) => slab.rate === 5);
  assert.equal(fiveInter.igst, 190.43, 'the whole tax is IGST across states');
  assert.equal(fiveInter.cgst, 0);
  assert.equal(fiveInter.sgst, 0);
});

test('HSN codes come from the product master and a missing one is a dash, never invented', () => {
  const order = orderFixture();
  const slabs = invoice.gstSlabsWithHsn(order, { type: 'intra' }, HSN);
  assert.deepEqual(slabs.map((slab) => slab.hsn), ['5208', '6206', '6214']);

  const partial = invoice.gstSlabsWithHsn(order, { type: 'intra' }, { 'VC-SR-02-DW': '5208' });
  assert.deepEqual(partial.map((slab) => slab.hsn), ['5208', '—', '—'], 'unknown codes render as a dash');

  const none = invoice.gstSlabsWithHsn(order, { type: 'intra' }, {});
  assert.ok(none.every((slab) => slab.hsn === '—'));

  // A code on the order line itself wins over the master, since the snapshot is what was charged.
  const snapshot = orderFixture();
  snapshot.items[0].hsnCode = '9999';
  const overridden = invoice.gstSlabsWithHsn(snapshot, { type: 'intra' }, HSN);
  assert.equal(overridden.find((slab) => slab.rate === 5).hsn, '9999');
});

test('totals come from the order snapshot and tie out to the item lines', () => {
  const totals = invoice.invoiceTotals(orderFixture());
  assert.equal(totals.subtotal, 9496);
  assert.equal(totals.discount, 500);
  assert.equal(totals.shipping, 0);
  assert.equal(totals.tax, 838.38);
  assert.equal(totals.total, 8996);
  assert.equal(totals.currency, 'INR');
  assert.equal(totals.taxableValue, invoice.round2(9496 - 838.38));

  // With no amounts block at all the lines still produce a coherent invoice.
  const bare = invoice.invoiceTotals({ items: orderFixture().items });
  assert.equal(bare.lineTotal, 9496);
  assert.equal(bare.itemTax, 838.38);
  assert.equal(bare.taxableValue, invoice.round2(9496 - 838.38));
  assert.equal(invoice.invoiceTotals({}).total, 0, 'an empty order does not throw');
});

/* ===========================================================================
   Rendering — assertions on the decoded document, not just the inputs
   =========================================================================== */

test('the invoice renders a valid PDF carrying every GST-mandatory field', async () => {
  const pdf = await invoice.renderInvoicePdf(orderFixture(), { seller: SELLER_MP, hsnBySku: HSN, customerEmail: 'meera@example.test' });
  assert.ok(Buffer.isBuffer(pdf) && pdf.length > 1000);
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-', 'a real PDF header');
  assert.ok(pdf.subarray(-1024).toString('latin1').includes('%%EOF'), 'and a proper trailer');

  const text = flat(pdfText(pdf));
  const upper = text.toUpperCase();
  for (const expected of [
    'TAX INVOICE', 'ORIGINAL FOR RECIPIENT', 'VC17200000001',
    '23AABCV1234F1Z5', 'AABCV1234F', 'Vani Collection',
    'Meera Joshi', 'Guna', 'Madhya Pradesh', '473001',
    '5208', '6206', '6214',
    'CGST', 'SGST', 'Intra-State', 'Place of Supply', 'Reverse Charge',
    'GRAND TOTAL', 'TOTAL AMOUNT IN WORDS', 'GST SUMMARY BY RATE SLAB', 'DECLARATION',
    'Chunri Bandhani Saree in Deep Wine', 'Ajrakh Handblock Mul Cotton Kurti',
    'Eight Thousand Nine Hundred Ninety Six Rupees Only',
    'Page 1 of',
  ]) {
    // Upper-cased comparison: several of these are drawn as small-caps section labels.
    assert.ok(upper.includes(expected.toUpperCase()), `invoice should contain "${expected}"`);
  }

  // The currency symbol must match what the font can actually draw.
  assert.ok(text.includes('Rs. 8,996'), 'the grand total is formatted with Indian grouping');
  assert.ok(!text.includes('\u00b9'), 'no superscript-one artifact from an unencodable rupee sign');
  assert.ok(!text.includes('IGST'), 'an intra-state supply must not show IGST');
  assert.ok(!text.includes('UNREGISTERED'), 'a registered seller is not marked unregistered');
});

test('an inter-state order shows IGST and no CGST/SGST split', async () => {
  const order = orderFixture();
  order.shippingAddress = { ...order.shippingAddress, city: 'Pune', state: 'Maharashtra', pincode: '411001' };
  const pdf = await invoice.renderInvoicePdf(order, { seller: SELLER_MP, hsnBySku: HSN });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('IGST'), 'IGST is charged');
  assert.ok(!text.includes('SGST'), 'and the CGST/SGST split is not');
  assert.ok(text.includes('Inter-State'));
  assert.ok(text.includes('Maharashtra'), 'the place of supply names the destination state');
});

test('an undetermined place of supply is labelled assumed, not asserted', async () => {
  const order = orderFixture();
  order.shippingAddress = { ...order.shippingAddress, state: 'Unknown Territory' };
  const pdf = await invoice.renderInvoicePdf(order, { seller: SELLER_MP, hsnBySku: HSN });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('(assumed)'), 'the reader can see the split was inferred');
});

test('a seller with no GSTIN produces an honest unregistered document', async () => {
  const pdf = await invoice.renderInvoicePdf(orderFixture(), {
    seller: { legalName: 'Vani Collection', address: 'Guna, Madhya Pradesh', email: 'care@vanicollection.test' },
    hsnBySku: HSN,
  });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('UNREGISTERED'), 'it does not print a fabricated registration number');
  assert.ok(text.includes('no input tax credit'), 'and warns that no credit is available');
  assert.ok(!text.includes('23AABCV1234F1Z5'));
});

test('a rejected GSTIN is never printed', async () => {
  const pdf = await invoice.renderInvoicePdf(orderFixture(), { seller: { ...SELLER_MP, gstin: undefined, gstinRejected: true }, hsnBySku: HSN });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('INVALID'), 'it says the number was not usable');
  assert.ok(!text.includes('23AABCV1234F1Z5'), 'the malformed value itself never reaches the page');
});

test('a buyer GSTIN is printed when supplied and validated upstream', async () => {
  const pdf = await invoice.renderInvoicePdf(orderFixture(), { seller: SELLER_MP, hsnBySku: HSN, customerGstin: '27AABCU9603R1ZM' });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('27AABCU9603R1ZM'));
  assert.ok(text.includes('Buyer GSTIN'));
});

test('a discount and delivery charge both appear in the totals', async () => {
  const order = orderFixture({ amounts: { subtotal: 9496, discount: 500, shipping: 99, tax: 838.38, total: 9095, currency: 'INR' } });
  const pdf = await invoice.renderInvoicePdf(order, { seller: SELLER_MP, hsnBySku: HSN });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('Less: Discount'));
  assert.ok(text.includes('Add: Delivery'));
  assert.ok(text.includes('Nine Thousand Ninety Five Rupees Only'));
});

test('a long order paginates and repeats the column header on each page', async () => {
  const many = Array.from({ length: 40 }, (_, index) => ({
    sku: `VC-MANY-${index}`,
    name: `Handblock Cotton Piece Number ${index + 1} With A Deliberately Long Description To Wrap`,
    size: 'M', color: 'Indigo', quantity: 1, unitPrice: 1299, gstRate: 5, taxAmount: 61.86, lineTotal: 1299,
  }));
  const order = orderFixture({ items: many, amounts: { subtotal: 51960, discount: 0, shipping: 0, tax: 2474.4, total: 51960, currency: 'INR' } });
  const pdf = await invoice.renderInvoicePdf(order, { seller: SELLER_MP, hsnBySku: {} });
  const text = flat(pdfText(pdf));
  const pages = Number((text.match(/Page 1 of (\d+)/) || [])[1] || 1);
  assert.ok(pages > 1, `40 lines should span more than one page, got ${pages}`);
  // The header band is redrawn after every break, so no column is ever orphaned from its label.
  // Column labels are drawn upper-cased, hence the case-insensitive match.
  const headerCount = (flat(pdfText(pdf)).match(/DESCRIPTION OF GOODS/g) || []).length;
  assert.equal(headerCount, pages, 'the items header appears once per page');
  assert.ok(text.includes('Page 40 of') || text.includes('Number 40'), 'the last line made it onto the document');
});

test('the packing slip carries SKUs, sizes and quantities but no prices at all', async () => {
  const pdf = await invoice.renderPackingSlipPdf(orderFixture(), { seller: SELLER_MP, hsnBySku: HSN });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const text = flat(pdfText(pdf));
  const upper = text.toUpperCase();

  for (const expected of ['PACKING SLIP', 'VC17200000001', 'VC-SR-02-DW', 'VC-KT-05-AJ-M', 'CHUNRI BANDHANI SAREE',
    'FREE SIZE', 'INDIGO', '5208', '6206', 'TOTAL UNITS TO PACK: 4', 'PACKER CHECKLIST', 'DELIVER TO', 'MEERA JOSHI']) {
    assert.ok(upper.includes(expected), `packing slip should contain "${expected}"`);
  }

  // It travels inside the parcel and is handled by couriers, so the customer's prices stay off it.
  assert.ok(!text.includes('Rs.'), 'no money amounts anywhere on the slip');
  assert.ok(!text.includes('3999') && !text.includes('8,996') && !text.includes('GRAND TOTAL'));
  assert.ok(text.includes('NO PRICES'), 'and it says so');
});

test('loadHsnBySku degrades to an empty map instead of throwing', async () => {
  // No database connection here: an invoice must still be producible, just without HSN codes.
  const map = await invoice.loadHsnBySku(orderFixture(), { log: { warn() {} } });
  assert.deepEqual(map, {});
  assert.deepEqual(await invoice.loadHsnBySku({ items: [] }), {});
  assert.deepEqual(await invoice.loadHsnBySku({}), {});
});

test('an invoice can still be produced when no HSN lookup was possible', async () => {
  const pdf = await invoice.renderInvoicePdf(orderFixture(), { seller: SELLER_MP, hsnBySku: {} });
  const text = flat(pdfText(pdf));
  assert.ok(text.includes('TAX INVOICE'));
  assert.ok(text.includes('—'), 'missing HSN codes render as a visible dash');
  assert.ok(!text.includes('undefined') && !text.includes('NaN'), 'no leaked JS values on the document');
});

test('a hostile product name cannot break the document', async () => {
  const order = orderFixture({
    items: [{ sku: 'X', name: '</script><b>bold</b> & "quotes" ₹100 \n newline', quantity: 1, unitPrice: 100, gstRate: 5, taxAmount: 4.76, lineTotal: 100 }],
    shippingAddress: { fullName: '<svg onload=alert(1)>', line1: 'A & B "Road"', city: 'Guna', state: 'Madhya Pradesh', pincode: '473001' },
    amounts: { subtotal: 100, discount: 0, shipping: 0, tax: 4.76, total: 100, currency: 'INR' },
  });
  const pdf = await invoice.renderInvoicePdf(order, { seller: SELLER_MP, hsnBySku: {} });
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  const text = flat(pdfText(pdf));
  // The rupee sign in the product name is drawn as whatever the font supports; the important part is
  // that nothing throws, the PDF stays valid and no "undefined" leaks onto the page.
  assert.ok(!text.includes('undefined') && !text.includes('NaN'));
  assert.ok(text.includes('bold'), 'the literal text survives, uninterpreted');
});
