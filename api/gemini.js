const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 20;
const rateLimitStore = new Map();

function getClientIp(req) {
  const xForwardedFor = req.headers['x-forwarded-for'];
  if (Array.isArray(xForwardedFor) && xForwardedFor.length > 0) {
    return String(xForwardedFor[0]).split(',')[0].trim();
  }
  if (typeof xForwardedFor === 'string' && xForwardedFor.trim()) {
    return xForwardedFor.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(clientIp) {
  const now = Date.now();
  const current = rateLimitStore.get(clientIp);

  if (!current || now > current.resetAt) {
    rateLimitStore.set(clientIp, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS
    });
    return { limited: false, retryAfterSec: 0 };
  }

  current.count += 1;
  rateLimitStore.set(clientIp, current);

  if (current.count > RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.ceil((current.resetAt - now) / 1000);
    return { limited: true, retryAfterSec: Math.max(retryAfterSec, 1) };
  }

  return { limited: false, retryAfterSec: 0 };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const clientIp = getClientIp(req);
    const { limited, retryAfterSec } = isRateLimited(clientIp);
    if (limited) {
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { prompt } = req.body || {};

    if (!prompt || !String(prompt).trim()) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': process.env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: String(prompt).trim() }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 900
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || 'Gemini API request failed'
      });
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({ text });
  } catch (error) {
    return res.status(500).json({
      error: 'Internal Server Error',
      detail: error?.message || 'Unknown error'
    });
  }
}
