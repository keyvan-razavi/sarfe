import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCategoryHierarchy, categoryInputSchema, isSupportedImagePayload, productInputSchema, safeCatalogImagePaths, validateAttributeValues } from '../src/modules/catalog/validation';
import { isSupportedCurrency } from '../src/lib/currency';
import { previewProducts } from '../src/modules/catalog/fixtures';

const variants = [{ sku: 'A-1', name: 'Walnut', priceMinor: 1500, currency: 'USD', stock: 3, attributes: { finish: 'Walnut' } }];
test('product configuration accepts optional base attributes when required values are supplied per variant', () => {
  const parsed = productInputSchema.parse({ categoryId: 'cat', slug: 'wood-tray', name: 'Tray', description: 'A tray', status: 'DRAFT', attributes: {}, variants });
  const defs = [{ key: 'finish', label: 'Finish', type: 'select', required: true, options: ['Walnut'] }];
  assert.equal(validateAttributeValues(defs.map((d) => ({ ...d, required: false })), parsed.attributes).success, true);
  assert.equal(validateAttributeValues(defs, { ...parsed.attributes, ...parsed.variants[0]!.attributes }).success, true);
});
test('category schema rejects duplicate definitions and malformed translations', () => {
  assert.equal(categoryInputSchema.safeParse({name:'Home',slug:'home',attributes:[{key:'tone',label:'Tone',type:'text'},{key:'tone',label:'Tone again',type:'text'}]}).success, false);
  assert.equal(categoryInputSchema.safeParse({name:'Home',slug:'home',translations:{fa:{name:4}}}).success, false);
});
test('product schema requires one valid currency and unique stable variant IDs', () => {
  assert.equal(isSupportedCurrency('ZZZ'),false);
  assert.equal(productInputSchema.safeParse({categoryId:'c',slug:'one',name:'One',description:'Item',status:'DRAFT',variants:[...variants,{...variants[0]!,sku:'A-2',currency:'ZZZ'}]}).success,false);
  assert.equal(productInputSchema.safeParse({categoryId:'c',slug:'one',name:'One',description:'Item',status:'DRAFT',variants:[{...variants[0]!,id:'same'},{...variants[0]!,id:'same',sku:'A-2'}]}).success,false);
});
test('category hierarchy validation rejects self and descendant cycles while allowing another branch', async () => {
 const parents:Record<string,string|null>={root:null,child:'root',leaf:'child',other:null};
 const getParent=async(id:string)=>parents[id];
 await assert.rejects(assertCategoryHierarchy('root','leaf',getParent),/cannot be its own parent/);
 await assert.rejects(assertCategoryHierarchy('child','leaf',getParent),/cannot be its own parent/);
 await assert.doesNotReject(assertCategoryHierarchy('child','other',getParent));
});
test('attribute values reject unknown keys and unconfigured select options', () => {
 const defs=[{key:'finish',label:'Finish',type:'select',required:true,options:['Oak']}];
 assert.deepEqual(validateAttributeValues(defs,{finish:'Oak'}),{success:true,data:{finish:'Oak'}});
 assert.equal(validateAttributeValues(defs,{finish:'Walnut'}).success,false);
 assert.equal(validateAttributeValues(defs,{finish:'Oak',extra:true}).success,false);
});
test('grocery preview products have valid image paths and category-matched product and variant attributes', () => {
 for (const product of previewProducts) {
  const parsed = productInputSchema.safeParse({
   categoryId: product.category.id, slug: product.slug, name: product.name, description: product.description,
   image: product.image, images: product.images, featured: product.featured, status: 'PUBLISHED',
   attributes: product.attributes, variants: product.variants,
  });
  assert.equal(parsed.success, true, `${product.slug} should satisfy product input schema`);
  assert.equal(validateAttributeValues(product.attributeDefinitions, product.attributes).success, true, `${product.slug} base attributes should be valid`);
  for (const variant of product.variants) {
   assert.equal(validateAttributeValues(product.attributeDefinitions, variant.attributes).success, true, `${variant.sku} attributes should match its category`);
  }
 }
});
test('product image schema accepts safe local assets and rejects unsafe relative paths', () => {
 const input = { categoryId:'c', slug:'local-image', name:'Local image', description:'Preview', status:'DRAFT', variants };
 assert.equal(productInputSchema.safeParse({ ...input, image:'/images/grocery/rice.png', images:['/images/grocery/rice.png'] }).success, true);
 assert.equal(productInputSchema.safeParse({ ...input, image:'/api/media/123e4567-e89b-12d3-a456-426614174000.webp' }).success, true);
 for (const unsafe of ['https://images.example.com/rice.jpg', '/images/../../secret.png', '/images//host/path.png', '//example.com/image.png', 'javascript:alert(1)']) {
  assert.equal(productInputSchema.safeParse({ ...input, image:unsafe, images:[unsafe] }).success, false, `${unsafe} should be rejected`);
 }
});
test('catalog display filters strip legacy remote and malformed images without changing persisted data', () => {
 const legacy = ['https://images.unsplash.com/photo-1', '/images/grocery/rice.png', '/api/media/123e4567-e89b-12d3-a456-426614174000.webp', '/images/../../private.png'];
 assert.deepEqual(safeCatalogImagePaths(legacy), ['/images/grocery/rice.png', '/api/media/123e4567-e89b-12d3-a456-426614174000.webp']);
 assert.deepEqual(legacy, ['https://images.unsplash.com/photo-1', '/images/grocery/rice.png', '/api/media/123e4567-e89b-12d3-a456-426614174000.webp', '/images/../../private.png']);
});
test('image uploads require matching JPEG, PNG, or WebP content signatures', () => {
 assert.equal(isSupportedImagePayload(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]), 'image/jpeg'), true);
 assert.equal(isSupportedImagePayload(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/png'), true);
 assert.equal(isSupportedImagePayload(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]), 'image/webp'), true);
 assert.equal(isSupportedImagePayload(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), 'image/jpeg'), false);
 assert.equal(isSupportedImagePayload(new TextEncoder().encode('<svg/>'), 'image/svg+xml'), false);
});
