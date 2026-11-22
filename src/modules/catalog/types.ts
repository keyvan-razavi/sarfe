export type AttributeValue = string | number | boolean;
export type LocalizedContent = { fa?: { name?: string; description?: string }; ckb?: { name?: string; description?: string } };
export type BrandLocalizedContent = { fa?: { name?: string }; ckb?: { name?: string } };
export type BrandSummary = { id: string; name: string; slug: string; description: string | null; translations?: BrandLocalizedContent | null };
export type AttributeKind = 'text' | 'number' | 'boolean' | 'select';
export type AttributeDefinition = {
  id: string;
  key: string;
  label: string;
  type: AttributeKind;
  required: boolean;
  options: string[];
};
export type CategorySummary = { id: string; name: string; slug: string; description: string | null; parentId: string | null; translations?: LocalizedContent | null };
export type CatalogVariant = {
  id: string;
  sku: string;
  name: string;
  priceMinor: number;
  currency: string;
  stock: number;
  attributes: Record<string, AttributeValue>;
};
export type ProductSummary = {
  id: string;
  slug: string;
  name: string;
  description: string;
  translations?: LocalizedContent | null;
  category: CategorySummary;
  brand: BrandSummary | null;
  priceMinor: number;
  currency: string;
  image: string | null;
  images: string[];
  featured: boolean;
  variants: CatalogVariant[];
};
export type ProductDetail = ProductSummary & {
  attributes: Record<string, AttributeValue>;
  attributeDefinitions: AttributeDefinition[];
};
export type CatalogResult = { products: ProductSummary[]; categories: CategorySummary[]; mode: 'database' | 'preview' };
export type CategoryResult = { categories: CategorySummary[]; mode: 'database' | 'preview' };
export type BrandResult = { brands: BrandSummary[]; mode: 'database' | 'preview' };
export type ProductResult = { product: ProductDetail | null; mode: 'database' | 'preview' };
