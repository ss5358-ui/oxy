"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, BarChart3, Loader2, UserCircle, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, useState } from "react";
import { db } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function AdminActivityLogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  
  useEffect(() => {
    if (!authLoading) {
        if (!user) {
            router.push("/login?redirect=/admin/activity");
        } else if (user.role !== 'admin') {
            router.push("/dashboard");
        }
    }
    // Fetch activity log from Firestore
    const fetchActivities = async () => {
      setLoadingActivities(true);
      try {
        const q = query(collection(db, 'activities'), orderBy('timestamp', 'desc'));
        const snapshot = await getDocs(q);
        setActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoadingActivities(false);
      }
    };
    fetchActivities();
  }, [user, authLoading, router]);


  if (authLoading || !user) { // Show loader if auth is loading or user is not yet available
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading page...</p>
      </div>
    );
  }
  
  // If user is loaded but not admin (should be caught by useEffect)
  if (user.role !== 'admin') {
     return <p className="text-destructive text-center py-10">Access Denied.</p>;
  }

  return (
    <div className="space-y-8">
        <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => router.push('/dashboard')} className="flex items-center">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Admin Dashboard
            </Button>
            <h1 className="text-3xl font-bold text-primary flex items-center">
                <BarChart3 className="mr-3 h-8 w-8" /> System Activity Log
            </h1>
        </div>
      
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>Track all system activities and events</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingActivities ? (
            <div className="flex flex-col items-center py-8">
              <Loader2 className="h-10 w-10 animate-spin text-primary mb-2" />
              <p className="text-muted-foreground">Loading activity log...</p>
            </div>
          ) : activities.length === 0 ? (
            <p className="text-center text-gray-600">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {activities.map(activity => (
                <li key={activity.id} className="py-4 flex items-start gap-4">
                  <div className="flex-shrink-0">
                    {/* Icon based on activity type */}
                    {activity.type === 'seller_registered' && <UserCircle className="h-7 w-7 text-primary" />}
                    {activity.type === 'seller_approved' && <CheckCircle className="h-7 w-7 text-green-600" />}
                    {/* Add more icons/types as needed */}
                  </div>
                  <div>
                    <div className="font-medium text-foreground">
                      {activity.type === 'seller_registered' && 'New Seller Registered'}
                      {activity.type === 'seller_approved' && 'Seller Approved'}
                      {/* Add more types as needed */}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {activity.description}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {activity.timestamp?.toDate ? activity.timestamp.toDate().toLocaleString() : ''}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {/* Note: Make sure to log activities to the 'activities' collection elsewhere in the app when sellers register or are approved. */}
    </div>
  );
}
