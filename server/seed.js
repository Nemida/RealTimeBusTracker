const mongoose = require('mongoose');
const Bus = require('./models/bus.model');
const VehicleHistory = require('./models/vehicleHistory.model');
const RouteStats = require('./models/routeStats.model');
const RoutePerformance = require('./models/routePerformance.model');
const UserFavorite = require('./models/userFavorite.model');
const Alert = require('./models/alert.model');
const SearchHistory = require('./models/searchHistory.model');
require('dotenv').config();

const initializeDB = async () => {
  try {
    await mongoose.connect(process.env.ATLAS_URI);
    console.log("MongoDB connected");

    console.log("\nClearing old data...");
    const busCount = await Bus.countDocuments();
    const historyCount = await VehicleHistory.countDocuments();
    const statsCount = await RouteStats.countDocuments();
    
    await Bus.deleteMany({});
    await VehicleHistory.deleteMany({});
    await RouteStats.deleteMany({});
    
    console.log(`Deleted ${busCount} buses, ${historyCount} history records, ${statsCount} stats`);

    console.log("\nSetting up indexes...");
    
    try {
      await Bus.collection.createIndex({ busNumber: 1 }, { unique: true, sparse: true });
    } catch (e) {}
    try {
      await Bus.collection.createIndex({ isActive: 1 });
    } catch (e) {}
    try {
      await Bus.collection.createIndex({ coordinates: '2dsphere' });
    } catch (e) {}
    console.log("Bus indexes ready");

    try {
      await VehicleHistory.collection.createIndex({ vehicleId: 1, timestamp: -1 });
    } catch (e) {}
    try {
      await VehicleHistory.collection.createIndex({ city: 1, timestamp: -1 });
    } catch (e) {}
    try {
      await VehicleHistory.collection.createIndex({ 'coordinates': '2dsphere' });
    } catch (e) {}
    try {
      await VehicleHistory.collection.createIndex(
        { timestamp: 1 }, 
        { expireAfterSeconds: 7 * 24 * 60 * 60 }
      );
    } catch (e) {}
    console.log("VehicleHistory indexes ready");

    try {
      await RouteStats.collection.createIndex({ city: 1, routeId: 1, date: 1 }, { unique: true });
    } catch (e) {}
    console.log("RouteStats indexes ready");

    try {
      await RoutePerformance.collection.createIndex({ routeId: 1, date: -1 });
      await RoutePerformance.collection.createIndex({ date: -1, reliabilityScore: 1 });
      await RoutePerformance.collection.createIndex({ dayOfWeek: 1, hour: 1 });
    } catch (e) {}
    console.log("RoutePerformance indexes ready");

    try {
      await UserFavorite.collection.createIndex({ sessionId: 1, type: 1 });
      await UserFavorite.collection.createIndex({ sessionId: 1, itemId: 1 }, { unique: true });
    } catch (e) {}
    console.log("UserFavorite indexes ready");

    try {
      await Alert.collection.createIndex({ sessionId: 1, isActive: 1 });
      await Alert.collection.createIndex({ 'config.routeId': 1, isActive: 1 });
      await Alert.collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (e) {}
    console.log("Alert indexes ready");

    try {
      await SearchHistory.collection.createIndex({ query: 'text' });
      await SearchHistory.collection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });
      await SearchHistory.collection.createIndex({ sessionId: 1, timestamp: -1 });
    } catch (e) {}
    console.log("SearchHistory indexes ready");

    console.log("\nDatabase initialized");

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await mongoose.connection.close();
    console.log("Connection closed");
  }
};

initializeDB();
