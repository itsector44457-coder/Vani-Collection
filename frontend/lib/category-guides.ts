import type { SeoCategory } from "./seo";

export interface CategoryGuide {
  intro: string;
  paragraphs: string[];
  highlights: string[];
  careTips: string[];
  faqs: { question: string; answer: string }[];
}

const standardFaqs = (name: string) => [
  {
    question: `How do I choose my size in ${name}?`,
    answer:
      "Use the Size Guide and compare your bust, waist and hip measurements with the garment measurements listed on the product page. If you are between two sizes, we usually suggest the larger size for a relaxed, comfortable fit.",
  },
  {
    question: "Is Cash on Delivery available?",
    answer:
      "Yes — Cash on Delivery is available across India. You can also prepay securely with UPI, cards or net banking at checkout. Delivery details for your pin code are shown on the product page before you order.",
  },
  {
    question: "Can I return or exchange a piece?",
    answer:
      "Yes. Unworn pieces with tags intact can be returned or exchanged as per our Returns & Exchanges policy. Message us on WhatsApp after delivery and we will guide you through the pickup and refund or size exchange.",
  },
];

const GUIDES: Record<string, Omit<CategoryGuide, "faqs"> & { faqs?: CategoryGuide["faqs"] }> = {
  "mul-cotton": {
    intro:
      "Feather-light mulmul cotton kurta sets and co-ords that breathe through Indian summers — hand-finished in soft, skin-friendly natural yarn.",
    paragraphs: [
      "Mul cotton (mulmul) is a fine, feather-light cotton weave loved for Indian summers. It does not cling, lets air move through the fabric, and gets softer with every wash — which is why a mul kurta set becomes the piece you reach for on office days, market runs and long afternoons alike.",
      "When you buy mul cotton, check three things: the weave should feel even without rough patches, prints should sit softly on the cloth (not stiff or plastic-like), and stitching should be neat at the neckline and armholes because the fabric is delicate. Natural-fibre pieces in lighter colours can be slightly sheer in strong sunlight, so many shoppers pair them with cotton inners for full-day comfort.",
    ],
    highlights: ["Breathable natural cotton", "Softer with every wash", "All-day summer comfort", "Easy home care"],
    careTips: [
      "Gentle machine wash or hand wash in cold water with dark colours separately.",
      "Dry in shade — direct harsh sun can fade natural prints faster.",
      "Warm iron on the reverse side keeps the weave smooth.",
    ],
  },
  festive: {
    intro:
      "Celebration-ready ethnic sets in rich Indian colours — made for poojas, family functions and festival evenings across India.",
    paragraphs: [
      "Festive dressing in India needs a balance: rich colour and detail that photographs beautifully, but a silhouette you can sit, serve, dance and host in for hours. Our festive edits focus on that balance — flattering necklines, breathable bases under festive dupattas, and embroidery or lace placed where it lifts the outfit without adding weight.",
      "Choose deeper tones like maroon, bottle green and royal blue for evening functions, and turmeric, rani pink or ivory for daytime poojas. If the venue involves a lot of movement, pick a flared Anarkali or a straight set with side slits. Keep jewellery lighter when the dupatta carries heavy borders so the outfit stays balanced.",
    ],
    highlights: ["Rich festive colours", "Comfort-first silhouettes", "Dupatta-led detailing", "Photo-ready finishes"],
    careTips: [
      "Dry-clean heavily embellished pieces; gentle hand wash for lighter festive sets.",
      "Store folded with soft cotton between layers to protect embroidery.",
      "Keep away from perfumes sprayed directly on embellished areas.",
    ],
  },
  anarkalis: {
    intro:
      "Flowy, twirl-ready Anarkali suits that pair classic Indian silhouettes with everyday comfort — for functions, festive days and evenings out.",
    paragraphs: [
      "An Anarkali earns its place in every Indian wardrobe because it works across body types: fitted through the bodice, flowing from the waist, and elegant in motion without needing heavy styling. The flare forgives a festive lunch, the silhouette needs no separate bottom styling, and one good dupatta can take it from a daytime function to an evening out.",
      "While choosing, look at the yoke fit first — it should sit close without pulling at the armholes. Longer lengths pair well with juttis and block heels, while calf-length Anarkalis are easier for travel and smaller functions. Cotton Anarkalis suit daytime wear; richer fabrics and borders suit evenings.",
    ],
    highlights: ["Flattering flow", "Function-to-festive range", "Easy one-piece styling", "Dupatta pairings"],
    careTips: [
      "Hang or roll to store so the flare keeps its fall.",
      "Steam or warm-iron from the reverse side.",
      "Wash embellished yokes gently or dry-clean as directed on the product page.",
    ],
  },
  "coord-sets": {
    intro:
      "Matching top-and-bottom co-ord sets in breathable Indian cotton — put-together looks for office, travel and everyday plans, zero styling effort.",
    paragraphs: [
      "A co-ord set solves the morning problem: top and bottom already matched, proportions already balanced. Indian-cotton co-ords add breathability to that convenience, which is why they have become travel and work-from-office staples from Delhi to Bengaluru.",
      "Fit is what makes a co-ord look premium. The top should sit clean at the shoulder, and the bottom should skim rather than cling. You also get three outfits in one — wear the set together, pair the top with denim, or style the pants with a plain kurta. Check the size guide for both pieces, as bottom measurements matter as much as the bust here.",
    ],
    highlights: ["Ready-matched outfits", "Mix-and-match pieces", "Travel-friendly cotton", "Office-to-outing range"],
    careTips: [
      "Wash both pieces together so colours age evenly.",
      "Turn inside out before washing to protect prints.",
      "Warm iron keeps the set looking crisp.",
    ],
  },
  "kurta-sets": {
    intro:
      "Complete kurta, pant and dupatta sets in breathable Indian fabrics — the everyday-to-festive backbone of an ethnic wardrobe.",
    paragraphs: [
      "A kurta set is the hardest-working outfit in an Indian wardrobe: office in the morning, a family visit in the evening, a pooja on the weekend. The right set comes down to fabric first — cotton and mul for daily wear in Indian heat, richer weaves and embroidery when the occasion calls for more.",
      "Check the pant style as carefully as the kurta. Straight pants keep the look sharp for work, palazzos and relaxed fits are kinder for travel and long days, and a bordered dupatta instantly dresses the same set up. Our size guide lists garment measurements, so compare with a set you already love for the closest fit.",
    ],
    highlights: ["Complete 2 & 3-piece looks", "Day-to-occasion range", "Breathable Indian fabrics", "Clear garment sizing"],
    careTips: [
      "First wash separately in cold water — natural dyes can release a little colour.",
      "Dry in shade and iron on the reverse.",
      "Store dupattas folded flat to protect borders.",
    ],
  },
  sarees: {
    intro:
      "Easy-drape sarees in soft Indian fabrics for functions and festive days — with fall, flow and finishes that photograph beautifully.",
    paragraphs: [
      "A good saree is judged by its drape: it should fall smoothly, hold pleats without fighting you, and stay comfortable through a full function. Lighter cotton and mul sarees are forgiving for beginners and day events, while richer borders and deeper colours carry evening celebrations.",
      "Before you buy, check the blouse-piece details and saree length on the product page. Pair printed sarees with plain blouses to let the print lead, and keep petticoats in matching tones for lighter fabrics. If you drape occasionally, a softer fabric that grips slightly is easier than a very slippery one.",
    ],
    highlights: ["Easy, graceful drape", "Function-ready colours", "Blouse details on each product", "Beginner-friendly fabrics"],
    careTips: [
      "Dry-clean zari or richly bordered sarees; gentle hand wash for cottons.",
      "Refold every few months to avoid permanent crease lines.",
      "Store away from direct sunlight and moisture.",
    ],
  },
};

// Specific buying-question FAQs per category, appended to the standard set.
const EXTRA_FAQS: Record<string, CategoryGuide["faqs"][number]> = {
  "mul-cotton": {
    question: "Is mul cotton see-through?",
    answer:
      "Darker colours and prints are comfortably opaque for daily wear. Very light colours in pure mulmul can be slightly sheer in bright sunlight, so we recommend a cotton inner with pale shades — the product photos and description note this wherever it applies.",
  },
  festive: {
    question: "Will a festive set be heavy to wear for a full function?",
    answer:
      "We keep festive bases breathable and put most embellishment on the dupatta, yoke or borders, so the outfit looks celebration-ready without feeling heavy through a long pooja or evening.",
  },
  anarkalis: {
    question: "Do Anarkalis suit shorter heights?",
    answer:
      "Yes — choose calf-length styles and wear them with a small heel or juttis in a matching tone. A well-fitted yoke and a flare that starts at the natural waist keeps the silhouette balanced.",
  },
  "coord-sets": {
    question: "Can I wear the co-ord pieces separately?",
    answer:
      "Absolutely — that is the point of a good co-ord. The top pairs with denim or plain trousers, and the pants work with kurtas and tees, so one set gives you at least three outfits.",
  },
  "kurta-sets": {
    question: "What is included in a kurta set?",
    answer:
      "Most sets include the kurta and pants; many include a dupatta as well. Every product page lists exactly what is included in the Set Includes section, along with fabric and measurements.",
  },
  sarees: {
    question: "Does the saree include a blouse piece?",
    answer:
      "Most of our sarees include an unstitched blouse piece — the product page confirms this under Set Includes. Stitched blouses shown in photos are for styling reference unless stated otherwise.",
  },
};

/**
 * Guide content for a category landing page. Admin-written `guideContent`/`faqs`/`description`
 * always win; otherwise we fall back to the editorial guides above so every category page carries
 * unique, useful copy instead of a bare product grid.
 */
export function getCategoryGuide(category: SeoCategory | null, slug: string, label: string): CategoryGuide {
  const base = GUIDES[slug];
  const adminParagraphs = (category?.guideContent || "")
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const adminFaqs = (category?.faqs || []).filter((faq) => faq.question?.trim() && faq.answer?.trim());

  const faqs = adminFaqs.length
    ? adminFaqs
    : [
        ...(EXTRA_FAQS[slug] ? [EXTRA_FAQS[slug]] : []),
        ...standardFaqs(label),
      ];

  return {
    intro: category?.description?.trim() || base?.intro || `Explore the latest ${label} at Vani Collection — breathable Indian fabrics, honest pricing and COD available across India.`,
    paragraphs: adminParagraphs.length
      ? adminParagraphs
      : base?.paragraphs || [
          `${label} at Vani Collection are chosen for Indian weather and Indian days — breathable fabrics, fits checked against real garment measurements, and finishing you can see up close in every product photo. Each product page lists fabric, what the set includes, and care instructions, so what you see is what arrives.`,
          `New here? Start with the Size Guide, check delivery for your pin code on any product page, and remember Cash on Delivery is available across India. If you are unsure between two options, message us on WhatsApp and we will happily share close-up photos before you order.`,
        ],
    highlights: base?.highlights || ["Breathable Indian fabrics", "COD available", "Honest garment sizing", "Easy returns"],
    careTips: base?.careTips || [
      "Wash dark colours separately in cold water for the first few washes.",
      "Dry in shade to protect colours and prints.",
      "Follow the fabric-specific care note on each product page.",
    ],
    faqs,
  };
}
