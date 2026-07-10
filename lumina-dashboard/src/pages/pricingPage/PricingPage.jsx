import { CheckIcon, StarIcon } from '@heroicons/react/20/solid'
import HomeNavBar from '../components/homeNavBar/HomeNavBar'

const tiers = [
  {
    name: 'Gratuito',
    id: 'tier-free',
    href: `https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands`,
    priceMonthly: '0',
    description: "Recursos básicos para começar a usar o Lumina Bot.",
    features: [
      'Comandos básicos do League of Legends',
      'Sistema de moderação básico',
      'Comandos de utilidade',
      'Suporte pela comunidade',
      'Uptime padrão'
    ],
    featured: false,
    popular: false,
  },
  {
    name: 'VIP',
    id: 'tier-vip',
    href: '#',
    priceMonthly: '29,99',
    description: "O plano perfeito para você que busca alguns benefícios a mais.",
    features: [
      'Todos os recursos gratuitos',
      'Música 24/7 sem interrupções',
      'AutoMod personalizável avançado',
      'Bot de música adicional',
      'Prioridade no suporte',
      'Comandos exclusivos VIP'
    ],
    featured: false,
    popular: true,
  },
  {
    name: 'Enterprise',
    id: 'tier-enterprise',
    href: '#',
    priceMonthly: '68,99',
    description: 'O plano para grandes comunidades buscando impulsionar as interações.',
    features: [
      'Todos os recursos VIP',
      'Sistema de tickets avançado',
      'Boost nos drops de baú e chave para todo servidor',
      'Melhor qualidade de som',
      'Dashboard personalizado',
      'Suporte prioritário 24/7',
      'Configurações personalizadas',
      'Analytics detalhados'
    ],
    featured: true,
    popular: false,
  },
]

const faqs = [
  {
    question: 'Posso cancelar minha assinatura a qualquer momento?',
    answer: 'Sim, você pode cancelar sua assinatura a qualquer momento sem taxas adicionais. Você manterá acesso aos recursos premium até o final do período pago.',
  },
  {
    question: 'Os preços incluem todos os recursos mencionados?',
    answer: 'Sim, todos os recursos listados em cada plano estão inclusos no preço mensal. Não há custos ocultos ou taxas adicionais.',
  },
  {
    question: 'Posso fazer upgrade ou downgrade do meu plano?',
    answer: 'Absolutamente! Você pode alterar seu plano a qualquer momento. As mudanças serão aplicadas no próximo ciclo de cobrança.',
  },
  {
    question: 'Oferecem desconto para pagamento anual?',
    answer: 'Sim, oferecemos 20% de desconto para assinatura anual em todos os planos pagos. Entre em contato para mais detalhes.',
  },
]

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export default function PricingPage() {
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <HomeNavBar />

      {/* Hero Section */}
      <section className="relative px-6 pt-24 lg:px-8">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="polygon-background opacity-20"/>
        </div>
        
        <div className="mx-auto max-w-7xl py-16 sm:py-24">
          <div className="text-center">
            <div className="mb-8 flex justify-center">
              <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-2 ring-indigo-600/20 hover:ring-indigo-600/30 bg-white/50 backdrop-blur-sm">
                💎 Potencialize seu servidor Discord{' '}
                <a href="#" className="font-semibold text-indigo-600">
                  <span aria-hidden="true" className="absolute inset-0" />
                  Saiba mais <span aria-hidden="true">&rarr;</span>
                </a>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
              Planos de <span className="text-indigo-600">Assinatura</span>
            </h1>
            
            <p className="mt-6 text-xl leading-8 text-gray-600 max-w-3xl mx-auto">
              Escolha o plano ideal para o seu servidor Discord. Desde recursos básicos até funcionalidades enterprise para grandes comunidades.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Preços simples e transparentes
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Escolha entre diferentes planos com recursos exclusivos para atender às necessidades do seu servidor.
            </p>
          </div>

          <div className="grid max-w-md mx-auto grid-cols-1 gap-8 lg:max-w-none lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={classNames(
                  tier.featured 
                    ? 'ring-2 ring-indigo-600 shadow-2xl scale-105' 
                    : 'ring-1 ring-gray-200',
                  'relative rounded-3xl p-8 bg-white hover:shadow-xl transition-all duration-300'
                )}
              >
                {tier.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 text-sm font-medium text-white">
                      <StarIcon className="h-4 w-4 mr-1" />
                      Mais Popular
                    </span>
                  </div>
                )}

                {tier.featured && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 px-3 py-1 text-sm font-medium text-white">
                      👑 Enterprise
                    </span>
                  </div>
                )}

                <div className="mb-8">
                  <h3 className="text-2xl font-bold text-gray-900">{tier.name}</h3>
                  <p className="mt-4 text-gray-600">{tier.description}</p>
                  
                  <div className="mt-6 flex items-baseline">
                    <span className="text-5xl font-bold tracking-tight text-gray-900">
                      R${tier.priceMonthly}
                    </span>
                    {tier.priceMonthly !== '0' && (
                      <span className="ml-1 text-xl font-semibold text-gray-500">/mês</span>
                    )}
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon 
                        className={classNames(
                          tier.featured ? 'text-indigo-600' : 'text-green-500',
                          'h-5 w-5 mt-0.5 mr-3 flex-shrink-0'
                        )} 
                      />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <a
                  href={tier.href}
                  className={classNames(
                    tier.featured
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg'
                      : tier.popular
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-900 text-white hover:bg-gray-800',
                    'block w-full rounded-lg px-6 py-3 text-center text-sm font-semibold transition-colors duration-200'
                  )}
                >
                  {tier.priceMonthly === '0' ? 'Começar Grátis' : 'Assinar Agora'}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Perguntas Frequentes
            </h2>
            <p className="mt-4 text-lg leading-8 text-gray-600">
              Tire suas dúvidas sobre nossos planos de assinatura
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="space-y-8">
              {faqs.map((faq, index) => (
                <div key={index} className="bg-white rounded-2xl p-8 shadow-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600 leading-7">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-indigo-600">
        <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Pronto para começar?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-indigo-200">
              Comece gratuitamente e faça upgrade quando precisar de mais recursos. Sem compromisso, sem taxas ocultas.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <a
                href={`https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_DISCORD_CLIENT_ID}&permissions=8&scope=bot+applications.commands`}
                className="rounded-md bg-white px-6 py-3 text-lg font-semibold text-indigo-600 shadow-sm hover:bg-indigo-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white transition-all duration-200"
              >
                Começar Grátis
              </a>
              <a href="/members" className="text-lg font-semibold leading-6 text-white hover:text-indigo-200 transition-colors">
                Área de Membros <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a href="https://github.com/YuriXbr" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; 2024 Lumina Bot. Feito com ❤️ para a comunidade Discord.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}