# Boston Transit Tracker - Frontend

React + TypeScript frontend application for real-time Boston MBTA bus tracking.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for blazing-fast builds
- **Tailwind CSS** for styling
- **shadcn/ui** component library
- **Mapbox GL JS** for interactive maps
- **React Router** for navigation

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Features

- 🗺️ Interactive map with real-time bus locations
- 🔍 Search and filter buses by route
- 📊 Fleet statistics dashboard
- 📱 Responsive design for all devices
- 🎨 Dark mode map interface

## Project Structure

```
src/
├── components/     # React components
│   ├── ui/        # shadcn/ui components
│   ├── MapView.tsx    # Main map component
│   └── ...
├── pages/         # Page components
├── hooks/         # Custom React hooks
├── lib/           # Utility functions
└── assets/        # Static assets
```

## Environment

The frontend connects to the backend API at `http://localhost:5000` by default.
