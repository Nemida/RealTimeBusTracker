import { Bus, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Bus className="h-6 w-6" />
              <span className="text-xl font-bold">Boston Transit</span>
            </div>
            <p className="text-muted-foreground mb-4">
              Real-time MBTA bus tracking for the Greater Boston area.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Services</h3>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>Real-Time Tracking</li>
              <li>Route Information</li>
              <li>Fleet Analytics</li>
              <li>Live Bus Positions</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-primary-foreground/80">
              <li>Help Center</li>
              <li>Contact Us</li>
              <li>Report Issues</li>
              <li>Feedback</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Contact</h3>
            <div className="space-y-2 text-primary-foreground/80">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>617-222-3200</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>support@bostontransit.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Greater Boston Area</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center text-primary-foreground/80">
          <p>&copy; 2024 Boston Transit Tracker. Built with ❤️ for Boston's commuters.</p>
        </div>
      </div>
    </footer>
  );
}