"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, updateDoc, getDoc, GeoPoint, serverTimestamp, collection, query, where, orderBy, limit, getDocs, Timestamp } from "firebase/firestore";
import { MapPin, PackagePlus, Edit3, Save, Loader2, Compass, AlertTriangle, CheckCircle, XCircle, ListOrdered, PackageSearch } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Order } from "@/app/dashboard/buyer/my-orders/page";


export default function SellerDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [cylindersAvailable, setCylindersAvailable] = useState<number>(0);
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [isSubmittingStock, setIsSubmittingStock] = useState<boolean>(false);
  const [isSubmittingLocation, setIsSubmittingLocation] = useState<boolean>(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);
  const [isActive, setIsActive] = useState<boolean>(false); 
  const [isTogglingActivity, setIsTogglingActivity] = useState<boolean>(false);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);


  const loadInitialDataAndOrders = useCallback(async () => {
    if (user && user.role === 'seller') {
      setInitialDataLoaded(false); // Reset for full load
      setLoadingOrders(true);
      const userDocRef = doc(db, "users", user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setCylindersAvailable(data.cylindersAvailable !== undefined ? data.cylindersAvailable : 0);
          if (data.location) {
            if (data.location instanceof GeoPoint) {
              setLatitude(data.location.latitude.toString());
              setLongitude(data.location.longitude.toString());
            } else if (typeof data.location.latitude === 'number' && typeof data.location.longitude === 'number') {
              setLatitude(data.location.latitude.toString());
              setLongitude(data.location.longitude.toString());
            }
          }
          setIsActive(!!data.active);
        } else {
          toast({title: "Error", description: "Could not load your seller data.", variant: "destructive"});
        }

        // Fetch recent orders
        const ordersQuery = query(
          collection(db, "purchases"),
          where("sellerId", "==", user.uid),
          orderBy("purchaseDate", "desc"),
          limit(5) // Get latest 5 orders
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const fetchedOrders = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as Order));
        setRecentOrders(fetchedOrders);

      } catch (error: any) {
          console.error("Error loading seller data or orders:", error);
          let description = "Could not load your seller data or recent orders.";
          if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('query requires an index')) {
            description = "Firestore query for recent orders requires an index. Please go to your Firebase console (Firestore > Indexes) and create a composite index for the 'purchases' collection with fields: 'sellerId' (Ascending) AND 'purchaseDate' (Descending). The error link in your browser console should guide you.";
          }
          toast({title: "Error", description, variant: "destructive"});
      } finally {
        setInitialDataLoaded(true);
        setLoadingOrders(false);
      }
    }
  }, [user, toast]); 


  useEffect(() => {
    if (!authLoading && user) {
      if (user.role !== 'seller') {
        router.push("/dashboard"); 
        return;
      }
      if (!user.approved) { // Check for approval here
        // No need to load data if not approved, message is shown in render
        setInitialDataLoaded(true); 
        setLoadingOrders(false);
        return;
      }
      loadInitialDataAndOrders();
    } else if (!authLoading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, authLoading, router, loadInitialDataAndOrders]);
  
  if (authLoading || (user && user.role === 'seller' && (!initialDataLoaded || (user.approved && loadingOrders) ))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading seller dashboard...</p>
      </div>
    );
  }

  if (user && user.role === 'seller' && !user.approved) {
    return (
      <Card className="max-w-2xl mx-auto my-8 shadow-lg border-yellow-500 border-2">
        <CardHeader className="items-center text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mb-2" />
          <CardTitle className="text-2xl font-semibold text-yellow-600">Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-foreground mb-4">
            Your seller account is currently under review. You can manage stock and location once approved.
          </p>
           <p className="text-muted-foreground text-sm mb-6">
            You can update your contact information on your <Link href="/profile" className="text-primary hover:underline font-medium">profile page</Link>.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  if (!user || user.role !== 'seller') {
    // This case should ideally be handled by the redirect in useEffect
    return <p className="text-destructive text-center py-10">Access Denied or error loading user data.</p>;
  }


  const handleUpdateStock = async () => {
    if (!user) return;
    setIsSubmittingStock(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        cylindersAvailable: Number(cylindersAvailable < 0 ? 0 : cylindersAvailable), // Ensure it's not negative
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Stock Updated", description: "Cylinder availability has been successfully updated." });
    } catch (error) {
      console.error("Error updating stock:", error);
      toast({ title: "Update Failed", description: "Could not update stock. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingStock(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!user) return;
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast({ title: "Invalid Coordinates", description: "Please enter valid latitude (-90 to 90) and longitude (-180 to 180).", variant: "destructive" });
      return;
    }
    
    setIsSubmittingLocation(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        location: new GeoPoint(lat, lng), 
        updatedAt: serverTimestamp(),
      });
      toast({ title: "Location Updated", description: "Your location has been successfully updated." });
    } catch (error) {
      console.error("Error updating location:", error);
      toast({ title: "Update Failed", description: "Could not update location. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmittingLocation(false);
    }
  };
  
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      setIsSubmittingLocation(true); 
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude.toString());
          setLongitude(position.coords.longitude.toString());
          toast({ title: "Location Fetched", description: "Current location populated. Remember to save."});
          setIsSubmittingLocation(false);
        },
        (error) => {
          toast({ title: "Location Error", description: `Could not get location: ${error.message}`, variant: "destructive"});
          setIsSubmittingLocation(false);
        }
      );
    } else {
      toast({ title: "Location Not Supported", description: "Geolocation is not supported by your browser.", variant: "destructive"});
    }
  };
  
  const handleActivityToggle = async (checked: boolean) => {
    if (!user) return;
    setIsTogglingActivity(true);
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        active: checked,
        updatedAt: serverTimestamp(),
      });
      setIsActive(checked);
      toast({ title: "Visibility Updated", description: `You are now ${checked ? 'VISIBLE' : 'HIDDEN'} to buyers.` });
    } catch (error) {
      console.error("Error updating active status:", error);
      toast({ title: "Update Failed", description: "Could not update visibility status.", variant: "destructive" });
    } finally {
      setIsTogglingActivity(false);
    }
  };

  const formatLocation = (location: Order['buyerLocation']) => {
    if (!location) return 'N/A';
    if (location instanceof GeoPoint) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    if (typeof location.latitude === 'number' && typeof location.longitude === 'number') {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }
    return 'Invalid Location';
  };


  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold text-primary">Seller Dashboard</h1>
        {user.approved && (
            <div className="flex items-center space-x-2 p-2 border rounded-lg bg-card shadow-sm">
                <Switch
                id="active-status"
                checked={isActive}
                onCheckedChange={handleActivityToggle}
                disabled={isTogglingActivity}
                aria-labelledby="active-status-label"
                />
                <Label htmlFor="active-status" id="active-status-label" className={`font-medium ${isActive ? "text-green-600" : "text-red-600"}`}>
                {isTogglingActivity ? <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" /> : isActive ? <CheckCircle className="h-4 w-4 inline-block mr-1" /> : <XCircle className="h-4 w-4 inline-block mr-1" /> }
                {isActive ? "Visible to Buyers" : "Hidden from Buyers"}
                </Label>
            </div>
        )}
      </div>
      
      {!user.approved && ( 
         // This case should now be covered by the redirect or specific message at the top
         null 
      )}
      
      <div className="grid md:grid-cols-2 gap-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><PackagePlus className="mr-3 h-7 w-7 text-primary" />Manage Cylinder Stock</CardTitle>
            <CardDescription>Update your current oxygen cylinder availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="cylindersAvailable" className="text-base">Number of Cylinders Available</Label>
              <Input
                id="cylindersAvailable"
                type="number"
                value={cylindersAvailable.toString()}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  setCylindersAvailable(isNaN(value) ? 0 : Math.max(0, value));
                }}
                min="0"
                className="mt-1 text-lg p-2"
                disabled={!user.approved}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateStock} disabled={isSubmittingStock || !user.approved} className="w-full">
              {isSubmittingStock ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Update Stock
            </Button>
          </CardFooter>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center"><MapPin className="mr-3 h-7 w-7 text-primary" />Update Your Location</CardTitle>
            <CardDescription>Keep your coordinates up-to-date for accurate buyer searches.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleGetCurrentLocation} variant="outline" className="w-full mb-4" disabled={isSubmittingLocation || !user.approved}>
              {isSubmittingLocation && (latitude === "" || longitude === "") ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Compass className="mr-2 h-4 w-4" />} 
              Use My Current Location
            </Button>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="latitude" className="text-base">Latitude</Label>
                <Input
                  id="latitude"
                  type="text" 
                  placeholder="-34.397"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  className="mt-1 text-lg p-2"
                  disabled={!user.approved}
                />
              </div>
              <div>
                <Label htmlFor="longitude" className="text-base">Longitude</Label>
                <Input
                  id="longitude"
                  type="text" 
                  placeholder="150.644"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  className="mt-1 text-lg p-2"
                  disabled={!user.approved}
                />
              </div>
            </div>
             <p className="text-xs text-muted-foreground">Tip: You can get coordinates from Google Maps by right-clicking a location.</p>
          </CardContent>
          <CardFooter>
            <Button onClick={handleUpdateLocation} disabled={isSubmittingLocation || !user.approved} className="w-full">
              {isSubmittingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Update Location
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
            <CardTitle className="text-2xl flex items-center"><ListOrdered className="mr-3 h-7 w-7 text-primary" />Recent Orders</CardTitle>
            <CardDescription>A quick view of your latest sales.</CardDescription>
        </CardHeader>
        <CardContent>
            {loadingOrders ? (
                 <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="ml-3 text-muted-foreground">Loading recent orders...</p>
                </div>
            ) : recentOrders.length === 0 ? (
                <div className="text-center py-6">
                    <PackageSearch className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground">You have no recent orders.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Buyer</TableHead>
                            <TableHead className="hidden md:table-cell">Date</TableHead>
                            <TableHead className="text-center">Quantity</TableHead>
                            <TableHead className="text-right hidden sm:table-cell">Total</TableHead>
                            <TableHead className="hidden lg:table-cell">Buyer Location</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {recentOrders.map((order) => (
                            <TableRow key={order.id}>
                            <TableCell>{order.buyerContactName || order.buyerEmail || 'N/A'}</TableCell>
                            <TableCell className="hidden md:table-cell">{order.purchaseDate.toDate().toLocaleDateString()}</TableCell>
                            <TableCell className="text-center">{order.quantity}</TableCell>
                            <TableCell className="text-right hidden sm:table-cell">${order.totalAmount.toFixed(2)}</TableCell>
                            <TableCell className="hidden lg:table-cell">
                                {order.buyerLocation ? (
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${order.buyerLocation instanceof GeoPoint ? order.buyerLocation.latitude : order.buyerLocation.latitude},${order.buyerLocation instanceof GeoPoint ? order.buyerLocation.longitude : order.buyerLocation.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline flex items-center"
                                >
                                    <MapPin className="mr-1 h-4 w-4" /> {formatLocation(order.buyerLocation)}
                                </a>
                                ) : (
                                'N/A'
                                )}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
        <CardFooter>
            <Button asChild variant="outline" className="w-full sm:w-auto">
                <Link href="/dashboard/seller/all-orders">View All Orders</Link>
            </Button>
        </CardFooter>
      </Card>
      
      <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl flex items-center"><Edit3 className="mr-3 h-7 w-7 text-primary" />Profile & Contact</CardTitle>
                <CardDescription>Manage your public contact name and phone number. For more options, visit your full profile page.</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    Your contact name: <span className="font-medium text-foreground">{user.contactName || 'Not set'}</span>
                </p>
                 <p className="text-muted-foreground mt-1">
                    Your phone number: <span className="font-medium text-foreground">{user.phoneNumber || 'Not set'}</span>
                </p>
            </CardContent>
            <CardFooter>
                <Button asChild variant="outline">
                    <Link href="/profile">Go to Full Profile Page</Link>
                </Button>
            </CardFooter>
        </Card>

      <div className="mt-10">
      </div>
    </div>
  );
}
