const axios = require('axios');

const MOCK_NEWS = [
  {
    id: 'mock1',
    title: 'Bitcoin Surges Past $65,000 as Institutional Demand Rises',
    description: 'Bitcoin reached new heights as major institutions continue to accumulate BTC ahead of the next halving cycle.',
    url: 'https://coindesk.com',
    imageUrl: 'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400',
    source: 'CoinDesk',
    publishedAt: new Date().toISOString(),
    category: 'bitcoin',
  },
  {
    id: 'mock2',
    title: 'Ethereum Layer 2 Solutions See Record Transaction Volume',
    description: 'L2 networks like Arbitrum and Optimism are processing more transactions than ever, reducing Ethereum mainnet fees.',
    url: 'https://cointelegraph.com',
    imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400',
    source: 'CoinTelegraph',
    publishedAt: new Date().toISOString(),
    category: 'ethereum',
  },
  {
    id: 'mock3',
    title: 'DeFi Total Value Locked Reaches New All-Time High',
    description: 'The decentralized finance ecosystem continues to expand with over $180 billion locked across protocols.',
    url: 'https://decrypt.co',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400',
    source: 'Decrypt',
    publishedAt: new Date().toISOString(),
    category: 'defi',
  },
  {
    id: 'mock4',
    title: 'Solana NFT Market Explodes with Record Weekly Sales',
    description: 'Solana-based NFT collections are seeing unprecedented trading volumes as creator adoption grows.',
    url: 'https://theblock.co',
    imageUrl: 'https://images.unsplash.com/photo-1622630998477-20aa696ecb05?w=400',
    source: 'The Block',
    publishedAt: new Date().toISOString(),
    category: 'nft',
  },
];

/**
 * Fetch crypto news from NewsAPI
 */
async function fetchCryptoNews() {
  const apiKey = process.env.NEWS_API_KEY;

  if (!apiKey || apiKey === 'your_news_api_key') {
    console.warn('⚠️  NewsAPI key not configured. Using mock news.');
    return MOCK_NEWS;
  }

  try {
    const response = await axios.get('https://newsapi.org/v2/everything', {
      params: {
        q: 'cryptocurrency OR bitcoin OR ethereum',
        language: 'en',
        sortBy: 'publishedAt',
        pageSize: 10,
        apiKey,
      },
      timeout: 8000,
    });

    if (response.data.status !== 'ok') return MOCK_NEWS;

    return response.data.articles.map((article, i) => ({
      id: `external_${i}`,
      title: article.title,
      description: article.description || '',
      url: article.url,
      imageUrl: article.urlToImage || '',
      source: article.source.name,
      publishedAt: article.publishedAt,
      category: 'crypto',
    }));
  } catch (err) {
    console.error('NewsAPI error:', err.message);
    return MOCK_NEWS;
  }
}

module.exports = { fetchCryptoNews };
