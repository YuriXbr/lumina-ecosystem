import LegalLinks from './LegalLinks';
export default function SiteFooter() {
  return <footer className="border-t border-gray-200 bg-white text-gray-600">
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 space-y-5 text-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div><p className="font-semibold text-gray-900 text-sm">Lumina Bot <span className="font-normal text-gray-500">por LuminaInk</span></p><p className="mt-1">© {new Date().getFullYear()} LuminaInk</p></div>
        <LegalLinks />
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-3 border-t border-gray-100 pt-4">
        <a href="mailto:contato@luminasink.com" className="hover:text-purple-800">Contato e privacidade</a>
        <a href="mailto:suporte@luminasink.com" className="hover:text-purple-800">Suporte</a>
        <a href="mailto:dmca@luminasink.com" className="hover:text-purple-800">Direitos autorais</a>
        <a href="https://github.com/YuriXbr/lumina-ecosystem" className="hover:text-purple-800">GitHub</a>
      </div>
    </div>
  </footer>;
}
