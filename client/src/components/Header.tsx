import { Bus, MapPin, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import LanguageSelector from './LanguageSelector';

export default function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary">
            <Bus className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Boston Transit</h1>
            <p className="text-xs text-muted-foreground">MBTA Real-Time Tracker</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/map">
              <MapPin className="h-4 w-4" />
              Live Map
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" asChild>
            <Link to="/map">
              <Clock className="h-4 w-4" />
              Live Tracking
            </Link>
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              // Trigger the SOS functionality
              const event = new CustomEvent('triggerSOS');
              window.dispatchEvent(event);
            }}
          >
            <AlertCircle className="h-4 w-4" />
            Emergency SOS
          </Button>
        </nav>

        <LanguageSelector />
      </div>
    </header>
  );
}