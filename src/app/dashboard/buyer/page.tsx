"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, GeoPoint } from "firebase/firestore";
import { MapPin, Phone, Package, Search, Compass, Loader2, ListOrdered } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import type { UserProfile } from '@/context/AuthContext'; 

interface Seller {
  id: string;
  contactName: string;
  phoneNumber: string;
  cylindersAvailable: number;
  location: { latitude: number; longitude: number } | null; 
  distance?: number;
  approved?: boolean; 
  active?: boolean; 
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; 
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; 
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}


export default function BuyerDashboard() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(25);
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const { toast } = useToast();

  const handleGetLocation = useCallback(() => {
    setError(null);
    if (navigator.geolocation) {
      setLoading(true); 
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          toast({ title: "Location Acquired", description: "Your current location has been set." });
          setLoading(false);
        },
        (err) => {
          console.error("Error getting location:", err);
          setError("Unable to retrieve your location. Please ensure location services are enabled or enter manually.");
          toast({ title: "Location Error", description: err.message, variant: "destructive" });
          setLoading(false);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser. Please enter manually.");
      toast({ title: "Location Error", description: "Geolocation not supported.", variant: "destructive" });
    }
  }, [toast]);

  const fetchNearbySellers = async () => {
    let currentLocationToSearch = userLocation;
    if (!useCurrentLocation) {
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        toast({ title: "Invalid Coordinates", description: "Please enter valid latitude (-90 to 90) and longitude (-180 to 180).", variant: "destructive" });
        return;
      }
      currentLocationToSearch = { lat, lng };
    }

    if (!currentLocationToSearch) {
      toast({ title: "Location Required", description: "Please set your location first by clicking 'Get My Location' or entering coordinates manually.", variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    setHasSearched(true);
    try {
      const sellersRef = collection(db, "users");
      const q = query(sellersRef,
        where("role", "==", "seller"),
        where("active", "==", true) 
      );
      const querySnapshot = await getDocs(q);

      const fetchedSellers: Seller[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserProfile; 

        if (data.approved && data.cylindersAvailable && data.cylindersAvailable > 0) {
            let sellerFirestoreLocation: GeoPoint | { latitude: number; longitude: number } | null | undefined = data.location;
            
            if (sellerFirestoreLocation) {
              let sellerLat: number;
              let sellerLng: number;

              if (sellerFirestoreLocation instanceof GeoPoint) {
                sellerLat = sellerFirestoreLocation.latitude;
                sellerLng = sellerFirestoreLocation.longitude;
              } else if (typeof sellerFirestoreLocation.latitude === 'number' && typeof sellerFirestoreLocation.longitude === 'number') {
                sellerLat = sellerFirestoreLocation.latitude;
                sellerLng = sellerFirestoreLocation.longitude;
              } else {
                return; 
              }
              
              const distance = calculateDistance(currentLocationToSearch!.lat, currentLocationToSearch!.lng, sellerLat, sellerLng);

              if (distance <= searchRadius) {
                fetchedSellers.push({
                  id: doc.id,
                  contactName: data.contactName || "N/A",
                  phoneNumber: data.phoneNumber || "N/A",
                  cylindersAvailable: data.cylindersAvailable,
                  location: { latitude: sellerLat, longitude: sellerLng },
                  distance: parseFloat(distance.toFixed(2)),
                  approved: data.approved,
                  active: data.active,
                });
              }
            }
        }
      });

      fetchedSellers.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
      setSellers(fetchedSellers);

      if (fetchedSellers.length === 0) {
        toast({ title: "No Sellers Found", description: `No active, approved sellers with available stock found within ${searchRadius}km.` });
      }

    } catch (err: any) {
      console.error("Error fetching sellers:", err);
      let description = `Failed to fetch sellers: ${err.message}`;
      if (err.code === 'failed-precondition' && err.message?.toLowerCase().includes('query requires an index')) {
        description = "Firestore query requires an index. Please go to the Firebase console to create the necessary composite index. The error message in your browser's developer console often provides a direct link to create it. This might be for fields like (role, active).";
      }
      setError(description);
      toast({ title: "Fetch Error", description, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (useCurrentLocation) {
        handleGetLocation();
    }
  }, [useCurrentLocation, handleGetLocation]);


  return (
    <div className="space-y-8">
        <div className="flex justify-end">
            <Button asChild variant="outline">
                <Link href="/dashboard/buyer/my-orders">
                    <ListOrdered className="mr-2 h-4 w-4" /> My Orders
                </Link>
            </Button>
        </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-semibold text-primary flex items-center">
            <MapPin className="mr-3 h-8 w-8" /> Find Oxygen Cylinders
          </CardTitle>
          <CardDescription>
            Set your location to find nearby sellers with available oxygen cylinders.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2 mb-4">
            <Switch
              id="location-mode"
              checked={useCurrentLocation}
              onCheckedChange={(checked) => {
                setUseCurrentLocation(checked);
                if(checked && !userLocation) { 
                    handleGetLocation();
                }
              }}
            />
            <Label htmlFor="location-mode">Use My Current Location</Label>
          </div>

          {useCurrentLocation ? (
            <Button onClick={handleGetLocation} disabled={loading && userLocation === null} className="w-full sm:w-auto">
              {loading && userLocation === null ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Compass className="mr-2 h-4 w-4" />}
              {userLocation ? "Refresh My Location" : "Get My Location"}
            </Button>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude">Latitude</Label>
                <Input id="latitude" type="number" placeholder="-34.397" value={manualLat} onChange={(e) => setManualLat(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="longitude">Longitude</Label>
                <Input id="longitude" type="number" placeholder="150.644" value={manualLng} onChange={(e) => setManualLng(e.target.value)} />
              </div>
            </div>
          )}

          {userLocation && useCurrentLocation && (
            <p className="text-sm text-muted-foreground">
              Current Location: Lat: {userLocation.lat.toFixed(4)}, Lng: {userLocation.lng.toFixed(4)}
            </p>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div>
            <Label htmlFor="radius">Search Radius (km)</Label>
            <Input
              id="radius"
              type="number"
              value={searchRadius}
              onChange={(e) => setSearchRadius(Math.max(1, parseInt(e.target.value, 10)))}
              min="1"
              className="mt-1"
            />
          </div>

          <Button onClick={fetchNearbySellers} disabled={loading || (useCurrentLocation && !userLocation) || (!useCurrentLocation && (!manualLat || !manualLng))} className="w-full text-lg py-3 sm:py-2.5">
            {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Search className="mr-2 h-5 w-5" />}
            {loading ? "Searching..." : "Search Nearby Sellers"}
          </Button>
        </CardContent>
      </Card>

      {loading && sellers.length === 0 && ( 
        <div className="text-center py-4 flex items-center justify-center">
           <Loader2 className="mr-2 h-6 w-6 animate-spin text-primary" />
          <p className="text-lg text-muted-foreground">Loading sellers...</p>
        </div>
      )}

      {!loading && hasSearched && sellers.length > 0 && (
        <div>
          <h2 className="text-2xl font-semibold mb-6 text-foreground">Available Sellers Nearby ({sellers.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellers.map((seller) => (
              <Card key={seller.id} className="overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <div className="h-2 bg-primary w-full" />
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" /> {seller.contactName}
                  </CardTitle>
                  {seller.distance !== undefined && (
                    <CardDescription className="text-sm text-primary">{seller.distance} km away</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 flex-grow">
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Phone className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{seller.phoneNumber}</span>
                  </div>
                  <div className="flex items-center text-muted-foreground gap-2">
                    <Package className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium">{seller.cylindersAvailable} cylinders available</span>
                  </div>
                  {seller.location && typeof seller.location.latitude === 'number' && typeof seller.location.longitude === 'number' && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${seller.location.latitude},${seller.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-primary hover:underline gap-2"
                    >
                      <MapPin className="h-4 w-4 shrink-0" /> View on Map
                    </a>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-2">
                  <Button asChild className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href={`/purchase/${seller.id}`}>Purchase</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      )}

      {!loading && hasSearched && sellers.length === 0 && (
         <Card className="shadow-md">
          <CardContent className="pt-6 text-center">
            <p className="text-lg text-muted-foreground">
              No sellers found with available stock in your specified radius. Try expanding your search radius or checking back later.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
