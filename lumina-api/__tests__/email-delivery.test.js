'use strict';
const mockSendMail=jest.fn().mockResolvedValue({messageId:'local-only'});
jest.mock('nodemailer',()=>({createTransport:jest.fn(()=>({sendMail:mockSendMail}))}));
const {codeEmail}=require('../src/email/templates');
const mailer=require('../src/email/mailer');
const original={...process.env};
afterEach(()=>{process.env={...original};mockSendMail.mockClear();});
function configure(){process.env.MAIL_TRANSPORT='smtp';process.env.SMTP_USER='test@example.test';process.env.SMTP_PASS='isolated-test';process.env.EMAIL_CODE_SECRET='a'.repeat(32);process.env.MAIL_DEV_RECIPIENT='devteam@luminasink.com';}
test('missing email settings fail closed without sending',async()=>{delete process.env.SMTP_PASS;expect(()=>mailer.assertConfigured()).toThrow();expect(mockSendMail).not.toHaveBeenCalled();});
test('development always redirects recipients and uses devenv sender',async()=>{configure();process.env.NODE_ENV='development';await mailer.sendAccountEmail({to:'customer@example.test',purpose:'verify',message:{subject:'Test',text:'Fixture'}});expect(mockSendMail.mock.calls[0][0]).toMatchObject({to:'devteam@luminasink.com',from:{address:'devenv@luminasink.com'},replyTo:'suporte@luminasink.com'});});
test('production uses the requested verify and noreply aliases',async()=>{configure();process.env.NODE_ENV='production';await mailer.sendAccountEmail({to:'customer@example.test',purpose:'verify',message:{subject:'Test',text:'Fixture'}});await mailer.sendAccountEmail({to:'customer@example.test',purpose:'reset',message:{subject:'Test',text:'Fixture'}});expect(mockSendMail.mock.calls[0][0].from.address).toBe('verify@luminasink.com');expect(mockSendMail.mock.calls[1][0].from.address).toBe('noreply@luminasink.com');});
test('HTML and plain text contain the code and an escaped cancellation link',()=>{const message=codeEmail({purpose:'verify',code:'ABCD2345',rejectionUrl:'https://bot.luminasink.com/security/code#token=A&x="test"'});expect(message.html).toContain('ABCD2345');expect(message.text).toContain('ABCD2345');expect(message.html).toContain('&amp;x=&quot;test&quot;');expect(message.html).toContain('15 minutos');expect(message.html).toContain('Não solicitei o código');expect(message.html).not.toContain('<script');});

test('every account email includes public legal links in HTML and plain text',()=>{
 const messages=[codeEmail({purpose:'verify',code:'ABCD2345',rejectionUrl:'https://bot.luminasink.com/security/code#token=fixture'}),require('../src/email/templates').passwordChangedEmail()];
 for(const message of messages)for(const path of ['terms','privacy','cookies']){expect(message.html).toContain('https://bot.luminasink.com/'+path);expect(message.text).toContain('https://bot.luminasink.com/'+path);}
});
