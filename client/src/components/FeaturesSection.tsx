import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MapPin, 
  Clock, 
  Route, 
  Smartphone, 
  Wifi, 
  Shield 
} from 'lucide-react';

const features = [
  {
    icon: MapPin,
    title: 'Real-Time GPS Tracking',
    description: 'Track your bus live on the map with precise location updates every few seconds.',
    color: 'text-primary'
  },
  {
    icon: Clock,
    title: 'Accurate ETAs',
    description: 'Get precise arrival times based on current traffic and route conditions.',
    color: 'text-accent'
  },
  {
    icon: Route,
    title: 'Complete Route Info',
    description: 'Detailed route maps, stop locations, and schedule information.',
    color: 'text-secondary'
  },
  {
    icon: Smartphone,
    title: 'Mobile Optimized',
    description: 'Designed for mobile-first experience with intuitive touch controls.',
    color: 'text-primary'
  },
  {
    icon: Wifi,
    title: 'Low Bandwidth Friendly',
    description: 'Works smoothly even on 2G connections in smaller towns.',
    color: 'text-accent'
  },
  {
    icon: Shield,
    title: 'Reliable Service',
    description: 'Dependable service with 99.9% uptime for consistent access.',
    color: 'text-secondary'
  }
];

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Boston Transit Tracker?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Built specifically for Boston MBTA transit with features that matter most to local commuters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="card-hover border-0 shadow-card">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mb-4`}>
                  <feature.icon className={`h-6 w-6 ${feature.color}`} />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}