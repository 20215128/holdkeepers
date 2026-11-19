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
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        body = {};
      }
    }

    const { name, email, usingStripe, customerCount, referredBy } = body || {};

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email is required.' });
    }

    const cleanName = (name || '').trim() || 'Founder';
    const cleanEmail = email.trim().toLowerCase();
    const referralCode = generateReferralCode();
    
    // Baseline queue offset for early traction display (e.g. #142)
    const baseOffset = 138;
    const randomOffset = Math.floor(Math.random() * 5);
    const position = baseOffset + randomOffset;

    const leadData = {
      name: cleanName,
      email: cleanEmail,
      usingStripe: usingStripe || 'Not specified',
      customerCount: customerCount || 'Not specified',
      referredBy: referredBy || null,
      referralCode,
      position,
      timestamp: new Date().toISOString()
    };

    // 1. Google Sheets Webhook (or general NOTIFICATION_WEBHOOK)
    const sheetWebhook = process.env.NOTIFICATION_WEBHOOK || process.env.GOOGLE_SHEETS_WEBHOOK;
    if (sheetWebhook && !sheetWebhook.includes('discord.com') && typeof fetch !== 'undefined') {
      try {
        await fetch(sheetWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(leadData)
        });
      } catch (err) {
        console.error('Google Sheets notification error:', err);
      }
    }

    // 2. Discord Webhook
    const discordWebhook = process.env.DISCORD_WEBHOOK || (sheetWebhook && sheetWebhook.includes('discord.com') ? sheetWebhook : null);
    if (discordWebhook && typeof fetch !== 'undefined') {
      try {
        await fetch(discordWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `🛡️ **New Hold Keepers Lead!**\n👤 **Name:** ${cleanName}\n📧 **Email:** \`${cleanEmail}\`\n💳 **Using Stripe:** ${leadData.usingStripe}\n👥 **Customers:** ${leadData.customerCount}\n🔢 **Queue:** #${position}`
          })
        });
      } catch (err) {
        console.error('Discord webhook error:', err);
      }
    }

    // Return success to the landing page frontend
    return res.status(200).json({
      success: true,
      message: 'Added to waitlist successfully',
      name: cleanName,
      email: cleanEmail,
      position,
      referralCode
    });
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
