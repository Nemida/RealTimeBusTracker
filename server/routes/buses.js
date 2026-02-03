const router = require('express').Router();
const Bus = require('../models/bus.model');
const dataSync = require('../services/dataSync');


router.get('/', async (req, res) => {
  try {
    const { active, near, radius } = req.query;
    
    const liveVehicles = dataSync.getLiveVehicles();
    
    if (liveVehicles && liveVehicles.length > 0) {
      let vehicles = liveVehicles.map(v => ({
        _id: v.vehicleId,
        vehicleId: v.vehicleId,
        busNumber: v.busNumber,
        routeId: v.routeId,
        routeName: v.routeName,
        routeColor: v.routeColor,
        coordinates: v.coordinates,
        heading: v.heading,
        bearing: v.heading,
        speed: v.speed,
        status: v.status,
        nextStop: v.nextStop,
        occupancy: v.occupancy || 'Unknown',
        isActive: v.isActive,
        isAtStop: v.status === 'At Stop',
        lastUpdated: v.timestamp
      }));

 
      if (active === 'true') {
        vehicles = vehicles.filter(v => v.isActive);
      }

      if (near) {
        const [lng, lat] = near.split(',').map(Number);
        const radiusKm = parseFloat(radius) || 10;
        vehicles = vehicles.filter(v => {
          const dist = haversineDistance(lat, lng, v.coordinates[1], v.coordinates[0]);
          return dist <= radiusKm;
        });
      }

      return res.json(vehicles);
    }

    
    let query = {};
    if (active === 'true') {
      query.isActive = true;
    }

    const buses = await Bus.find(query).sort({ busNumber: 1 }).limit(200);
    res.json(buses);
  } catch (err) {
    console.error('Error fetching buses:', err);
    res.status(500).json({ error: 'Failed to fetch buses' });
  }
});


router.get('/stats', async (req, res) => {
  try {
    const liveVehicles = dataSync.getLiveVehicles();
    
    const stats = {
      total: liveVehicles.length,
      active: liveVehicles.filter(v => v.isActive).length,
      byStatus: {},
      avgSpeed: 0,
      routes: new Set()
    };

    liveVehicles.forEach(v => {
      stats.byStatus[v.status] = (stats.byStatus[v.status] || 0) + 1;
      stats.routes.add(v.routeName);
    });

    const speeds = liveVehicles.filter(v => v.speed > 0).map(v => v.speed);
    stats.avgSpeed = speeds.length > 0 
      ? Math.round(speeds.reduce((a, b) => a + b, 0) / speeds.length) 
      : 0;
    stats.routeCount = stats.routes.size;
    delete stats.routes;

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


router.get('/:id', async (req, res) => {
  try {
   
    const liveVehicles = dataSync.getLiveVehicles();
    const liveBus = liveVehicles.find(v => v.vehicleId === req.params.id);
    
    if (liveBus) {
      return res.json({
        _id: liveBus.vehicleId,
        vehicleId: liveBus.vehicleId,
        busNumber: liveBus.busNumber,
        routeId: liveBus.routeId,
        routeName: liveBus.routeName,
        routeColor: liveBus.routeColor,
        coordinates: liveBus.coordinates,
        heading: liveBus.heading,
        bearing: liveBus.heading,
        speed: liveBus.speed,
        status: liveBus.status,
        nextStop: liveBus.nextStop,
        occupancy: liveBus.occupancy || 'Unknown',
        isActive: liveBus.isActive,
        isAtStop: liveBus.status === 'At Stop',
        lastUpdated: liveBus.timestamp
      });
    }

    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ error: 'Bus not found' });
    }
    res.json(bus);
  } catch (err) {
    console.error('Error fetching bus:', err);
    res.status(500).json({ error: 'Failed to fetch bus' });
  }
});


router.get('/nearby/:lng/:lat', async (req, res) => {
  try {
    const lng = parseFloat(req.params.lng);
    const lat = parseFloat(req.params.lat);
    const radius = parseFloat(req.query.radius) || 5;

    const liveVehicles = dataSync.getLiveVehicles();
    
    const nearbyBuses = liveVehicles.filter(v => {
      const dist = haversineDistance(lat, lng, v.coordinates[1], v.coordinates[0]);
      return dist <= radius;
    }).map(v => ({
      ...v,
      distance: haversineDistance(lat, lng, v.coordinates[1], v.coordinates[0])
    })).sort((a, b) => a.distance - b.distance);

    res.json({
      center: [lng, lat],
      radiusKm: radius,
      count: nearbyBuses.length,
      buses: nearbyBuses
    });
  } catch (err) {
    console.error('Error fetching nearby buses:', err);
    res.status(500).json({ error: 'Failed to fetch nearby buses' });
  }
});

router.get('/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const liveVehicles = dataSync.getLiveVehicles();
    
    const routeBuses = liveVehicles.filter(v => v.routeId === routeId);
    
    res.json({
      routeId,
      count: routeBuses.length,
      buses: routeBuses
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

module.exports = router;