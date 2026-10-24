'use strict';
const mockRequest=jest.fn();
const mockSetCredentials=jest.fn();
const mockCompose=jest.fn().mockResolvedValue({message:Buffer.from('Subject: Lumina\r\n\r\nHTML and text fixture')});
jest.mock('google-auth-library',()=>({OAuth2Client:jest.fn(()=>({setCredentials:mockSetCredentials,request:mockRequest}))}));
jest.mock('nodemailer',()=>({createTransport:jest.fn(()=>({sendMail:mockCompose}))}));
const original={...process.env};
beforeEach(()=>{jest.resetModules();jest.clearAllMocks();process.env={...original,MAIL_TRANSPORT:'gmail_api',SMTP_USER:'sender@example.test',GMAIL_CLIENT_ID:'isolated-client',GMAIL_CLIENT_SECRET:'isolated-secret',GMAIL_REFRESH_TOKEN:'isolated-refresh',EMAIL_CODE_SECRET:'x'.repeat(32),MAIL_DEV_RECIPIENT:'devteam@example.test'};});
afterAll(()=>{process.env=original;});
test('Gmail API receives base64url MIME and uses the intended mailbox',async()=>{
 mockRequest.mockResolvedValue({data:{id:'gmail-message-id'}});
 const result=await require('../src/email/gmailTransport').sendMail({to:'devteam@example.test',text:'Fixture'});
 expect(result).toEqual({messageId:'gmail-message-id'});
 expect(mockSetCredentials).toHaveBeenCalledWith({refresh_token:'isolated-refresh'});
 expect(mockRequest).toHaveBeenCalledWith(expect.objectContaining({url:'https://gmail.googleapis.com/gmail/v1/users/sender%40example.test/messages/send',method:'POST',timeout:12000,retry:false}));
 const payload=mockRequest.mock.calls[0][0];expect(Buffer.from(payload.data.raw,'base64url').toString()).toContain('Subject: Lumina');
 expect(JSON.stringify(payload.data)).not.toContain('isolated-refresh');
});
test('Gmail API errors propagate so an undelivered code cannot become valid',async()=>{
 mockRequest.mockRejectedValue(new Error('isolated rejection'));
 await expect(require('../src/email/gmailTransport').sendMail({text:'Fixture'})).rejects.toThrow('isolated rejection');
});
test('OAuth configuration requires a refresh token and does not require an app password',()=>{
 delete process.env.SMTP_PASS;
 const mailer=require('../src/email/mailer');expect(()=>mailer.assertConfigured()).not.toThrow();
 delete process.env.GMAIL_REFRESH_TOKEN;expect(()=>mailer.assertConfigured()).toThrow();
});
test('unknown mail transports fail closed',()=>{
 process.env.MAIL_TRANSPORT='unrecognized';process.env.SMTP_PASS='irrelevant';
 expect(()=>require('../src/email/mailer').assertConfigured()).toThrow();
});
test('OAuth development delivery still uses only the development sender and recipient',async()=>{
 process.env.NODE_ENV='development';mockRequest.mockResolvedValue({data:{id:'dev-id'}});
 await require('../src/email/mailer').sendAccountEmail({to:'customer@example.test',purpose:'verify',message:{subject:'Fixture',text:'Fixture'}});
 expect(mockCompose).toHaveBeenCalledWith(expect.objectContaining({to:'devteam@example.test',from:expect.objectContaining({address:'devenv@luminasink.com'})}));
});
