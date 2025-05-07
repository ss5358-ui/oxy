"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth, UserProfile } from "@/context/AuthContext"; 
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, doc, updateDoc, orderBy, serverTimestamp } from "firebase/firestore";
import { CheckCircle, XCircle, Users, Package, MapPin, Loader2, Eye, ArrowLeft, RefreshCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


type SellerAdminView = UserProfile & { id: string }; 

export default function ManageSellersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [sellers, setSellers] = useState<SellerAdminView[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>(searchParams.get('filter') as 'all' | 'pending' | 'approved' || 'all');

  const fetchSellers = useCallback(async () => {
    setLoadingSellers(true);
    try {
      const usersCollectionRef = collection(db, "users");
      let sellersQuery;

      // Base query for sellers, ordered by creation date
      const baseConditions = [where("role", "==", "seller")];
      
      if (filter === 'pending') {
        sellersQuery = query(usersCollectionRef, ...baseConditions, where("approved", "==", false), orderBy("createdAt", "desc"));
        // Requires index: role ASC, approved ASC, createdAt DESC
      } else if (filter === 'approved') {
        sellersQuery = query(usersCollectionRef, ...baseConditions, where("approved", "==", true), orderBy("createdAt", "desc"));
        // Requires index: role ASC, approved ASC, createdAt DESC 
      } else { // 'all'
        sellersQuery = query(usersCollectionRef, ...baseConditions, orderBy("createdAt", "desc"));
        // Requires index: role ASC, createdAt DESC
      }
      
      const querySnapshot = await getDocs(sellersQuery);
      const fetchedSellers: SellerAdminView[] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SellerAdminView));
      setSellers(fetchedSellers);

    } catch (error: any) {
      console.error("Error fetching sellers:", error);
      let description = `Could not fetch sellers: ${error.message}`;
      if (error.code === 'failed-precondition' && error.message?.toLowerCase().includes('query requires an index')) {
        description = "Firestore query requires an index. Please go to the Firebase console to create the necessary composite index. The error message in your browser's developer console often provides a direct link to create it. Ensure indexes match your query, e.g., for (role, createdAt) or (role, approved, createdAt).";
      }
      toast({ title: "Error Fetching the Sellers", description, variant: "destructive" });
    } finally {
      setLoadingSellers(false);
    }
  }, [filter, toast]);

  useEffect(() => {
    if (!authLoading && user) {
        if (user.role === 'admin') {
            fetchSellers();
        } else {
            router.push("/dashboard");
        }
    } else if (!authLoading && !user) {
        router.push("/login?redirect=/admin/sellers");
    }
  }, [user, authLoading, fetchSellers, router]);

  const handleFilterChange = (newFilter: 'all' | 'pending' | 'approved') => {
    setFilter(newFilter);
    router.push(`/admin/sellers?filter=${newFilter}`); 
  };

  if (authLoading || (user && loadingSellers && user.role === 'admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading sellers management...</p>
      </div>
    );
  }
  
  if (user && user.role !== 'admin') { 
     return <p className="text-destructive text-center py-10">Access Denied.</p>;
  }


  const handleApproval = async (sellerId: string, newStatus: boolean) => {
    const originalSellers = [...sellers];
    setSellers(prevSellers => prevSellers.map(s => s.id === sellerId ? {...s, approved: newStatus, active: newStatus } : s));

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
      fetchSellers(); 
    } catch (error) {
      console.error("Error updating seller status:", error);
      toast({ title: "Error", description: "Could not update seller status.", variant: "destructive" });
      setSellers(originalSellers); 
    }
  };
  
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-primary">Manage All Sellers</h1>
      </div>


      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-semibold">Seller List ({sellers.length})</CardTitle>
              <CardDescription>View, approve, or revoke seller access. Click on a seller's name for more details.</CardDescription>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
                <Select value={filter} onValueChange={handleFilterChange}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter sellers" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Sellers</SelectItem>
                        <SelectItem value="pending">Pending Approval</SelectItem>
                        <SelectItem value="approved">Approved Sellers</SelectItem>
                    </SelectContent>
                </Select>
                <Button onClick={fetchSellers} variant="outline" size="icon" title="Refresh list" disabled={loadingSellers}>
                    {loadingSellers ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingSellers && sellers.length === 0 ? ( 
             <div className="flex items-center justify-center py-10">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Fetching sellers...</p>
            </div>
          ) : !loadingSellers && sellers.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">No sellers match the current filter.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead className="hidden lg:table-cell">Phone</TableHead>
                    <TableHead>Approval</TableHead>
                    <TableHead className="hidden sm:table-cell">Visibility</TableHead>
                    <TableHead className="text-center hidden lg:table-cell">Stock</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sellers.map((seller) => (
                    <TableRow key={seller.id} className={`${!seller.approved ? 'bg-yellow-500/10 hover:bg-yellow-500/20' : seller.active ? 'hover:bg-green-500/10' : 'bg-red-500/5 hover:bg-red-500/10'}`}>
                      <TableCell className="font-medium">
                        <Link href={`/admin/seller/${seller.id}`} className="hover:underline text-primary">
                          {seller.contactName}
                        </Link>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{seller.email}</TableCell>
                      <TableCell className="hidden lg:table-cell">{seller.phoneNumber}</TableCell>
                      <TableCell>
                        {seller.approved ? (
                          <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">Approved</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500 border-yellow-600 text-yellow-900 hover:bg-yellow-600">Pending</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="outline" className={seller.active ? 'border-green-500 text-green-600' : 'border-red-500 text-red-500'}>
                            {seller.active ? "Visible" : "Hidden"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">{seller.cylindersAvailable ?? 'N/A'}</TableCell>
                      <TableCell className="text-center space-x-1 sm:space-x-2">
                        {!seller.approved ? (
                          <Button size="sm" onClick={() => handleApproval(seller.id, true)} className="bg-green-500 hover:bg-green-600 text-xs p-1 sm:p-2">
                            <CheckCircle className="mr-0 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Approve</span>
                          </Button>
                        ) : (
                          <Button variant="destructive" size="sm" onClick={() => handleApproval(seller.id, false)} className="text-xs p-1 sm:p-2">
                            <XCircle className="mr-0 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Revoke</span>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild className="text-xs p-1 sm:p-2">
                          <Link href={`/admin/seller/${seller.id}`}><Eye className="mr-0 sm:mr-1 h-3 w-3 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Details</span></Link>
                        </Button>
                      </TableCell>
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
