# Smart Transit Tracker

> A real-time public transit tracking system with live GPS monitoring, geospatial analytics, and comprehensive fleet management capabilities.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-brightgreen.svg)](https://www.mongodb.com/atlas)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## Overview

Smart Transit Tracker is a full-stack application that provides real-time tracking of Boston's public bus network using the **MBTA (Massachusetts Bay Transportation Authority)** live API. The system displays 100+ buses simultaneously with live position updates, comprehensive analytics, and an interactive map interface.

![Project Screenshot](client/src/assets/image-1.png)

![Project Screenshot](client/src/assets/image.png)

![Project Screenshot](client/src/assets/image2.png)

![Project Screenshot](client/src/assets/image3.png)

### Key Features

- **Real-time tracking** of 100+ MBTA buses with 5-second updates
- **MongoDB time-series collections** for historical analytics
- **Geospatial queries** supporting radius-based vehicle discovery
- **Live GTFS integration** with Boston MBTA public API
- **Interactive Mapbox visualization** with route colors and stop info

## Features

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

## Tech Stack

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



## Quick Start

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


## Architecture

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


