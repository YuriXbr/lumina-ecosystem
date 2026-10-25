'use strict';
const {OAuth2Client}=require('google-auth-library');
const nodemailer=require('nodemailer');
let client;
let composer;
function oauthClient() {
  if(!client) {
    client=new OAuth2Client({clientId:process.env.GMAIL_CLIENT_ID,clientSecret:process.env.GMAIL_CLIENT_SECRET});
    client.setCredentials({refresh_token:process.env.GMAIL_REFRESH_TOKEN});
  }
  return client;
}
async function sendMail(message) {
  // Nodemailer generates MIME locally; only the Gmail API performs delivery.
  composer ||= nodemailer.createTransport({streamTransport:true,buffer:true,newline:'windows',disableFileAccess:true,disableUrlAccess:true});
  const rendered=await composer.sendMail(message);
  const {data}=await oauthClient().request({url:`https://gmail.googleapis.com/gmail/v1/users/${encodeURIComponent(process.env.SMTP_USER)}/messages/send`,method:'POST',data:{raw:rendered.message.toString('base64url')},timeout:12000,retry:false});
  if(!data?.id)throw new Error('Gmail did not acknowledge delivery');
  return {messageId:data.id};
}
module.exports={sendMail};
