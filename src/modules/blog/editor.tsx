'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRef, useState, useActionState } from 'react';
import { Button, Field, HelpTooltip, Input, MediaPicker, Select, Textarea } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { InlineText } from './inline';
import type { BlogBlock, BlogPost, BlogTranslation } from './types';
import { blogMessage, type BlogMessage } from './messages';
import styles from './editor.module.css';
import { deleteBlogAction } from './actions';

type Language = 'fa' | 'ckb';
type ProductChoice = { slug: string; name: string };
type PostChoice = { slug: string; title: string };
type SaveState = { error?: string; fieldErrors?: string[] };
type SaveAction = (previous: SaveState, form: FormData) => Promise<SaveState>;
const blockTypes: BlogBlock['type'][] = ['paragraph', 'heading', 'quote', 'bulletList', 'orderedList', 'image', 'product'];
const blankTranslation = (): BlogTranslation => ({ title: '', excerpt: '', blocks: [], seoTitle: '', seoDescription: '' });
function cloneTranslation(value?: BlogTranslation): BlogTranslation {
  if (!value || typeof value !== 'object') return blankTranslation();
  return { title: value.title || '', excerpt: value.excerpt || '', seoTitle: value.seoTitle || '', seoDescription: value.seoDescription || '', blocks: Array.isArray(value.blocks) ? value.blocks.map((block) => ({ ...block })) : [] };
}
function block(type: BlogBlock['type']): BlogBlock { return { id: crypto.randomUUID(), type, text: '', ...(type === 'heading' ? { level: 2 as const } : {}) }; }
function changeBlockType(current: BlogBlock, type: BlogBlock['type']): BlogBlock {
  return { id: current.id, type, text: current.text, ...(type === 'heading' ? { level: type === current.type ? current.level ?? 2 : 2 } : {}), ...(type === 'image' && current.type === 'image' ? { url: current.url, alt: current.alt, caption: current.caption } : {}), ...(type === 'product' && current.type === 'product' ? { productSlug: current.productSlug } : {}) };
}
function hasTranslation(value: BlogTranslation) { return value.title.trim() || value.excerpt.trim() || value.seoTitle.trim() || value.seoDescription.trim() || value.blocks.length > 0; }

function ReferenceChooser({ legend, empty, choices, selected, onChange, disabled }: {
  legend: string; empty: string; choices: Array<{ slug: string; label: string }>;
  selected: string[]; onChange: (value: string[]) => void; disabled: boolean;
}) {
  const available = new Map(choices.map((choice) => [choice.slug, choice.label]));
  const options = [...choices, ...selected.filter((slug) => !available.has(slug)).map((slug) => ({ slug, label: slug }))];
  return <fieldset className={styles.references} disabled={disabled} dir="rtl">
    <legend>{legend}</legend>
    {options.length ? <div className={styles.referenceList}>{options.map((choice) =>
      <label className={styles.referenceOption} key={choice.slug}>
        <input type="checkbox" checked={selected.includes(choice.slug)} onChange={(event) => {
          onChange(event.target.checked ? [...selected, choice.slug] : selected.filter((slug) => slug !== choice.slug));
        }} />
        <span>{choice.label}</span>
      </label>,
    )}</div> : <p className={styles.hint}>{empty}</p>}
  </fieldset>;
}

function TextToolbar({ locale, area, onChange }: { locale: Locale; area: React.RefObject<HTMLDivElement | null>; onChange: (value: string) => void }) {
  const m = (key: BlogMessage) => blogMessage(locale, key);
  const wrap = (before: string, after = before) => {
    const node = area.current?.querySelector('textarea'); if (!node) return;
    const start = node.selectionStart, end = node.selectionEnd;
    const selected = node.value.slice(start, end) || (locale === 'fa' ? 'متن' : 'دەق');
    const next = `${node.value.slice(0, start)}${before}${selected}${after}${node.value.slice(end)}`;
    onChange(next);
    requestAnimationFrame(() => { node.focus(); node.setSelectionRange(start + before.length, start + before.length + selected.length); });
  };
  const link = () => { const url = window.prompt(m('link')); if (url && (/^https:\/\//i.test(url) || /^\/(?!\/)/.test(url))) wrap('[', `](${url})`); };
  return <div className={styles.toolbar} role="group" aria-label={m('formatting')}>
    <button type="button" onClick={() => wrap('**')} aria-label={m('bold')}><strong>B</strong></button>
    <button type="button" onClick={() => wrap('*')} aria-label={m('italic')}><em>I</em></button>
    <button type="button" onClick={() => wrap('==')} aria-label={m('highlight')}>==</button>
    <button type="button" onClick={link} aria-label={m('link')}>↗</button>
    <HelpTooltip text={m('formatting')} />
  </div>;
}

function Upload({ locale, id, path, onChange, label, disabled = false }: { locale: Locale; id: string; path: string; onChange: (path: string) => void; label: string; disabled?: boolean }) {
  const m = (key: BlogMessage) => blogMessage(locale, key);
  return <MediaPicker id={id} locale={locale} paths={path ? [path] : []} onPathsChange={(paths) => onChange(paths[0] ?? '')} maxFiles={1} disabled={disabled} labels={{ label, hint: m('uploadHint'), choose: m('choose'), upload: m('upload'), uploading: m('uploading'), complete: m('uploaded'), failed: m('uploadFailed'), limit: m('limit'), invalid: m('invalid'), count: m('count'), primary: m('primary'), gallery: m('gallery'), remove: m('remove'), empty: m('noImage') }} />;
}

function TranslationEditor({ locale, language, value, onChange, products, disabled, translationHint }: { locale: Locale; language: Language; value: BlogTranslation; onChange: (value: BlogTranslation) => void; products: ProductChoice[]; disabled: boolean; translationHint?: string }) {
  const m = (key: BlogMessage) => blogMessage(locale, key);
  const update = (patch: Partial<BlogTranslation>) => onChange({ ...value, ...patch });
  const updateBlock = (index: number, patch: Partial<BlogBlock>) => update({ blocks: value.blocks.map((item, row) => row === index ? { ...item, ...patch } : item) });
  const moveBlock = (index: number, by: number) => { const target = index + by; if (target < 0 || target >= value.blocks.length) return; const next = [...value.blocks]; [next[index], next[target]] = [next[target], next[index]]; update({ blocks: next }); };
  return <fieldset className={styles.translation} lang={language} dir="rtl">
    <legend>{m(language === 'fa' ? 'persian' : 'sorani')}{translationHint ? <HelpTooltip text={translationHint} /> : null}</legend>
    <div className="admin-grid">
      <Field label={m('titleField')} htmlFor={`${language}-title`}><Input id={`${language}-title`} value={value.title} onChange={(event) => update({ title: event.target.value })} maxLength={180} required={language === 'fa' || Boolean(hasTranslation(value))} /></Field>
      <Field label={m('excerpt')} htmlFor={`${language}-excerpt`}><Textarea id={`${language}-excerpt`} value={value.excerpt} onChange={(event) => update({ excerpt: event.target.value })} maxLength={600} required={language === 'fa' || Boolean(hasTranslation(value))} rows={3} /></Field>
      <Field label={m('seoTitle')} htmlFor={`${language}-seo-title`}><Input id={`${language}-seo-title`} value={value.seoTitle} onChange={(event) => update({ seoTitle: event.target.value })} maxLength={180} /></Field>
      <Field label={m('seoDescription')} htmlFor={`${language}-seo-description`}><Textarea id={`${language}-seo-description`} value={value.seoDescription} onChange={(event) => update({ seoDescription: event.target.value })} maxLength={320} rows={3} /></Field>
    </div>
    <section className={styles.blocks} aria-label={m('blocks')}>
      <h3>{m('blocks')} <HelpTooltip text={m('formatting')} /></h3>
      {value.blocks.map((item, index) => <fieldset className={styles.block} key={item.id}>
        <legend>{m(item.type)}</legend>
        <div className={styles.blockControls}>
          <Select aria-label={m('blocks')} value={item.type} onChange={(event) => update({ blocks: value.blocks.map((current, row) => row === index ? changeBlockType(current, event.target.value as BlogBlock['type']) : current) })}>{blockTypes.map((type) => <option key={type} value={type}>{m(type)}</option>)}</Select>
          <Button type="button" size="sm" variant="secondary" disabled={index === 0} onClick={() => moveBlock(index, -1)}>{m('moveUp')}</Button>
          <Button type="button" size="sm" variant="secondary" disabled={index === value.blocks.length - 1} onClick={() => moveBlock(index, 1)}>{m('moveDown')}</Button>
          <Button type="button" size="sm" variant="danger" onClick={() => update({ blocks: value.blocks.filter((_, row) => row !== index) })}>{m('removeBlock')}</Button>
        </div>
        {item.type === 'image' ? <>
          <Upload locale={locale} id={`${language}-inline-${item.id}`} path={item.url ?? ''} label={m('image')} onChange={(url) => updateBlock(index, { url })} disabled={disabled} />
          <div className="admin-grid"><Field label={m('alt')} htmlFor={`${item.id}-alt`}><Input id={`${item.id}-alt`} value={item.alt ?? ''} onChange={(event) => updateBlock(index, { alt: event.target.value })} required /></Field><Field label={m('caption')} htmlFor={`${item.id}-caption`}><Input id={`${item.id}-caption`} value={item.caption ?? ''} onChange={(event) => updateBlock(index, { caption: event.target.value })} /></Field></div>
        </> : item.type === 'product' ? <Field label={m('productSlug')} htmlFor={`${item.id}-product`}><Select id={`${item.id}-product`} value={item.productSlug ?? ''} onChange={(event) => updateBlock(index, { productSlug: event.target.value })} required><option value="">{m('productChoice')}</option>{products.map((product) => <option key={product.slug} value={product.slug}>{product.name}</option>)}</Select></Field> : <>
          {item.type === 'heading' ? <Field label={m('level')} htmlFor={`${item.id}-level`}><Select id={`${item.id}-level`} value={item.level ?? 2} onChange={(event) => updateBlock(index, { level: Number(event.target.value) as 2 | 3 })}><option value={2}>H2</option><option value={3}>H3</option></Select></Field> : null}
          <BlockText locale={locale} item={item} onChange={(text) => updateBlock(index, { text })} />
        </>}
      </fieldset>)}
      <div className={styles.addBlock}><Select aria-label={m('addBlock')} value={''} onChange={(event) => { const type = event.target.value as BlogBlock['type']; if (type) update({ blocks: [...value.blocks, block(type)] }); }}><option value="">{m('addBlock')}</option>{blockTypes.map((type) => <option key={type} value={type}>{m(type)}</option>)}</Select></div>
    </section>
    <section className={styles.preview} aria-label={m('preview')}><h3>{m('preview')}</h3>{value.blocks.map((item) => <PreviewBlock key={item.id} block={item} products={products} />)}</section>
  </fieldset>;
}

function BlockText({ locale, item, onChange }: { locale: Locale; item: BlogBlock; onChange: (text: string) => void }) {
  const m = (key: BlogMessage) => blogMessage(locale, key);
  const ref = useRef<HTMLDivElement>(null);
  return <Field label={m('blockText')} htmlFor={`${item.id}-text`}><div ref={ref}><TextToolbar locale={locale} area={ref} onChange={onChange} /><Textarea id={`${item.id}-text`} value={item.text} onChange={(event) => onChange(event.target.value)} rows={item.type === 'paragraph' ? 6 : 4} required maxLength={10_000} /></div></Field>;
}

function PreviewBlock({ block: item, products }: { block: BlogBlock; products: ProductChoice[] }) {
  if (item.type === 'image') return item.url ? <figure><Image className={styles.previewImage} src={item.url} alt={item.alt ?? ''} width={720} height={480} unoptimized />{item.caption ? <figcaption>{item.caption}</figcaption> : null}</figure> : null;
  if (item.type === 'product') return <p>{products.find((product) => product.slug === item.productSlug)?.name ?? item.productSlug}</p>;
  if (item.type === 'heading') return item.level === 3 ? <h3><InlineText text={item.text} /></h3> : <h2><InlineText text={item.text} /></h2>;
  if (item.type === 'quote') return <blockquote><InlineText text={item.text} /></blockquote>;
  const lines = item.text.split('\n').filter(Boolean);
  if (item.type === 'bulletList' || item.type === 'orderedList') { const List = item.type === 'bulletList' ? 'ul' : 'ol'; return <List>{lines.map((line, index) => <li key={index}><InlineText text={line} /></li>)}</List>; }
  return <p><InlineText text={item.text} /></p>;
}

export function BlogEditor({ locale, initial, products, posts, action, editable = true }: { locale: Locale; initial?: BlogPost; products: ProductChoice[]; posts: PostChoice[]; action: SaveAction; editable?: boolean }) {
  const m = (key: BlogMessage) => blogMessage(locale, key);
  const [state, formAction, pending] = useActionState(action, {} as SaveState);
  const [cover, setCover] = useState(initial?.coverImage ?? '');
  const [coverAlt, setCoverAlt] = useState(initial?.coverAlt ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [status, setStatus] = useState(initial?.status ?? 'DRAFT');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [relatedPostSlugs, setRelatedPostSlugs] = useState(initial?.relatedPostSlugs ?? []);
  const [relatedProductSlugs, setRelatedProductSlugs] = useState(initial?.relatedProductSlugs ?? []);
  const [translations, setTranslations] = useState<{ fa: BlogTranslation; ckb: BlogTranslation }>(() => ({ fa: cloneTranslation(initial?.translations.fa), ckb: cloneTranslation(initial?.translations.ckb) }));
  const [clientError, setClientError] = useState('');
  const disabled = !editable || pending;
  return <form action={formAction} onSubmit={(event) => { if (status === 'PUBLISHED' && !translations.fa.blocks.some((item) => item.text.trim())) { event.preventDefault(); setClientError('publishedNeedsText'); } else setClientError(''); }} className={`admin-panel admin-form ${styles.editor}`} dir="rtl">
    <input type="hidden" name="id" value={initial?.id ?? ''} />
    <input type="hidden" name="coverImage" value={cover} />
    <input type="hidden" name="tags" value={JSON.stringify(tags.split(/[,،]/).map((tag) => tag.trim()).filter(Boolean))} />
    <input type="hidden" name="relatedPostSlugs" value={JSON.stringify(relatedPostSlugs)} />
    <input type="hidden" name="relatedProductSlugs" value={JSON.stringify(relatedProductSlugs)} />
    <input type="hidden" name="translations" value={JSON.stringify({ fa: translations.fa, ...(hasTranslation(translations.ckb) ? { ckb: translations.ckb } : {}) })} />
    {state.error ? <div className="admin-notice admin-notice--error" role="alert">{m(state.error === 'duplicate' ? 'saveErrorDuplicate' : state.error === 'auth' ? 'saveErrorAuth' : state.error === 'preview' ? 'saveErrorPreview' : 'saveError')}{state.fieldErrors?.length ? <ul>{state.fieldErrors.map((path) => <li key={path}><a href={fieldErrorTarget(path)}>{fieldErrorLabel(path, locale, m, translations)}</a></li>)}</ul> : null}</div> : null}
    {clientError ? <div className="admin-notice admin-notice--error" role="alert">{m('publishedNeedsText')}</div> : null}
    {!editable ? <div className="admin-notice">{m('readOnly')}</div> : null}
    <fieldset disabled={disabled} className={styles.editorFieldset}>
    <div className="admin-grid">
      <Field label={m('slug')} htmlFor="blog-slug"><Input id="blog-slug" name="slug" value={slug} onChange={(event) => setSlug(event.target.value)} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={120} dir="ltr" /></Field>
      <Field label={m('statusField')} htmlFor="blog-status"><Select id="blog-status" name="status" value={status} onChange={(event) => setStatus(event.target.value as BlogPost['status'])}><option value="DRAFT">{m('draft')}</option><option value="PUBLISHED">{m('published')}</option><option value="ARCHIVED">{m('archived')}</option></Select></Field>
      <Field label={m('tags')} htmlFor="blog-tags" hint={m('tagsHint')}><Input id="blog-tags" value={tags} onChange={(event) => setTags(event.target.value)} maxLength={1000} /></Field>
      <Field label={m('coverAlt')} htmlFor="blog-cover-alt"><Input id="blog-cover-alt" name="coverAlt" value={coverAlt} onChange={(event) => setCoverAlt(event.target.value)} maxLength={300} required={Boolean(cover)} /></Field>
    </div>
    <Upload locale={locale} id="blog-cover" path={cover} onChange={setCover} label={m('cover')} disabled={disabled} />
    <div className={styles.referenceGrid}>
      <ReferenceChooser legend={m('relatedPosts')} empty={m('noRelatedPosts')} choices={posts.map((post) => ({ slug: post.slug, label: post.title }))} selected={relatedPostSlugs} onChange={setRelatedPostSlugs} disabled={disabled} />
      <ReferenceChooser legend={m('relatedProducts')} empty={m('noRelatedProducts')} choices={products.map((product) => ({ slug: product.slug, label: product.name }))} selected={relatedProductSlugs} onChange={setRelatedProductSlugs} disabled={disabled} />
    </div>
    {(['fa', 'ckb'] as const).map((language) => <div id={`${language}-translation`} key={language}><TranslationEditor locale={locale} language={language} value={translations[language]} products={products} disabled={disabled} translationHint={language === 'ckb' ? m('translationHint') : undefined} onChange={(value) => setTranslations((current) => ({ ...current, [language]: value }))} /></div>)}
    </fieldset>
    <div className="admin-form__actions"><Button type="submit" disabled={disabled}>{pending ? m('saving') : m('save')}</Button><Link href="/admin/blog" className="ui-button ui-button--secondary ui-button--md">{m('cancel')}</Link></div>
  </form>;
}

function fieldErrorTarget(path: string) {
  if (path === 'slug') return '#blog-slug';
  if (path === 'coverAlt') return '#blog-cover-alt';
  if (path.startsWith('translations.fa.')) return '#fa-translation';
  if (path.startsWith('translations.ckb.')) return '#ckb-translation';
  return '#blog-slug';
}
function fieldErrorLabel(path: string, locale: Locale, m: (key: BlogMessage) => string, translations: { fa: BlogTranslation; ckb: BlogTranslation }) {
  if (path === 'slug') return m('slug');
  if (path === 'coverAlt') return m('coverAlt');
  const parts = path.split('.');
  const language = parts[1] === 'ckb' ? 'ckb' : 'fa';
  const key = parts.at(-1);
  const labels: Record<string, BlogMessage> = { title: 'titleField', excerpt: 'excerpt', seoTitle: 'seoTitle', seoDescription: 'seoDescription', text: 'blockText', alt: 'alt', url: 'image', caption: 'caption', level: 'level', productSlug: 'productSlug' };
  const label = key && labels[key] ? m(labels[key]) : m('blocks');
  const languageName = m(language === 'fa' ? 'persian' : 'sorani');
  const blockIndex = parts[2] === 'blocks' ? Number(parts[3]) : -1;
  const selectedBlock = Number.isInteger(blockIndex) && blockIndex >= 0 ? translations[language].blocks[blockIndex] : undefined;
  return selectedBlock ? `${languageName} · ${m(selectedBlock.type)} · ${label}` : `${languageName} · ${label}`;
}

export function BlogDeleteForm({ locale, id, editable }: { locale: Locale; id: string; editable: boolean }) {
  const m = (key: BlogMessage) => blogMessage(locale, key);
  const [state, action, pending] = useActionState(deleteBlogAction, {} as { error?: string });
  return <form action={action} className={styles.deleteForm}>
    <input type="hidden" name="id" value={id} />
    <label><input type="checkbox" name="confirm" value="yes" required disabled={!editable || pending} />{m('deleteConfirm')}</label>
    <Button type="submit" variant="danger" disabled={!editable || pending}>{m('delete')}</Button>
    {state.error ? <span role="alert" className="ui-field__error">{m('deleteError')}</span> : null}
  </form>;
}
