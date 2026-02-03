const axios = require('axios');
const VehicleHistory = require('../models/vehicleHistory.model');

const TRANSIT_CONFIGS = {
  boston: {
    name: 'Boston MBTA',
    center: [-71.0589, 42.3601],
    zoom: 12,
    vehiclesUrl: 'https://api-v3.mbta.com/vehicles',
    routesUrl: 'https://api-v3.mbta.com/routes',
    stopsUrl: 'https://api-v3.mbta.com/stops',
    shapesUrl: 'https://api-v3.mbta.com/shapes',
    apiKey: null, // MBTA API is free, no key required for basic usage
    filterParams: { 'filter[route_type]': '3' }, // Type 3 = Bus
    simulated: false,
    description: 'Real-time Boston MBTA bus tracking'
  }
};

class TransitApiService {
  constructor() {
    this.currentCity = 'boston'; // Always use Boston
    this.cache = {
      vehicles: null,
      routes: null,
      stops: null,
      lastFetch: 0
    };
    this.cacheTimeout = 5000;
    this.historyInterval = null;
  }

  startHistoryRecording(intervalMs = 60000) {
    if (this.historyInterval) {
      clearInterval(this.historyInterval);
    }
    
    this.historyInterval = setInterval(async () => {
      try {
        if (!this.isSimulated() && this.cache.vehicles?.length > 0) {
          await this.recordVehicleHistory(this.cache.vehicles);
        }
      } catch (err) {
        console.error('History recording error:', err.message);
      }
    }, intervalMs);
    
    console.log(`Vehicle history recording started (${intervalMs / 1000}s interval)`);
  }

  stopHistoryRecording() {
    if (this.historyInterval) {
      clearInterval(this.historyInterval);
      this.historyInterval = null;
      console.log('Vehicle history recording stopped');
    }
  }

  async recordVehicleHistory(vehicles) {
    if (!vehicles || vehicles.length === 0) return;

    const historyDocs = vehicles.map(v => ({
      vehicleId: v.vehicleId,
      city: this.currentCity,
      routeId: v.routeId,
      routeName: v.routeName,
      coordinates: {
        type: 'Point',
        coordinates: v.coordinates
      },
      heading: v.heading,
      speed: v.speed,
      status: v.status,
      occupancy: v.occupancy,
      timestamp: new Date()
    }));

    try {
      await VehicleHistory.insertMany(historyDocs, { ordered: false });
    } catch (err) {
      if (err.code !== 11000) {
        console.error('History insert error:', err.message);
      }
    }
  }

  async getRouteAnalytics(routeId, days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const stats = await VehicleHistory.aggregate([
      {
        $match: {
          city: this.currentCity,
          routeId: routeId,
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            hour: { $hour: '$timestamp' }
          },
          avgSpeed: { $avg: '$speed' },
          maxSpeed: { $max: '$speed' },
          dataPoints: { $sum: 1 },
          vehicles: { $addToSet: '$vehicleId' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          hourlyStats: {
            $push: {
              hour: '$_id.hour',
              avgSpeed: '$avgSpeed',
              dataPoints: '$dataPoints'
            }
          },
          dailyAvgSpeed: { $avg: '$avgSpeed' },
          totalDataPoints: { $sum: '$dataPoints' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    return stats;
  }

  async getHeatmapData() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    const heatmap = await VehicleHistory.aggregate([
      { 
        $match: { 
          city: this.currentCity, 
          timestamp: { $gte: oneHourAgo } 
        } 
      },
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
      {
        $project: {
          _id: 0,
          coordinates: ['$_id.lng', '$_id.lat'],
          intensity: '$count',
          avgSpeed: '$avgSpeed'
        }
      }
    ]);

    return heatmap;
  }

  async getStats() {
    const vehicles = this.cache.vehicles || [];
    
    let historyCount = 0;
    try {
      historyCount = await VehicleHistory.countDocuments({ city: this.currentCity });
    } catch (err) {
    }

    return {
      city: this.getCurrentCity(),
      vehicles: {
        total: vehicles.length,
        byStatus: {
          onTime: vehicles.filter(v => v.status === 'On Time').length,
          atStop: vehicles.filter(v => v.status === 'At Stop').length,
          delayed: vehicles.filter(v => v.status === 'Delayed').length
        },
        avgSpeed: vehicles.length > 0 
          ? Math.round(vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length)
          : 0
      },
      history: {
        dataPoints: historyCount,
        retention: '7 days'
      },
      lastUpdate: this.cache.lastFetch ? new Date(this.cache.lastFetch) : null
    };
  }

  getAvailableCities() {
    return Object.entries(TRANSIT_CONFIGS).map(([id, config]) => ({
      id,
      name: config.name,
      center: config.center,
      zoom: config.zoom || 12,
      available: true,
      simulated: config.simulated || false,
      description: config.description
    }));
  }

  setCity(cityId) {
    if (TRANSIT_CONFIGS[cityId]) {
      this.currentCity = cityId;
      this.cache = { vehicles: null, routes: null, lastFetch: 0 };
      return true;
    }
    return false;
  }

  getCurrentCity() {
    return {
      id: this.currentCity,
      ...TRANSIT_CONFIGS[this.currentCity]
    };
  }

  isConfigured() {
    const config = TRANSIT_CONFIGS[this.currentCity];
    return config && !config.simulated;
  }

  isSimulated() {
    return TRANSIT_CONFIGS[this.currentCity]?.simulated || false;
  }

  async fetchVehiclePositions() {
    const config = TRANSIT_CONFIGS[this.currentCity];
    if (!config || config.simulated) return null;

    const now = Date.now();
    if (this.cache.vehicles && (now - this.cache.lastFetch) < this.cacheTimeout) {
      return this.cache.vehicles;
    }

    try {
      let vehicles = [];
      
      if (this.currentCity === 'boston') {
        vehicles = await this.fetchMBTA(config);
      }

      this.cache.vehicles = vehicles;
      this.cache.lastFetch = now;
      return vehicles;
    } catch (error) {
      console.error(`Transit API error (${this.currentCity}):`, error.message);
      return this.cache.vehicles || null; 
    }
  }

  async fetchMBTA(config) {
    const params = {
      'include': 'route,stop,trip',
      ...config.filterParams
    };
    
    const response = await axios.get(config.vehiclesUrl, {
      params,
      timeout: 15000,
      headers: config.apiKey ? { 'x-api-key': config.apiKey } : {}
    });

    const { data, included } = response.data;
    
    const routesMap = new Map();
    const stopsMap = new Map();
    
    if (included) {
      included.forEach(item => {
        if (item.type === 'route') {
          routesMap.set(item.id, {
            id: item.id,
            name: item.attributes.long_name || item.attributes.short_name,
            color: item.attributes.color ? `#${item.attributes.color}` : '#3b82f6'
          });
        }
        if (item.type === 'stop') {
          stopsMap.set(item.id, {
            id: item.id,
            name: item.attributes.name,
            coords: [item.attributes.longitude, item.attributes.latitude]
          });
        }
      });
    }

    return data
      .filter(vehicle => vehicle.attributes.latitude && vehicle.attributes.longitude)
      .map(vehicle => {
      const attrs = vehicle.attributes;
      const routeRel = vehicle.relationships?.route?.data;
      const stopRel = vehicle.relationships?.stop?.data;
      
      const route = routeRel ? routesMap.get(routeRel.id) : null;
      const stop = stopRel ? stopsMap.get(stopRel.id) : null;

      return {
        vehicleId: vehicle.id,
        busNumber: `${route?.name || 'Bus'}-${vehicle.id.slice(-4)}`,
        coordinates: [attrs.longitude, attrs.latitude],
        heading: attrs.bearing || 0,
        speed: attrs.speed ? Math.round(attrs.speed * 2.237) : 0,
        timestamp: new Date(attrs.updated_at),
        status: this.mapMBTAStatus(attrs.current_status),
        routeId: routeRel?.id,
        routeName: route?.name || 'Unknown Route',
        routeColor: route?.color || '#3b82f6',
        nextStop: stop?.name || 'En Route',
        occupancy: this.mapOccupancy(attrs.occupancy_status),
        isActive: true
      };
    });
  }

  mapMBTAStatus(status) {
    const statusMap = {
      'INCOMING_AT': 'On Time',
      'STOPPED_AT': 'At Stop',
      'IN_TRANSIT_TO': 'On Time'
    };
    return statusMap[status] || 'On Time';
  }

  mapOccupancy(occupancy) {
    const occupancyMap = {
      'MANY_SEATS_AVAILABLE': '10/50',
      'FEW_SEATS_AVAILABLE': '35/50',
      'STANDING_ROOM_ONLY': '45/50',
      'CRUSHED_STANDING_ROOM_ONLY': '50/50',
      'FULL': '50/50',
      'NOT_ACCEPTING_PASSENGERS': '50/50'
    };
    return occupancyMap[occupancy] || '25/50';
  }

  async fetchRoutes() {
    const config = TRANSIT_CONFIGS[this.currentCity];
    if (!config || config.simulated || !config.routesUrl) return null;

    try {
      if (this.currentCity === 'boston') {
        const response = await axios.get(config.routesUrl, {
          params: { 'filter[type]': '3' },
          timeout: 15000
        });
        
        return response.data.data.map(route => ({
          id: route.id,
          name: route.attributes.long_name || route.attributes.short_name,
          color: route.attributes.color ? `#${route.attributes.color}` : '#3b82f6',
          description: route.attributes.description
        }));
      }
    } catch (error) {
      console.error('Routes API error:', error.message);
      return null;
    }
  }

  async fetchRouteShape(routeId) {
    const config = TRANSIT_CONFIGS[this.currentCity];
    if (!config || config.simulated || !config.shapesUrl) return null;

    try {
      if (this.currentCity === 'boston') {
        const response = await axios.get(config.shapesUrl, {
          params: { 'filter[route]': routeId },
          timeout: 15000
        });
        
        if (response.data.data.length > 0) {
          const shape = response.data.data[0];
          return {
            coordinates: shape.attributes.polyline 
              ? this.decodePolyline(shape.attributes.polyline)
              : []
          };
        }
      }
    } catch (error) {
      console.error('Shape API error:', error.message);
    }
    return null;
  }

  decodePolyline(encoded) {
    const points = [];
    let index = 0, lat = 0, lng = 0;

    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;

      shift = 0;
      result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;

      points.push([lng / 1e5, lat / 1e5]);
    }
    return points;
  }
}

module.exports = new TransitApiService();
