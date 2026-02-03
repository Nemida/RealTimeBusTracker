const mongoose = require('mongoose');

const routeStatsSchema = new mongoose.Schema({
  city: { type: String, required: true },
  routeId: { type: String, required: true },
  routeName: { type: String },
  date: { type: Date, required: true },
  
  totalTrips: { type: Number, default: 0 },
  avgTripDuration: { type: Number, default: 0 },
  totalDistance: { type: Number, default: 0 },
  
  onTimePercentage: { type: Number, default: 0 },
  avgDelay: { type: Number, default: 0 },
  
  avgOccupancy: { type: Number, default: 0 },
  peakHours: [{ hour: Number, occupancy: Number }],
  
  avgSpeed: { type: Number, default: 0 },
  maxSpeed: { type: Number, default: 0 },
  
  uniqueVehicles: { type: Number, default: 0 },
  dataPoints: { type: Number, default: 0 }
}, {
  timestamps: true
});

routeStatsSchema.index({ city: 1, routeId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RouteStats', routeStatsSchema);
