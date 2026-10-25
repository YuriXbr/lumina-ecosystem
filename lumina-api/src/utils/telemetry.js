'use strict';
const crypto = require('crypto');
const { trace, context, SpanStatusCode } = require('@opentelemetry/api');
let provider;
if (process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
  const { TracerProvider, BatchSpanProcessor } = require('@opentelemetry/sdk-trace');
  const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
  const endpoint = new URL(process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT);
  if (endpoint.protocol !== 'https:') throw new Error('OTLP exporter requires HTTPS');
  provider = new TracerProvider({spanProcessors:[new BatchSpanProcessor(new OTLPTraceExporter(),{maxQueueSize:256,maxExportBatchSize:32,exportTimeoutMillis:3000})]});
  trace.setGlobalTracerProvider(provider);
}
function background(promise) {
  const guarded = promise.catch(() => {});
  if (process.env.VERCEL) require('@vercel/functions').waitUntil(guarded);
  return guarded;
}
function requestTelemetry(req,res,next) {
  const started = process.hrtime.bigint();
  req.id = crypto.randomUUID();
  const incoming = String(req.headers.traceparent || '');
  const match = /^00-([a-f0-9]{32})-([a-f0-9]{16})-0[01]$/.exec(incoming);
  const validTrace = match && !/^0+$/.test(match[1]) && !/^0+$/.test(match[2]);
  // Visitor headers are correlation data only; they never establish identity or trust.
  req.traceId = validTrace ? match[1] : crypto.randomBytes(16).toString('hex');
  req.cfRay = /^[a-f0-9]{16,32}-[A-Za-z]{3}$/.test(req.headers['cf-ray'] || '') ? req.headers['cf-ray'] : '';
  const parent = validTrace ? trace.setSpanContext(context.active(),{traceId:match[1],spanId:match[2],traceFlags:Number(incoming.slice(-2)),isRemote:true}) : context.active();
  const span = trace.getTracer('lumina-api').startSpan('HTTP request',{},parent);
  if (span.isRecording()) req.traceId = span.spanContext().traceId;
  const spanId = span.isRecording() ? span.spanContext().spanId : crypto.randomBytes(8).toString('hex');
  const traceFlags = span.isRecording() ? (span.spanContext().traceFlags & 1) : 0;
  res.setHeader('X-Request-Id',req.id); res.setHeader('Traceparent',`00-${req.traceId}-${spanId}-0${traceFlags}`);
  if (req.cfRay) res.setHeader('X-CF-Ray',req.cfRay);
  const end = res.end;
  res.end = function(...args) {
    if (!res.headersSent) res.setHeader('Server-Timing',`app;dur=${(Number(process.hrtime.bigint()-started)/1e6).toFixed(1)}`);
    return end.apply(this,args);
  };
  res.once('finish',()=>{
    const route = req.route?.path || 'unmatched';
    span.updateName(`${req.method} ${route}`);
    span.setAttributes({'http.request.method':req.method,'http.route':route,'http.response.status_code':res.statusCode,'lumina.request_id':req.id,'cloudflare.ray_id':req.cfRay});
    if (res.statusCode >= 500) span.setStatus({code:SpanStatusCode.ERROR});
    span.end();
    if (provider) background(provider.forceFlush());
  });
  context.with(trace.setSpan(parent,span),next);
}
module.exports = { requestTelemetry, background };
