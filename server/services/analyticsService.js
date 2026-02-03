const VehicleHistory = require('../models/vehicleHistory.model');
const RouteStats = require('../models/routeStats.model');
const Bus = require('../models/bus.model');


class AnalyticsService {
  constructor() {
    this.cacheTimeout = 60000; // 1 minute cache
    this.cache = {
      fleetSummary: null,
      lastUpdate: 0
    };
  }

 
  async getFleetDashboard(city) {
    const now = Date.now();
    if (this.cache.fleetSummary && (now - this.cache.lastUpdate) < this.cacheTimeout) {
      return this.cache.fleetSummary;
    }

    const [statusBreakdown, speedStats, recentActivity, routeCoverage] = await Promise.all([
      this.getStatusBreakdown(),
      this.getSpeedStatistics(city),
      this.getRecentActivity(city),
      this.getRouteCoverage()
    ]);

    const result = {
      timestamp: new Date().toISOString(),
      fleet: statusBreakdown,
      performance: speedStats,
      activity: recentActivity,
      coverage: routeCoverage
    };

    this.cache.fleetSummary = result;
    this.cache.lastUpdate = now;
    return result;
  }

 
  async getStatusBreakdown() {
    const statusCounts = await Bus.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          avgSpeed: { $avg: '$speed' }
        }
      }
    ]);

    const totalBuses = await Bus.countDocuments();
    const activeBuses = await Bus.countDocuments({ isActive: true });

    return {
      total: totalBuses,
      active: activeBuses,
      inactive: totalBuses - activeBuses,
      utilizationRate: totalBuses > 0 ? Math.round((activeBuses / totalBuses) * 100) : 0,
      byStatus: statusCounts.reduce((acc, item) => {
        acc[item._id || 'Unknown'] = {
          count: item.count,
          avgSpeed: Math.round(item.avgSpeed || 0)
        };
        return acc;
      }, {})
    };
  }

 
  async getSpeedStatistics(city) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const stats = await VehicleHistory.aggregate([
      {
        $match: {
          city,
          timestamp: { $gte: oneHourAgo },
          speed: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          minSpeed: { $min: '$speed' },
          dataPoints: { $sum: 1 }
        }
      }
    ]);

    return stats[0] || {
      avgSpeed: 0,
      maxSpeed: 0,
      minSpeed: 0,
      dataPoints: 0
    };
  }


  async getRecentActivity(city) {
    const periods = [
      { name: 'lastHour', hours: 1 },
      { name: 'last6Hours', hours: 6 },
      { name: 'last24Hours', hours: 24 }
    ];

    const activity = {};
    for (const period of periods) {
      const since = new Date(Date.now() - period.hours * 60 * 60 * 1000);
      const count = await VehicleHistory.countDocuments({
        city,
        timestamp: { $gte: since }
      });
      activity[period.name] = count;
    }

    return activity;
  }

 
  async getRouteCoverage() {
    const routes = await Bus.aggregate([
      {
        $group: {
          _id: {
            source: '$source.name',
            destination: '$destination.name'
          },
          busCount: { $sum: 1 },
          activeBuses: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      { $sort: { busCount: -1 } },
      { $limit: 10 }
    ]);

    return {
      topRoutes: routes.map(r => ({
        route: `${r._id.source} → ${r._id.destination}`,
        totalBuses: r.busCount,
        activeBuses: r.activeBuses
      })),
      totalRoutes: routes.length
    };
  }

  
  async getRoutePerformance(routeId, days = 7) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [hourlyTrends, dailyStats, stopAnalysis] = await Promise.all([
      this.getHourlyTrends(routeId, startDate),
      this.getDailyStats(routeId, startDate),
      this.getStopAnalysis(routeId)
    ]);

    return {
      routeId,
      period: `Last ${days} days`,
      hourlyTrends,
      dailyStats,
      stopAnalysis
    };
  }

  
  async getHourlyTrends(routeId, startDate) {
    const trends = await VehicleHistory.aggregate([
      {
        $match: {
          routeId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          avgSpeed: { $avg: '$speed' },
          vehicleCount: { $addToSet: '$vehicleId' },
          dataPoints: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return trends.map(t => ({
      hour: t._id,
      timeSlot: `${String(t._id).padStart(2, '0')}:00`,
      avgSpeed: Math.round(t.avgSpeed || 0),
      uniqueVehicles: t.vehicleCount.length,
      activityLevel: this.categorizeActivity(t.dataPoints)
    }));
  }

 
  async getDailyStats(routeId, startDate) {
    const stats = await VehicleHistory.aggregate([
      {
        $match: {
          routeId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
          avgSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          dataPoints: { $sum: 1 },
          vehicles: { $addToSet: '$vehicleId' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return stats.map(s => ({
      date: s._id,
      avgSpeed: Math.round(s.avgSpeed || 0),
      maxSpeed: Math.round(s.maxSpeed || 0),
      dataPoints: s.dataPoints,
      uniqueVehicles: s.vehicles.length
    }));
  }

  async getStopAnalysis(busNumber) {
    const bus = await Bus.findOne({ busNumber });
    if (!bus) return null;

    const allStops = [bus.source, ...bus.stops, bus.destination];
    return {
      totalStops: allStops.length,
      route: `${bus.source.name} → ${bus.destination.name}`,
      stops: allStops.map((stop, index) => ({
        order: index + 1,
        name: stop.name,
        coordinates: stop.coords,
        type: index === 0 ? 'origin' : (index === allStops.length - 1 ? 'destination' : 'intermediate')
      }))
    };
  }

  
  async findBusesNearLocation(longitude, latitude, radiusKm = 5) {
    const buses = await Bus.find({
      isActive: true,
      coordinates: {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radiusKm / 6378.1]
        }
      }
    }).select('busNumber coordinates speed status nextStop eta routeGeometry');

    return {
      center: [longitude, latitude],
      radiusKm,
      timestamp: new Date().toISOString(),
      buses: buses.map(b => ({
        busNumber: b.busNumber,
        coordinates: b.coordinates,
        speed: b.speed,
        status: b.status,
        nextStop: b.nextStop,
        eta: b.eta
      })),
      count: buses.length
    };
  }


  async getVehicleHeatmap(city) {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const heatmap = await VehicleHistory.aggregate([
      {
        $match: {
          city,
          timestamp: { $gte: oneHourAgo }
        }
      },
      {
        $group: {
          _id: {
            lng: { $round: [{ $arrayElemAt: ['$coordinates.coordinates', 0] }, 3] },
            lat: { $round: [{ $arrayElemAt: ['$coordinates.coordinates', 1] }, 3] }
          },
          intensity: { $sum: 1 },
          avgSpeed: { $avg: '$speed' }
        }
      },
      {
        $project: {
          _id: 0,
          coordinates: ['$_id.lng', '$_id.lat'],
          intensity: 1,
          avgSpeed: { $round: ['$avgSpeed', 0] }
        }
      }
    ]);

    return {
      city,
      timestamp: new Date().toISOString(),
      dataPoints: heatmap.length,
      heatmap
    };
  }


  async getOccupancyTrends() {
    const buses = await Bus.find({ isActive: true }).select('busNumber passengers status');

    const occupancyData = buses.map(bus => {
      const [current, max] = (bus.passengers || '0/40').split('/').map(Number);
      const percentage = max > 0 ? Math.round((current / max) * 100) : 0;

      return {
        busNumber: bus.busNumber,
        current,
        max,
        percentage,
        level: this.categorizeOccupancy(percentage),
        status: bus.status
      };
    });

    const avgOccupancy = occupancyData.length > 0
      ? Math.round(occupancyData.reduce((sum, b) => sum + b.percentage, 0) / occupancyData.length)
      : 0;

    return {
      timestamp: new Date().toISOString(),
      totalBuses: occupancyData.length,
      averageOccupancy: avgOccupancy,
      byLevel: {
        low: occupancyData.filter(b => b.level === 'low').length,
        moderate: occupancyData.filter(b => b.level === 'moderate').length,
        high: occupancyData.filter(b => b.level === 'high').length,
        full: occupancyData.filter(b => b.level === 'full').length
      },
      buses: occupancyData
    };
  }

  
  async recordDailyStats(city) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buses = await Bus.find({});
    const routeGroups = {};

    buses.forEach(bus => {
      const routeKey = `${bus.source.name}-${bus.destination.name}`;
      if (!routeGroups[routeKey]) {
        routeGroups[routeKey] = {
          routeId: routeKey,
          routeName: `${bus.source.name} → ${bus.destination.name}`,
          buses: []
        };
      }
      routeGroups[routeKey].buses.push(bus);
    });

    const stats = [];
    for (const [routeId, data] of Object.entries(routeGroups)) {
      const activeBuses = data.buses.filter(b => b.isActive);
      const avgSpeed = activeBuses.length > 0
        ? activeBuses.reduce((sum, b) => sum + (b.speed || 0), 0) / activeBuses.length
        : 0;

      stats.push({
        city,
        routeId,
        routeName: data.routeName,
        date: today,
        totalTrips: data.buses.length,
        avgSpeed: Math.round(avgSpeed),
        uniqueVehicles: data.buses.length,
        dataPoints: 1
      });
    }

    if (stats.length > 0) {
      await RouteStats.bulkWrite(
        stats.map(stat => ({
          updateOne: {
            filter: { city, routeId: stat.routeId, date: stat.date },
            update: { $set: stat },
            upsert: true
          }
        }))
      );
    }

    return { recorded: stats.length, date: today };
  }

 
  async getHistoricalStats(city, days = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await RouteStats.aggregate([
      {
        $match: {
          city,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$routeName',
          avgSpeed: { $avg: '$avgSpeed' },
          totalTrips: { $sum: '$totalTrips' },
          dataPoints: { $sum: '$dataPoints' },
          days: { $sum: 1 }
        }
      },
      { $sort: { totalTrips: -1 } }
    ]);

    return {
      city,
      period: `Last ${days} days`,
      routes: stats.map(s => ({
        route: s._id,
        avgSpeed: Math.round(s.avgSpeed || 0),
        totalTrips: s.totalTrips,
        activeDays: s.days
      }))
    };
  }


  categorizeActivity(dataPoints) {
    if (dataPoints > 100) return 'very-high';
    if (dataPoints > 50) return 'high';
    if (dataPoints > 20) return 'moderate';
    return 'low';
  }

  categorizeOccupancy(percentage) {
    if (percentage >= 90) return 'full';
    if (percentage >= 60) return 'high';
    if (percentage >= 30) return 'moderate';
    return 'low';
  }
}

module.exports = new AnalyticsService();
