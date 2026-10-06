/**
 * Shared email chrome for every Vani Collection template.
 *
 * Deliberately boring on purpose: table-based markup, inline styles and web-safe font stacks are
 * the only things that survive Gmail, Outlook and the Yahoo/AOL clients that still strip `<style>`
 * blocks. No build step — these are plain functions returning strings.
 *
 * SECURITY: every interpolated user value must go through {@link escapeHtml}. Templates receive
 * names, addresses and free-text notes straight from shopper input.
 */

const BRAND = {
  crimson: '#881337',
  wine: '#4c0a1f',
  cream: '#faf7f2',
  gold: '#dfc28c',
  ink: '#14100f',
  muted: '#6b6560',
  line: '#ebe6de',
};

const SERIF = "'Playfair Display', Georgia, 'Times New Roman', serif";
const SANS = "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/** HTML-escapes a value so shopper input can never break out of an attribute or a text node. */
function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Escapes a value for use inside a URL query string or path segment. */
function escapeUrl(value) {
  if (value === undefined || value === null) return '';
  return encodeURIComponent(String(value));
}

const inrFormatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

/** Formats an amount the way the storefront does: `₹1,299`. */
function inr(amount) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '₹0';
  return `₹${inrFormatter.format(Math.round(value))}`;
}

/** Indian date formatting, e.g. `6 Oct 2026`. */
function dateLabel(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

/** Drops empty lines so a template can build optional copy with `filter(Boolean).join()`. */
const lines = (parts) => parts.filter((part) => part !== undefined && part !== null && String(part).length > 0).join('\n');

/* --------------------------------------------------------------- html pieces */

function bulletproofButton(href, label, { background = BRAND.crimson, color = '#ffffff' } = {}) {
  const safeHref = escapeHtml(href);
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding:8px 0 4px;">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${safeHref}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="50%" strokecolor="${background}" fillcolor="${background}">
              <w:anchorlock/><center style="color:${color};font-family:Georgia,serif;font-size:15px;font-weight:bold;">${escapeHtml(label)}</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-- -->
            <a href="${safeHref}" target="_blank" rel="noopener" style="background:${background};border-radius:999px;color:${color};display:inline-block;font-family:${SANS};font-size:15px;font-weight:700;letter-spacing:0.01em;line-height:48px;padding:0 34px;text-align:center;text-decoration:none;-webkit-text-size-adjust:none;">${escapeHtml(label)}</a>
            <!--<![endif]-->
          </td>
        </tr>
      </table>`;
}

function heading(text) {
  return `<h1 style="margin:0 0 10px;font-family:${SERIF};font-size:26px;line-height:1.25;font-weight:600;color:${BRAND.ink};">${escapeHtml(text)}</h1>`;
}

function paragraph(text, style = '') {
  return `<p style="margin:0 0 14px;font-family:${SANS};font-size:15px;line-height:1.65;color:${BRAND.muted};${style}">${escapeHtml(text)}</p>`;
}

/** Small uppercase eyebrow used above section titles. */
function eyebrow(text) {
  return `<p style="margin:0 0 6px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:${BRAND.crimson};">${escapeHtml(text)}</p>`;
}

function divider() {
  return `<tr><td style="padding:18px 0;border-top:1px solid ${BRAND.line};font-size:0;line-height:0;">&nbsp;</td></tr>`;
}

function keyValue(label, value, { strong = false } = {}) {
  if (value === undefined || value === null || value === '') return '';
  return `
        <tr>
          <td style="padding:5px 0;font-family:${SANS};font-size:13px;color:${BRAND.muted};width:44%;">${escapeHtml(label)}</td>
          <td style="padding:5px 0;font-family:${SANS};font-size:13px;color:${BRAND.ink};${strong ? 'font-weight:700;' : ''}text-align:right;">${escapeHtml(value)}</td>
        </tr>`;
}

function addressBlock(title, address) {
  if (!address) return '';
  const parts = lines([
    address.fullName,
    address.line1,
    address.line2,
    address.landmark,
    [address.city, address.state].filter(Boolean).join(', '),
    address.pincode,
    address.country && address.country !== 'IN' ? address.country : '',
  ]);
  if (!parts) return '';
  return `
      <td valign="top" width="50%" style="padding:0 8px 0 0;">
        ${eyebrow(title)}
        <p style="margin:0;font-family:${SANS};font-size:13.5px;line-height:1.7;color:${BRAND.ink};white-space:pre-line;">${escapeHtml(parts)}</p>
        ${address.phone ? `<p style="margin:6px 0 0;font-family:${SANS};font-size:12.5px;color:${BRAND.muted};">${escapeHtml(address.phone)}</p>` : ''}
      </td>`;
}

/** Line-item table shared by the order, cancellation, refund and return templates. */
function orderItemsTable(items = []) {
  if (!items.length) return '';
  const rows = items
    .map((item) => {
      const meta = [item.size && `Size ${item.size}`, item.color, item.sku && `SKU ${item.sku}`].filter(Boolean).map((part) => escapeHtml(part)).join(' · ');
      return `
        <tr>
          <td style="padding:10px 8px 10px 0;border-bottom:1px solid ${BRAND.line};font-family:${SANS};font-size:13.5px;color:${BRAND.ink};">
            <strong style="font-weight:600;">${escapeHtml(item.name || item.sku || 'Item')}</strong>
            ${meta ? `<br /><span style="font-size:11.5px;color:${BRAND.muted};">${meta}</span>` : ''}
          </td>
          <td align="center" style="padding:10px 8px;border-bottom:1px solid ${BRAND.line};font-family:${SANS};font-size:13px;color:${BRAND.muted};">${escapeHtml(item.quantity ?? 1)}</td>
          <td align="right" style="padding:10px 0 10px 8px;border-bottom:1px solid ${BRAND.line};font-family:${SANS};font-size:13px;color:${BRAND.muted};">${escapeHtml(inr(item.unitPrice))}</td>
          <td align="right" style="padding:10px 0 10px 8px;border-bottom:1px solid ${BRAND.line};font-family:${SANS};font-size:13.5px;font-weight:700;color:${BRAND.ink};">${escapeHtml(inr(item.lineTotal ?? (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)))}</td>
        </tr>`;
    })
    .join('');

  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:6px 0 4px;">
        <tr>
          <th align="left" style="padding:0 8px 8px 0;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">Item</th>
          <th align="center" style="padding:0 8px 8px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">Qty</th>
          <th align="right" style="padding:0 8px 8px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">Price</th>
          <th align="right" style="padding:0 0 8px 8px;font-family:${SANS};font-size:10px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.muted};">Total</th>
        </tr>
        ${rows}
      </table>`;
}

/** Totals block (subtotal, discount, shipping, GST, grand total). */
function totalsTable(amounts = {}) {
  const rows = [];
  const push = (label, value, { strong = false, negative = false } = {}) => {
    if (value === undefined || value === null) return;
    if (!strong && Number(value) === 0) return;
    rows.push(keyValue(label, `${negative ? '−' : ''}${inr(value)}`, { strong }));
  };
  push('Subtotal', amounts.subtotal);
  if (Number(amounts.discount) > 0) push(amounts.couponCode ? `Discount (${amounts.couponCode})` : 'Discount', amounts.discount, { negative: true });
  push('Shipping', amounts.shipping);
  push('GST (inclusive)', amounts.tax);
  const body = rows.join('');
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
        ${body}
        <tr>
          <td colspan="2" style="padding:12px 0 0;border-top:2px solid ${BRAND.gold};">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:10px 0 0;font-family:${SANS};font-size:14px;font-weight:700;color:${BRAND.ink};">Total paid</td>
                <td align="right" style="padding:10px 0 0;font-family:${SERIF};font-size:22px;font-weight:700;color:${BRAND.crimson};">${escapeHtml(inr(amounts.total))}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`;
}

/* -------------------------------------------------------------------- header */

function brandHeader({ logoUrl, storefrontUrl }) {
  const mark = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="34" height="34" alt="Vani Collection" style="display:block;border:0;outline:none;text-decoration:none;height:34px;width:34px;border-radius:9px;" />`
    : `<span style="display:block;width:34px;height:34px;line-height:34px;text-align:center;border-radius:9px;background:${BRAND.wine};color:${BRAND.gold};font-family:${SERIF};font-size:19px;font-weight:700;">V</span>`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};border-bottom:1px solid ${BRAND.line};">
      <tr>
        <td align="center" style="padding:22px 16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right:10px;">
                <a href="${escapeHtml(storefrontUrl)}" target="_blank" rel="noopener" style="text-decoration:none;">${mark}</a>
              </td>
              <td valign="middle">
                <a href="${escapeHtml(storefrontUrl)}" target="_blank" rel="noopener" style="text-decoration:none;">
                  <span style="display:block;font-family:${SERIF};font-size:19px;font-weight:600;letter-spacing:0.01em;color:${BRAND.ink};">Vani Collection</span>
                  <span style="display:block;font-family:${SANS};font-size:8.5px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND.crimson};">Atelier · Handcrafted in India</span>
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;
}

function brandFooter({ supportEmail, storefrontUrl, unsubscribeHref }) {
  const links = [
    ['Shop', storefrontUrl],
    ['Track order', `${storefrontUrl}/account/track`],
    ['Shipping', `${storefrontUrl}/shipping`],
    ['Returns', `${storefrontUrl}/returns`],
  ]
    .map(([label, href]) => `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" style="font-family:${SANS};font-size:11.5px;color:${BRAND.gold};text-decoration:none;">${escapeHtml(label)}</a>`)
    .join('&nbsp;&nbsp;·&nbsp;&nbsp;');

  const unsubscribe = unsubscribeHref
    ? `<p style="margin:14px 0 0;font-family:${SANS};font-size:11px;line-height:1.6;color:#8d857e;">
        <a href="${escapeHtml(unsubscribeHref)}" target="_blank" rel="noopener" style="color:#8d857e;text-decoration:underline;">Unsubscribe from these emails</a>
       </p>`
    : '';

  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.wine};">
      <tr>
        <td align="center" style="padding:26px 20px 30px;">
          <p style="margin:0 0 10px;">${links}</p>
          <p style="margin:0;font-family:${SERIF};font-size:14px;color:${BRAND.gold};">Vani Collection Atelier</p>
          <p style="margin:6px 0 0;font-family:${SANS};font-size:11.5px;line-height:1.7;color:#c9bfb6;">
            Need a hand? Write to
            <a href="mailto:${escapeHtml(supportEmail)}" style="color:${BRAND.gold};text-decoration:underline;">${escapeHtml(supportEmail)}</a>
            — we answer every message.
          </p>
          ${unsubscribe}
          <p style="margin:14px 0 0;font-family:${SANS};font-size:10.5px;line-height:1.6;color:#8d857e;">
            &copy; ${new Date().getFullYear()} Vani Collection. All rights reserved.
          </p>
        </td>
      </tr>
    </table>`;
}

/**
 * Wraps body markup in the full document: doctype, preheader, brand header, cream card, footer.
 *
 * @param {object} options
 * @param {string} options.preheader  Short text shown in the inbox preview.
 * @param {string} options.body       Inner HTML (already escaped by the caller's helpers).
 * @param {string} options.subject    Used for the document `<title>`.
 * @param {boolean} [options.transactional] Transactional mail omits the unsubscribe link.
 */
function layout({ subject, preheader, body, storefrontUrl, supportEmail, logoUrl, transactional = true, unsubscribeUrl = '' }) {
  // Non-transactional mail keeps the provider-safe `{{unsubscribe}}` token when no explicit link
  // was supplied, so ESPs (Resend, Postmark, Brevo, SES) can substitute their own list-unsubscribe URL.
  const unsubscribeHref = transactional ? '' : unsubscribeUrl || '{{unsubscribe}}';
  return `<!doctype html>
<html lang="en-IN" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(subject)}</title>
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0 !important; padding: 0 !important; width: 100% !important; background: ${BRAND.cream}; }
  a { color: ${BRAND.crimson}; }
  @media screen and (max-width: 600px) {
    .stack { display: block !important; width: 100% !important; padding: 0 0 18px 0 !important; }
    .pad { padding: 24px 18px !important; }
    h1 { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.cream};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;font-size:1px;line-height:1px;">${escapeHtml(preheader || '')}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.cream};">
    <tr>
      <td align="center" style="padding:0;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:#ffffff;">
          <tr><td>${brandHeader({ logoUrl, storefrontUrl })}</td></tr>
          <tr>
            <td class="pad" style="padding:32px 34px 34px;">
              ${body}
            </td>
          </tr>
          <tr><td>${brandFooter({ supportEmail, storefrontUrl, unsubscribeHref })}</td></tr>
        </table>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">
          <tr><td style="padding:14px 20px 28px;font-family:${SANS};font-size:10.5px;color:${BRAND.muted};text-align:center;">
            This message was sent to a Vani Collection customer. Prices are in Indian Rupees and include GST.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Plain-text footer shared by every `text` alternative. */
function textFooter({ supportEmail, storefrontUrl, transactional = true, unsubscribeUrl = '' }) {
  const parts = [
    '',
    '— Vani Collection Atelier, handcrafted in India',
    `Shop: ${storefrontUrl}`,
    `Need help? ${supportEmail}`,
  ];
  if (!transactional) parts.push(`Unsubscribe: ${unsubscribeUrl || '{{unsubscribe}}'}`);
  return `${parts.join('\n')}\n`;
}

module.exports = {
  BRAND,
  SERIF,
  SANS,
  escapeHtml,
  escapeUrl,
  inr,
  dateLabel,
  lines,
  bulletproofButton,
  heading,
  paragraph,
  eyebrow,
  divider,
  keyValue,
  addressBlock,
  orderItemsTable,
  totalsTable,
  layout,
  textFooter,
};
