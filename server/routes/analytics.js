const router = require('express').Router();
const RoutePerformance = require('../models/routePerformance.model');
const VehicleHistory = require('../models/vehicleHistory.model');
const Bus = require('../models/bus.model');

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [activeVehicles, hourlyStats, routeCount, recentHistory] = await Promise.all([
      Bus.countDocuments({ isActive: true }),
      VehicleHistory.aggregate([
        { $match: { timestamp: { $gte: oneHourAgo } } },
        {
          $group: {
            _id: null,
            avgSpeed: { $avg: '$speed' },
            dataPoints: { $sum: 1 },
            uniqueVehicles: { $addToSet: '$vehicleId' }
          }
        }
      ]),
      Bus.distinct('routeId').then(r => r.filter(Boolean).length),
      VehicleHistory.countDocuments({ timestamp: { $gte: oneDayAgo } })
    ]);

    const hourlyData = hourlyStats[0] || { avgSpeed: 0, dataPoints: 0, uniqueVehicles: [] };

    res.json({
      realtime: {
        activeVehicles,
        routeCount,
        timestamp: now.toISOString()
      },
      hourly: {
        avgSpeed: Math.round(hourlyData.avgSpeed || 0),
        dataPoints: hourlyData.dataPoints,
        vehiclesTracked: hourlyData.uniqueVehicles?.length || 0
      },
      daily: {
        historyRecords: recentHistory
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/routes', async (req, res) => {
  try {
    const { sort = 'reliability', limit = 20 } = req.query;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const routeStats = await RoutePerformance.aggregate([
      { $match: { date: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: '$routeId',
          routeName: { $first: '$routeName' },
          avgReliability: { $avg: '$reliabilityScore' },
          avgSpeed: { $avg: '$speed.average' },
          totalTrips: { $sum: '$metrics.totalTrips' },
          avgDelay: { $avg: '$metrics.avgDelayMinutes' },
          dataPoints: { $sum: '$dataPoints' }
        }
      },
      {
        $project: {
          routeId: '$_id',
          routeName: 1,
          reliability: { $round: ['$avgReliability', 1] },
          avgSpeed: { $round: ['$avgSpeed', 1] },
          totalTrips: 1,
          avgDelay: { $round: ['$avgDelay', 1] },
          dataPoints: 1
        }
      },
      { $sort: sort === 'reliability' ? { reliability: -1 } : { avgSpeed: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json(routeStats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/routes/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [dailyPerformance, hourlyPattern, recentVehicles] = await Promise.all([
      RoutePerformance.find({ routeId, date: { $gte: startDate }, hour: null })
        .sort({ date: 1 })
        .select('date metrics speed reliabilityScore'),
      RoutePerformance.aggregate([
        { $match: { routeId, date: { $gte: startDate }, hour: { $ne: null } } },
        {
          $group: {
            _id: '$hour',
            avgSpeed: { $avg: '$speed.average' },
            avgDelay: { $avg: '$metrics.avgDelayMinutes' },
            avgReliability: { $avg: '$reliabilityScore' }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      VehicleHistory.aggregate([
        { $match: { routeId, timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } } },
        {
          $group: {
            _id: '$vehicleId',
            lastSeen: { $max: '$timestamp' },
            avgSpeed: { $avg: '$speed' },
            positions: { $sum: 1 }
          }
        },
        { $sort: { lastSeen: -1 } },
        { $limit: 10 }
      ])
    ]);

    res.json({
      routeId,
      days: parseInt(days),
      dailyTrend: dailyPerformance,
      hourlyPattern: hourlyPattern.map(h => ({
        hour: h._id,
        avgSpeed: Math.round(h.avgSpeed || 0),
        avgDelay: Math.round(h.avgDelay || 0),
        reliability: Math.round(h.avgReliability || 0)
      })),
      recentVehicles
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/peak-hours', async (req, res) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const hourlyActivity = await VehicleHistory.aggregate([
      { $match: { timestamp: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgSpeed: { $avg: '$speed' },
          vehicleCount: { $addToSet: '$vehicleId' },
          dataPoints: { $sum: 1 }
        }
      },
      {
        $project: {
          hour: '$_id',
          avgSpeed: { $round: ['$avgSpeed', 1] },
          uniqueVehicles: { $size: '$vehicleCount' },
          dataPoints: 1
        }
      },
      { $sort: { hour: 1 } }
    ]);

    const sorted = [...hourlyActivity].sort((a, b) => b.uniqueVehicles - a.uniqueVehicles);
    const peakHours = sorted.slice(0, 3).map(h => h.hour);

    res.json({
      hourlyBreakdown: hourlyActivity,
      peakHours,
      analysis: {
        busiestHour: peakHours[0],
        quietestHour: sorted[sorted.length - 1]?.hour,
        avgVehiclesPerHour: Math.round(
          hourlyActivity.reduce((sum, h) => sum + h.uniqueVehicles, 0) / Math.max(hourlyActivity.length, 1)
        )
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/heatmap', async (req, res) => {
  try {
    const { hours = 1 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const heatmapData = await VehicleHistory.aggregate([
      { $match: { timestamp: { $gte: since } } },
      {
        $group: {
          _id: {
            lng: { $round: [{ $arrayElemAt: ['$coordinates.coordinates', 0] }, 3] },
            lat: { $round: [{ $arrayElemAt: ['$coordinates.coordinates', 1] }, 3] }
          },
          count: { $sum: 1 },
          avgSpeed: { $avg: '$speed' }
        }
      },
      { $match: { count: { $gte: 2 } } },
      {
        $project: {
          coordinates: ['$_id.lng', '$_id.lat'],
          intensity: '$count',
          avgSpeed: { $round: ['$avgSpeed', 1] }
        }
      }
    ]);

    res.json({
      timeRange: `${hours}h`,
      points: heatmapData.length,
      data: heatmapData
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { hours = 2 } = req.query;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    const history = await VehicleHistory.find({
      vehicleId,
      timestamp: { $gte: since }
    })
      .sort({ timestamp: 1 })
      .select('coordinates speed heading status timestamp')
      .limit(500);

    const stats = await VehicleHistory.aggregate([
      { $match: { vehicleId, timestamp: { $gte: since } } },
      {
        $group: {
          _id: null,
          avgSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          positions: { $sum: 1 },
          firstSeen: { $min: '$timestamp' },
          lastSeen: { $max: '$timestamp' }
        }
      }
    ]);

    res.json({
      vehicleId,
      timeRange: `${hours}h`,
      stats: stats[0] || {},
      path: history.map(h => ({
        coordinates: h.coordinates?.coordinates,
        speed: h.speed,
        heading: h.heading,
        timestamp: h.timestamp
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
