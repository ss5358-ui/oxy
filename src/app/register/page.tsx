"use client";

import AuthForm from "@/components/auth/AuthForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, GeoPoint } from "firebase/firestore";
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/dashboard'); 
    }
  }, [user, authLoading, router]);

  if (authLoading || (!authLoading && user)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-3">Loading...</p>
      </div>
    );
  }

  const handleRegister = async (values: any) => { 
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const firebaseUser = userCredential.user;

      if (firebaseUser) {
        await updateProfile(firebaseUser, {
          displayName: values.contactName,
        });

        const userDocRef = doc(db, "users", firebaseUser.uid);
        const isSeller = values.role === 'seller';
        const isBuyer = values.role === 'buyer';
        const isAdmin = values.role === 'admin';
        
        const userData: any = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          contactName: values.contactName,
          phoneNumber: values.phoneNumber,
          role: values.role,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          approved: isBuyer || isAdmin, 
          active: isBuyer || isAdmin,   
          cylindersAvailable: isSeller ? 0 : null,
          location: isSeller ? null : null, 
          address: isBuyer ? "" : null,
          licenseNumber: isSeller ? null : null,
          licenseeNameAddress: isSeller ? null : null,
          licenseValidity: isSeller ? null : null,
          licenseType: isSeller ? null : null,
        };
        await setDoc(userDocRef, userData);

        toast({
          title: "Registration Successful",
          description: "Your account has been created. Redirecting...",
        });
        // Wait for a moment to ensure user data is propagated in AuthContext
        // This is a common pattern, though ideally AuthContext would handle this seamlessly.
        setTimeout(() => {
          router.push("/dashboard"); 
        }, 500);
      } else {
        throw new Error("User creation failed.");
      }
    } catch (error: any) { 
      console.error("Registration error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/email-already-in-use":
            errorMessage = "This email address is already in use.";
            break;
          case "auth/weak-password":
            errorMessage = "The password is too weak.";
            break;
          case "auth/invalid-email":
            errorMessage = "The email address is not valid.";
            break;
          case "auth/operation-not-allowed":
             errorMessage = "Email/password accounts are not enabled. Please contact support.";
            break;
          case "auth/configuration-not-found":
            errorMessage = "Firebase authentication configuration is not found. Please ensure it's enabled in the Firebase console.";
            break;
          default:
            errorMessage = `Failed to register: ${error.message}. Please try again.`;
        }
      }
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-150px)] items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-background to-background">
      <div className="w-full max-w-lg space-y-8"> {}
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">Create an Account</CardTitle>
            <CardDescription>
              Join oxylink to find or provide oxygen cylinders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="register" onSubmit={handleRegister} loading={loading} />
             <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-primary hover:underline">
                    Sign in
                </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

