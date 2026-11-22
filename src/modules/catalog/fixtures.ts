import type { CategorySummary, LocalizedContent, ProductDetail } from "./types";
import { tomanToIrrMinor } from "@/lib/store-money";

export const categoryTranslations: Record<string, LocalizedContent> = {
  grocery: {
    fa: {
      name: "خواربار",
      description: "کالاهای پرکاربرد خوراکی و خانه برای خرید روزمره.",
    },
    ckb: {
      name: "خۆراک و خواربار",
      description: "پێداویستییە خۆراکی و ماڵییەکانی کڕینی ڕۆژانە.",
    },
  },
  staples: {
    fa: {
      name: "کالاهای اساسی خوراکی",
      description: "برنج و حبوبات برای آشپزی روزانه.",
    },
    ckb: {
      name: "کالا خۆراکییە بنەڕەتییەکان",
      description: "برنج و دانەوێڵە بۆ چێشتلێنانی ڕۆژانە.",
    },
  },
  oils: {
    fa: {
      name: "روغن خوراکی",
      description: "روغن‌های پخت‌وپز در بسته‌بندی‌های گوناگون.",
    },
    ckb: {
      name: "ڕۆنی خواردن",
      description: "ڕۆنی چێشتلێنان بە پێوانەی جیاواز.",
    },
  },
  pantry: {
    fa: {
      name: "اقلام انباری",
      description: "رب گوجه‌فرنگی و مواد کاربردی آشپزخانه.",
    },
    ckb: {
      name: "پێداویستییەکانی ئاشپەزخانە",
      description: "ڕەبی تەماتە و کاڵای بەسوودی ئاشپەزخانە.",
    },
  },
  detergents: {
    fa: {
      name: "شوینده‌ها",
      description: "شوینده‌های معمول خانه با اندازه‌های مشخص.",
    },
    ckb: {
      name: "پاککەرەوەکان",
      description: "پاککەرەوەی ماڵ بە پێوانەی دیاریکراو.",
    },
  },
};

export const productTranslations: Record<string, LocalizedContent> = {
  "berenj-basmati": {
    fa: {
      name: "برنج باسماتی",
      description:
        "برنج باسماتی برای پلو و غذاهای روزانه؛ بسته‌بندی نمونه در دو وزن.",
    },
    ckb: {
      name: "برنجی باسماتی",
      description:
        "برنجی باسماتی بۆ پڵاو و خواردنی ڕۆژانە؛ پاکێجی نموونە بە دوو کێش.",
    },
  },
  "roghan-aftabgardan": {
    fa: {
      name: "روغن آفتابگردان",
      description:
        "روغن خوراکی آفتابگردان برای پخت‌وپز؛ نمونهٔ کاتالوگ در دو حجم.",
    },
    ckb: {
      name: "ڕۆنی گوڵەبەڕۆژە",
      description:
        "ڕۆنی خواردنی گوڵەبەڕۆژە بۆ چێشتلێنان؛ نموونەی کاتالۆگ بە دوو قەبارە.",
    },
  },
  "rob-goje": {
    fa: {
      name: "رب گوجه‌فرنگی",
      description: "رب گوجه‌فرنگی برای سس و خوراک؛ ظرف‌های نمونه با وزن مشخص.",
    },
    ckb: {
      name: "ڕەبی تەماتە",
      description:
        "ڕەبی تەماتە بۆ سۆس و خواردن؛ قاپی نموونە بە کێشی دیاریکراو.",
    },
  },
  "adas-khoraki": {
    fa: {
      name: "عدس خوراکی",
      description:
        "عدس خشک برای سوپ و غذاهای خانگی؛ بسته‌بندی نمونه در دو وزن.",
    },
    ckb: {
      name: "نەسکی خواردن",
      description:
        "نەسکی وشک بۆ شۆربا و خواردنی ماڵەوە؛ پاکێجی نموونە بە دوو کێش.",
    },
  },
  "shooyande-lebas": {
    fa: {
      name: "مایع شویندهٔ لباس",
      description: "شویندهٔ لباس با حجم مشخص برای شست‌وشوی معمول خانه.",
    },
    ckb: {
      name: "مایعی پاککەرەوەی جل",
      description: "پاککەرەوەی جل بە قەبارەی دیاریکراو بۆ شۆردنی ئاسایی.",
    },
  },
};

export const previewCategories: CategorySummary[] = [
  {
    id: "cat-grocery",
    name: "Groceries",
    slug: "grocery",
    description: "Everyday food and household essentials.",
    parentId: null,
  },
  {
    id: "cat-staples",
    name: "Essential food staples",
    slug: "staples",
    description: "Rice and legumes for everyday cooking.",
    parentId: "cat-grocery",
  },
  {
    id: "cat-oils",
    name: "Cooking oils",
    slug: "oils",
    description: "Cooking oil in practical package sizes.",
    parentId: "cat-grocery",
  },
  {
    id: "cat-pantry",
    name: "Pantry",
    slug: "pantry",
    description: "Tomato paste and kitchen basics.",
    parentId: "cat-grocery",
  },
  {
    id: "cat-detergents",
    name: "Detergents",
    slug: "detergents",
    description: "Household cleaning essentials.",
    parentId: "cat-grocery",
  },
];

const definitionsByCategory = {
  staples: [
    {
      id: "a-staple-type",
      key: "staple_type",
      label: "Staple type",
      type: "select" as const,
      required: true,
      options: ["Rice", "Lentils"],
    },
    {
      id: "a-package-weight",
      key: "package_weight_kg",
      label: "Package weight (kg)",
      type: "number" as const,
      required: true,
      options: [],
    },
  ],
  oils: [
    {
      id: "a-oil-type",
      key: "oil_type",
      label: "Oil type",
      type: "select" as const,
      required: true,
      options: ["Sunflower"],
    },
    {
      id: "a-volume",
      key: "volume_ml",
      label: "Volume (ml)",
      type: "number" as const,
      required: true,
      options: [],
    },
  ],
  pantry: [
    {
      id: "a-net-weight",
      key: "net_weight_g",
      label: "Net weight (g)",
      type: "number" as const,
      required: true,
      options: [],
    },
    {
      id: "a-package-type",
      key: "package_type",
      label: "Package type",
      type: "select" as const,
      required: true,
      options: ["Jar"],
    },
  ],
  detergents: [
    {
      id: "a-detergent-type",
      key: "detergent_type",
      label: "Detergent type",
      type: "select" as const,
      required: true,
      options: ["Laundry"],
    },
    {
      id: "a-detergent-volume",
      key: "volume_ml",
      label: "Volume (ml)",
      type: "number" as const,
      required: true,
      options: [],
    },
  ],
};

const category = (slug: string) =>
  previewCategories.find((item) => item.slug === slug)!;
// Local sample assets keep preview mode independent from external image hosts.
// Product images remain editable from the owner CMS before a live store launch.
const publicPlaceholderImages: Record<string, string> = {
  rice: "/images/grocery/rice.webp",
  oil: "/images/grocery/oil.webp",
  paste: "/images/grocery/paste.webp",
  staples: "/images/grocery/staples.webp",
  detergent: "/images/grocery/detergent.webp",
};
const image = (name: string) => publicPlaceholderImages[name] ?? publicPlaceholderImages.staples!;

export const previewProducts: ProductDetail[] = [
  // Prices are illustrative preview values in toman, stored as IRR minor units.
  // They are not current market prices or inventory quotes.
  {
    id: "p-rice",
    slug: "berenj-basmati",
    name: "Basmati rice",
    description:
      "Basmati rice for pilaf and everyday meals; sample catalog packs in two weights.",
    category: category("staples"),
    brand: null,
    priceMinor: tomanToIrrMinor(89_000),
    currency: "IRR",
    image: image("rice"),
    images: [image("rice")],
    featured: true,
    attributes: { staple_type: "Rice", package_weight_kg: 1 },
    attributeDefinitions: definitionsByCategory.staples,
    variants: [
      {
        id: "v-rice-1kg",
        sku: "STAPLE-RICE-1KG",
        name: "1 kg",
        priceMinor: tomanToIrrMinor(89_000),
        currency: "IRR",
        stock: 24,
        attributes: { staple_type: "Rice", package_weight_kg: 1 },
      },
      {
        id: "v-rice-5kg",
        sku: "STAPLE-RICE-5KG",
        name: "5 kg",
        priceMinor: tomanToIrrMinor(399_000),
        currency: "IRR",
        stock: 12,
        attributes: { staple_type: "Rice", package_weight_kg: 5 },
      },
    ],
  },
  {
    id: "p-oil",
    slug: "roghan-aftabgardan",
    name: "Sunflower cooking oil",
    description:
      "Sunflower cooking oil for everyday preparation; catalog sample in two volumes.",
    category: category("oils"),
    brand: null,
    priceMinor: tomanToIrrMinor(79_000),
    currency: "IRR",
    image: image("oil"),
    images: [image("oil")],
    featured: false,
    attributes: { oil_type: "Sunflower", volume_ml: 900 },
    attributeDefinitions: definitionsByCategory.oils,
    variants: [
      {
        id: "v-oil-900ml",
        sku: "OIL-SUNFLOWER-900ML",
        name: "900 ml",
        priceMinor: tomanToIrrMinor(79_000),
        currency: "IRR",
        stock: 18,
        attributes: { oil_type: "Sunflower", volume_ml: 900 },
      },
      {
        id: "v-oil-1800ml",
        sku: "OIL-SUNFLOWER-1800ML",
        name: "1,800 ml",
        priceMinor: tomanToIrrMinor(145_000),
        currency: "IRR",
        stock: 10,
        attributes: { oil_type: "Sunflower", volume_ml: 1800 },
      },
    ],
  },
  {
    id: "p-tomato-paste",
    slug: "rob-goje",
    name: "Tomato paste",
    description:
      "Tomato paste for sauces and home cooking; sample jars with stated net weights.",
    category: category("pantry"),
    brand: null,
    priceMinor: tomanToIrrMinor(45_000),
    currency: "IRR",
    image: image("paste"),
    images: [image("paste")],
    featured: false,
    attributes: { net_weight_g: 400, package_type: "Jar" },
    attributeDefinitions: definitionsByCategory.pantry,
    variants: [
      {
        id: "v-paste-400g",
        sku: "PANTRY-PASTE-400G",
        name: "400 g jar",
        priceMinor: tomanToIrrMinor(45_000),
        currency: "IRR",
        stock: 21,
        attributes: { net_weight_g: 400, package_type: "Jar" },
      },
      {
        id: "v-paste-800g",
        sku: "PANTRY-PASTE-800G",
        name: "800 g jar",
        priceMinor: tomanToIrrMinor(79_000),
        currency: "IRR",
        stock: 9,
        attributes: { net_weight_g: 800, package_type: "Jar" },
      },
    ],
  },
  {
    id: "p-lentils",
    slug: "adas-khoraki",
    name: "Dry lentils",
    description:
      "Dry lentils for soups and home cooking; sample packs in two weights.",
    category: category("staples"),
    brand: null,
    priceMinor: tomanToIrrMinor(59_000),
    currency: "IRR",
    image: image("staples"),
    images: [image("staples")],
    featured: false,
    attributes: { staple_type: "Lentils", package_weight_kg: 1 },
    attributeDefinitions: definitionsByCategory.staples,
    variants: [
      {
        id: "v-lentils-1kg",
        sku: "STAPLE-LENTILS-1KG",
        name: "1 kg",
        priceMinor: tomanToIrrMinor(59_000),
        currency: "IRR",
        stock: 20,
        attributes: { staple_type: "Lentils", package_weight_kg: 1 },
      },
      {
        id: "v-lentils-2kg",
        sku: "STAPLE-LENTILS-2KG",
        name: "2 kg",
        priceMinor: tomanToIrrMinor(109_000),
        currency: "IRR",
        stock: 11,
        attributes: { staple_type: "Lentils", package_weight_kg: 2 },
      },
    ],
  },
  {
    id: "p-laundry-detergent",
    slug: "shooyande-lebas",
    name: "Laundry detergent",
    description:
      "Laundry detergent in a stated volume for routine household washing.",
    category: category("detergents"),
    brand: null,
    priceMinor: tomanToIrrMinor(99_000),
    currency: "IRR",
    image: image("detergent"),
    images: [image("detergent")],
    featured: false,
    attributes: { detergent_type: "Laundry", volume_ml: 1000 },
    attributeDefinitions: definitionsByCategory.detergents,
    variants: [
      {
        id: "v-detergent-1l",
        sku: "DETERGENT-LAUNDRY-1L",
        name: "1,000 ml",
        priceMinor: tomanToIrrMinor(99_000),
        currency: "IRR",
        stock: 15,
        attributes: { detergent_type: "Laundry", volume_ml: 1000 },
      },
    ],
  },
];
