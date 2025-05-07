"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, writeBatch, orderBy, serverTimestamp } from "firebase/firestore";
import { CheckCircle, XCircle, Users, Package, MapPin, Loader2, Eye, BarChart3, AlertTriangle, RefreshCcw, Building } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface Seller {
  id: string;
  contactName: string;
  email: string;
  phoneNumber: string;
  approved: boolean;
  active: boolean; 
  cylindersAvailable?: number;
  location?: { latitude: number; longitude: number } | null;
  createdAt: any; 
  licenseUrl?: string;
}

interface Stats {
  totalUsers: number;
  totalSellers: number;
  totalBuyers: number;
  pendingApprovals: number;
  totalCylinders: number;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchSellersAndStats = useCallback(async () => {
    setLoadingSellers(true);
    setLoadingStats(true);
    try {
      // Fetch Sellers
      const sellersQuery = query(collection(db, "users"), where("role", "==", "seller"), orderBy("createdAt", "desc"));
      const sellersSnapshot = await getDocs(sellersQuery);
      const fetchedSellers: Seller[] = sellersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Seller));
      setSellers(fetchedSellers);

      // Fetch All Users for Stats
      const usersSnapshot = await getDocs(collection(db, "users"));
      let totalUsers = usersSnapshot.size;
      let totalSellersCount = 0;
      let totalBuyers = 0;
      let pendingApprovals = 0;
      let totalCylinders = 0;

      usersSnapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.role === 'seller') {
          totalSellersCount++;
          if (!userData.approved) {
            pendingApprovals++;
          }
          if (userData.cylindersAvailable) {
            totalCylinders += Number(userData.cylindersAvailable);
          }
        } else if (userData.role === 'buyer') {
          totalBuyers++;
        }
      });
      setStats({ totalUsers, totalSellers: totalSellersCount, totalBuyers, pendingApprovals, totalCylinders });

    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: `Could not fetch data: ${error.message}`, variant: "destructive" });
    } finally {
      setLoadingSellers(false);
      setLoadingStats(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);


  useEffect(() => {
    if (!authLoading && user) {
      if (user.role === 'admin') {
        fetchSellersAndStats();
      } else {
        router.push("/dashboard"); // Redirect non-admins
      }
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router, fetchSellersAndStats]);

  if (authLoading || (!user && !authLoading) || (user && (loadingSellers || loadingStats))) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading admin dashboard...</p>
      </div>
    );
  }
  
  if (user && user.role !== 'admin') {
     // This case should be handled by useEffect, but as a safeguard
     return <p className="text-destructive text-center">Access Denied. You are not an admin.</p>;
  }


  const handleApproval = async (sellerId: string, newStatus: boolean) => {
    // Optimistically update UI or show specific loader for the row
    const originalSellers = [...sellers];
    setSellers(prevSellers => prevSellers.map(s => s.id === sellerId ? {...s, approved: newStatus, active: newStatus} : s));

    try {
      const sellerDocRef = doc(db, "users", sellerId);
      await updateDoc(sellerDocRef, { 
        approved: newStatus,
        active: newStatus, 
        updatedAt: serverTimestamp(),
      });
      toast({
        title: "Success",
        description: `Seller ${newStatus ? 'approved and activated' : 'unapproved and deactivated'}.`,
      });
      fetchSellersAndStats(); // Refresh all data
    } catch (error) {
      console.error("Error updating seller status:", error);
      toast({ title: "Error", description: "Could not update seller status.", variant: "destructive" });
      setSellers(originalSellers); // Revert optimistic update on error
    }
  };

  const StatsCard = ({ title, value, icon: Icon, isLoading }: { title: string, value: string | number, icon: React.ElementType, isLoading: boolean }) => (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300 ease-in-out transform hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent>
        {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <div className="text-3xl font-bold text-foreground">{value}</div>}
      </CardContent>
    </Card>
  );
  
  const pendingApprovalSellers = sellers.filter(s => !s.approved);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-4xl font-bold text-primary tracking-tight">Admin Dashboard</h1>
        <Button onClick={fetchSellersAndStats} disabled={loadingSellers || loadingStats} variant="outline">
            {(loadingSellers || loadingStats) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Refresh Data
        </Button>
      </div>


      <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <StatsCard title="Total Users" value={stats?.totalUsers ?? '...'} icon={Users} isLoading={loadingStats} />
        <StatsCard title="Sellers" value={stats?.totalSellers ?? '...'} icon={Building} isLoading={loadingStats} />
        <StatsCard title="Buyers" value={stats?.totalBuyers ?? '...'} icon={Users} isLoading={loadingStats} />
        <StatsCard title="Pending Approvals" value={stats?.pendingApprovals ?? '...'} icon={AlertTriangle} isLoading={loadingStats} />
        <StatsCard title="Total Cylinders" value={stats?.totalCylinders ?? '...'} icon={Package} isLoading={loadingStats} />
      </section>

      {pendingApprovalSellers.length > 0 && (
        <Card className="shadow-xl border-accent">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-accent flex items-center">
              <AlertTriangle className="mr-2 h-6 w-6" /> Pending Seller Approvals ({pendingApprovalSellers.length})
            </CardTitle>
            <CardDescription>Review and approve new seller registrations.</CardDescription>
          </CardHeader>
          <CardContent>
             <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>License/Certificate</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovalSellers.slice(0, 5).map((seller) => (
                    <TableRow key={seller.id}>
                      <TableCell className="font-medium">{seller.contactName}</TableCell>
                      <TableCell>{seller.email}</TableCell>
                      <TableCell>
                        {seller.licenseUrl ? (
                          <a href={seller.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">View</a>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not uploaded</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center space-x-2">
                        <Button size="sm" onClick={() => handleApproval(seller.id, true)} className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="mr-1 h-4 w-4" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/seller/${seller.id}`}><Eye className="mr-1 h-4 w-4" /> View</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {pendingApprovalSellers.length > 5 && (
                <div className="text-center mt-4">
                    <Button variant="link" asChild><Link href="/admin/sellers?filter=pending">View All Pending Approvals</Link></Button>
                </div>
            )}
          </CardContent>
        </Card>
      )}
      
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Quick Links</CardTitle>
          <CardDescription>Navigate to other administrative sections.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link href="/admin/sellers" className="block p-6 border rounded-lg hover:shadow-md transition-shadow duration-300 ease-in-out hover:bg-card transform hover:-translate-y-1">
                <h3 className="text-lg font-semibold text-primary flex items-center"><Users className="mr-2 h-5 w-5" />Manage All Sellers</h3>
                <p className="text-sm text-muted-foreground mt-1">View detailed list of all sellers, edit profiles, and manage status.</p>
            </Link>
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">More administrative tools will be added here.</p>
        </CardFooter>
      </Card>

    </div>
  );
}

