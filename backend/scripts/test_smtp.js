const path = require('path');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('--- SMTP Configuration Audit ---');
console.log('EMAIL_HOST:', process.env.EMAIL_HOST);
console.log('EMAIL_PORT:', process.env.EMAIL_PORT);
console.log('EMAIL_SECURE:', process.env.EMAIL_SECURE);
console.log('EMAIL_USER:', process.env.EMAIL_USER);
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('--------------------------------\n');

async function run() {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ Error: Missing SMTP configurations in .env file!');
    process.exit(1);
  }

  const configs = [
    { name: 'Port 465, Secure (SSL/TLS)', port: 465, secure: true },
    { name: 'Port 587, STARTTLS', port: 587, secure: false }
  ];

  for (const config of configs) {
    console.log(`\n--- Testing Configuration: ${config.name} ---`);
    const transporterConfig = {
      host: process.env.EMAIL_HOST,
      port: config.port,
      secure: config.secure,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    };

    const transporter = nodemailer.createTransport(transporterConfig);
    try {
      await transporter.verify();
      console.log(`✅ Success for: ${config.name}! SMTP Connection works perfectly!`);
      
      const testRecipient = 'beingiitd@gmail.com';
      console.log(`Sending a test email to ${testRecipient}...`);

      const mailOptions = {
        from: process.env.EMAIL_FROM || `"Samay Watch" <orders@samaywatch.in>`,
        to: testRecipient,
        subject: 'SMTP Connection Test - Samay Watch',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #eee; border-radius: 15px; color: #333;">
            <div style="text-align: center; margin-bottom: 30px;">
              <img src="https://samaywatch-assets.sgp1.cdn.digitaloceanspaces.com/samay_logo.png" alt="Samay Watch" style="max-height: 40px; margin: 0 auto; display: block;" />
              <p style="font-size: 10px; color: #888; letter-spacing: 4px; margin-top: 5px; text-transform: uppercase;">SMTP Audit Check</p>
            </div>
            <h2 style="font-size: 20px; font-weight: normal; border-bottom: 1px solid #eee; padding-bottom: 10px; color: #000;">Connection Test Successful</h2>
            <p>Hello,</p>
            <p>This is an automated test email confirming that the SMTP server configuration for <strong>orders@samaywatch.in</strong> is configured correctly on the server.</p>
            <p>Your test order confirmation emails will be delivered without any issues.</p>
            <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px; font-size: 11px; color: #999;">
              <strong>Samay Watch</strong><br/>
              GSTIN - 07AANFS0947D1Z5<br/>
              Main Market, Bada Gol Chakkar,<br/>
              10-F, Near Sparks Mall, Kamla Nagar,<br/>
              Block F, Kamla Nagar,<br/>
              New Delhi, Delhi - 110007<br/>
              If you have any inquiries, please contact us at orders@samaywatch.in
            </div>
          </div>
        `
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('✅ Test email sent successfully!');
      console.log('Message ID:', info.messageId);
      return; // Exit on first working config
    } catch (error) {
      console.error(`❌ Failed for: ${config.name}. Error:`, error.message || error);
    }
  }
  console.log('\n❌ All configurations failed.');
  process.exit(1);
}

run();
