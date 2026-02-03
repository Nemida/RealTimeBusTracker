const router = require('express').Router();
const UserFavorite = require('../models/userFavorite.model');
const SearchHistory = require('../models/searchHistory.model');
const Alert = require('../models/alert.model');

router.get('/favorites', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const favorites = await UserFavorite.find({ sessionId })
      .sort({ lastAccessed: -1 })
      .limit(50);

    res.json(favorites);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/favorites', async (req, res) => {
  try {
    const { sessionId, type, itemId, itemName, metadata } = req.body;
    
    if (!sessionId || !type || !itemId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const favorite = await UserFavorite.findOneAndUpdate(
      { sessionId, itemId },
      { 
        sessionId, 
        type, 
        itemId, 
        itemName, 
        metadata,
        lastAccessed: new Date()
      },
      { upsert: true, new: true }
    );

    res.json(favorite);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/favorites/:itemId', async (req, res) => {
  try {
    const { sessionId } = req.query;
    const { itemId } = req.params;

    await UserFavorite.deleteOne({ sessionId, itemId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/alerts', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    const alerts = await Alert.find({ sessionId, isActive: true })
      .sort({ createdAt: -1 });

    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/alerts', async (req, res) => {
  try {
    const { sessionId, type, config } = req.body;
    
    if (!sessionId || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const alert = new Alert({
      sessionId,
      type,
      config,
      expiresAt
    });

    await alert.save();
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/alerts/:alertId', async (req, res) => {
  try {
    const { sessionId } = req.query;
    const { alertId } = req.params;

    await Alert.deleteOne({ _id: alertId, sessionId });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { sessionId, query, queryType, resultCount, selectedResult, location } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query required' });
    }

    const searchEntry = new SearchHistory({
      sessionId,
      query: query.toLowerCase(),
      queryType,
      resultCount,
      selectedResult,
      location: location ? { type: 'Point', coordinates: location } : undefined
    });

    await searchEntry.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/search/suggestions', async (req, res) => {
  try {
    const { q, sessionId } = req.query;
    
    const suggestions = await SearchHistory.aggregate([
      {
        $match: q ? { 
          query: { $regex: q, $options: 'i' }
        } : {}
      },
      {
        $group: {
          _id: '$query',
          count: { $sum: 1 },
          lastSearched: { $max: '$timestamp' },
          type: { $first: '$queryType' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    let recentSearches = [];
    if (sessionId) {
      recentSearches = await SearchHistory.find({ sessionId })
        .sort({ timestamp: -1 })
        .limit(5)
        .select('query queryType selectedResult');
    }

    res.json({
      popular: suggestions.map(s => ({
        query: s._id,
        count: s.count,
        type: s.type
      })),
      recent: recentSearches
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const [favoriteStats, alertStats, searchStats] = await Promise.all([
      UserFavorite.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]),
      Alert.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 }, active: { $sum: { $cond: ['$isActive', 1, 0] } } } }
      ]),
      SearchHistory.aggregate([
        { $group: { _id: '$queryType', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      favorites: favoriteStats,
      alerts: alertStats,
      searches: searchStats
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
