const mongoose = require('mongoose');

const routePerformanceSchema = new mongoose.Schema({
  routeId: { type: String, required: true, index: true },
  routeName: { type: String },
  date: { type: Date, required: true, index: true },
  hour: { type: Number, min: 0, max: 23 }, // For hourly breakdowns
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0 = Sunday
  
  metrics: {
    totalTrips: { type: Number, default: 0 },
    onTimeTrips: { type: Number, default: 0 },
    delayedTrips: { type: Number, default: 0 },
    avgDelayMinutes: { type: Number, default: 0 },
    maxDelayMinutes: { type: Number, default: 0 }
  },
  
  speed: {
    average: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 }
  },
  
  vehicleCount: { type: Number, default: 0 },
  dataPoints: { type: Number, default: 0 },
  
  reliabilityScore: { type: Number, default: 100 }
});

routePerformanceSchema.index({ routeId: 1, date: -1 });
routePerformanceSchema.index({ date: -1, reliabilityScore: 1 });
routePerformanceSchema.index({ dayOfWeek: 1, hour: 1 });


routePerformanceSchema.pre('save', function(next) {
  if (this.metrics.totalTrips > 0) {
    const onTimeRate = this.metrics.onTimeTrips / this.metrics.totalTrips;
    const delayPenalty = Math.min(this.metrics.avgDelayMinutes * 2, 30);
    this.reliabilityScore = Math.max(0, Math.round(onTimeRate * 100 - delayPenalty));
  }
  next();
});

module.exports = mongoose.model('RoutePerformance', routePerformanceSchema);
