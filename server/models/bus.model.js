const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const LocationSchema = new Schema({
  name: { type: String, required: true },
  coords: { type: [Number], required: true }
}, { _id: false });

const busSchema = new Schema({
  busNumber: { type: String, required: true, unique: true },
  vehicleId: { type: String, index: true },
  routeId: { type: String, index: true },
  routeName: { type: String },
  routeColor: { type: String, default: '#3b82f6' },
  source: { type: LocationSchema },
  destination: { type: LocationSchema },
  stops: [LocationSchema],
  coordinates: { type: [Number], default: [0, 0], index: '2dsphere' },
  heading: { type: Number, default: 0 },
  speed: { type: Number, default: 0 },
  status: { 
    type: String, 
    enum: ['On Time', 'Delayed', 'At Stop', 'Breakdown', 'Inactive'],
    default: 'Inactive' 
  },
  passengers: { type: String, default: '25/50' },
  nextStop: { type: String, default: 'N/A' },
  eta: { type: String, default: 'N/A' },
  isActive: { type: Boolean, default: false, index: true },
  isAtStop: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now, index: true }
});

// Compound index for common queries
busSchema.index({ isActive: 1, status: 1 });

const Bus = mongoose.model('Bus', busSchema);

module.exports = Bus;