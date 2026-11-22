import type { OrderPricingPolicy } from './domain';
import { isSupportedCurrency } from '@/lib/currency';

export type CheckoutPolicyConfig = { policy: OrderPricingPolicy; productionEnabled: boolean };
export type CheckoutPolicyEnvironment = Record<string, string | undefined>;

function requiredText(env: CheckoutPolicyEnvironment, key: string): string | null {
  const value = env[key]?.trim();
  return value ? value : null;
}

function minorAmount(env: CheckoutPolicyEnvironment, key: string): number | null {
  const value = env[key];
  if (value === undefined || !/^(0|[1-9]\d*)$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) ? amount : null;
}

/** Checkout requires explicit, stable server configuration for every fee. */
export function readCheckoutPolicyConfig(env: CheckoutPolicyEnvironment): CheckoutPolicyConfig | null {
  const id = requiredText(env, 'CHECKOUT_POLICY_ID');
  const shippingPolicy = requiredText(env, 'CHECKOUT_SHIPPING_POLICY');
  const taxPolicy = requiredText(env, 'CHECKOUT_TAX_POLICY');
  const currency = requiredText(env, 'CHECKOUT_POLICY_CURRENCY');
  const shippingMinor = minorAmount(env, 'CHECKOUT_SHIPPING_MINOR');
  const taxMinor = minorAmount(env, 'CHECKOUT_TAX_MINOR');
  if (!id || id.length > 100 || !shippingPolicy || shippingPolicy.length > 100 || !taxPolicy || taxPolicy.length > 100 || !currency || !isSupportedCurrency(currency) || shippingMinor === null || taxMinor === null) return null;
  const productionEnabled = env.NODE_ENV !== 'production' || env.CHECKOUT_ENABLED === 'true';
  return {
    productionEnabled,
    policy: {
      id,
      quote: () => ({ shippingMinor, shippingPolicy, taxMinor, taxPolicy, currency }),
    },
  };
}

export function isCheckoutEnabled(config: CheckoutPolicyConfig | null, env: CheckoutPolicyEnvironment): config is CheckoutPolicyConfig {
  return Boolean(config && config.productionEnabled && env.DATABASE_URL);
}

export function configuredCheckoutPolicy(env: CheckoutPolicyEnvironment): OrderPricingPolicy | null {
  const config = readCheckoutPolicyConfig(env);
  return isCheckoutEnabled(config, env) ? config.policy : null;
}
