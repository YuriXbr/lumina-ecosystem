'use strict';
const {isAllowedOrigin,getAllowedOrigins}=require('../src/config/allowedOrigins');
const originalEnv=process.env.NODE_ENV,originalAdditional=process.env.ADDITIONAL_ALLOWED_ORIGINS;
afterEach(()=>{process.env.NODE_ENV=originalEnv;if(originalAdditional===undefined)delete process.env.ADDITIONAL_ALLOWED_ORIGINS;else process.env.ADDITIONAL_ALLOWED_ORIGINS=originalAdditional;});
test('production accepts the current dashboard and refuses local, legacy, and unapproved preview origins',()=>{
 process.env.NODE_ENV='production';delete process.env.ADDITIONAL_ALLOWED_ORIGINS;
 expect(isAllowedOrigin('https://bot.luminasink.com')).toBe(true);
 for(const origin of ['http://localhost:5173','https://luminasink.me','https://other-yurixbrs-projects.vercel.app','https://bot.luminasink.com.evil.test'])expect(isAllowedOrigin(origin)).toBe(false);
 expect(getAllowedOrigins()).not.toContain('http://localhost:5173');
});
test('additional production origins require an exact HTTPS origin without paths or credentials',()=>{
 process.env.NODE_ENV='production';process.env.ADDITIONAL_ALLOWED_ORIGINS='https://preview.example.test,http://insecure.test,https://user:pass@example.test,https://path.test/route';
 expect(isAllowedOrigin('https://preview.example.test')).toBe(true);
 for(const origin of ['http://insecure.test','https://user:pass@example.test','https://path.test/route'])expect(isAllowedOrigin(origin)).toBe(false);
});
test('local visual and development origins remain usable outside production',()=>{process.env.NODE_ENV='development';expect(isAllowedOrigin('http://127.0.0.1:5180')).toBe(true);});
