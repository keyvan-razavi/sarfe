import type { Locale } from "@/lib/i18n";
import type { ProductSummary } from "@/modules/catalog";

type LocalizedContent = NonNullable<ProductSummary["translations"]>;

const messages = {
  fa: {
    home: "صفحهٔ اصلی", shop: "خرید", approach: "دربارهٔ صرفه", bag: "سبد خرید", menuOpen: "بازکردن فهرست", menuClose: "بستن فهرست", preview: "کاتالوگ پیش‌نمایش", sample: "محصول و تصویر نمونه · فقط برای نمایش", groceries: "خواربار · خوراکی · شوینده", brands: "برندها", allBrands: "همهٔ برندها",
    heroIntro: "خواربار و نیازهای خانه", heroTitle: "خرید خانه، با صرفه", heroAlt: "ترکیب خواربار و کالاهای اساسی روی زمینهٔ سبز، با نوشتهٔ فارسی ارسالی", deliveryAlt: "تصویرسازی ارسالی صرفه از تلفن همراه، سبد خرید و بسته‌های کالا", deliveryCredit: "طرح ارسالی صرفه", heroBody: "برنج، روغن، رب و شوینده‌های خانه در یک کاتالوگ نمونهٔ ساده.", explore: "دیدن کالاها", collection: "کاتالوگ", collectionTitle: "خواربار و کالاهای اساسی خانه.", collectionBody: "برنج و حبوبات، روغن پخت‌وپز، رب گوجه‌فرنگی و شوینده.", search: "جست‌وجو در کالاها", searchButton: "جست‌وجو", all: "همه", pieces: "کالا", piecesPlural: "کالا برای دیدن", in: "در دستهٔ", nothing: "کالایی در این بخش پیدا نشد", tryAgain: "نام کالا را جست‌وجو کنید یا دستهٔ دیگری را ببینید.", seeAll: "دیدن همهٔ کالاها", details: "جزئیات کالا", add: "افزودن به سبد", unavailable: "ناموجود", available: "عدد موجود", aboutTitle: "خواربار و نیازهای روزانهٔ خانه.", aboutBody: "صرفه کاتالوگی برای نمونهٔ کالاهای خوراکی و شوینده است. نام‌ها، تصاویر، قیمت‌ها و موجودی‌ها نمونه هستند و موجودی واقعی فروشگاه را نشان نمی‌دهند.", less: "کالاهای روزمره", footerBody: "فضایی برای خوراک، تندرستی و فرهنگ غذایی، همراه با فروشگاه نیازهای روزمره.", owner: "ورود مدیر", sampleFooter: "پیش‌نمایش · کالاها، تصاویر، قیمت‌ها و موجودی نمونه هستند.", breadcrumb: "کالاها", back: "بازگشت به کالاها", choose: "اندازه یا بسته‌بندی را انتخاب کنید", stock: "موجودی", notAvailable: "فعلاً موجود نیست", addSuccess: "به سبد شما اضافه شد.", viewBag: "دیدن سبد", sampleProduct: "این کالا و اطلاعات آن برای پیش‌نمایش کاتالوگ نمونه هستند.", selected: "خرید شما", yourBag: "سبد خرید", item: "قلم", items: "قلم", emptyTitle: "سبد خرید خالی است.", emptyBody: "برای دیدن کالاهای خواربار و خانه به کاتالوگ بروید.", subtotal: "جمع جزء", shipping: "هزینهٔ ارسال و مالیات احتمالی بعداً مشخص می‌شوند.", checkoutUnavailable: "پرداخت هنوز در دسترس نیست", checkoutNote: "سبد روی این دستگاه ذخیره می‌شود. پرداخت آنلاین هنوز تنظیم نشده است.", each: "برای هر عدد", decrease: "کم کردن", increase: "زیاد کردن", remove: "حذف از سبد", savedSample: "سبد نمونه · کالاها و قیمت‌ها برای پیش‌نمایش هستند.", continue: "ادامهٔ خرید", noOptions: "همهٔ اندازه‌ها فعلاً ناموجودند.", categoryGroceries: "خواربار", categoryStaples: "کالاهای اساسی خوراکی", categoryOils: "روغن خوراکی", categoryPantry: "اقلام انباری", categoryDetergents: "شوینده‌ها", footerShop: "دیدن کالاها", footerBag: "سبد خرید", notFoundTitle: "این صفحه پیدا نشد.", notFoundBody: "صفحهٔ درخواستی در دسترس نیست.", errorTitle: "بارگذاری صفحه با مشکل روبه‌رو شد.", errorBody: "دوباره تلاش کنید.", retry: "تلاش دوباره",
    attribute: { staple_type: "نوع کالای اساسی", package_weight_kg: "وزن بسته", oil_type: "نوع روغن", volume_ml: "حجم", net_weight_g: "وزن خالص", package_type: "نوع بسته‌بندی", detergent_type: "نوع شوینده" },
    errors: { unavailable: "این گزینه فعلاً موجود نیست.", currency: "هر بار فقط می‌توانید اقلام هم‌ارز را به سبد اضافه کنید.", stock: "حداکثر موجودی این گزینه در سبد شماست.", limit: "سبد خرید به سقف مجاز رسیده است." },
  },
  ckb: {
    home: "پەڕەی سەرەکی", shop: "کڕین", approach: "دەربارەی صرفه", bag: "سەبەتە", menuOpen: "کردنەوەی لیست", menuClose: "داخستنی لیست", preview: "کاتالۆگی پێشبینین", sample: "کاڵا و وێنەی نموونە · تەنها بۆ پیشاندان", groceries: "خۆراک · خواربار · پاککەرەوە", brands: "براندەکان", allBrands: "هەموو براندەکان",
    heroIntro: "خۆراک و پێداویستیی ماڵ", heroTitle: "کڕینی ماڵ، لە صرفه", heroAlt: "کۆمەڵێک خۆراک و کاڵای بنەڕەتی لەسەر پاشبنەمای سەوز، لەگەڵ دەقی کوردیی وێنەکە", deliveryAlt: "وێنەسازیی صرفه بۆ مۆبایل، سەبەتەی کڕین و سندوقی کاڵا", deliveryCredit: "وێنەی نێردراوی صرفه", heroBody: "برنج، ڕۆن، ڕەب و پاککەرەوەی ماڵ لە کاتالۆگێکی نموونەی سادەدا.", explore: "بینینی کاڵاکان", collection: "کاتالۆگ", collectionTitle: "خۆراک و پێداویستیی بنەڕەتیی ماڵ.", collectionBody: "برنج و دانەوێڵە، ڕۆنی چێشتلێنان، ڕەبی تەماتە و پاککەرەوە.", search: "گەڕان لە کاڵاکان", searchButton: "گەڕان", all: "هەموو", pieces: "کاڵا", piecesPlural: "کاڵا بۆ بینین", in: "لە پۆلی", nothing: "هیچ کاڵایەک لەم بەشەدا نەدۆزرایەوە", tryAgain: "ناوی کاڵایەک بگەڕێ یان پۆلێکی تر ببینە.", seeAll: "بینینی هەموو کاڵاکان", details: "وردەکاریی کاڵا", add: "زیادکردن بۆ سەبەتە", unavailable: "بەردەست نییە", available: "دانە بەردەستە", aboutTitle: "خۆراک و پێداویستیی ڕۆژانەی ماڵ.", aboutBody: "صرفه کاتالۆگێکی نموونەییە بۆ کاڵای خۆراکی و پاککەرەوە. ناو، وێنە، نرخ و کۆگا نموونەن و کۆگای ڕاستەقینەی فرۆشگا نیشان نادەن.", less: "کاڵای ڕۆژانە", footerBody: "شوێنێک بۆ خۆراک، تەندروستی و کەلتووری خواردن، لەگەڵ فرۆشگای پێداویستیی ڕۆژانە.", owner: "چوونەژوورەوەی بەڕێوەبەر", sampleFooter: "پێشبینین · کاڵا، وێنە، نرخ و کۆگا نموونەن.", breadcrumb: "کاڵاکان", back: "گەڕانەوە بۆ کاڵاکان", choose: "قەبارە یان پاکێج هەڵبژێرە", stock: "لە کۆگا", notAvailable: "ئێستا بەردەست نییە", addSuccess: "زیادکرا بۆ سەبەتەکەت.", viewBag: "بینینی سەبەتە", sampleProduct: "ئەم کاڵا و زانیارییانە بۆ پێشبینینی کاتالۆگی نموونەن.", selected: "کڕینەکەت", yourBag: "سەبەتە", item: "دانە", items: "دانە", emptyTitle: "سەبەتەکەت بەتاڵە.", emptyBody: "بۆ بینینی کاڵاکانی خۆراک و ماڵ بچۆ بۆ کاتالۆگ.", subtotal: "کۆی لاوەکی", shipping: "کرێی گەیاندن و باجی ئەگەری دواتر دیاری دەکرێن.", checkoutUnavailable: "پارەدان هێشتا بەردەست نییە", checkoutNote: "سەبەتەکەت لەم ئامێرەدا پاشەکەوت دەکرێت. پارەدانی ئۆنلاین هێشتا ڕێکنەخراوە.", each: "بۆ هەر دانەیەک", decrease: "کەمکردنەوە", increase: "زیادکردن", remove: "سڕینەوە لە سەبەتە", savedSample: "سەبەتەی نموونە · کاڵا و نرخەکان بۆ پێشبینینن.", continue: "بەردەوام بە لە کڕین", noOptions: "هەموو قەبارەکان ئێستا بەردەست نین.", categoryGroceries: "خۆراک و خواربار", categoryStaples: "کالا خۆراکییە بنەڕەتییەکان", categoryOils: "ڕۆنی خواردن", categoryPantry: "پێداویستیی ئاشپەزخانە", categoryDetergents: "پاککەرەوەکان", footerShop: "بینینی کاڵاکان", footerBag: "سەبەتە", notFoundTitle: "ئەم پەڕەیە نەدۆزرایەوە.", notFoundBody: "پەڕەی داواکراو بەردەست نییە.", errorTitle: "کێشەیەک لە بارکردنی پەڕەدا هەیە.", errorBody: "تکایە دووبارە هەوڵ بدەوە.", retry: "هەوڵدانەوە",
    attribute: { staple_type: "جۆری کاڵای بنەڕەتی", package_weight_kg: "کێشی پاکێج", oil_type: "جۆری ڕۆن", volume_ml: "قەبارە", net_weight_g: "کێشی پاک", package_type: "جۆری پاکێج", detergent_type: "جۆری پاککەرەوە" },
    errors: { unavailable: "ئەم هەڵبژاردەیە ئێستا بەردەست نییە.", currency: "لە هەر جارێکدا تەنها دەتوانیت کاڵای هەمان دراو زیاد بکەیت.", stock: "زۆرترین دانەی بەردەست لەم هەڵبژاردەیە لە سەبەتەکەتدایە.", limit: "سەبەتەکە گەیشتووەتە سنووری ڕێگەپێدراو." },
  },
};

export function storefrontText(locale: Locale) { return messages[locale]; }

export function localizeCartError(error: string | null, locale: Locale) {
  if (!error) return null;
  const t = storefrontText(locale);
  if (error.includes("one currency")) return t.errors.currency;
  if (error.includes("stock limit")) return t.errors.stock;
  if (error.includes("cart has reached")) return t.errors.limit;
  return t.errors.unavailable;
}

export function attributeLabel(key: string, locale: Locale) {
  return messages[locale].attribute[key as keyof typeof messages.fa.attribute] ?? key.replaceAll("_", " ");
}

export function localizeCategory(slug: string, fallback: string, locale: Locale, preview = true, translations?: LocalizedContent | null) {
  if (preview) return translations?.[locale]?.name ?? ({ grocery: messages[locale].categoryGroceries, staples: messages[locale].categoryStaples, oils: messages[locale].categoryOils, pantry: messages[locale].categoryPantry, detergents: messages[locale].categoryDetergents }[slug] ?? fallback);
  return translations?.[locale]?.name ?? fallback;
}

export function localizeProduct<T extends ProductSummary>(product: T, locale: Locale, preview = true): T {
  if (!preview) return { ...product, name: product.translations?.[locale]?.name ?? product.name, description: product.translations?.[locale]?.description ?? product.description, category: { ...product.category, name: localizeCategory(product.category.slug, product.category.name, locale, false, product.category.translations) } };
  return { ...product, name: product.translations?.[locale]?.name ?? product.name, description: product.translations?.[locale]?.description ?? product.description, category: { ...product.category, name: localizeCategory(product.category.slug, product.category.name, locale, true, product.category.translations) } };
}

const valueTranslations: Record<string, { fa: string; ckb: string }> = {
  Rice: { fa: "برنج", ckb: "برنج" }, Lentils: { fa: "عدس", ckb: "نەسک" }, Sunflower: { fa: "آفتابگردان", ckb: "گوڵەبەڕۆژە" }, Jar: { fa: "شیشه", ckb: "قاپی شووشەیی" }, Laundry: { fa: "لباس", ckb: "جل" },
};

export function localizeAttributeValue(key: string, value: string | number | boolean, locale: Locale) {
  if (typeof value === "boolean") return locale === "fa" ? (value ? "بله" : "خیر") : (value ? "بەڵێ" : "نەخێر");
  if (typeof value === "number") {
    const number = new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "ckb-IQ").format(value);
    const unit = key === "package_weight_kg" ? (locale === "fa" ? "کیلوگرم" : "کیلۆگرام") : key === "volume_ml" ? (locale === "fa" ? "میلی‌لیتر" : "مل") : key === "net_weight_g" ? (locale === "fa" ? "گرم" : "گرام") : "";
    return unit ? `${number} ${unit}` : number;
  }
  return valueTranslations[value]?.[locale] ?? value;
}

export function localizeVariantName(name: string, locale: Locale) {
  const match = name.match(/^(\d[\d,]*)\s*(kg|g|ml)(?:\s+(jar))?$/i);
  if (match) {
    const value = Number(match[1].replaceAll(",", ""));
    const key = match[2].toLowerCase() === "kg" ? "package_weight_kg" : match[2].toLowerCase() === "ml" ? "volume_ml" : "net_weight_g";
    return `${localizeAttributeValue(key, value, locale)}${match[3] ? ` · ${locale === "fa" ? "شیشه" : "قاپی شووشەیی"}` : ""}`;
  }
  return valueTranslations[name]?.[locale] ?? name;
}

export function localizeCartName(line: { slug: string; name: string; isPreview: boolean; translations?: LocalizedContent | null }, locale: Locale) {
  return line.isPreview ? line.translations?.[locale]?.name ?? line.name : line.translations?.[locale]?.name ?? line.name;
}
