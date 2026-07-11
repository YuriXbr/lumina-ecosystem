import { CheckIcon, StarIcon } from '@heroicons/react/20/solid'
import HomeNavBar from '../components/homeNavBar/HomeNavBar'
import { useT } from '../../i18n/LanguageContext.jsx';

// Module-level static config — only keys, no t() calls
const TIER_KEYS = [
  {
    nameKey: 'pricing.free.name',
    id: 'tier-free',
    href: `https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}`,
    priceMonthly: '0',
    descKey: 'pricing.free.desc',
    featureKeys: ['pricing.free.f1', 'pricing.free.f2', 'pricing.free.f4', 'pricing.free.f5', 'pricing.free.f3'],
    featured: false,
    popular: false,
  },
  {
    nameKey: 'pricing.vip.name',
    id: 'tier-vip',
    href: '#',
    priceMonthly: '29,99',
    descKey: 'pricing.vip.desc',
    featureKeys: ['pricing.vip.f6', 'pricing.vip.f1', 'pricing.vip.f2', 'pricing.vip.f3', 'pricing.vip.f7', 'pricing.vip.f8'],
    featured: false,
    popular: true,
  },
  {
    nameKey: 'pricing.enterprise.name',
    id: 'tier-enterprise',
    href: '#',
    priceMonthly: '68,99',
    descKey: 'pricing.enterprise.desc',
    featureKeys: ['pricing.enterprise.f1', 'pricing.enterprise.f7', 'pricing.enterprise.f8', 'pricing.enterprise.f9', 'pricing.enterprise.f4', 'pricing.enterprise.f10', 'pricing.enterprise.f3', 'pricing.enterprise.f11'],
    featured: true,
    popular: false,
  },
];

const FAQ_KEYS = [
  { qKey: 'pricing.faq.q1', aKey: 'pricing.faq.a1' },
  { qKey: 'pricing.faq.q2', aKey: 'pricing.faq.a2' },
  { qKey: 'pricing.faq.q3', aKey: 'pricing.faq.a3' },
  { qKey: 'pricing.faq.q4', aKey: 'pricing.faq.a4' },
];

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function PricingPage() {
  const t = useT();

  // Resolve translations inside the component where t() is available
  const tiers = TIER_KEYS.map(tier => ({
    ...tier,
    name: t(tier.nameKey),
    description: t(tier.descKey),
    features: tier.featureKeys.map(k => t(k)),
  }));

  const faqs = FAQ_KEYS.map(faq => ({
    question: t(faq.qKey),
    answer: t(faq.aKey),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <HomeNavBar />

      {/* Hero Section */}
      <section className="relative px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-7xl py-24 sm:py-32">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-2 ring-indigo-600/20 hover:ring-indigo-600/30 bg-white/50 backdrop-blur-sm">
                {t('pricing.badge', { defaultValue: 'Plans for every need' })}
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              💎 {t('pricing.subtitle')}
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              {t('pricing.subtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Tiers */}
      <section className="px-6 pb-24 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-2xl bg-white shadow-lg ring-1 ring-gray-200 ${
                  tier.featured ? 'ring-2 ring-purple-600 lg:scale-105' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-xs font-semibold text-white">
                      <StarIcon className="h-3 w-3" />
                      {t('pricing.popular')}
                    </span>
                  </div>
                )}
                <div className="p-8">
                  <h3 className="text-lg font-semibold leading-8 text-gray-900">{tier.name}</h3>
                  <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>
                  <p className="mt-6 flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-gray-900">R$ {tier.priceMonthly}</span>
                    <span className="text-sm font-semibold text-gray-600">/mês</span>
                  </p>
                  <a
                    href={tier.href}
                    className={`mt-6 block rounded-md px-3 py-2 text-center text-sm font-semibold leading-6 ${
                      tier.featured
                        ? 'bg-purple-600 text-white hover:bg-purple-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {tier.priceMonthly === '0' ? t('pricing.free.cta') : t('pricing.vip.cta')}
                  </a>
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        <CheckIcon className="h-5 w-5 flex-none text-purple-600" aria-hidden="true" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">{t('pricing.faqTitle', { defaultValue: 'FAQ' })}</h2>
            <p className="mt-4 text-gray-600">{t('pricing.faqSubtitle', { defaultValue: '' })}</p>
          </div>
          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
