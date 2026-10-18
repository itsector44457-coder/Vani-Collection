require('dotenv').config();

if (process.env.DNS_SERVERS) {
  const dns = require('dns');
  const servers = process.env.DNS_SERVERS.split(',').map((s) => s.trim()).filter(Boolean);
  if (servers.length) dns.setServers(servers);
}

const { loadConfig } = require('../src/config');
const { verifyEmailConnection, sendRaw } = require('../src/services/email');
const { startIntegrationWorker } = require('../src/workers/integration-worker');
const mongoose = require('mongoose');

async function testEmail() {
  const targetEmail = process.argv[2] || process.env.SMTP_USER || process.env.ADMIN_EMAIL;

  console.log('\n--- ✉️  Vani Collection Nodemailer Test ---');
  const config = loadConfig();

  console.log('EMAIL_ENABLED :', config.EMAIL_ENABLED);
  console.log('SMTP_HOST     :', config.SMTP_HOST);
  console.log('SMTP_PORT     :', config.SMTP_PORT);
  console.log('SMTP_USER     :', config.SMTP_USER || '(not set)');
  console.log('SMTP_PASS     :', config.SMTP_PASS ? `****** (${config.SMTP_PASS.replace(/\s+/g, '').length} chars)` : '(not set)');
  console.log('EMAIL_FROM    :', config.EMAIL_FROM);
  console.log('TARGET EMAIL  :', targetEmail);

  if (!config.SMTP_PASS) {
    console.error('\n❌ ERROR: SMTP_PASS is missing in backend/.env!');
    console.error('Please add your 16-character Google App Password to SMTP_PASS in backend/.env.');
    process.exit(1);
  }

  console.log('\n1. Verifying SMTP transport connection...');
  const verifyRes = await verifyEmailConnection();
  if (!verifyRes.ok) {
    console.error('❌ SMTP Connection Failed:', verifyRes.error || verifyRes.message);
    process.exit(1);
  }
  console.log('✅ SMTP Connection verified successfully!');

  if (!targetEmail) {
    console.log('\nPass an email address as argument to send a test email:');
    console.log('node scripts/test-email.js your-email@example.com');
    process.exit(0);
  }

  console.log(`\n2. Connecting to DB and sending live test email to: ${targetEmail}...`);
  await mongoose.connect(config.MONGO_URI);
  const stopWorker = startIntegrationWorker({ log: console });

  const result = await sendRaw({
    to: targetEmail,
    subject: '🌸 Vani Collection — Nodemailer SMTP Test Successful',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px; background: #faf7f2; border: 1px solid #e8dfd5; border-radius: 12px;">
        <h1 style="color: #881337; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; text-align: center; margin-top: 0;">Vani Collection</h1>
        <p style="text-align: center; color: #78716c; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 24px;">Atelier Verification & Notification Test</p>
        <p style="font-size: 15px; color: #1c1917;">Namaste,</p>
        <p style="font-size: 14px; color: #44403c; line-height: 1.6;">Your <strong>Nodemailer SMTP email pipeline is fully connected and operational!</strong></p>
        <div style="background: #ffffff; padding: 16px; border: 1px solid #e8dfd5; border-radius: 8px; margin: 20px 0; font-size: 13px; color: #1c1917;">
          <p style="margin: 4px 0;"><strong>Delivered via:</strong> ${config.SMTP_HOST} (${config.SMTP_USER})</p>
          <p style="margin: 4px 0;"><strong>Timestamp:</strong> ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          <p style="margin: 4px 0;"><strong>Active Channels:</strong> Signup OTPs, Password Resets, Order Receipts, Concierge Inquiries</p>
        </div>
        <p style="font-size: 13px; color: #78716c;">All transactional emails and customer notifications will now be dispatched live to this mailbox.</p>
        <p style="margin-top: 28px; font-size: 14px; color: #1c1917;">Warm regards,<br /><strong>The Vani Collection Atelier Team</strong></p>
      </div>
    `,
    text: `Vani Collection Nodemailer SMTP Test Successful!\n\nDelivered via: ${config.SMTP_HOST} (${config.SMTP_USER})\nTimestamp: ${new Date().toLocaleString()}`,
    tags: ['test'],
    log: console,
  });

  console.log('Result:', result);
  console.log('Waiting for outbox dispatch...');
  setTimeout(async () => {
    stopWorker();
    await mongoose.connection.close();
    console.log('\n🎉 Test completed! Check your inbox (or spam folder) for the test email.\n');
    process.exit(0);
  }, 4000);
}

testEmail().catch((err) => {
  console.error('\n❌ Unhandled error:', err);
  process.exit(1);
});
