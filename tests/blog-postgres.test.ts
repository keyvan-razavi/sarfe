import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID } from 'node:crypto';
import test from 'node:test';
import { loadEnvConfig } from '@next/env';
Object.assign(globalThis,{AsyncLocalStorage});
const enabled=process.env.SARFE_TEST_POSTGRES==='1';
if(enabled) loadEnvConfig(process.cwd());
const databaseName=(url:string)=>new URL(url).pathname.replace(/^\//,'');
async function requestContext<T>(run:()=>Promise<T>):Promise<T>{
 const [{HeadersAdapter},{RequestCookies,ResponseCookies},{workAsyncStorage},{workUnitAsyncStorage}]=await Promise.all([
  import('next/dist/server/web/spec-extension/adapters/headers'),import('next/dist/server/web/spec-extension/cookies'),
  import('next/dist/server/app-render/work-async-storage.external'),import('next/dist/server/app-render/work-unit-async-storage.external')]);
 const incomingHeaders=new Headers({host:'localhost:3000',origin:'http://localhost:3000'});
 const requestCookies=new RequestCookies(incomingHeaders);const responseCookies=new ResponseCookies(new Headers());
 const workStore={route:'/admin',page:'/admin/page',forceStatic:false,dynamicShouldError:false};
 const workUnitStore={type:'request',phase:'action',implicitTags:[],url:{pathname:'/admin',search:''},headers:HeadersAdapter.seal(incomingHeaders),cookies:requestCookies,mutableCookies:responseCookies,userspaceMutableCookies:responseCookies,draftMode:{},rootParams:{},resumeDataCache:null};
 return workAsyncStorage.run(workStore as never,()=>workUnitAsyncStorage.run(workUnitStore as never,run));
}
test('blog authorization, persistence, publication filters, tags, uniqueness, and product validation', {skip:!enabled},async()=>{
 const testUrl=process.env.TEST_DATABASE_URL;
 if(!testUrl) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test.');
 if(!['postgres:','postgresql:'].includes(new URL(testUrl).protocol)||!databaseName(testUrl).endsWith('_test')) throw new Error('TEST_DATABASE_URL must point to a dedicated PostgreSQL _test database.');
 const previous=process.env.DATABASE_URL; if(previous&&databaseName(previous)===databaseName(testUrl)) throw new Error('TEST_DATABASE_URL must differ from DATABASE_URL.');
 process.env.DATABASE_URL=testUrl;
 const salt=randomBytes(16); const password='blog-test-'+randomUUID();
 const {scrypt}=await import('node:crypto');
 const key=await new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,64,{N:32768,r:8,p:1,maxmem:64*1024*1024},(e,k)=>e?reject(e):resolve(k as Buffer)));
 process.env.ADMIN_EMAIL='blog-owner@example.test';process.env.ADMIN_PASSWORD_HASH=`scrypt$32768$8$1$${salt.toString('hex')}$${key.toString('hex')}`;process.env.SESSION_SECRET=randomBytes(32).toString('hex');
 const [{prisma},identity,admin,blog]=await Promise.all([import('../src/lib/db'),import('../src/modules/identity'),import('../src/modules/blog/admin'),import('../src/modules/blog')]);
 const prefix='blog-it-'+randomUUID().replaceAll('-','');const slug=prefix+'-guide';let connected=false;let categoryId:string|undefined;let productId:string|undefined;
 const fa={title:'راهنمای آزمون',excerpt:'متن آزمون',blocks:[{id:'b1',type:'paragraph' as const,text:'متن'}],seoTitle:'راهنما',seoDescription:'توضیح'};
 const post={slug,status:'PUBLISHED' as const,coverImage:'/images/grocery/staples.webp',coverAlt:'قفسه',tags:['testing'],translations:{fa}};
 try {
  await prisma.$connect();connected=true;
  await requestContext(async()=>{
   await assert.rejects(admin.listManageableBlogPosts(),/Sign in to manage the catalog/);
   await assert.rejects(admin.saveBlogPost(post),/Sign in to manage the catalog/);
   await assert.rejects(admin.getManageableBlogPost('missing'),/Sign in to manage the catalog/);
   await assert.rejects(admin.deleteBlogPost('missing'),/Sign in to manage the catalog/);
   assert.equal(await identity.loginOwner(process.env.ADMIN_EMAIL!,password),true);
   const connectedUrl=process.env.DATABASE_URL;delete process.env.DATABASE_URL;
   await assert.rejects(admin.saveBlogPost(post),/preview mode/);
   process.env.DATABASE_URL=connectedUrl;
   const category=await prisma.category.create({data:{name:prefix,slug:prefix}});categoryId=category.id;
   const product=await prisma.product.create({data:{categoryId:category.id,name:'Blog product test',slug:prefix+'-product',description:'Published product reference',status:'PUBLISHED'}});productId=product.id;
   const catalog=await import('../src/modules/catalog');
   assert.equal((await catalog.getProductBySlug(prefix+'-product')).product?.id,product.id);
   const relatedSlug=prefix+'-related-guide';
   await admin.saveBlogPost({...post,slug:relatedSlug,translations:{fa:{...fa,title:'نوشتۀ مرتبط'}}});
   const linkedPost={...post,relatedPostSlugs:[relatedSlug],relatedProductSlugs:[prefix+'-product']};
   const id=await admin.saveBlogPost(linkedPost);
   const initial=(await blog.getBlogPostBySlug(slug)).post!;assert.equal(initial.id,id);
   assert.deepEqual(initial.relatedPostSlugs,[relatedSlug]);assert.deepEqual(initial.relatedProductSlugs,[prefix+'-product']);
   assert.deepEqual((await blog.getRelatedBlogPosts(initial.relatedPostSlugs)).map((item)=>item.slug),[relatedSlug]);
   const list=await blog.getBlogPosts({tag:'testing',search:'راهنمای'});assert.equal(list.total,1);assert.equal(list.posts[0]?.id,id);
   assert.ok((await blog.getBlogSitemapPosts()).some((item)=>item.slug===slug));
   const edited=await admin.saveBlogPost({...post,id,slug:slug+'-edited',tags:['updated'],translations:{fa:{...fa,title:'عنوان ویرایش'}}});
   assert.equal(edited,id);const editedPost=(await blog.getBlogPostBySlug(slug+'-edited')).post!;
   assert.equal(editedPost.publishedAt,initial.publishedAt);assert.deepEqual(editedPost.tags,['updated']);assert.equal(editedPost.translations.fa.title,'عنوان ویرایش');
   await assert.rejects(admin.saveBlogPost({...post,slug:slug+'-edited'}),/slug is already in use/);
   await admin.saveBlogPost({...post,id,slug:slug+'-edited',status:'DRAFT'});
   assert.equal((await blog.getBlogPostBySlug(slug+'-edited')).post,null);assert.equal((await blog.getBlogPostBySlug(slug)).post,null);assert.equal((await blog.getBlogPosts({search:slug+'-edited'})).total,0);assert.ok(!(await blog.getBlogSitemapPosts()).some((item)=>item.slug===slug+'-edited'));
   await new Promise((resolve)=>setTimeout(resolve,5));
   await admin.saveBlogPost({...post,id,slug:slug+'-edited',status:'PUBLISHED'});
   assert.ok(Date.parse((await blog.getBlogPostBySlug(slug+'-edited')).post!.publishedAt!)>Date.parse(initial.publishedAt!));
   await admin.saveBlogPost({...post,id,slug:slug+'-edited',status:'ARCHIVED'});
   assert.equal((await blog.getBlogPostBySlug(slug+'-edited')).post,null);assert.equal((await blog.getBlogPosts({search:slug+'-edited'})).total,0);assert.ok(!(await blog.getBlogSitemapPosts()).some((item)=>item.slug===slug+'-edited'));
   const visibleManageable=await admin.getManageableBlogPost(id);assert.equal(visibleManageable.post?.status,'ARCHIVED');
   await admin.saveBlogPost({...post,id,slug:slug+'-edited',status:'PUBLISHED'});
   const productReferenceId=await admin.saveBlogPost({...post,slug:prefix+'-product-reference',translations:{fa:{...fa,blocks:[...fa.blocks,{id:'product-reference',type:'product',text:'',productSlug:prefix+'-product'}]}}});
   const productReference=(await blog.getBlogPostBySlug(prefix+'-product-reference')).post;
   assert.equal(productReference?.id,productReferenceId);assert.equal(productReference?.translations.fa.blocks.at(-1)?.productSlug,prefix+'-product');
   await prisma.product.update({where:{id:product.id},data:{status:'DRAFT'}});
   assert.equal((await catalog.getProductBySlug(prefix+'-product')).product,null);
   assert.equal((await blog.getBlogPostBySlug(prefix+'-product-reference')).post?.translations.fa.blocks.at(-1)?.productSlug,prefix+'-product');
   await assert.rejects(admin.saveBlogPost({...post,slug:prefix+'-bad-product',translations:{fa:{...fa,blocks:[...fa.blocks,{id:'product',type:'product',text:'',productSlug:'missing-blog-test-product'}]}}}),/does not exist or is not published/);
   assert.equal(await prisma.blogPost.count({where:{slug:prefix+'-bad-product'}}),0);
   await assert.rejects(admin.saveBlogPost({...post,slug:prefix+'-bad-related-post',relatedPostSlugs:['missing-blog-test-post']}),/does not exist or is not published/);
   assert.equal(await prisma.blogPost.count({where:{slug:prefix+'-bad-related-post'}}),0);
   await admin.deleteBlogPost(id);assert.equal(await prisma.blogPost.count({where:{id}}),0);
  });
 } finally {try{if(connected){await prisma.blogPost.deleteMany({where:{slug:{startsWith:prefix}}});if(productId) await prisma.product.delete({where:{id:productId}});if(categoryId) await prisma.category.delete({where:{id:categoryId}});}}finally{await prisma.$disconnect();if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;}}
});
