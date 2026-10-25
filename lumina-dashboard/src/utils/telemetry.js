// Public Web Analytics identifier, already configured for luminasink.com.
const SITE_TOKEN = import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN || 'b7dcbbe40eb94fa3b09b85d28ff8f87f';
export function initTelemetry() {
  if (!import.meta.env.PROD || !/(^|\.)luminasink\.com$/.test(window.location.hostname)) return;
  if (document.querySelector('script[src*="cloudflareinsights.com/beacon"],script[data-cf-beacon]')) return;
  const script = document.createElement('script');
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.type = 'module'; script.dataset.cfBeacon = JSON.stringify({ token:SITE_TOKEN, spa:true });
  script.dataset.luminaAnalytics = 'true'; document.head.appendChild(script);
}
export async function observeVitals(onMetric) {
  const { onCLS,onINP,onLCP,onTTFB } = await import('web-vitals');
  for (const observe of [onCLS,onINP,onLCP,onTTFB]) observe(metric => onMetric({name:metric.name,value:metric.value,rating:metric.rating}));
}
