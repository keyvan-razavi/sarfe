'use client';

import { useState } from 'react';
import { Button, Field, Select } from '@/components/ui';
import type { Locale } from '@/lib/i18n';
import { formatStoreMoney } from '@/lib/store-money';
import './payment-simulator.css';

type MockPaymentAttempt = { id: string; orderId: string; outcome: 'APPROVED' | 'DECLINED'; amountMinor: number; currency: string; createdAt: string | Date };

const copy = {
  fa: { title: 'شبیه‌سازی محلی پرداخت', warning: 'فقط برای بازبینی رابط کاربری است. هیچ پولی جابه‌جا نمی‌شود و این شبیه‌سازی سفارش را پرداخت‌شده یا ارسال‌شده نمی‌کند.', scenario: 'نتیجهٔ نمایشی', approve: 'پاسخ موفق نمایشی', decline: 'پاسخ ناموفق نمایشی', run: 'اجرای شبیه‌سازی', pending: 'در حال اجرا…', success: 'نتیجهٔ شبیه‌سازی ثبت شد؛ سفارش همچنان پرداخت‌نشده است.', error: 'شبیه‌سازی انجام نشد. وضعیت رزرو را بررسی کنید.', attempts: 'نتایج قبلی · شبیه‌سازی', approved: 'پاسخ موفق نمایشی', declined: 'پاسخ ناموفق نمایشی', amount: 'مبلغ نمایشی', date: 'زمان ثبت' },
  ckb: { title: 'شبیه‌سازیی ناوخۆییی پارەدان', warning: 'تەنها بۆ پێداچوونەوەی ڕووکارە. هیچ پارەیەک ناگوازرێتەوە و ئەم شبیه‌سازییە داواکاری بە پارەدراو یان نێردراو نادات.', scenario: 'ئەنجامی نمایشی', approve: 'وەڵامی سەرکەوتووی نمایشی', decline: 'وەڵامی سەرنەکەوتووی نمایشی', run: 'جێبەجێکردنی شبیه‌سازی', pending: 'لە جێبەجێکردندایە…', success: 'ئەنجامی شبیه‌سازی تۆمار کرا؛ داواکاری هەر پارەی پێ نەدراوە.', error: 'شبیه‌سازی سەرکەوتوو نەبوو. دۆخی ڕاگرتن بپشکنە.', attempts: 'ئەنجامە پێشووەکان · شبیه‌سازی', approved: 'وەڵامی سەرکەوتووی نمایشی', declined: 'وەڵامی سەرنەکەوتووی نمایشی', amount: 'بڕی نمایشی', date: 'کاتی تۆمار' },
};

export function PaymentSimulator({ locale, orderId, initialAttempts = [] }: { locale: Locale; orderId: string; initialAttempts?: MockPaymentAttempt[] }) {
  const t = copy[locale];
  const [scenario, setScenario] = useState<'APPROVED' | 'DECLINED'>('APPROVED');
  const [attempts, setAttempts] = useState(initialAttempts);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'ckb-IQ';

  async function submit() {
    setPending(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/mock-payments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderId, attemptKey: crypto.randomUUID(), scenario }),
      });
      const result: unknown = await response.json();
      if (!response.ok || !result || typeof result !== 'object' || !('attempt' in result) || !result.attempt || typeof result.attempt !== 'object') throw new Error(t.error);
      const attempt = result.attempt as MockPaymentAttempt;
      if (attempt.orderId !== orderId || (attempt.outcome !== 'APPROVED' && attempt.outcome !== 'DECLINED') || typeof attempt.id !== 'string' || typeof attempt.createdAt !== 'string') throw new Error(t.error);
      setAttempts((current) => [attempt, ...current]);
      setMessage(t.success);
    } catch { setError(t.error); }
    finally { setPending(false); }
  }

  return <section className="mock-payment-panel">
    <div className="mock-payment-panel__heading"><h2>{t.title}</h2><span>LOCAL DEMO</span></div>
    <p className="mock-payment-panel__notice">{t.warning}</p>
    <Field label={t.scenario} htmlFor={`mock-payment-scenario-${orderId}`}>
      <Select id={`mock-payment-scenario-${orderId}`} value={scenario} onChange={(event) => setScenario(event.target.value as typeof scenario)}>
        <option value="APPROVED">{t.approve}</option>
        <option value="DECLINED">{t.decline}</option>
      </Select>
    </Field>
    <Button type="button" disabled={pending} onClick={submit}>{pending ? t.pending : t.run}</Button>
    {error && <p className="mock-payment-panel__error" role="alert">{error}</p>}
    {message && <p className="mock-payment-panel__success" role="status">{message}</p>}
    {attempts.length > 0 && <div className="mock-payment-panel__attempts"><h3>{t.attempts}</h3><ul>{attempts.map((attempt) => <li key={attempt.id}><strong>{attempt.outcome === 'APPROVED' ? t.approved : t.declined}</strong><span>{t.amount}: {formatStoreMoney(attempt.amountMinor, attempt.currency, intlLocale)}</span><span>{t.date}: <time dateTime={new Date(attempt.createdAt).toISOString()}>{new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(attempt.createdAt))}</time></span></li>)}</ul></div>}
  </section>;
}
