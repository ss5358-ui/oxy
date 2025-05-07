"use client";

import AuthForm from "@/components/auth/AuthForm";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { auth } from '@/lib/firebase'; // db is not needed here directly
import { signInWithEmailAndPassword } from 'firebase/auth';
// import { doc, getDoc } from "firebase/firestore"; // User data is fetched by AuthContext
import { useRouter } from 'next/navigation';
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
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
    // Show loading or redirecting state
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Loading...</p>
      </div>
    );
  }


  const handleLogin = async (values: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // AuthContext will handle fetching user data and redirecting
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to dashboard...",
      });
      // No need to explicitly push here, AuthContext effect will handle it
      // router.push("/dashboard"); 
    } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error("Login error:", error);
      let errorMessage = "An unexpected error occurred. Please try again.";
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
          case "auth/wrong-password":
          case "auth/invalid-credential":
            errorMessage = "Invalid email or password.";
            break;
          case "auth/too-many-requests":
            errorMessage = "Too many login attempts. Please try again later or reset your password.";
            break;
          default:
            errorMessage = "Failed to login. Please check your credentials.";
        }
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 bg-gray-50 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <Card className="shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold tracking-tight text-primary">Sign In to oxylink</CardTitle>
            <CardDescription>
              Enter your credentials to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthForm mode="login" onSubmit={handleLogin} loading={loading} />
             <p className="mt-6 text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/register" className="font-medium text-primary hover:underline">
                    Register here
                </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
