const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  sessionId: String, 
  query: { type: String, required: true, index: true },
  queryType: {
    type: String,
    enum: ['route', 'stop', 'location', 'bus'],
    default: 'route'
  },
  resultCount: { type: Number, default: 0 },
  selectedResult: String, 
  timestamp: { type: Date, default: Date.now, index: true },
  
 
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number]
  }
});

searchHistorySchema.index({ query: 'text' });
searchHistorySchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days
searchHistorySchema.index({ 'location': '2dsphere' });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
