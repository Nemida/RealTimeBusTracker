import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bus, Users, Clock, XCircle, RefreshCw, 
  Search, MapPin, Activity, AlertTriangle, CheckCircle2,
  Gauge, Route, Timer, Globe, Wifi, WifiOff,
  Star, StarOff, TrendingUp, BarChart3, Bell, BellOff, History
} from 'lucide-react';
import { cn } from "@/lib/utils";

mapboxgl.accessToken = 'pk.eyJ1Ijoic3RhcmsxMjM0IiwiYSI6ImNtZmh5cWVubzBqMXoyaXF0aDNneGg5OWQifQ._dySBvjJtseB2Y6t_iquUA';
const API_URL = 'http://localhost:5000';
const POLLING_INTERVAL_MS = 2000;

// Boston MBTA center coordinates
const BOSTON_CENTER: [number, number] = [-71.0589, 42.3601];

interface Location {
  name: string;
  coords: [number, number];
}

interface BusData {
  _id: string;
  busNumber: string;
  vehicleId?: string;
  routeId?: string;
  routeName?: string;
  routeColor?: string;
  source?: Location;
  destination?: Location;
  stops?: Location[];
  status: 'On Time' | 'Delayed' | 'At Stop' | 'Breakdown' | 'Inactive';
  passengers?: string;
  occupancy?: string;
  coordinates: [number, number];
  heading: number;
  bearing: number;
  speed: number;
  nextStop: string;
  eta?: string;
  isActive: boolean;
  isAtStop: boolean;
  currentStopIndex?: number;
  lastUpdated?: string;
}

interface AnimationState {
  from: [number, number];
  to: [number, number];
  startTime: number;
  rotation: number;
}

const createBusMarkerElement = (status: BusData['status']) => {
  const el = document.createElement('div');
  el.className = 'bus-marker-wrapper';
  
  const statusConfig: Record<string, { class: string; pulse: boolean }> = {
    'On Time': { class: 'bus-on-time', pulse: false },
    'Delayed': { class: 'bus-delayed', pulse: true },
    'Breakdown': { class: 'bus-breakdown', pulse: true },
    'At Stop': { class: 'bus-at-stop', pulse: false },
    'Inactive': { class: 'bus-inactive', pulse: false }
  };
  const config = statusConfig[status] || statusConfig['On Time'];

  el.innerHTML = `
    <div class="bus-marker-container ${config.pulse ? 'pulse' : ''}">
      <div class="bus-marker-ring"></div>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="bus-marker-icon ${config.class}">
        <path d="M18.9 2.1C18.4.8 17.1.1 15.8.1H8.2c-1.3 0-2.6.7-3.1 1.9L2 10.4v8.1c0 1.3 1.1 2.4 2.4 2.4h1.2c1.3 0 2.4-1.1 2.4-2.4V17h8.1v1.5c0 1.3 1.1 2.4 2.4 2.4h1.2c1.3 0 2.4-1.1 2.4-2.4v-8L18.9 2.1zM8 12.6c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5S8.8 12.6 8 12.6zm8 0c-.8 0-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5 1.5.7 1.5 1.5S16.8 12.6 16 12.6zM4.1 8l1.8-4.5h12.3L20 8H4.1z"></path>
      </svg>
    </div>
  `;
  return el;
};

const createStopMarkerElement = (isPast: boolean, isNext: boolean, stopName: string) => {
  const el = document.createElement('div');
  el.className = cn('stop-marker-container', isPast && 'past', isNext && 'next');
  el.innerHTML = `
    <div class="stop-marker-dot"></div>
    <div class="stop-marker-label">${stopName}</div>
  `;
  return el;
};

const getPassengerInfo = (passengers: string | undefined) => {
  if (!passengers) return { current: 0, max: 50, percentage: 50, status: 'available' };
  const [current, max] = passengers.split('/').map(Number);
  if (isNaN(current) || isNaN(max)) return { current: 0, max: 50, percentage: 50, status: 'available' };
  const percentage = Math.round((current / max) * 100);
  const status = percentage >= 90 ? 'full' : percentage > 60 ? 'busy' : 'available';
  return { current, max, percentage, status };
};

const getStatusConfig = (status: BusData['status']) => {
  const configs = {
    'On Time': { color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle2 },
    'Delayed': { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Timer },
    'Breakdown': { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle },
    'At Stop': { color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: MapPin },
    'Inactive': { color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/20', icon: Clock }
  };
  return configs[status] || configs['Inactive'];
};

export default function MapView() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [buses, setBuses] = useState<BusData[]>([]);
  const [userLocation, setUserLocation] = useState<[number, number]>(BOSTON_CENTER);
  const [selectedBus, setSelectedBus] = useState<BusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sidebarTab, setSidebarTab] = useState('buses');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [analytics, setAnalytics] = useState<{
    realtime?: { activeVehicles: number; routeCount: number; timestamp: string };
    hourly?: { avgSpeed: number; dataPoints: number; vehiclesTracked: number };
    daily?: { historyRecords: number };
  } | null>(null);
  const [searchSuggestions, setSearchSuggestions] = useState<{
    popular: Array<{ term: string; count: number }>;
    recent: Array<{ query: string; timestamp: string }>;
  }>({ popular: [], recent: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sessionId] = useState(() => localStorage.getItem('sessionId') || `session_${Date.now()}`);

  const busMarkersRef = useRef<{ [key: string]: mapboxgl.Marker }>({});
  const animationStateRef = useRef<{ [key: string]: AnimationState }>({});
  const stopMarkersRef = useRef<mapboxgl.Marker[]>([]);

  // Initialize with Boston on mount
  useEffect(() => {
    setUserLocation(BOSTON_CENTER);
    setIsLive(true);
    localStorage.setItem('sessionId', sessionId);
  }, [sessionId]);

  // Load favorites and analytics on mount
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const res = await fetch(`${API_URL}/user/favorites?sessionId=${sessionId}`);
        const data = await res.json();
        setFavorites(data.map((f: { itemId: string }) => f.itemId));
      } catch (err) {
        console.error('Failed to load favorites:', err);
      }
    };

    const loadAnalytics = async () => {
      try {
        const res = await fetch(`${API_URL}/analytics/dashboard`);
        const data = await res.json();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    };

    loadFavorites();
    loadAnalytics();
    // Refresh analytics every 30 seconds
    const analyticsInterval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(analyticsInterval);
  }, [sessionId]);

  // Toggle favorite
  const toggleFavorite = async (bus: BusData) => {
    const isFavorite = favorites.includes(bus.routeId || bus._id);
    const itemId = bus.routeId || bus._id;
    
    try {
      if (isFavorite) {
        await fetch(`${API_URL}/user/favorites/${itemId}?sessionId=${sessionId}`, { method: 'DELETE' });
        setFavorites(prev => prev.filter(id => id !== itemId));
      } else {
        await fetch(`${API_URL}/user/favorites`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            type: 'route',
            itemId,
            itemName: bus.routeName || bus.busNumber,
            metadata: { routeColor: bus.routeColor, coordinates: bus.coordinates }
          })
        });
        setFavorites(prev => [...prev, itemId]);
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Search suggestions
  const fetchSuggestions = async (query: string) => {
    try {
      const res = await fetch(`${API_URL}/user/search/suggestions?q=${encodeURIComponent(query)}&sessionId=${sessionId}`);
      const data = await res.json();
      setSearchSuggestions(data);
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  // Log search when user selects
  const logSearch = async (query: string, selectedResult?: string) => {
    try {
      await fetch(`${API_URL}/user/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, query, queryType: 'route', selectedResult })
      });
    } catch (err) {
      // Silent fail for analytics
    }
  };

  const stats = useMemo(() => {
    const total = buses.length;
    const active = buses.filter(b => b.isActive).length;
    const onTime = buses.filter(b => b.status === 'On Time').length;
    const delayed = buses.filter(b => b.status === 'Delayed').length;
    const atStop = buses.filter(b => b.status === 'At Stop').length;
    const breakdown = buses.filter(b => b.status === 'Breakdown').length;
    const totalPassengers = buses.reduce((sum, b) => {
      const passengers = b.passengers || '0/0';
      const [current] = passengers.split('/').map(Number);
      return sum + (isNaN(current) ? 0 : current);
    }, 0);
    return { total, active, onTime, delayed, atStop, breakdown, totalPassengers };
  }, [buses]);

  const filteredBuses = useMemo(() => {
    return buses.filter(bus => {
      const matchesSearch = searchQuery === '' || 
        bus.busNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bus.source?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bus.destination?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        bus.nextStop.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bus.routeName || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && bus.isActive) ||
        (statusFilter === 'inactive' && !bus.isActive) ||
        bus.status.toLowerCase().replace(' ', '-') === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [buses, searchQuery, statusFilter]);

  const fetchBuses = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/buses`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const newBuses: BusData[] = await res.json();
      setBuses(newBuses);
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error fetching buses:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleBusSelect = useCallback((bus: BusData) => {
    setSelectedBus(prev => (prev?._id === bus._id ? null : bus));
    if (selectedBus?._id !== bus._id) {
      map.current?.flyTo({ center: bus.coordinates, zoom: 14, speed: 1.5 });
    }
  }, [selectedBus?._id]);

  const clearSelection = useCallback(() => {
    setSelectedBus(null);
    map.current?.flyTo({ center: BOSTON_CENTER, zoom: 12, speed: 1.2 });
  }, []);

  useEffect(() => {
    if (map.current || !mapContainer.current || !userLocation) return;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: userLocation,
      zoom: 10,
      pitch: 45,
      bearing: -10,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'bottom-right');
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: true,
        showUserHeading: true
      }),
      'bottom-right'
    );

    map.current.on('load', () => {
      map.current!.addSource('route', { 
        type: 'geojson', 
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } } 
      });
      
      map.current!.addLayer({ 
        id: 'route-glow', 
        type: 'line', 
        source: 'route', 
        layout: { 'line-join': 'round', 'line-cap': 'round' }, 
        paint: { 'line-color': '#3b82f6', 'line-width': 12, 'line-opacity': 0.3, 'line-blur': 3 } 
      });
      
      map.current!.addLayer({ 
        id: 'route', 
        type: 'line', 
        source: 'route', 
        layout: { 'line-join': 'round', 'line-cap': 'round' }, 
        paint: { 'line-color': '#3b82f6', 'line-width': 4, 'line-opacity': 1 } 
      });
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [userLocation]);

  useEffect(() => {
    fetchBuses();
    const interval = setInterval(fetchBuses, POLLING_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchBuses]);

  useEffect(() => {
    const now = Date.now();
    const newAnimationState: { [key: string]: AnimationState } = {};
    buses.forEach(bus => {
      const marker = busMarkersRef.current[bus._id];
      const currentPosition = marker ? [marker.getLngLat().lng, marker.getLngLat().lat] as [number, number] : bus.coordinates;
      newAnimationState[bus._id] = { from: currentPosition, to: bus.coordinates, startTime: now, rotation: bus.heading };
    });
    animationStateRef.current = newAnimationState;
  }, [buses]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      const now = Date.now();
      Object.keys(busMarkersRef.current).forEach(busId => {
        const marker = busMarkersRef.current[busId];
        const animState = animationStateRef.current[busId];
        if (!marker || !animState) return;

        const progress = Math.min((now - animState.startTime) / POLLING_INTERVAL_MS, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const lng = animState.from[0] + (animState.to[0] - animState.from[0]) * easeProgress;
        const lat = animState.from[1] + (animState.to[1] - animState.from[1]) * easeProgress;

        marker.setLngLat([lng, lat]);

        const icon = marker.getElement().querySelector<HTMLElement>('.bus-marker-icon');
        if (icon) {
          icon.style.transform = `rotate(${animState.rotation}deg)`;
        }
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const newBusIds = new Set(buses.map(b => b._id));

    Object.keys(busMarkersRef.current).forEach(id => {
      if (!newBusIds.has(id)) {
        busMarkersRef.current[id].remove();
        delete busMarkersRef.current[id];
      }
    });

    buses.forEach(bus => {
      const isSelected = selectedBus?._id === bus._id;
      if (busMarkersRef.current[bus._id]) {
        const el = busMarkersRef.current[bus._id].getElement();
        const icon = el.querySelector('.bus-marker-icon');
        if (icon) {
          const statusClass = bus.status === 'On Time' ? 'bus-on-time' 
            : bus.status === 'At Stop' ? 'bus-at-stop'
            : bus.status === 'Delayed' ? 'bus-delayed'
            : bus.status === 'Breakdown' ? 'bus-breakdown'
            : 'bus-inactive';
          icon.setAttribute('class', `bus-marker-icon ${statusClass}`);
        }
        el.classList.toggle('selected', isSelected);
      } else {
        const el = createBusMarkerElement(bus.status);
        const newMarker = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(bus.coordinates)
          .addTo(map.current!);
        
        el.addEventListener('click', () => handleBusSelect(bus));
        busMarkersRef.current[bus._id] = newMarker;
      }
    });
  }, [buses, selectedBus, handleBusSelect]);

  useEffect(() => {
    if (!map.current) return;

    stopMarkersRef.current.forEach(marker => marker.remove());
    stopMarkersRef.current = [];

    const routeSource = map.current.getSource('route') as mapboxgl.GeoJSONSource;
    if (!routeSource) return;
    
    // Clear any existing route data since live API doesn't provide route geometry
    routeSource.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } });
  }, [selectedBus, buses]);

  const currentBus = selectedBus ? buses.find(b => b._id === selectedBus._id) : null;

  return (
    <div className="h-full w-full flex bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-[420px] border-r border-slate-800 flex flex-col bg-slate-900/50 backdrop-blur-xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Globe className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Transit Tracker</h1>
                <div className="flex items-center gap-1.5">
                  {isLive ? (
                    <Wifi className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-amber-400" />
                  )}
                  <p className="text-xs text-slate-400">
                    {isLive ? 'Live Data' : 'Simulated'}
                  </p>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={fetchBuses} 
              disabled={isLoading}
              className="hover:bg-slate-800"
            >
              <RefreshCw className={cn("h-4 w-4 text-slate-400", isLoading && "animate-spin")} />
            </Button>
          </div>

          {/* City Label - Boston MBTA */}
          <div className="mb-3 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-md">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="font-medium">Boston MBTA</span>
              <span className="text-xs text-emerald-400 ml-auto">(Live)</span>
            </div>
          </div>
          
          {/* Search with suggestions */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search buses, routes..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length > 1) {
                  fetchSuggestions(e.target.value);
                  setShowSuggestions(true);
                } else {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => searchQuery.length > 1 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="pl-10 bg-slate-800/50 border-slate-700 focus:border-blue-500 text-white placeholder:text-slate-500"
            />
            {/* Search Suggestions Dropdown */}
            {showSuggestions && (searchSuggestions.popular.length > 0 || searchSuggestions.recent.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-md shadow-xl z-50 max-h-60 overflow-auto">
                {searchSuggestions.recent.length > 0 && (
                  <div className="p-2 border-b border-slate-700">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <History className="h-3 w-3" /> Recent
                    </div>
                    {searchSuggestions.recent.slice(0, 3).map((item, i: number) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery(item.query);
                          setShowSuggestions(false);
                          logSearch(item.query);
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded"
                      >
                        {item.query}
                      </button>
                    ))}
                  </div>
                )}
                {searchSuggestions.popular.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Popular
                    </div>
                    {searchSuggestions.popular.slice(0, 5).map((item, i: number) => (
                      <button
                        key={i}
                        onClick={() => {
                          setSearchQuery(item.term);
                          setShowSuggestions(false);
                          logSearch(item.term);
                        }}
                        className="w-full text-left px-2 py-1.5 text-sm text-slate-300 hover:bg-slate-700 rounded flex justify-between"
                      >
                        <span>{item.term}</span>
                        <span className="text-xs text-slate-500">{item.count} searches</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={sidebarTab} onValueChange={setSidebarTab} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-3 bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="buses" className="flex-1 data-[state=active]:bg-blue-600">
              <Bus className="h-4 w-4 mr-1" />
              Buses
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex-1 data-[state=active]:bg-blue-600">
              <Star className="h-4 w-4 mr-1" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 data-[state=active]:bg-blue-600">
              <BarChart3 className="h-4 w-4 mr-1" />
              Insights
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buses" className="flex-1 flex flex-col mt-0 p-0">
            {/* Filter Pills */}
            <div className="px-4 py-3 flex gap-2 flex-wrap">
              {[
                { value: 'all', label: 'All', count: stats.total },
                { value: 'active', label: 'Active', count: stats.active },
                { value: 'on-time', label: 'On Time', count: stats.onTime },
                { value: 'delayed', label: 'Delayed', count: stats.delayed },
              ].map(filter => (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                    statusFilter === filter.value 
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25" 
                      : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                  )}
                >
                  {filter.label} ({filter.count})
                </button>
              ))}
            </div>

            {/* Bus List */}
            <ScrollArea className="flex-1 px-4">
              <div className="space-y-2 pb-4">
                {filteredBuses.length === 0 && (
                  <div className="text-center py-12 text-slate-500">
                    <Bus className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No buses found</p>
                  </div>
                )}
                {filteredBuses.map((bus) => {
                  const statusConfig = getStatusConfig(bus.status);
                  const passengerInfo = getPassengerInfo(bus.passengers);
                  const StatusIcon = statusConfig.icon;
                  const isSelected = currentBus?._id === bus._id;
                  
                  return (
                    <Card 
                      key={bus._id} 
                      onClick={() => handleBusSelect(bus)} 
                      className={cn(
                        'cursor-pointer transition-all duration-200 border-slate-800 bg-slate-800/30 hover:bg-slate-800/60',
                        isSelected && 'ring-2 ring-blue-500 bg-blue-500/10 border-blue-500/50'
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="font-bold text-white flex items-center gap-2">
                              {bus.busNumber}
                              {bus.isActive && (
                                <span className="flex h-2 w-2 relative">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-400 flex items-center gap-1 mt-0.5">
                              <Route className="h-3 w-3" />
                              {bus.routeName || bus.routeId || 'Unknown Route'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(bus);
                              }}
                              className="p-1.5 rounded-full hover:bg-slate-700 transition-colors"
                            >
                              {favorites.includes(bus.routeId || bus._id) ? (
                                <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                              ) : (
                                <StarOff className="h-4 w-4 text-slate-500 hover:text-yellow-400" />
                              )}
                            </button>
                            <div className={cn(
                              "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                              statusConfig.bg, statusConfig.color, "border", statusConfig.border
                            )}>
                              <StatusIcon className="h-3 w-3" />
                              {bus.status}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-900/50 rounded-lg p-2.5">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Next Stop</div>
                            <div className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                              <MapPin className="h-3 w-3 text-blue-400 flex-shrink-0" />
                              {bus.nextStop || 'N/A'}
                            </div>
                          </div>
                          <div className="bg-slate-900/50 rounded-lg p-2.5">
                            <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Occupancy</div>
                            <div className="text-sm font-medium text-white flex items-center gap-1.5">
                              <Users className="h-3 w-3 text-amber-400" />
                              {bus.occupancy || 'N/A'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Gauge className="h-3 w-3" />
                              <span>{bus.speed} km/h</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <span>Bearing: {bus.bearing}°</span>
                            </div>
                          </div>
                          {passengerInfo.percentage > 0 && (
                            <div className="w-16 bg-slate-700 rounded-full h-1.5 overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  passengerInfo.status === 'full' ? 'bg-red-500' :
                                  passengerInfo.status === 'busy' ? 'bg-amber-500' : 'bg-emerald-500'
                                )}
                                style={{ width: `${passengerInfo.percentage}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>



          {/* Favorites Tab */}
          <TabsContent value="favorites" className="flex-1 flex flex-col mt-0 p-0">
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-2">
                {favorites.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="mb-2">No saved routes yet</p>
                    <p className="text-xs">Click the ⭐ on any bus to save it here</p>
                  </div>
                ) : (
                  buses
                    .filter(bus => favorites.includes(bus.routeId || bus._id))
                    .map((bus) => {
                      const statusConfig = getStatusConfig(bus.status);
                      const StatusIcon = statusConfig.icon;
                      return (
                        <Card 
                          key={bus._id}
                          onClick={() => handleBusSelect(bus)}
                          className="cursor-pointer border-slate-800 bg-slate-800/30 hover:bg-slate-800/60"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                                <div>
                                  <div className="font-bold text-white">{bus.busNumber}</div>
                                  <div className="text-sm text-slate-400">{bus.routeName || 'Route'}</div>
                                </div>
                              </div>
                              <div className={cn(
                                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                statusConfig.bg, statusConfig.color, "border", statusConfig.border
                              )}>
                                <StatusIcon className="h-3 w-3" />
                                {bus.status}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Analytics/Insights Tab */}
          <TabsContent value="analytics" className="flex-1 flex flex-col mt-0 p-0">
            <ScrollArea className="flex-1 px-4 py-3">
              <div className="space-y-4">
                {analytics ? (
                  <>
                    {/* Real-time Stats */}
                    <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 border-0">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="h-5 w-5 text-white" />
                          <span className="font-semibold text-white">Live System Status</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-2xl font-bold text-white">{analytics.realtime?.activeVehicles || 0}</div>
                            <div className="text-xs text-indigo-200">Active Buses</div>
                          </div>
                          <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-2xl font-bold text-white">{analytics.realtime?.routeCount || 0}</div>
                            <div className="text-xs text-indigo-200">Routes</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Hourly Performance */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Last Hour Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Avg Speed</span>
                          <span className="text-white font-semibold">{analytics.hourly?.avgSpeed || 0} km/h</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Data Points</span>
                          <span className="text-white font-semibold">{(analytics.hourly?.dataPoints || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-sm">Vehicles Tracked</span>
                          <span className="text-white font-semibold">{analytics.hourly?.vehiclesTracked || 0}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Database Stats */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
                          <BarChart3 className="h-4 w-4" />
                          Historical Data (24h)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                            <History className="h-6 w-6 text-blue-400" />
                          </div>
                          <div>
                            <div className="text-2xl font-bold text-white">
                              {(analytics.daily?.historyRecords || 0).toLocaleString()}
                            </div>
                            <div className="text-sm text-slate-400">Position records stored</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Why MongoDB Section */}
                    <Card className="bg-slate-800/50 border-slate-700">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-emerald-400">
                          💾 Powered by MongoDB
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs text-slate-400 space-y-2">
                        <p>• <span className="text-slate-300">Time-series data</span> for historical tracking</p>
                        <p>• <span className="text-slate-300">Geospatial queries</span> for nearby buses</p>
                        <p>• <span className="text-slate-300">User favorites</span> stored per session</p>
                        <p>• <span className="text-slate-300">Search analytics</span> for suggestions</p>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-500">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50 animate-pulse" />
                    <p>Loading analytics...</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <div ref={mapContainer} className="absolute inset-0" />
        
        {/* Selected Bus Details Overlay */}
        {currentBus && (
          <div className="absolute top-4 left-4 right-4 z-10">
            <Card className="bg-slate-900/90 backdrop-blur-xl border-slate-700 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <Bus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-white text-lg">{currentBus.busNumber}</div>
                      <div className="text-sm text-slate-400">
                        {currentBus.routeName || 'Unknown Route'}
                        {currentBus.source?.name && currentBus.destination?.name && 
                          ` • ${currentBus.source.name} → ${currentBus.destination.name}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={clearSelection} variant="ghost" size="icon" className="hover:bg-slate-800">
                      <XCircle className="h-5 w-5 text-slate-400" />
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Status</div>
                    <div className={cn("font-semibold mt-1", getStatusConfig(currentBus.status).color)}>
                      {currentBus.status}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Occupancy</div>
                    <div className="font-semibold text-white mt-1">{currentBus.occupancy || 'N/A'}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Speed</div>
                    <div className="font-semibold text-white mt-1">{currentBus.speed} km/h</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider">Bearing</div>
                    <div className="font-semibold text-white mt-1">{currentBus.bearing}°</div>
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="mt-4 pt-4 border-t border-slate-700">
                  <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Vehicle Information</div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-slate-400">Vehicle ID:</div>
                    <div className="text-white">{currentBus.vehicleId || currentBus._id}</div>
                    <div className="text-slate-400">Route:</div>
                    <div className="text-white">{currentBus.routeId || 'N/A'}</div>
                    <div className="text-slate-400">Next Stop:</div>
                    <div className="text-white">{currentBus.nextStop || 'N/A'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Map Styles */}
        <style>{`
          .mapboxgl-ctrl-bottom-right { z-index: 5; }
          
          .bus-marker-wrapper { 
            cursor: pointer; 
            transition: transform 0.2s ease;
          }
          .bus-marker-wrapper:hover { transform: scale(1.1); }
          .bus-marker-wrapper.selected { transform: scale(1.3); z-index: 100 !important; }
          
          .bus-marker-container {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          
          .bus-marker-container.pulse .bus-marker-ring {
            position: absolute;
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: currentColor;
            opacity: 0.3;
            animation: marker-pulse 2s ease-in-out infinite;
          }
          
          .bus-marker-icon { 
            width: 36px; 
            height: 36px;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
            transition: transform 0.15s ease-out;
            position: relative;
            z-index: 1;
          }
          
          .bus-marker-icon.bus-on-time { color: #10b981; }
          .bus-marker-icon.bus-at-stop { color: #3b82f6; }
          .bus-marker-icon.bus-delayed { color: #f59e0b; }
          .bus-marker-icon.bus-breakdown { color: #ef4444; }
          .bus-marker-icon.bus-inactive { color: #6b7280; }
          
          .stop-marker-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          
          .stop-marker-dot { 
            background: #3b82f6;
            border: 3px solid #fff;
            border-radius: 50%; 
            width: 14px; 
            height: 14px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
          }
          
          .stop-marker-container.past .stop-marker-dot { 
            background: #6b7280;
            border-color: #9ca3af;
          }
          
          .stop-marker-container.next .stop-marker-dot { 
            background: #10b981;
            border-color: #fff;
            animation: stop-pulse 1.5s ease-in-out infinite;
          }
          
          .stop-marker-label {
            background: rgba(15, 23, 42, 0.9);
            color: white;
            font-size: 11px;
            font-weight: 500;
            padding: 2px 8px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          }
          
          @keyframes marker-pulse {
            0%, 100% { transform: scale(1); opacity: 0.3; }
            50% { transform: scale(1.5); opacity: 0; }
          }
          
          @keyframes stop-pulse { 
            0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            50% { transform: scale(1.2); box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
          }
        `}</style>
      </div>
    </div>
  );
}
