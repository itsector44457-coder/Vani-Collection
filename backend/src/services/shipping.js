const PINCODE_RE = /^[1-9][0-9]{5}$/;
const METRO_PREFIXES = ['11', '12', '13', '14', '20', '21', '22', '40', '41', '50', '56', '60', '70', '78', '79', '80', '81', '82', '83', '84'];

function serviceability(pincode) {
  if (!PINCODE_RE.test(String(pincode))) return { serviceable: false, reason: 'INVALID_PINCODE' };
  const prefix = String(pincode).slice(0, 2);
  const metro = METRO_PREFIXES.includes(prefix);
  const zone = Number(String(pincode)[0]);
  const etaDays = metro ? 3 : zone <= 4 ? 4 : 6;
  return { pincode: String(pincode), serviceable: true, cod: zone <= 6, etaDays, zone: metro ? 'metro' : 'rest', shippingFee: etaDays <= 4 ? 79 : 99, freeAbove: 1999 };
}
module.exports = { PINCODE_RE, serviceability };
