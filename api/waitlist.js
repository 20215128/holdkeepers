/**
 * Vercel Serverless Function — /api/waitlist
 * Handles waitlist lead submission on Vercel.
 */

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HK-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { email, usingStripe, customerCount, referredBy } = req.body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const referralCode = generateReferralCode();
    
    // Baseline queue offset for early traction display (e.g. #142)
    const baseOffset = 138;
    const randomOffset = Math.floor(Math.random() * 5);
    const position = baseOffset + randomOffset;

    const leadData = {
      email: cleanEmail,
      usingStripe: usingStripe || 'Not specified',
      customerCount: customerCount || 'Not specified',
      referredBy: referredBy || null,
      referralCode,
      position,
      timestamp: new Date().toISOString()
    };

    // If a webhook URL is configured (Discord, Slack, Zapier, Make, or Google Sheets Apps Script)
    const webhookUrl = process.env.NOTIFICATION_WEBHOOK || process.env.DISCORD_WEBHOOK || process.env.SLACK_WEBHOOK;
    if (webhookUrl) {
      try {
        const payload = webhookUrl.includes('discord.com')
          ? {
              content: `🛡️ **New Hold Keepers Lead!**\n📧 Email: \`${cleanEmail}\`\n💳 Using Stripe: ${leadData.usingStripe}\n👥 Customers: ${leadData.customerCount}\n🔢 Queue: #${position}`
            }
          : leadData;

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } catch (err) {
        console.error('Webhook notification error:', err);
      }
    }

    // Return success to the landing page frontend
    return res.status(200).json({
      success: true,
      message: 'Added to waitlist successfully',
      email: cleanEmail,
      position,
      referralCode
    });
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
