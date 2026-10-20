/**
 * Catalogue search shared by the instant-search endpoint and the product listing.
 *
 * Shoppers do not search like a database: they type Roman Hinglish ("lal kurti"), shop vocabulary
 * ("suit" for a kurta set, "chunni" for a dupatta), colours, sizes, SKUs and small typos
 * ("anarkli"). A single whole-phrase regex misses almost all of that, so search works in concepts:
 *
 *  - the query is split into words, and each word expands to its synonym group;
 *  - a product matches a word when ANY synonym appears in ANY searchable field;
 *  - ranking rewards the exact phrase, name hits and all-words-matched over incidental hits; and
 *  - a small edit-distance pass forgives one or two mistyped letters.
 *
 * Everything here is pure so ranking can be unit-tested without Mongo.
 */

const SYNONYM_GROUPS = [
  ['kurta', 'kurti', 'kurtis', 'kurties'],
  ['suit', 'set', 'coord', 'co-ord', 'coords', 'kurta set'],
  ['saree', 'sari', 'sarees', 'saris'],
  ['dupatta', 'chunni', 'odhni', 'odini'],
  ['mul', 'mulmul', 'malmal'],
  ['cotton', 'suti'],
  ['anarkali', 'anarkalis'],
  ['sharara', 'gharara'],
  ['palazzo', 'plazo', 'palazo', 'pajama', 'pyjama'],
  ['pant', 'pants', 'trouser', 'trousers', 'bottom'],
  ['lehenga', 'ghagra', 'chaniya'],
  ['gown', 'frock', 'dress'],
  ['handblock', 'hand block', 'block print', 'bagru', 'dabu', 'ajrakh'],
  ['festive', 'party', 'shaadi', 'wedding', 'tyohar'],
  ['red', 'lal'],
  ['pink', 'gulabi'],
  ['green', 'hara'],
  ['blue', 'neela'],
  ['yellow', 'peela', 'haldi'],
  ['black', 'kala'],
  ['white', 'safed'],
  ['maroon', 'mehroon'],
];

const SYNONYMS = new Map();
for (const group of SYNONYM_GROUPS) {
  for (const term of group) SYNONYMS.set(term, new Set(group));
}

const SEARCH_FIELDS = [
  'name',
  'slug',
  'description',
  'shortDescription',
  'category',
  'subcategory',
  'fabric',
  'craft',
  'tags',
  'badges',
  'variants.sku',
  'variants.barcode',
  'variants.color',
  'variants.size',
];

function normalizeSearch(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9+ ]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function queryTokens(query) {
  return [...new Set(normalizeSearch(query).split(' ').filter((token) => token.length >= 2 || /^[a-z]$/i.test(token)))].slice(0, 8);
}

/** Every searchable spelling of one query word: itself, sane plurals and its synonym group. */
function expandedTerms(token) {
  const terms = new Set([token]);
  if (token.endsWith('s') && token.length > 3) terms.add(token.slice(0, -1));
  else if (!token.endsWith('s') && token.length > 2) terms.add(`${token}s`);
  for (const term of SYNONYMS.get(token) || []) terms.add(term);
  return [...terms];
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function fieldClauses(term) {
  // One/two-letter tokens are usually sizes (M, XL): match whole words, not any letter inside "Mul".
  const pattern = term.length <= 2 ? `\b${escapeRegExp(term)}\b` : escapeRegExp(term);
  const regex = new RegExp(pattern, 'i');
  return SEARCH_FIELDS.map((field) => ({ [field]: regex }));
}

/** Broad candidate filter: ANY expanded term in ANY field. Ranking happens in memory. */
function candidateFilter(query) {
  const terms = [...new Set(queryTokens(query).flatMap(expandedTerms))];
  return terms.length ? { $or: terms.flatMap(fieldClauses) } : null;
}

/** Listing filter: EVERY query word must match somewhere (synonyms allowed per word). */
function listingSearchFilter(query) {
  const groups = queryTokens(query).map((token) => ({ $or: expandedTerms(token).flatMap(fieldClauses) }));
  return groups.length ? { $and: groups } : null;
}

function plainProduct(product) {
  return typeof product?.toObject === 'function' ? product.toObject() : product || {};
}

function searchableText(product) {
  const item = plainProduct(product);
  const variants = Array.isArray(item.variants) ? item.variants : [];
  return normalizeSearch([
    item.name,
    item.slug,
    item.category,
    item.subcategory,
    item.fabric,
    item.craft,
    item.description,
    item.shortDescription,
    ...(item.tags || []),
    ...(item.badges || []),
    ...variants.flatMap((variant) => [variant.sku, variant.barcode, variant.color, variant.size]),
  ].filter(Boolean).join(' '));
}

/** Short tokens (sizes, SKU fragments) must match a whole word — "an" hiding inside "handblock" is not a hit. */
function includesTerm(text, term) {
  if (!text || !term) return false;
  if (term.includes(' ') || term.length > 3) return text.includes(term);
  return text.split(' ').some((word) => word === term || word.startsWith(term));
}

/** Classic Levenshtein, capped inputs — search words are short. */
function editDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    previous = current;
  }
  return previous[b.length];
}

function fuzzyMatches(token, words) {
  if (token.length < 4) return false;
  const allowed = token.length >= 7 ? 2 : 1;
  return words.some((word) => Math.abs(word.length - token.length) <= allowed && editDistance(token, word) <= allowed);
}

/**
 * Relevance score. Exact phrase/name wins; every matched query word adds up; a product that
 * matches ALL words beats one that matches one word strongly; fuzzy-only hits trail real ones.
 */
function scoreProduct(product, query) {
  const item = plainProduct(product);
  const phrase = normalizeSearch(query);
  const tokens = queryTokens(query);
  if (!phrase || !tokens.length) return 0;

  const name = normalizeSearch(item.name);
  const slug = normalizeSearch(item.slug);
  const category = normalizeSearch([item.category, item.subcategory].filter(Boolean).join(' '));
  const fabric = normalizeSearch([item.fabric, item.craft].filter(Boolean).join(' '));
  const tags = normalizeSearch([...(item.tags || []), ...(item.badges || [])].join(' '));
  const variants = Array.isArray(item.variants) ? item.variants : [];
  const skus = variants.map((variant) => normalizeSearch(variant.sku)).join(' ');
  const allText = searchableText(item);
  const words = [...new Set(allText.split(' ').filter(Boolean))];

  let score = 0;
  if (name === phrase) score += 120;
  else if (name.startsWith(phrase)) score += 70;
  else if (name.includes(phrase)) score += 55;
  if (slug.includes(phrase)) score += 35;
  if (category.includes(phrase)) score += 25;
  if (skus.includes(phrase)) score += 60;

  let matched = 0;
  let fuzzyOnly = 0;
  for (const token of tokens) {
    const terms = expandedTerms(token);
    const inName = terms.some((term) => includesTerm(name, term));
    const inCategory = terms.some((term) => includesTerm(category, term));
    const inFabric = terms.some((term) => includesTerm(fabric, term));
    const inTags = terms.some((term) => includesTerm(tags, term));
    const inSku = terms.some((term) => includesTerm(skus, term));
    const anywhere = inName || inCategory || inFabric || inTags || inSku || terms.some((term) => includesTerm(allText, term));

    if (anywhere) {
      matched += 1;
      if (inName) score += token === name ? 30 : 18;
      if (inSku) score += 22;
      if (inCategory) score += 10;
      if (inFabric) score += 8;
      if (inTags) score += 6;
      if (!inName && !inCategory && !inFabric && !inTags && !inSku) score += 3;
    } else if (fuzzyMatches(token, words)) {
      matched += 1;
      fuzzyOnly += 1;
      score += 4;
    }
  }

  if (matched === tokens.length && tokens.length > 1) score += 25;
  // Partial multi-word hits stay visible but well below products matching every word.
  else if (tokens.length > 1 && matched > 0) score = Math.round(score * (matched / tokens.length) * 0.6);
  if (fuzzyOnly === tokens.length) score -= 2;
  if (item.featured) score += 1;
  return matched ? Math.max(1, score) : 0;
}

function rankProducts(products, query) {
  return (products || [])
    .map((product) => ({ product, score: scoreProduct(product, query) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || new Date(plainProduct(b.product).createdAt || 0) - new Date(plainProduct(a.product).createdAt || 0));
}

module.exports = {
  SEARCH_FIELDS,
  normalizeSearch,
  queryTokens,
  expandedTerms,
  candidateFilter,
  listingSearchFilter,
  searchableText,
  editDistance,
  scoreProduct,
  rankProducts,
};
