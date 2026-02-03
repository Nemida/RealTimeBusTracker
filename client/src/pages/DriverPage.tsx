import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bus, PlayCircle, StopCircle, MapPin, Users, Clock, AlertTriangle, TrafficCone, Wrench } from 'lucide-react';
import { toast } from "sonner";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

const API_BASE = 'http://localhost:5000';

interface BusData {
  _id: string;
  busNumber: string;
  source: { name: string };
  destination: { name: string };
  isActive: boolean;
  status: string;
  passengers: string;
  nextStop: string;
  eta: string;
}

export default function DriverPage() {
  const [allBuses, setAllBuses] = useState<BusData[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [activeBus, setActiveBus] = useState<BusData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAllBuses = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/buses`);
      const data = await response.json();
      setAllBuses(data);
      const currentlyActive = data.find((bus: BusData) => bus.isActive);
      if (currentlyActive) {
        setActiveBus(currentlyActive);
        setSelectedBusId(currentlyActive._id);
      }
    } catch (error) {
      console.error("Failed to fetch buses:", error);
      toast.error("Failed to load bus routes.");
    }
  }, []);

  useEffect(() => {
    fetchAllBuses();
  }, [fetchAllBuses]);

  useEffect(() => {
    if (!activeBus) return;
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${API_BASE}/buses/${activeBus._id}`);
        const data = await response.json();
        setActiveBus(data);
      } catch (error) {
        console.error("Failed to update active bus status:", error);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeBus]);

  const handleTripToggle = async () => {
    setIsLoading(true);
    const isStarting = !activeBus;
    const endpoint = isStarting ? `start/${selectedBusId}` : `stop/${activeBus?._id}`;
    
    if (isStarting && !selectedBusId) {
      toast.warning("Please select a bus route first.");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/buses/${endpoint}`, { method: 'POST' });
      const data = await response.json();
      setActiveBus(isStarting ? data.bus : null);
      if (!isStarting) setSelectedBusId(null);
      toast.success(data.message);
    } catch (error) {
      toast.error(`Could not ${isStarting ? 'start' : 'stop'} the trip.`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const updateStatus = async (payload: { passengers?: string, status?: string }) => {
    if (!activeBus) return;
    try {
      const response = await fetch(`${API_BASE}/buses/update-status/${activeBus._id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      setActiveBus(data.bus); // Update local state immediately
      toast.info("Status updated.");
    } catch (error) {
        toast.error("Failed to update status.");
    }
  };

  const currentPassengers = activeBus?.passengers.split('/')[0];

  return (
    <div className="flex items-center justify-center min-h-screen bg-muted/30 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary text-primary-foreground rounded-full h-16 w-16 flex items-center justify-center mb-4">
            <Bus className="h-8 w-8" />
          </div>
          <CardTitle>Driver Dashboard</CardTitle>
          <CardDescription>{activeBus ? `Trip in Progress` : 'Start your trip to begin tracking'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!activeBus ? (
            <Select onValueChange={setSelectedBusId} value={selectedBusId || ""}>
              <SelectTrigger><SelectValue placeholder="Select your bus route..." /></SelectTrigger>
              <SelectContent>
                {allBuses.map((bus) => (
                  <SelectItem key={bus._id} value={bus._id}>
                    {bus.busNumber} ({bus.source.name} to {bus.destination.name})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                <h3 className="font-semibold text-green-800 text-center">{activeBus.busNumber}</h3>
                <p className="text-center text-sm text-green-600">{activeBus.source.name} → {activeBus.destination.name}</p>
              </div>
              
              <div>
                <Label className="text-xs text-muted-foreground">Report Passenger Load</Label>
                <ToggleGroup type="single" value={currentPassengers} onValueChange={(value) => value && updateStatus({ passengers: value })} className="w-full grid grid-cols-3">
                  <ToggleGroupItem value="5" aria-label="Low occupancy">Empty</ToggleGroupItem>
                  <ToggleGroupItem value="20" aria-label="Medium occupancy">Some Seats</ToggleGroupItem>
                  <ToggleGroupItem value="40" aria-label="High occupancy">Full</ToggleGroupItem>
                </ToggleGroup>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Report Road Conditions</Label>
                <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => updateStatus({ status: 'On Time' })}>
                        <PlayCircle className="h-4 w-4" /> Clear
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => updateStatus({ status: 'Delayed' })}>
                        <TrafficCone className="h-4 w-4" /> Traffic
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => updateStatus({ status: 'Breakdown' })}>
                        <Wrench className="h-4 w-4" /> Breakdown
                    </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full gap-2" 
            variant={activeBus ? "destructive" : "default"} 
            onClick={handleTripToggle} 
            disabled={isLoading || (!activeBus && !selectedBusId)}
          >
            {activeBus ? <StopCircle className="h-5 w-5" /> : <PlayCircle className="h-5 w-5" />}
            {isLoading ? 'Updating...' : (activeBus ? 'Stop Trip' : 'Start Trip')}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}