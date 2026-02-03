const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dataSync = require('./services/dataSync');
const transitApi = require('./services/transitApi');
const analyticsService = require('./services/analyticsService');

require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MS) || 1000;

app.use(cors());
app.use(express.json());

const uri = process.env.ATLAS_URI;
mongoose.connect(uri);
const connection = mongoose.connection;
connection.once('open', async () => {
  console.log("MongoDB connected");
  
  await dataSync.initialize();
  
  setInterval(() => dataSync.syncBusData(), SYNC_INTERVAL_MS);
  console.log(`Data sync started (${SYNC_INTERVAL_MS}ms interval)`);
  
  transitApi.startHistoryRecording(60000);
});

const busesRouter = require('./routes/buses');
const userRouter = require('./routes/user');
const analyticsRouter = require('./routes/analytics');

app.use('/buses', busesRouter);
app.use('/user', userRouter);
app.use('/analytics', analyticsRouter);

app.post('/gps/update', async (req, res) => {
  try {
    const { busNumber, latitude, longitude, speed, heading, timestamp } = req.body;
    
    if (!busNumber || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const updated = await dataSync.updateBusFromGPS(busNumber, {
      latitude,
      longitude,
      speed,
      heading,
      timestamp
    });
    
    if (!updated) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    
    res.json({ success: true, bus: updated });
  } catch (err) {
    console.error('GPS update error:', err);
    res.status(500).json({ error: 'Failed to update GPS data' });
  }
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mode: 'live',
    city: transitApi.getCurrentCity()
  });
});

app.get('/live', async (req, res) => {
  try {
    const vehicles = await transitApi.fetchVehiclePositions();
    res.json({
      city: transitApi.getCurrentCity(),
      vehicles: vehicles || [],
      count: vehicles ? vehicles.length : 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics/stats', async (req, res) => {
  try {
    const stats = await transitApi.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const analytics = await transitApi.getRouteAnalytics(routeId, days);
    res.json({ routeId, days, analytics });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/analytics/heatmap', async (req, res) => {
  try {
    const heatmap = await transitApi.getHeatmapData();
    res.json({ 
      city: transitApi.getCurrentCity().name,
      data: heatmap,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/routes', async (req, res) => {
  try {
    const routes = await transitApi.fetchRoutes();
    res.json(routes || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/routes/:routeId/shape', async (req, res) => {
  try {
    const shape = await transitApi.fetchRouteShape(req.params.routeId);
    res.json(shape || { coordinates: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ANALYTICS API ====================

// Fleet Dashboard - Comprehensive overview of all vehicles
app.get('/analytics/dashboard', async (req, res) => {
  try {
    const city = transitApi.getCurrentCity().id;
    const dashboard = await analyticsService.getFleetDashboard(city);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route Performance - Detailed analytics for specific route
app.get('/analytics/route/:routeId/performance', async (req, res) => {
  try {
    const { routeId } = req.params;
    const days = parseInt(req.query.days) || 7;
    const performance = await analyticsService.getRoutePerformance(routeId, days);
    res.json(performance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Geospatial - Find buses near a location
app.get('/analytics/nearby', async (req, res) => {
  try {
    const { lng, lat, radius } = req.query;
    if (!lng || !lat) {
      return res.status(400).json({ error: 'lng and lat query parameters required' });
    }
    const result = await analyticsService.findBusesNearLocation(
      parseFloat(lng),
      parseFloat(lat),
      parseFloat(radius) || 5
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Vehicle Heatmap - Density visualization data
app.get('/analytics/heatmap', async (req, res) => {
  try {
    const city = transitApi.getCurrentCity().id;
    const heatmap = await analyticsService.getVehicleHeatmap(city);
    res.json(heatmap);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Occupancy Trends - Current passenger load analysis
app.get('/analytics/occupancy', async (req, res) => {
  try {
    const occupancy = await analyticsService.getOccupancyTrends();
    res.json(occupancy);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Historical Statistics - Long-term route data
app.get('/analytics/history', async (req, res) => {
  try {
    const city = transitApi.getCurrentCity().id;
    const days = parseInt(req.query.days) || 30;
    const history = await analyticsService.getHistoricalStats(city, days);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record daily stats (can be called by cron job)
app.post('/analytics/record-stats', async (req, res) => {
  try {
    const city = transitApi.getCurrentCity().id;
    const result = await analyticsService.recordDailyStats(city);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});