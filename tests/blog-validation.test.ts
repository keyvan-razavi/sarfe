import assert from 'node:assert/strict';
import test from 'node:test';
import { blogInputSchema, safeBlogLink } from '../src/modules/blog/validation';

const valid = {
  slug:'food-storage-guide',status:'PUBLISHED',coverImage:'/images/grocery/staples.webp',coverAlt:'Pantry staples',tags:['storage'],
  translations:{fa:{title:'راهنمای نگهداری',excerpt:'راهنمای مواد غذایی',blocks:[{id:'p1',type:'paragraph',text:'Use **airtight** containers and ==keep dry==.'}],seoTitle:'راهنمای نگهداری',seoDescription:'نکته‌های نگهداری'},
    ckb:{title:'ڕێنمای هەڵگرتن',excerpt:'ڕێنمای خواردن',blocks:[{id:'p1',type:'paragraph',text:'باشترە.'}],seoTitle:'ڕێنمای هەڵگرتن',seoDescription:'ڕێنمای خواردن'}},
};
test('blog accepts inline markdown and valid localized published content',()=>assert.equal(blogInputSchema.safeParse(valid).success,true));
test('blog relations default to empty, deduplicate choices, and reject self-links',()=>{
  const withoutRelations=blogInputSchema.parse(valid);
  assert.deepEqual(withoutRelations.relatedPostSlugs,[]);
  assert.deepEqual(withoutRelations.relatedProductSlugs,[]);
  const linked=blogInputSchema.parse({...valid,relatedPostSlugs:['another-post','another-post'],relatedProductSlugs:['sample-product','sample-product']});
  assert.deepEqual(linked.relatedPostSlugs,['another-post']);
  assert.deepEqual(linked.relatedProductSlugs,['sample-product']);
  assert.equal(blogInputSchema.safeParse({...valid,relatedPostSlugs:[valid.slug]}).success,false);
  assert.equal(blogInputSchema.safeParse({...valid,relatedPostSlugs:Array.from({length:13},(_,index)=>`post-${index}`)}).success,false);
});
test('blog rejects script/html, unsafe markdown links, and unsupported schemes',()=>{
  for (const text of ['<script>alert(1)</script>','[click](javascript:alert(1))','[bad](https://user:pass@example.test)','[x](http://example.test)']) {
    assert.equal(blogInputSchema.safeParse({...valid,translations:{...valid.translations,fa:{...valid.translations.fa,blocks:[{id:'x',type:'paragraph',text}]}}}).success,false,text);
  }
  assert.equal(safeBlogLink('https://example.test/path'),true);
  assert.equal(safeBlogLink('/products/rice'),true);
  for(const value of ['javascript:alert(1)','//evil.test','/images/../secret','data:text/html,x']) assert.equal(safeBlogLink(value),false,value);
});
test('blog rejects external or traversing media and images without alt',()=>{
  for(const coverImage of ['https://example.test/x.jpg','/images/../private.jpg','/uploads/x.jpg']) assert.equal(blogInputSchema.safeParse({...valid,coverImage}).success,false);
  const block={id:'image',type:'image',url:'/images/grocery/staples.webp',text:''};
  assert.equal(blogInputSchema.safeParse({...valid,translations:{...valid.translations,fa:{...valid.translations.fa,blocks:[block]}}}).success,false);
});
test('published posts require content; drafts may remain incomplete',()=>{
  assert.equal(blogInputSchema.safeParse({...valid,translations:{...valid.translations,fa:{...valid.translations.fa,blocks:[]}}}).success,false);
  assert.equal(blogInputSchema.safeParse({...valid,status:'DRAFT',translations:{...valid.translations,fa:{...valid.translations.fa,blocks:[]}}}).success,true);
});
test('cover images are optional, meaningful alt is required when a cover exists, and block IDs are unique',()=>{
  assert.equal(blogInputSchema.safeParse({...valid,coverImage:'',coverAlt:''}).success,true);
  assert.equal(blogInputSchema.safeParse({...valid,coverAlt:''}).success,false);
  assert.equal(blogInputSchema.safeParse({...valid,status:'DRAFT',coverAlt:''}).success,false);
  const duplicate={...valid,translations:{...valid.translations,fa:{...valid.translations.fa,blocks:[{id:'same',type:'paragraph',text:'one'},{id:'same',type:'paragraph',text:'two'}]}}};
  assert.equal(blogInputSchema.safeParse(duplicate).success,false);
  const empty={...valid,translations:{...valid.translations,fa:{...valid.translations.fa,blocks:[{id:'empty',type:'paragraph',text:'   '}]}}};
  assert.equal(blogInputSchema.safeParse(empty).success,false);
});
