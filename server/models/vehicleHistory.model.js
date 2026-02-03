const mongoose = require('mongoose');

const vehicleHistorySchema = new mongoose.Schema({
  vehicleId: { type: String, required: true, index: true },
  city: { type: String, required: true, index: true },
  routeId: { type: String },
  routeName: { type: String },
  coordinates: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true }
  },
  heading: { type: Number },
  speed: { type: Number },
  status: { type: String },
  occupancy: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
}, { 
  timeseries: {
    timeField: 'timestamp',
    metaField: 'vehicleId',
    granularity: 'minutes'
  }
});

vehicleHistorySchema.index({ coordinates: '2dsphere' });
vehicleHistorySchema.index({ city: 1, timestamp: -1 });
vehicleHistorySchema.index({ vehicleId: 1, timestamp: -1 });
vehicleHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

module.exports = mongoose.model('VehicleHistory', vehicleHistorySchema);
