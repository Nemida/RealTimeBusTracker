import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Search, Navigation, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import heroImage from '@/assets/transit-hero.jpg';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Public Transit Bus"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-secondary/80" />
      </div>

      {/* Content */}
      <div className="relative container py-24 md:py-32">
        <div className="max-w-2xl text-white">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Boston MBTA
            <span className="block gradient-text">Live Tracking</span>
          </h1>
          <p className="text-lg md:text-xl mb-8 text-white/90 animate-fade-in">
            Real-time bus tracking powered by the MBTA API. Track buses across 
            the Greater Boston area with live location updates.
          </p>

          {/* Search Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 animate-fade-in">
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-4 w-4 text-white/70" />
                <Input 
                  placeholder="From (e.g., Harvard Square)" 
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70"
                />
              </div>
              <div className="relative">
                <Navigation className="absolute left-3 top-3 h-4 w-4 text-white/70" />
                <Input 
                  placeholder="To (e.g., Downtown Crossing)" 
                  className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70"
                />
              </div>
            </div>
            <Button size="lg" className="w-full bg-white text-primary hover:bg-white/90 gap-2" asChild>
              <Link to="/map">
                <Search className="h-4 w-4" />
                View Live Map
              </Link>
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 text-center animate-fade-in">
            <div>
              <div className="text-2xl font-bold">175+</div>
              <div className="text-sm text-white/80">Routes</div>
            </div>
            <div>
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-sm text-white/80">Live Tracking</div>
            </div>
            <div>
              <div className="text-2xl font-bold">95%</div>
              <div className="text-sm text-white/80">On-Time</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}