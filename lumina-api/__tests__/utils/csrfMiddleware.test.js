'use strict';
const express=require('express');const cookieParser=require('cookie-parser');const request=require('supertest');
const {csrfProtection,ensureCsrfToken}=require('../../src/utils/csrfMiddleware');
function app(){const instance=express();instance.use(cookieParser());instance.get('/token',ensureCsrfToken,(req,res)=>res.json({csrfToken:req.csrfToken()}));instance.post('/mutate',csrfProtection,(req,res)=>res.json({ok:true}));instance.use((error,req,res,next)=>res.status(error.code==='EBADCSRFTOKEN'?403:500).json({code:error.code}));return instance;}
async function token(instance,session=''){const r=await request(instance).get('/token').set('Cookie',session?`lumina_token=${session}`:'');const cookie=r.headers['set-cookie'].find(c=>c.startsWith('csrf_token=')).split(';')[0];return {value:r.body.csrfToken,cookie};}
test('a signed token works only with its cookie and is HttpOnly',async()=>{
 const instance=app();const response=await request(instance).get('/token');expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
 const csrf=await token(instance);expect(csrf.value).toMatch(/^[A-Za-z0-9_-]{43}\.[A-Za-z0-9_-]{43}$/);
 const result=await request(instance).post('/mutate').set('Cookie',csrf.cookie).set('X-CSRF-Token',csrf.value);expect(result.status).toBe(200);
});
test('missing token is rejected',async()=>{expect((await request(app()).post('/mutate')).status).toBe(403);});
test('matching attacker-chosen cookie and header are rejected without a valid signature',async()=>{const result=await request(app()).post('/mutate').set('Cookie','csrf_token=attacker-chosen').set('X-CSRF-Token','attacker-chosen');expect(result.status).toBe(403);});
test('token from a different session is rejected',async()=>{
 const instance=app();const csrf=await token(instance,'session-a');const result=await request(instance).post('/mutate').set('Cookie',`${csrf.cookie}; lumina_token=session-b`).set('X-CSRF-Token',csrf.value);expect(result.status).toBe(403);
});
test('a malicious Origin is rejected even with matching token and cookie',async()=>{const instance=app();const csrf=await token(instance);expect((await request(instance).post('/mutate').set('Cookie',csrf.cookie).set('X-CSRF-Token',csrf.value).set('Origin','https://evil.example')).status).toBe(403);});
test('legitimate same-site origin is accepted with a signed token',async()=>{const instance=app();const csrf=await token(instance);expect((await request(instance).post('/mutate').set('Cookie',csrf.cookie).set('X-CSRF-Token',csrf.value).set('Origin','https://bot.luminasink.com')).status).toBe(200);});
