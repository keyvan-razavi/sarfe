import { PrismaClient, Prisma } from "@prisma/client";
import { loadEnvConfig } from "@next/env";
import {
  categoryTranslations,
  previewCategories,
  previewProducts,
  productTranslations,
} from "../src/modules/catalog/fixtures";

const sampleBlogPosts = [
  {
    slug: "pantry-week-planning",
    coverImage: "/images/grocery/staples.webp",
    coverAlt: "کاسه‌های نمونهٔ حبوبات و برنج روی میز روشن",
    tags: ["برنامه‌ریزی", "آشپزی روزانه", "مواد غذایی"],
    relatedPostSlugs: ["rice-and-legumes", "read-a-food-label", "small-kitchen-prep"],
    relatedProductSlugs: ["berenj-basmati", "adas-khoraki"],
    publishedAt: new Date("2026-11-17T08:00:00.000Z"),
    translations: {
      fa: {
        title: "برنامه‌ریزی ساده برای انباری آشپزخانه",
        excerpt: "با یک فهرست کوتاه می‌شود مواد پایهٔ آشپزی را بهتر دید و خریدهای خانه را منظم‌تر کرد.",
        seoTitle: "برنامه‌ریزی انباری آشپزخانه | صرفه",
        seoDescription: "راهنمایی ساده برای مرتب‌کردن مواد پایه و برنامه‌ریزی خرید هفتگی خانه.",
        blocks: [
          { id: "fa-pantry-intro", type: "paragraph", text: "پیش از نوشتن فهرست خرید، چند دقیقه قفسه‌ها را نگاه کنید. دانستن اینکه چه چیزی دارید، کمک می‌کند خرید تازه با نیاز واقعی خانه هماهنگ باشد." },
          { id: "fa-pantry-heading", type: "heading", level: 2, text: "از چند وعدهٔ آشنا شروع کنید" },
          { id: "fa-pantry-list", type: "bulletList", text: "وعده‌هایی را که خانواده معمولاً می‌پزد یادداشت کنید.\nمواد پایهٔ هر وعده را کنار هم بنویسید.\nپیش از خرید، مقدار باقی‌مانده و اندازهٔ بسته را بررسی کنید." },
          { id: "fa-pantry-quote", type: "quote", text: "یک فهرست کاربردی از برنامهٔ واقعی آشپزخانه شروع می‌شود." },
          { id: "fa-pantry-product-rice", type: "product", text: "", productSlug: "berenj-basmati" },
          { id: "fa-pantry-product-lentils", type: "product", text: "", productSlug: "adas-khoraki" },
        ],
      },
      ckb: {
        title: "پلاندانانێکی سادە بۆ کۆگای چێشتخانە",
        excerpt: "بە لیستێکی کورت دەتوانیت پێداویستییە بنەڕەتییەکانی چێشت لە بیر بمێنن و کڕینی ماڵ ڕێک بخەیت.",
        seoTitle: "پلاندانانی کۆگای چێشتخانە | صرفه",
        seoDescription: "ڕێنماییەکی سادە بۆ ڕێکخستنی پێداویستییە بنەڕەتییەکان و پلاندانانی کڕینی هەفتانە.",
        blocks: [
          { id: "ckb-pantry-intro", type: "paragraph", text: "پێش نووسینی لیستی کڕین، چەند خولەکێک سەیری ڕەفەکان بکە. زانینی ئەوەی لە ماڵدا هەتە، یارمەتیت دەدات کڕینی نوێ لەگەڵ پێویستییەکانی ماڵ بگونجێت." },
          { id: "ckb-pantry-heading", type: "heading", level: 2, text: "لە چەند خواردنێکی ئاشناوە دەست پێ بکە" },
          { id: "ckb-pantry-list", type: "bulletList", text: "ئەو خواردنانە بنووسە کە خێزانەکەت زۆرجار ئامادەیان دەکات.\nپێداویستییە بنەڕەتییەکانی هەر خواردنێک تۆمار بکە.\nپێش کڕین، بڕی ماوە و قەبارەی پاکێجەکە بپشکنە." },
          { id: "ckb-pantry-quote", type: "quote", text: "لیستێکی بەسوود لە پلانی ڕاستەقینەی چێشتخانەوە دەست پێ دەکات." },
          { id: "ckb-pantry-product-rice", type: "product", text: "", productSlug: "berenj-basmati" },
          { id: "ckb-pantry-product-lentils", type: "product", text: "", productSlug: "adas-khoraki" },
        ],
      },
    },
  },
  {
    slug: "rice-and-legumes",
    coverImage: "/images/grocery/rice.webp",
    coverAlt: "برنج خشک در پاکت کاغذی نمونه در کنار چند دانهٔ برنج",
    tags: ["برنج", "حبوبات", "آشپزی روزانه"],
    relatedPostSlugs: ["pantry-week-planning", "small-kitchen-prep"],
    relatedProductSlugs: ["berenj-basmati", "adas-khoraki"],
    publishedAt: new Date("2026-11-16T08:00:00.000Z"),
    translations: {
      fa: {
        title: "برنج و حبوبات را چطور برای آشپزی روزانه آماده کنیم؟",
        excerpt: "نگهداری درست و بررسی مقدار بسته، کار با مواد خشک آشپزخانه را ساده‌تر می‌کند.",
        seoTitle: "نگهداری برنج و حبوبات | صرفه",
        seoDescription: "چند نکتهٔ کاربردی برای نگهداری برنج و حبوبات خشک و آماده‌کردن فهرست خرید.",
        blocks: [
          { id: "fa-grains-intro", type: "paragraph", text: "مواد خشک وقتی در جای تمیز و خشک نگهداری شوند، پیدا کردن و استفاده از آن‌ها آسان‌تر است. برای هر ظرف، نام ماده و زمان بازکردن بسته را یادداشت کنید." },
          { id: "fa-grains-heading", type: "heading", level: 2, text: "اندازه و برچسب را بخوانید" },
          { id: "fa-grains-text", type: "paragraph", text: "اندازهٔ بسته را با فضای نگهداری و مقدار مصرف معمول خانه بسنجید. اگر بسته را به ظرف دیگری منتقل می‌کنید، نام محصول را روی ظرف بنویسید تا با مواد مشابه اشتباه نشود." },
          { id: "fa-grains-image", type: "image", text: "", url: "/images/grocery/staples.webp", alt: "عدس و نخود خشک در کاسه‌های روشن", caption: "نمونه‌ای از مواد خشک برای برنامهٔ آشپزی خانه" },
          { id: "fa-grains-product-rice", type: "product", text: "", productSlug: "berenj-basmati" },
          { id: "fa-grains-product-lentils", type: "product", text: "", productSlug: "adas-khoraki" },
        ],
      },
      ckb: {
        title: "چۆن برنج و دانەوێڵە بۆ چێشتی ڕۆژانە ئامادە بکەین؟",
        excerpt: "پاراستنی دروست و پشکنینی بڕی پاکێج، بەکارهێنانی ماددە وشکەکانی چێشتخانە ئاسانتر دەکات.",
        seoTitle: "پاراستنی برنج و دانەوێڵە | صرفه",
        seoDescription: "چەند تێبینییەکی بەسوود بۆ پاراستنی برنج و دانەوێڵەی وشک و ئامادەکردنی لیستی کڕین.",
        blocks: [
          { id: "ckb-grains-intro", type: "paragraph", text: "ماددە وشکەکان کاتێک لە شوێنێکی پاک و وشک دەپارێزرێن، دۆزینەوە و بەکارهێنانیان ئاسانترە. ناوی ماددەکە و کاتی کردنەوەی پاکێجەکە بنووسە." },
          { id: "ckb-grains-heading", type: "heading", level: 2, text: "قەبارە و لیبێڵ بخوێنەوە" },
          { id: "ckb-grains-text", type: "paragraph", text: "قەبارەی پاکێجەکە لەگەڵ شوێنی پاراستن و بڕی بەکارهێنانی ئاسایی ماڵەکەت بەراورد بکە. ئەگەر ماددەکە دەگوازیتەوە بۆ قاپێکی تر، ناوی لەسەر بنووسە." },
          { id: "ckb-grains-image", type: "image", text: "", url: "/images/grocery/staples.webp", alt: "نەسک و نوخت لە کاسەی ڕووندا", caption: "نموونەی ماددە وشکەکان بۆ پلانی چێشتی ماڵ" },
          { id: "ckb-grains-product-rice", type: "product", text: "", productSlug: "berenj-basmati" },
          { id: "ckb-grains-product-lentils", type: "product", text: "", productSlug: "adas-khoraki" },
        ],
      },
    },
  },
  {
    slug: "read-a-food-label",
    coverImage: "/images/grocery/paste.webp",
    coverAlt: "شیشهٔ نمونهٔ رب گوجه‌فرنگی در کنار گوجهٔ تازه",
    tags: ["راهنمای خرید", "برچسب محصول", "مواد غذایی"],
    relatedPostSlugs: ["pantry-week-planning", "rice-and-legumes", "short-shopping-list"],
    relatedProductSlugs: ["rob-goje", "roghan-aftabgardan"],
    publishedAt: new Date("2026-11-15T08:00:00.000Z"),
    translations: {
      fa: {
        title: "هنگام خرید مواد غذایی چه چیزهایی را روی بسته بخوانیم؟",
        excerpt: "نام محصول، مقدار خالص و اطلاعات نگهداری، از داده‌های ساده‌ای هستند که مقایسهٔ بسته‌ها را آسان می‌کنند.",
        seoTitle: "خواندن برچسب مواد غذایی | صرفه",
        seoDescription: "راهنمایی عمومی برای بررسی نام، مقدار و اطلاعات درج‌شده روی بسته‌بندی مواد غذایی.",
        blocks: [
          { id: "fa-label-intro", type: "paragraph", text: "بسته‌بندی‌های شبیه به هم ممکن است اندازه‌ها یا اطلاعات متفاوتی داشته باشند. چند لحظه برای خواندن نوشته‌های روی بسته وقت بگذارید و اطلاعات مورد نیاز خانه را با هم مقایسه کنید." },
          { id: "fa-label-heading", type: "heading", level: 2, text: "این موارد را بررسی کنید" },
          { id: "fa-label-list", type: "orderedList", text: "نام و نوع محصول را بخوانید.\nمقدار خالص و اندازهٔ هر بسته را بررسی کنید.\nراهنمای نگهداری و تاریخ‌های درج‌شده را پیدا کنید." },
          { id: "fa-label-note", type: "paragraph", text: "این نوشته یک راهنمای عمومی برای خواندن بسته‌بندی است و جایگزین توصیهٔ تخصصی یا بررسی الزامات رسمی برچسب‌گذاری نیست." },
          { id: "fa-label-product-paste", type: "product", text: "", productSlug: "rob-goje" },
          { id: "fa-label-product-oil", type: "product", text: "", productSlug: "roghan-aftabgardan" },
        ],
      },
      ckb: {
        title: "کاتی کڕینی خۆراک، لەسەر پاکێجەکە چی بخوێنینەوە؟",
        excerpt: "ناوی بەرهەم، بڕی پاک و زانیارییەکانی پاراستن لەو زانیارییانەن کە بەراوردکردنی پاکێجەکان ئاسان دەکەن.",
        seoTitle: "خوێندنەوەی لیبێڵی خۆراک | صرفه",
        seoDescription: "ڕێنماییەکی گشتی بۆ پشکنینی ناو، بڕ و زانیارییەکانی سەر پاکێجی خۆراک.",
        blocks: [
          { id: "ckb-label-intro", type: "paragraph", text: "پاکێجی هاوشێوە ڕەنگە قەبارە یان زانیاریی جیاوازیان هەبێت. چەند ساتێک بۆ خوێندنەوەی نووسینەکانی سەر پاکێجەکە دابنێ و ئەو زانیارییانەی ماڵەکەت پێویستی پێیەتی بەراورد بکە." },
          { id: "ckb-label-heading", type: "heading", level: 2, text: "ئەم خاڵانە بپشکنە" },
          { id: "ckb-label-list", type: "orderedList", text: "ناو و جۆری بەرهەم بخوێنەوە.\nبڕی پاک و قەبارەی هەر پاکێجێک بپشکنە.\nڕێنمایی پاراستن و بەروارە نووسراوەکان بدۆزەوە." },
          { id: "ckb-label-note", type: "paragraph", text: "ئەم نووسینە ڕێنماییەکی گشتییە بۆ خوێندنەوەی پاکێج و جێگەی ڕاوێژی پسپۆڕان یان پشکنینی پێداویستییە فەرمییەکانی لیبێڵ ناگرێتەوە." },
          { id: "ckb-label-product-paste", type: "product", text: "", productSlug: "rob-goje" },
          { id: "ckb-label-product-oil", type: "product", text: "", productSlug: "roghan-aftabgardan" },
        ],
      },
    },
  },
  {
    slug: "small-kitchen-prep",
    coverImage: "/images/grocery/staples.webp",
    coverAlt: "کاسه‌های کوچک مواد خشک برای آماده‌سازی آشپزی روزانه",
    tags: ["آشپزی روزانه", "آماده‌سازی", "خوراک"],
    relatedPostSlugs: ["pantry-week-planning", "rice-and-legumes"],
    relatedProductSlugs: ["berenj-basmati", "adas-khoraki"],
    publishedAt: new Date("2026-11-14T08:00:00.000Z"),
    translations: {
      fa: {
        title: "آماده‌سازی آرام‌تر برای آشپزی روزانه",
        excerpt: "چند کار کوچک پیش از شروع آشپزی، پیدا کردن مواد و مرتب نگه‌داشتن فضای کار را ساده‌تر می‌کند.",
        seoTitle: "آماده‌سازی آشپزی روزانه | صرفه",
        seoDescription: "پیشنهادهایی ساده برای چیدن مواد لازم، آماده‌کردن سطح کار و استفاده از اقلام موجود در خانه.",
        blocks: [
          { id: "fa-prep-intro", type: "paragraph", text: "برای شروع، برنامهٔ همان وعده را یک بار بخوانید و مواد لازم را کنار دست بگذارید. لازم نیست همه‌چیز از پیش آماده باشد؛ همین که بدانید چه چیزی کجاست، رفت‌وآمد میان قفسه و سطح کار کمتر می‌شود." },
          { id: "fa-prep-heading", type: "heading", level: 2, text: "پیش از شروع آشپزی" },
          { id: "fa-prep-list", type: "orderedList", text: "مواد لازم را از روی فهرست کنار هم بگذارید.\nسبزی و ابزار مورد نیاز را بشویید و آماده کنید.\nبسته‌ها را ببندید و مواد باقی‌مانده را به جای خود برگردانید." },
          { id: "fa-prep-note", type: "paragraph", text: "اگر برنامه عوض شد، مواد خشک استفاده‌نشده را در ظرف تمیز و خشک نگه دارید و نام آن‌ها را مشخص کنید." },
          { id: "fa-prep-rice", type: "product", text: "", productSlug: "berenj-basmati" },
          { id: "fa-prep-lentils", type: "product", text: "", productSlug: "adas-khoraki" },
        ],
      },
      ckb: {
        title: "ئامادەکارییەکی ئارامتر بۆ چێشتی ڕۆژانە",
        excerpt: "چەند کارێکی بچووک پێش دەستپێکردنی چێشت، دۆزینەوەی ماددەکان و ڕێکخستنی شوێنی کار ئاسانتر دەکات.",
        seoTitle: "ئامادەکاریی چێشتی ڕۆژانە | صرفه",
        seoDescription: "چەند پێشنیارێکی سادە بۆ دانانی ماددە پێویستەکان و ئامادەکردنی شوێنی کار.",
        blocks: [
          { id: "ckb-prep-intro", type: "paragraph", text: "بۆ دەستپێکردن، پلانی ئەو خواردنە یەک جار بخوێنەوە و ماددە پێویستەکان لە نزیک خۆت دابنێ. پێویست ناکات هەموو شتێک پێشوەختە ئامادە بێت؛ زانینی شوێنی شتەکان بەسوودە." },
          { id: "ckb-prep-heading", type: "heading", level: 2, text: "پێش دەستپێکردنی چێشت" },
          { id: "ckb-prep-list", type: "orderedList", text: "ماددە پێویستەکان لەسەر لیستەکە دابنێ.\nسەوزە و ئامرازە پێویستەکان بشۆ و ئامادەیان بکە.\nپاکێجەکان دابخە و ماددەی ماوە بگەڕێنەوە شوێنی خۆی." },
          { id: "ckb-prep-note", type: "paragraph", text: "ئەگەر پلانەکە گۆڕا، ماددە وشکە بەکارهێنەنەکراوەکان لە قاپی پاک و وشکدا دابنێ و ناویان دیاری بکە." },
          { id: "ckb-prep-rice", type: "product", text: "", productSlug: "berenj-basmati" },
          { id: "ckb-prep-lentils", type: "product", text: "", productSlug: "adas-khoraki" },
        ],
      },
    },
  },
  {
    slug: "short-shopping-list",
    coverImage: "/images/grocery/paste.webp",
    coverAlt: "گوجهٔ تازه در کنار شیشهٔ نمونهٔ رب گوجه‌فرنگی",
    tags: ["برنامه‌ریزی خرید", "فهرست خرید", "آشپزی روزانه"],
    relatedPostSlugs: ["read-a-food-label", "pantry-week-planning", "small-kitchen-prep"],
    relatedProductSlugs: ["rob-goje", "roghan-aftabgardan"],
    publishedAt: new Date("2026-11-13T08:00:00.000Z"),
    translations: {
      fa: {
        title: "یک فهرست خرید کوتاه اما کاربردی",
        excerpt: "فهرست خوب از نیازهای واقعی آشپزخانه شروع می‌شود و هنگام خرید قابل مرور می‌ماند.",
        seoTitle: "نوشتن فهرست خرید کاربردی | صرفه",
        seoDescription: "روشی ساده برای یادداشت مواد مورد نیاز، بررسی موجودی و مقایسهٔ اندازهٔ بسته‌ها.",
        blocks: [
          { id: "fa-list-intro", type: "paragraph", text: "به جای نوشتن نام هر چیزی که به ذهنتان می‌رسد، چند وعدهٔ پیش رو را در نظر بگیرید. قفسه‌ها و یخچال را بررسی کنید و فقط چیزهایی را یادداشت کنید که واقعاً کم دارید." },
          { id: "fa-list-heading", type: "heading", level: 2, text: "فهرست را دسته‌بندی کنید" },
          { id: "fa-list-bullets", type: "bulletList", text: "مواد تازه و اقلام یخچالی را جدا بنویسید.\nمواد خشک و بسته‌بندی‌شده را در بخش دیگری بیاورید.\nاندازه یا مقدار مورد نیاز را کنار نام کالا یادداشت کنید." },
          { id: "fa-list-copy", type: "paragraph", text: "در فروشگاه، مقدار خالص و اطلاعات روی بسته را بخوانید. فهرست را پس از خرید به‌روز کنید تا دفعهٔ بعد تصویر روشن‌تری از موجودی خانه داشته باشید." },
          { id: "fa-list-paste", type: "product", text: "", productSlug: "rob-goje" },
          { id: "fa-list-oil", type: "product", text: "", productSlug: "roghan-aftabgardan" },
        ],
      },
      ckb: {
        title: "لیستێکی کورت و بەسوود بۆ کڕین",
        excerpt: "لیستێکی باش لە پێویستییە ڕاستەقینەکانی چێشتخانەوە دەست پێ دەکات و لە کاتی کڕیندا بە ئاسانی دەخوێندرێتەوە.",
        seoTitle: "نووسینی لیستی بەسوودی کڕین | صرفه",
        seoDescription: "ڕێگایەکی سادە بۆ تۆمارکردنی ماددە پێویستەکان، پشکنینی ماوە و بەراوردکردنی قەبارەی پاکێج.",
        blocks: [
          { id: "ckb-list-intro", type: "paragraph", text: "لەبری نووسینی هەر شتێک کە دێتە بیرت، چەند خواردنی داهاتوو لەبەرچاو بگرە. ڕەف و ساردکەرەوەکە بپشکنە و تەنها ئەو شتانە بنووسە کە بەڕاستی کەمە." },
          { id: "ckb-list-heading", type: "heading", level: 2, text: "لیستەکە بەش بەش بکە" },
          { id: "ckb-list-bullets", type: "bulletList", text: "ماددە تازە و شتەکانی ساردکەرەوە جیا بنووسە.\nماددە وشک و پاکێجکراوەکان لە بەشێکی تر دابنێ.\nقەبارە یان بڕی پێویست لە تەنیشت ناوی کاڵاکە بنووسە." },
          { id: "ckb-list-copy", type: "paragraph", text: "لە فرۆشگا بڕی پاک و زانیاریی سەر پاکێجەکە بخوێنەوە. دوای کڕین لیستەکە نوێ بکەرەوە تا جارێکی تر زانیارییەکی ڕوونترت هەبێت." },
          { id: "ckb-list-paste", type: "product", text: "", productSlug: "rob-goje" },
          { id: "ckb-list-oil", type: "product", text: "", productSlug: "roghan-aftabgardan" },
        ],
      },
    },
  },
];

async function main(): Promise<void> {
  loadEnvConfig(process.cwd());

  if (!process.env.DATABASE_URL)
    throw new Error(
      "Set DATABASE_URL before seeding; preview fixtures are not written to the database.",
    );

  const prisma = new PrismaClient();
  try {
    const categoryIds = new Map<string, string>();
    for (const category of previewCategories) {
      const translations = categoryTranslations[category.slug] ?? {};
      const parentId = category.parentId
        ? (categoryIds.get(
            previewCategories.find((item) => item.id === category.parentId)
              ?.slug ?? "",
          ) ?? null)
        : null;
      const row = await prisma.category.upsert({
        where: { slug: category.slug },
        update: {
          name: category.name,
          description: category.description,
          translations,
          parentId,
        },
        create: {
          name: category.name,
          slug: category.slug,
          description: category.description,
          translations,
          parentId,
        },
      });
      categoryIds.set(category.slug, row.id);
    }
    await prisma.product.updateMany({
      where: {
        slug: {
          in: [
            "arc-oak-tray",
            "still-table-lamp",
            "field-radio",
            "everyday-canvas-tote",
          ],
        },
      },
      data: { status: "DRAFT" },
    });
    for (const sampleCategory of previewCategories) {
      const categoryId = categoryIds.get(sampleCategory.slug)!;
      const definitions =
        previewProducts.find(
          (product) => product.category.slug === sampleCategory.slug,
        )?.attributeDefinitions ?? [];
      await prisma.$transaction(async (tx) => {
        await tx.attributeDefinition.deleteMany({ where: { categoryId } });
        if (definitions.length)
          await tx.attributeDefinition.createMany({
            data: definitions.map((definition, sortOrder) => ({
              categoryId,
              key: definition.key,
              label: definition.label,
              type: definition.type,
              required: definition.required,
              options: definition.options.length
                ? definition.options
                : Prisma.JsonNull,
              sortOrder,
            })),
          });
      });
    }
    for (const sample of previewProducts) {
      const categoryId = categoryIds.get(sample.category.slug)!;
      const translations = productTranslations[sample.slug] ?? {};
      await prisma.$transaction(async (tx) => {
        const product = await tx.product.upsert({
          where: { slug: sample.slug },
          update: {
            categoryId,
            name: sample.name,
            description: sample.description,
            translations,
            attributes: sample.attributes as Prisma.InputJsonValue,
            images: sample.images,
            featured: sample.featured,
            status: "PUBLISHED",
          },
          create: {
            categoryId,
            slug: sample.slug,
            name: sample.name,
            description: sample.description,
            translations,
            attributes: sample.attributes as Prisma.InputJsonValue,
            images: sample.images,
            featured: sample.featured,
            status: "PUBLISHED",
          },
        });
        for (const variant of sample.variants)
          await tx.variant.upsert({
            where: { sku: variant.sku },
            update: {
              productId: product.id,
              name: variant.name,
              priceMinor: variant.priceMinor,
              currency: variant.currency,
              stock: variant.stock,
              attributes: variant.attributes as Prisma.InputJsonValue,
            },
            create: {
              productId: product.id,
              sku: variant.sku,
              name: variant.name,
              priceMinor: variant.priceMinor,
              currency: variant.currency,
              stock: variant.stock,
              attributes: variant.attributes as Prisma.InputJsonValue,
            },
          });
      });
    }
    for (const post of sampleBlogPosts) {
      await prisma.blogPost.upsert({
        where: { slug: post.slug },
        update: {
          status: "PUBLISHED",
          coverImage: post.coverImage,
          coverAlt: post.coverAlt,
          tags: post.tags,
          relatedPostSlugs: post.relatedPostSlugs,
          relatedProductSlugs: post.relatedProductSlugs,
          translations: post.translations as Prisma.InputJsonValue,
          publishedAt: post.publishedAt,
        },
        create: {
          slug: post.slug,
          status: "PUBLISHED",
          coverImage: post.coverImage,
          coverAlt: post.coverAlt,
          tags: post.tags,
          relatedPostSlugs: post.relatedPostSlugs,
          relatedProductSlugs: post.relatedProductSlugs,
          translations: post.translations as Prisma.InputJsonValue,
          publishedAt: post.publishedAt,
        },
      });
    }
    console.log(
      `Seeded ${previewCategories.length} categories, ${previewProducts.length} published products, and ${sampleBlogPosts.length} linked blog posts.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: unknown) => {
  console.error("Database seed failed:", error);
  process.exitCode = 1;
});
