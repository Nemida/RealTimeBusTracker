const Bus = require('../models/bus.model');
const transitApi = require('./transitApi');

class DataSyncService {
  constructor() {
    this.useRealApi = true;
    this.liveVehicles = [];
  }

  async initialize() {
    this.useRealApi = true;
    console.log(`🚌 Connected to: ${transitApi.getCurrentCity().name}`);
    console.log(`📡 Mode: Live API (Boston MBTA)`);
  }

  getLiveVehicles() {
    return this.liveVehicles;
  }

  async syncBusData() {
    try {
      await this.syncFromApi();
    } catch (error) {
      console.error('Data sync error:', error.message);
    }
  }

  async syncFromApi() {
    const vehiclePositions = await transitApi.fetchVehiclePositions();
    
    if (!vehiclePositions || vehiclePositions.length === 0) {
      return;
    }

    this.liveVehicles = vehiclePositions;
    
 
    if (vehiclePositions.length > 0) {
      await this.updateDatabaseFromLive(vehiclePositions);
    }
  }

  async updateDatabaseFromLive(vehicles) {
    try {
      const bulkOps = vehicles.map(v => ({
        updateOne: {
          filter: { busNumber: v.busNumber },
          update: {
            $set: {
              busNumber: v.busNumber,
              vehicleId: v.vehicleId,
              coordinates: v.coordinates,
              heading: v.heading,
              speed: v.speed,
              status: v.status,
              isActive: v.isActive,
              nextStop: v.nextStop,
              passengers: v.occupancy || '25/50',
              lastUpdated: new Date(),
              source: { name: v.routeName, coords: v.coordinates },
              destination: { name: 'In Service', coords: v.coordinates }
            }
          },
          upsert: true
        }
      }));

      if (bulkOps.length > 0) {
        await Bus.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (err) {
     
      if (err.code !== 11000) {
        console.error('Database update error:', err.message);
      }
    }
  }

 
  async updateBusFromGPS(busNumber, gpsData) {
    try {
      const bus = await Bus.findOneAndUpdate(
        { busNumber },
        {
          $set: {
            coordinates: [gpsData.longitude, gpsData.latitude],
            speed: gpsData.speed || 0,
            heading: gpsData.heading || 0,
            lastUpdated: gpsData.timestamp || new Date(),
            isActive: true
          }
        },
        { new: true }
      );
      return bus;
    } catch (err) {
      console.error('GPS update error:', err.message);
      return null;
    }
  }
}

module.exports = new DataSyncService();

