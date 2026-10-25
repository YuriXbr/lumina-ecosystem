import { botInviteUrl } from '../../utils/botInvite';
import { CheckIcon } from '@heroicons/react/20/solid'
import { useT } from '../../i18n/LanguageContext.jsx';

// Module-level static config — only keys, no t() calls
const TIER_KEYS = [
  {
    nameKey: 'pricing.free.name',
    id: 'tier-free',
    href: botInviteUrl() || 'mailto:suporte@luminasink.com',
    priceMonthly: '0',
    descKey: 'pricing.free.desc',
    featureKeys: ['pricing.free.f1', 'pricing.free.f2', 'pricing.free.f4', 'pricing.free.f5', 'pricing.free.f3'],
    featured: false,
    popular: false,
  },
  {
    nameKey: 'pricing.vip.name',
    id: 'tier-vip',
    href: null,
    priceMonthly: null,
    descKey: 'pricing.vip.desc',
    featureKeys: ['pricing.vip.f6', 'pricing.vip.f1', 'pricing.vip.f2', 'pricing.vip.f3', 'pricing.vip.f7', 'pricing.vip.f8'],
    featured: false,
    popular: false,
  },
  {
    nameKey: 'pricing.enterprise.name',
    id: 'tier-enterprise',
    href: null,
    priceMonthly: null,
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

export default function PricingPage() {
  const t = useT();

  // Resolve translations inside the component where t() is available
  const tiers = TIER_KEYS.map(tier => ({
    ...tier,
    name: t(tier.nameKey),
    description: tier.priceMonthly === null ? t('pricing.availability.plannedDescription') : t(tier.descKey),
    features: [...new Set(tier.featureKeys.map(k => t(k)))],
  }));

  const faqs = FAQ_KEYS.map(faq => ({
    question: t(faq.qKey),
    answer: t(faq.aKey),
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-purple-100">


      {/* Hero Section */}
      <section className="relative px-6 pt-14 lg:px-8">
        <div className="mx-auto max-w-7xl py-12 sm:py-16">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-2 ring-purple-600/20 hover:ring-purple-600/30 bg-white/50 backdrop-blur-sm">
                {t('pricing.badge', { defaultValue: 'Plans for every need' })}
              </div>
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              {t('pricing.availability.title')}
            </h1>

            <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
              {t('pricing.availability.intro')}
            </p>
            <p role="status" className="mt-5 text-sm text-gray-600 max-w-2xl mx-auto">{t('pricing.availability.notice')}</p>
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
                className={`relative lumina-card ${
                  tier.featured ? 'ring-2 ring-purple-600 lg:scale-105' : ''
                }`}
              >
                <div className="p-8">
                  <h2 className="text-lg font-semibold leading-8 text-gray-900">{tier.name}</h2>
                  {tier.priceMonthly === null && <p className="mt-2 text-xs font-semibold text-purple-700">{t('pricing.availability.planned')}</p>}
                  <p className="mt-4 text-sm leading-6 text-gray-600">{tier.description}</p>
                  {tier.priceMonthly === null ? <>
                    <p className="mt-6 text-xl font-semibold text-gray-900">{t('pricing.availability.pricePending')}</p>
                    <button disabled aria-label={t('pricing.availability.notOpen', {plan:tier.name})} className="lumina-button-secondary w-full mt-6 disabled:opacity-60">{t('pricing.availability.planned')}</button>
                    <p className="mt-6 text-xs text-gray-600">{t('pricing.availability.futureFeatures')}</p>
                  </> : <>
                    <p className="mt-6 flex items-baseline gap-1"><span className="text-4xl font-bold text-gray-900">R$ {tier.priceMonthly}</span><span className="text-sm text-gray-600">/mês</span></p>
                    <a href={tier.href} className="lumina-button block mt-6 text-center">{t('pricing.free.cta')}</a>
                  </>}
                  <ul className="mt-8 space-y-3 text-sm leading-6 text-gray-600">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex gap-3">
                        {tier.priceMonthly === null ? <span aria-hidden="true" className="text-gray-400">•</span> : <CheckIcon className="h-5 w-5 flex-none text-purple-600" aria-hidden="true" />}
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
    </main>
  );
}
