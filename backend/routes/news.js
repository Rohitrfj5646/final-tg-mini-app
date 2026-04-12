const express = require('express');
const router = express.Router();
const { getDb } = require('../config/supabase');
const { authMiddleware } = require('../middleware/auth');
const { fetchCryptoNews } = require('../services/news');

/**
 * GET /api/news — combined admin + external news
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const db = getDb();

    // Custom news from Supabase
    const { data: customNews } = await db
      .from('news')
      .select('*')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .limit(5);

    const formattedCustom = (customNews || []).map((n) => ({
      id: n.id,
      title: n.title,
      description: n.content,
      url: n.url || '#',
      imageUrl: n.image_url || '',
      source: 'Admin',
      publishedAt: n.created_at,
      category: n.category,
    }));

    // External news
    let externalNews = [];
    try {
      externalNews = await fetchCryptoNews();
    } catch (e) {
      console.warn('External news skipped:', e.message);
    }

    const combined = [...formattedCustom, ...externalNews].slice(0, 10);
    res.json({ success: true, news: combined });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch news' });
  }
});

module.exports = router;
