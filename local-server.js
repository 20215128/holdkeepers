/**
 * Hold Keepers — Waitlist Landing Page Server
 * Zero-dependency Node.js HTTP server.
 * Handles static file serving and persistent email waitlist collection with CSV export.
 * 
 * Run with: node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const JSON_FILE = path.join(DATA_DIR, 'waitlist.json');
const CSV_FILE = path.join(DATA_DIR, 'waitlist.csv');

// Baseline momentum offset for early traction display (e.g. #142)
const BASE_QUEUE_OFFSET = 128;

// Ensure storage exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

if (!fs.existsSync(JSON_FILE)) {
  fs.writeFileSync(JSON_FILE, JSON.stringify([], null, 2), 'utf-8');
}

if (!fs.existsSync(CSV_FILE)) {
  const header = 'Index,Email,UsingStripe,CustomerCount,ReferralCode,ReferredBy,ReferralCount,Timestamp\n';
  fs.writeFileSync(CSV_FILE, header, 'utf-8');
}

function loadWaitlist() {
  try {
    const raw = fs.readFileSync(JSON_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading waitlist.json:', err);
    return [];
  }
}

function saveWaitlist(list) {
  try {
    fs.writeFileSync(JSON_FILE, JSON.stringify(list, null, 2), 'utf-8');
    
    // Sync CSV
    const header = 'Index,Email,UsingStripe,CustomerCount,ReferralCode,ReferredBy,ReferralCount,Timestamp\n';
    const rows = list.map((item, idx) => {
      const email = (item.email || '').replace(/"/g, '""');
      const stripe = (item.usingStripe || '').replace(/"/g, '""');
      const customers = (item.customerCount || '').replace(/"/g, '""');
      const refCode = (item.referralCode || '').replace(/"/g, '""');
      const refBy = (item.referredBy || '').replace(/"/g, '""');
      const refCount = item.referralCount || 0;
      const ts = (item.timestamp || '').replace(/"/g, '""');
      return `"${idx + 1}","${email}","${stripe}","${customers}","${refCode}","${refBy}","${refCount}","${ts}"`;
    }).join('\n');
    fs.writeFileSync(CSV_FILE, header + rows + '\n', 'utf-8');
  } catch (err) {
    console.error('Error saving waitlist:', err);
  }
}

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HK-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  // API: POST /api/waitlist
  if (pathname === '/api/waitlist' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      // Safeguard against oversized payloads (max 100KB)
      if (body.length > 1e5) {
        req.destroy();
      }
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = (payload.email || '').trim().toLowerCase();
        const usingStripe = (payload.usingStripe || 'Yes').trim();
        const customerCount = (payload.customerCount || 'Not specified').trim();
        const referredBy = (payload.referredBy || '').trim().toUpperCase();

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          return sendJson(res, 400, { error: 'Please enter a valid email address.' });
        }

        const waitlist = loadWaitlist();
        const existing = waitlist.find(item => item.email === email);

        if (existing) {
          return sendJson(res, 200, {
            success: true,
            alreadyRegistered: true,
            email: existing.email,
            position: existing.position,
            referralCode: existing.referralCode,
            totalSignups: BASE_QUEUE_OFFSET + waitlist.length
          });
        }

        // Generate position & referral code
        const referralCode = generateReferralCode();
        const position = BASE_QUEUE_OFFSET + waitlist.length + 1;

        // Reward referrer if valid code passed
        if (referredBy) {
          const referrer = waitlist.find(item => item.referralCode === referredBy);
          if (referrer) {
            referrer.referralCount = (referrer.referralCount || 0) + 1;
            // Bump referrer up 3 spots
            referrer.position = Math.max(1, referrer.position - 3);
          }
        }

        const newEntry = {
          email,
          usingStripe,
          customerCount,
          referredBy: referredBy || null,
          position,
          referralCode,
          referralCount: 0,
          timestamp: new Date().toISOString()
        };

        waitlist.push(newEntry);
        saveWaitlist(waitlist);

        console.log(`[Hold Keepers] New Waitlist Signup: ${email} | Stripe: ${usingStripe} | Customers: ${customerCount} | Pos #${position}`);

        return sendJson(res, 201, {
          success: true,
          email: newEntry.email,
          position: newEntry.position,
          referralCode: newEntry.referralCode,
          totalSignups: BASE_QUEUE_OFFSET + waitlist.length
        });
      } catch (err) {
        console.error('Error handling waitlist submission:', err);
        return sendJson(res, 500, { error: 'Internal server error. Please try again.' });
      }
    });
    return;
  }

  // API: GET /api/waitlist/stats
  if (pathname === '/api/waitlist/stats' && req.method === 'GET') {
    const waitlist = loadWaitlist();
    return sendJson(res, 200, {
      totalReal: waitlist.length,
      simulatedTotal: BASE_QUEUE_OFFSET + waitlist.length
    });
  }

  // API: GET /api/waitlist/export (Admin CSV export)
  if (pathname === '/api/waitlist/export' && req.method === 'GET') {
    if (!fs.existsSync(CSV_FILE)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('CSV file does not exist yet.');
    }
    const stat = fs.statSync(CSV_FILE);
    res.writeHead(200, {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Length': stat.size,
      'Content-Disposition': 'attachment; filename="hold_keepers_waitlist.csv"'
    });
    return fs.createReadStream(CSV_FILE).pipe(res);
  }

  // Static file serving
  let cleanPath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(__dirname, cleanPath);

  // Guard against path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Access denied');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Default to index.html for SPA-like navigation
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.json': 'application/json; charset=utf-8',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.ico': 'image/x-icon'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n================================================================`);
  console.log(`  🛡️  HOLD KEEPERS WAITLIST SERVER RUNNING`);
  console.log(`  🔗 Local preview:    http://localhost:${PORT}`);
  console.log(`  💾 Stored leads:     ${JSON_FILE}`);
  console.log(`  📊 Export CSV leads: http://localhost:${PORT}/api/waitlist/export`);
  console.log(`================================================================\n`);
});
