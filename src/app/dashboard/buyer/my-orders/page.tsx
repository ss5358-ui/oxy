
"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, Timestamp, GeoPoint } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ShoppingBag, PackageSearch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

export interface Order {
  id: string; // Document ID from Firestore
  buyerId: string;
  buyerEmail?: string;
  buyerContactName?: string;
  sellerId: string;
  sellerName?: string;
  quantity: number;
  pricePerCylinder: number;
  totalAmount: number;
  purchaseDate: Timestamp;
  status: string;
  paymentCardLast4?: string;
  buyerLocation?: GeoPoint | { latitude: number; longitude: number } | null;
  buyerAddress?: string | null; 
}

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    setLoadingOrders(true);
    try {
      const ordersQuery = query(
        collection(db, "purchases"),
        where("buyerId", "==", user.uid),
        orderBy("purchaseDate", "desc")
      );
      const querySnapshot = await getDocs(ordersQuery);
      const fetchedOrders = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Order));
      setOrders(fetchedOrders);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      let description = `Could not fetch your orders: ${error.message}`;
      if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('query requires an index')) {
        description = "Firestore query requires an index for (buyerId, purchaseDate DESC). Please create this in your Firebase console.";
      }
      toast({
        title: "Error Loading Orders",
        description,
        variant: "destructive",
      });
    } finally {
      setLoadingOrders(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login?redirect=/dashboard/buyer/my-orders");
      } else if (user.role !== 'buyer') {
        toast({ title: "Access Denied", description: "Only buyers can view their orders.", variant: "destructive" });
        router.push("/dashboard");
      } else {
        fetchOrders();
      }
    }
  }, [user, authLoading, router, toast, fetchOrders]);

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }
  
  if (user && user.role !== 'buyer') {
     return <p className="text-destructive text-center py-10">Access Denied.</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-primary flex items-center">
          <ShoppingBag className="mr-3 h-8 w-8" /> My Orders
        </h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Your Purchase History</CardTitle>
          <CardDescription>Here are all the oxygen cylinder purchases you have made.</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingOrders ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg text-muted-foreground">Fetching your orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <PackageSearch className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-xl text-muted-foreground">You haven&apos;t placed any orders yet.</p>
              <Button asChild className="mt-4">
                <Link href="/dashboard">Find Sellers</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead className="hidden md:table-cell">Date</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead className="text-right">Total Amount</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Delivery Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium truncate" title={order.id}>{order.id.substring(0,8)}...</TableCell>
                      <TableCell>{order.sellerName || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">{order.purchaseDate.toDate().toLocaleDateString()}</TableCell>
                      <TableCell className="text-center">{order.quantity}</TableCell>
                      <TableCell className="text-right">${order.totalAmount.toFixed(2)}</TableCell>
                      <TableCell className="hidden sm:table-cell">{order.status}</TableCell>
                      <TableCell className="hidden lg:table-cell">{order.buyerAddress || 'Not specified'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
