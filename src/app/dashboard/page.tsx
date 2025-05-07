
"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import BuyerDashboard from "./buyer/page";
import SellerDashboard from "./seller/page";
import AdminDashboard from "./admin/page";
import { Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login?redirect=/dashboard");
    }
  }, [user, loading, router]);

  if (loading || !user) { // Keep loading indicator until user object is resolved
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }
  
  if (user.role === 'seller' && !user.approved) {
    return (
       <Card className="max-w-2xl mx-auto my-8 shadow-lg border-yellow-500 border-2">
        <CardHeader className="items-center text-center">
           <AlertTriangle className="h-12 w-12 text-yellow-500 mb-2" />
          <CardTitle className="text-2xl font-semibold text-yellow-600">Account Pending Approval</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-foreground mb-4">
            Your seller account is currently awaiting admin approval. 
            You will be notified once your account is active.
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            In the meantime, you can update your profile information. However, you won&apos;t be able to list stock or appear in searches until approved.
          </p>
          <Button onClick={() => router.push('/profile')} variant="outline">
            Go to Profile
          </Button>
        </CardContent>
      </Card>
    );
  }


  switch (user.role) {
    case "buyer":
      return <BuyerDashboard />;
    case "seller":
      // This seller is approved if they reach here
      return <SellerDashboard />;
    case "admin":
      return <AdminDashboard />;
    default:
      console.error("Unknown user role or role not set:", user.role);
      toast({title: "Access Error", description: "Your user role is not recognized. Logging out.", variant: "destructive"});
      // AuthContext logout would be better here if accessible, or a dedicated logout function
      // For now, simple redirect.
      router.push("/login");
      return (
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-destructive">Error: Unknown user role. Redirecting...</p>
        </div>
      );
  }
}

// Need to import toast if used directly, though it's better to handle such errors globally or via AuthContext
import { toast } from "@/hooks/use-toast";
