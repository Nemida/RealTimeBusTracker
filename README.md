# 🚌 Smart Transit Tracker

> A real-time public transit tracking system with live GPS monitoring, geospatial analytics, and comprehensive fleet management capabilities.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## 📖 Overview

Smart Transit Tracker is a full-stack application that provides real-time tracking of Boston's public bus network using the **MBTA (Massachusetts Bay Transportation Authority)** live API. The system displays 100+ buses simultaneously with live position updates, comprehensive analytics, and an interactive map interface.

### 🎯 Key Features

- **Real-time tracking** of 100+ MBTA buses with 5-second updates
- **MongoDB time-series collections** for historical analytics
- **Geospatial queries** supporting radius-based vehicle discovery
- **Live GTFS integration** with Boston MBTA public API
- **Interactive Mapbox visualization** with route colors and stop info

## ✨ Features

### Real-Time Tracking
- Live GPS positions updated every 5 seconds
- Smooth animated bus movement on map
- Status indicators (On Time, Delayed, At Stop, Breakdown)
- Current passenger occupancy levels

### Fleet Analytics Dashboard
- **Fleet Overview**: Real-time status breakdown, utilization rates
- **Route Performance**: Speed trends, daily statistics, stop analysis
- **Geospatial Queries**: Find buses within specified radius
- **Vehicle Heatmaps**: Traffic density visualization
- **Occupancy Analytics**: Passenger load distribution
- **Historical Reporting**: 30-day trend analysis

### Interactive Map
- Mapbox GL JS powered visualization
- Route polylines with turn-by-turn geometry
- Stop markers with estimated arrival times
- Click-to-track individual vehicles

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **React 18** | UI framework with hooks |
| **TypeScript** | Type-safe development |
| **Vite** | Fast build tooling |
| **Tailwind CSS** | Utility-first styling |
| **shadcn/ui** | Accessible component library |
| **Mapbox GL JS** | Interactive mapping |
| **Turf.js** | Geospatial calculations |

### Backend
| Technology | Purpose |
|------------|---------|
| **Node.js** | Runtime environment |
| **Express.js** | REST API framework |
| **MongoDB Atlas** | Cloud database with geo-indexing |
| **Mongoose** | ODM with schema validation |
| **Axios** | HTTP client for GTFS feeds |

### Database Design
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│      Bus        │     │  VehicleHistory  │     │   RouteStats    │
├─────────────────┤     ├──────────────────┤     ├─────────────────┤
│ busNumber (idx) │     │ vehicleId (idx)  │     │ city            │
│ source          │     │ city (idx)       │     │ routeId         │
│ destination     │     │ coordinates (2d) │     │ date            │
│ stops[]         │     │ timestamp (ts)   │     │ avgSpeed        │
│ coordinates     │     │ speed, heading   │     │ totalTrips      │
│ routeGeometry   │     │ occupancy        │     │ dataPoints      │
│ status          │     │ TTL: 7 days      │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

## � Project Structure

```
smart-transit-tracker/
├── client/                      # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── MapView.tsx      # Main map visualization
│   │   │   ├── LiveTrackingDemo.tsx
│   │   │   ├── HeroSection.tsx
│   │   │   └── ui/              # shadcn components
│   │   ├── pages/
│   │   │   ├── Index.tsx        # Landing page
│   │   │   ├── MapPage.tsx      # Full-screen tracking
│   │   │   └── DriverPage.tsx   # Driver interface
│   │   └── hooks/               # Custom React hooks
│   └── package.json
│
└── server/                      # Node.js backend
    ├── models/
    │   ├── bus.model.js         # Bus schema with geospatial
    │   ├── vehicleHistory.model.js  # Time-series data
    │   ├── routeStats.model.js  # Aggregated statistics
    │   ├── routePerformance.model.js # Route reliability scores
    │   ├── userFavorite.model.js    # User saved routes/stops
    │   ├── alert.model.js       # User notification alerts
    │   └── searchHistory.model.js   # Search analytics
    ├── routes/
    │   ├── buses.js             # CRUD + geospatial queries
    │   ├── analytics.js         # Historical data insights
    │   └── user.js              # Favorites, alerts, search
    ├── services/
    │   ├── analyticsService.js  # MongoDB aggregations
    │   ├── dataSync.js          # Real-time sync engine
    │   └── transitApi.js        # GTFS integration
    ├── seed.js                  # Database initialization
    └── server.js                # Express entry point
```

## 💾 Why MongoDB? Database Role Explained

MongoDB serves **three critical purposes** in this architecture:

### 1. **Historical Analytics & Time-Series Data**
The live MBTA API only provides *current* vehicle positions. MongoDB stores historical position data enabling:
- **Route performance analysis** - Which routes are most reliable?
- **Peak hour identification** - When is the busiest time?
- **Speed trend analysis** - How has traffic changed over time?
- **Vehicle path replay** - See where a bus has been

### 2. **User Personalization (Serverless Sessions)**
Without user accounts, MongoDB provides session-based storage for:
- **Saved favorite routes** - Quick access to frequently used buses
- **Custom alerts** - Notify when a specific bus is delayed
- **Search history** - Personalized suggestions based on past searches

### 3. **Aggregation & Analytics Pipeline**
MongoDB's aggregation framework enables complex queries impossible with just the live API:
- **Geospatial heatmaps** - Where do buses spend the most time?
- **Reliability scoring** - Calculate on-time performance per route
- **Cross-route comparisons** - Which route has the best speed?

### Database Collections

| Collection | Purpose | TTL |
|------------|---------|-----|
| `buses` | Current vehicle state cache | - |
| `vehiclehistories` | Historical positions (time-series) | 7 days |
| `routeperformances` | Daily/hourly route metrics | 30 days |
| `userfavorites` | Saved routes and stops | - |
| `alerts` | User notification configs | 24 hours |
| `searchhistories` | Search analytics | 30 days |

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ or Bun
- MongoDB Atlas account (free tier works)
- Mapbox access token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/smart-transit-tracker.git
   cd smart-transit-tracker
   ```

2. **Backend Setup**
   ```bash
   cd server
   npm install
   
   # Create .env file
   cat > .env << EOF
   PORT=5000
   ATLAS_URI=mongodb+srv://username:password@cluster.mongodb.net/bustrack
   MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token
   SYNC_INTERVAL_MS=5000
   EOF
   
   # Initialize database indexes
   npm run seed
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd client
   npm install
   
   # Create .env.local
   echo "VITE_MAPBOX_TOKEN=pk.your_mapbox_token" > .env.local
   echo "VITE_API_URL=http://localhost:5000" >> .env.local
   
   npm run dev
   ```

4. **Open** http://localhost:5173

## 🗺️ Data Source

### Boston MBTA Live API
This application connects directly to the **Boston MBTA (Massachusetts Bay Transportation Authority)** real-time transit feed:

- **100+ live buses** tracked simultaneously
- **Real-time positions** updated every 5 seconds
- **Route information** including bus numbers, stops, and directions
- **Occupancy data** when available from MBTA
- **No API key required** - MBTA provides free public access

#### MBTA API Details
- Vehicle Positions: `https://api-v3.mbta.com/vehicles`
- Routes: `https://api-v3.mbta.com/routes`
- Stops: `https://api-v3.mbta.com/stops`

## 📡 API Reference

### Vehicle Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/buses` | List all live buses |
| `GET` | `/buses?active=true` | Filter active buses only |
| `GET` | `/buses/:id` | Get specific bus details |
| `GET` | `/buses/nearby/:lng/:lat?radius=5` | Find buses within radius |
| `GET` | `/buses/route/:routeId` | Get buses on specific route |
| `GET` | `/buses/stats` | Fleet statistics summary |

### Analytics Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/analytics/dashboard` | System-wide dashboard metrics |
| `GET` | `/analytics/routes` | Route performance rankings |
| `GET` | `/analytics/routes/:routeId` | Detailed route analytics |
| `GET` | `/analytics/peak-hours` | Peak hour analysis |
| `GET` | `/analytics/heatmap?hours=1` | Geographic activity heatmap |
| `GET` | `/analytics/vehicle/:vehicleId` | Vehicle history & path |

### User Features Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/user/favorites?sessionId=X` | Get saved favorites |
| `POST` | `/user/favorites` | Save a route/stop |
| `DELETE` | `/user/favorites/:itemId` | Remove favorite |
| `GET` | `/user/alerts?sessionId=X` | Get active alerts |
| `POST` | `/user/alerts` | Create delay/arrival alert |
| `DELETE` | `/user/alerts/:alertId` | Remove alert |
| `POST` | `/user/search` | Log search query |
| `GET` | `/user/search/suggestions?q=X` | Get search suggestions |

### System Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | API health check |
| `GET` | `/live` | Raw MBTA vehicle positions |
| `POST` | `/gps/update` | GPS hardware webhook |

### Example Response: Live Buses

```json
{
  "city": {
    "id": "boston",
    "name": "Boston MBTA",
    "center": [-71.0589, 42.3601]
  },
  "vehicles": [
    {
      "vehicleId": "y1234",
      "busNumber": "Route 1-1234",
      "routeName": "Harvard/Holyoke Gate - Dudley Station",
      "coordinates": [-71.1097, 42.3736],
      "heading": 180,
      "speed": 15,
      "status": "On Time",
      "nextStop": "Central Square",
      "occupancy": "25/50",
      "isActive": true
    }
  ],
  "count": 127,
  "timestamp": "2024-02-15T10:30:00.000Z"
}
```

## 🏗️ Architecture Highlights

### Real-Time Data Pipeline
```
MBTA API ──5s poll──▶ Transit Service ──▶ Data Sync ──▶ MongoDB
                            │                              │
                            ▼                              ▼
                     Live Vehicles Cache           Vehicle History
                            │                      (7-day retention)
                            ▼
                     REST API ──▶ React Frontend ──▶ Mapbox GL
```

### MongoDB Optimizations
- **2dsphere indexes** on coordinates for geo queries
- **Time-series collections** with automatic 7-day TTL cleanup
- **Compound indexes** for efficient fleet aggregations
- **Bulk upsert operations** for real-time sync (~500 writes/min)

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| API Response Time | < 100ms |
| Map Update Frequency | 5 seconds |
| Database Writes | ~500/minute |
| History Retention | 7 days |
| Concurrent Connections | 100+ |

## �🎨 UI Components

Built with **shadcn/ui** components including:
- Cards for bus information display
- Badges for status indicators
- Buttons for interactive actions
- Real-time data tables
- Responsive navigation

## 🔧 Development

### Running Tests
```bash
# Frontend tests
cd client && npm test

# Backend tests
cd server && npm test
```

### Building for Production
```bash
# Frontend build
cd client && npm run build

# Start production server
cd server && npm start
```

### Code Quality
```bash
# Linting
npm run lint

# Type checking
npm run type-check
```

## 🌐 Deployment

### Frontend (Vercel/Netlify)
```bash
npm run build
```

### Backend (Railway/Render)
Set environment variables and deploy with:
```bash
npm start
```

### Database (MongoDB Atlas)
Update `MONGODB_URI` in production environment.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🏆 Project Highlights

### Technical Achievements
- **Real-time integration** with Boston MBTA GTFS-RT feed
- **100+ concurrent vehicles** tracked with < 100ms API response
- **MongoDB aggregation pipelines** for fleet analytics
- **Geospatial queries** for location-based services
- **Responsive React UI** with interactive Mapbox visualization

### Solution Impact
- **For Passengers**: Know exactly when buses arrive, plan journeys better
- **For Operators**: Monitor fleet performance in real-time
- **For Developers**: Clean, extensible architecture for any transit system

---


