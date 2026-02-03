const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true },
  type: {
    type: String,
    enum: ['delay', 'arrival', 'service_change', 'route_nearby'],
    required: true
  },
  
  
  config: {
    routeId: String,
    routeName: String,
    stopId: String,
    stopName: String,
    delayThresholdMinutes: { type: Number, default: 10 },
    radiusMeters: { type: Number, default: 500 }, 
    coordinates: [Number] 
  },
  
  // Alert state
  isActive: { type: Boolean, default: true },
  lastTriggered: Date,
  triggerCount: { type: Number, default: 0 },
  
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, index: true } 
});

alertSchema.index({ sessionId: 1, isActive: 1 });
alertSchema.index({ 'config.routeId': 1, isActive: 1 });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Alert', alertSchema);
