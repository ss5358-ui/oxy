"use client";

import { useEffect } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, MapPin, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <section className="py-12 bg-gradient-to-r from-primary/5 via-background to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
              Welcome to <span className="text-primary">oxylink</span>
            </h1>
            <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
              Connecting oxygen suppliers with healthcare facilities
            </p>
          </div>
        </div>
      </section>

      <section className="text-center py-16 bg-gradient-to-br from-primary/10 via-background to-background rounded-lg shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-6 text-primary tracking-tight">
            Welcome to oxylink, {user.displayName || 'User'}!
          </h1>
          <p className="text-lg sm:text-xl text-foreground mb-8 max-w-2xl mx-auto">
            Your reliable platform for finding and providing life-saving oxygen cylinders when and where you need them most.
          </p>
          <div className="space-x-2 sm:space-x-4">
            <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/profile">View Profile</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="py-12">
        <h2 className="text-3xl font-bold text-center mb-10 text-foreground">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card className="shadow-md hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <MapPin className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center text-2xl">Find Nearby</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Buyers can easily locate sellers with available oxygen cylinders in their vicinity using our real-time map.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                 <Zap className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center text-2xl">Real-time Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Sellers update their cylinder stock and location, ensuring buyers have the most current information.
              </CardDescription>
            </CardContent>
          </Card>
          <Card className="shadow-md hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <ShieldCheck className="h-12 w-12 text-primary" />
              </div>
              <CardTitle className="text-center text-2xl">Secure & Verified</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-center">
                Admins approve sellers, and secure payments update inventory automatically for a trustworthy experience.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>
      
      <section className="py-12 bg-card rounded-lg shadow-lg">
        <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4 text-foreground">Our Network Focus</h2>
            <p className="text-lg text-muted-foreground mb-6">
              oxylink provides a seamless and efficient platform for oxygen cylinder management. Our mission is to connect those in need with those who can provide, quickly and reliably.
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-primary mr-2" /> User-friendly dashboards for all roles.</li>
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-primary mr-2" /> Accurate location-based search for buyers.</li>
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-primary mr-2" /> Easy stock and location management for sellers.</li>
              <li className="flex items-center"><CheckCircle className="h-5 w-5 text-primary mr-2" /> Secure, simulated payment processing.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
