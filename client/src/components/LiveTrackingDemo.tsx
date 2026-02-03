import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Bus, 
  MapPin, 
  Clock, 
  Users, 
  Navigation,
  Circle,
  Loader2
} from 'lucide-react';

const API_URL = 'http://localhost:5000/buses';

interface Location {
  name: string;
  coords: [number, number];
}

interface BusData {
  _id: string;
  busNumber: string;
  source?: Location;
  destination?: Location;
  routeName?: string;
  routeId?: string;
  status: 'On Time' | 'Delayed' | 'At Stop' | 'Breakdown' | 'Inactive';
  passengers?: string;
  occupancy?: string;
  nextStop: string;
  eta?: string;
  isActive: boolean;
}

export default function LiveTrackingDemo() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBuses = async () => {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        const data: BusData[] = await res.json();
        setBuses(data.filter(bus => bus.isActive).slice(0, 3));
        setError(null);
      } catch (err) {
        setError('Unable to fetch bus data');
        console.error("Error fetching buses:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBuses();
    const interval = setInterval(fetchBuses, 5000);
    return () => clearInterval(interval);
  }, []);

  const getBadgeVariant = (status: BusData['status']) => {
    switch (status) {
      case 'On Time': return 'default';
      case 'Delayed': case 'Breakdown': return 'destructive';
      default: return 'secondary';
    }
  };
  return (
    <section className="py-20">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Live Bus Tracking
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              See exactly where your bus is and when it will arrive at your stop. 
              Our GPS tracking system provides real-time updates for all transit routes.
            </p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3">
                <Circle className="h-2 w-2 fill-primary text-primary" />
                <span>Live location updates every 30 seconds</span>
              </div>
              <div className="flex items-center gap-3">
                <Circle className="h-2 w-2 fill-primary text-primary" />
                <span>Traffic-adjusted arrival times</span>
              </div>
              <div className="flex items-center gap-3">
                <Circle className="h-2 w-2 fill-primary text-primary" />
                <span>Real-time passenger capacity</span>
              </div>
            </div>

            <Button size="lg" className="gap-2" asChild>
              <Link to="/map">
                <MapPin className="h-4 w-4" />
                View Live Map
              </Link>
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Buses Near You</h3>
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {error && (
              <div className="text-center py-8 text-muted-foreground">
                {error}
              </div>
            )}
            {!loading && !error && buses.map((bus) => (
              <Card key={bus._id} className="card-hover">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                        <Bus className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="font-semibold">{bus.busNumber}</div>
                        <div className="text-sm text-muted-foreground">{bus.routeName || bus.routeId || 'Route'}</div>
                      </div>
                    </div>
                    <Badge variant={getBadgeVariant(bus.status)}>
                      {bus.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{bus.eta || 'Live'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{bus.occupancy || bus.passengers || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{bus.nextStop}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!loading && !error && buses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active buses found
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}