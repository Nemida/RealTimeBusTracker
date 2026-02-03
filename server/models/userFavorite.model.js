const mongoose = require('mongoose');

const userFavoriteSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, index: true }, 
  type: { 
    type: String, 
    enum: ['route', 'stop', 'bus'], 
    required: true 
  },
  itemId: { type: String, required: true }, 
  itemName: { type: String }, 
  metadata: {
    routeColor: String,
    coordinates: [Number],
    description: String
  },
  createdAt: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now }
});

userFavoriteSchema.index({ sessionId: 1, type: 1 });
userFavoriteSchema.index({ sessionId: 1, itemId: 1 }, { unique: true });

module.exports = mongoose.model('UserFavorite', userFavoriteSchema);
