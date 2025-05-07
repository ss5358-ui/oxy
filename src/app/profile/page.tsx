
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth, UserProfile } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db, auth } from "@/lib/firebase"; // Removed storage import
import { doc, updateDoc, getDoc, GeoPoint, serverTimestamp } from "firebase/firestore";
// Removed storage related imports: ref, uploadBytesResumable, getDownloadURL, deleteObject
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { Loader2, UserCog, Save, KeyRound, ShieldAlert, MapPin, Package, LogOutIcon, FileText } from "lucide-react"; // Removed UploadCloud
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import Link from "next/link";
// Removed Image import as it's not used for license anymore

export default function ProfilePage() {
  const { user, loading: authLoading, logout, setUser: setAuthUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);

  // Removed license file upload states
  // const [licenseFile, setLicenseFile] = useState<File | null>(null);
  // const [isUploadingLicense, setIsUploadingLicense] = useState(false);
  // const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const loadProfileData = useCallback(async () => {
    if (user && !initialDataLoaded) { 
      setInitialDataLoaded(true); 
      const userDocRef = doc(db, "users", user.uid);
      try {
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile; 
          setProfileData({
            contactName: data.contactName || user.displayName || "",
            phoneNumber: data.phoneNumber || "",
            address: data.address || "", 
            // New license fields
            licenseNumber: data.licenseNumber || "",
            licenseeNameAddress: data.licenseeNameAddress || "",
            licenseValidity: data.licenseValidity || "",
            licenseType: data.licenseType || "",
            ...(user.role === 'seller' && {
              cylindersAvailable: data.cylindersAvailable || 0,
              location: data.location instanceof GeoPoint ? data.location : 
                         (data.location && typeof data.location.latitude === 'number') ? data.location as { latitude: number; longitude: number; } : null,
            }),
          });
        } else {
          console.warn("Profile document not found for user:", user.uid);
           setProfileData({
            contactName: user.displayName || "",
            phoneNumber: "", 
            address: "",
            licenseNumber: "",
            licenseeNameAddress: "",
            licenseValidity: "",
            licenseType: "",
          });
        }
      } catch (error) {
        console.error("Error fetching profile data:", error);
        toast({title: "Error", description: "Could not load profile data.", variant: "destructive"});
      }
    }
  }, [user, initialDataLoaded, toast]); 

  useEffect(() => {
    if (!authLoading) {
        if (user) {
            loadProfileData();
        } else {
            router.push("/login?redirect=/profile");
        }
    }
  }, [user, authLoading, router, loadProfileData]);

  if (authLoading || (user && !initialDataLoaded)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }
  
  if (!user) { 
    return null;
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingProfile(true);

    const updateData: any = { 
      contactName: profileData.contactName || user.displayName, 
      phoneNumber: profileData.phoneNumber,
      updatedAt: serverTimestamp(),
    };

    if (user.role === 'buyer') {
        updateData.address = profileData.address || "";
    }
    
    if (user.role === 'seller') {
        updateData.licenseNumber = profileData.licenseNumber || "";
        updateData.licenseeNameAddress = profileData.licenseeNameAddress || "";
        updateData.licenseValidity = profileData.licenseValidity || "";
        updateData.licenseType = profileData.licenseType || "";
    }
    
    try {
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, updateData);
      
      // Optimistically update AuthContext user
      const updatedAuthUser: Partial<UserProfile> = {
        displayName: updateData.contactName,
        contactName: updateData.contactName,
      };
      if (user.role === 'buyer') updatedAuthUser.address = updateData.address;
      if (user.role === 'seller') {
        updatedAuthUser.licenseNumber = updateData.licenseNumber;
        updatedAuthUser.licenseeNameAddress = updateData.licenseeNameAddress;
        updatedAuthUser.licenseValidity = updateData.licenseValidity;
        updatedAuthUser.licenseType = updateData.licenseType;
      }
      setAuthUser(prevUser => prevUser ? ({...prevUser, ...updatedAuthUser }) : null);

      toast({ title: "Profile Updated", description: "Your profile details have been saved." });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ title: "Update Failed", description: "Could not update profile.", variant: "destructive" });
    } finally {
      setIsSubmittingProfile(false);
    }
  };
  
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !auth.currentUser || !auth.currentUser.email) {
        toast({title: "Error", description: "User not properly authenticated.", variant: "destructive"});
        return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword) || !/[\W_]/.test(newPassword)) {
       toast({ title: "Weak Password", description: "New password must be at least 8 characters and include uppercase, lowercase, number, and special character.", variant: "destructive" });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      toast({ title: "Password Updated", description: "Your password has been changed successfully. Please log in again." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      await logout(); 
      router.push('/login');
    } catch (error: any) { 
      console.error("Error updating password:", error);
      let desc = "Could not update password.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        desc = "Incorrect current password.";
      } else if (error.code === 'auth/weak-password') { 
        desc = "New password is too weak (as per Firebase).";
      } else if (error.code === 'auth/requires-recent-login') {
        desc = "This operation is sensitive and requires recent authentication. Please log out and log back in before changing your password.";
      }
      toast({ title: "Password Update Failed", description: desc, variant: "destructive" });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Removed handleFileChange, handleLicenseUpload, handleRemoveLicense

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold text-primary tracking-tight">My Profile</h1>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><UserCog className="mr-3 h-7 w-7 text-primary" />Contact Information</CardTitle>
          <CardDescription>Manage your contact name and phone number. Buyers can also update their address.</CardDescription>
        </CardHeader>
        <form onSubmit={handleProfileUpdate}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-base">Email Address</Label>
              <Input id="email" type="email" value={user.email || ""} disabled className="mt-1 text-lg p-2 bg-muted/50 cursor-not-allowed" />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed.</p>
            </div>
            <div>
              <Label htmlFor="contactName" className="text-base">Contact / Business Name</Label>
              <Input
                id="contactName"
                name="contactName"
                type="text"
                value={profileData.contactName || ""}
                onChange={handleInputChange}
                className="mt-1 text-lg p-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber" className="text-base">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                value={profileData.phoneNumber || ""}
                onChange={handleInputChange}
                className="mt-1 text-lg p-2"
                required
              />
            </div>
            {user.role === 'buyer' && (
                <div>
                    <Label htmlFor="address" className="text-base">Delivery Address</Label>
                    <Textarea
                        id="address"
                        name="address"
                        placeholder="123 Main St, Anytown, USA 12345"
                        value={profileData.address || ""}
                        onChange={handleInputChange}
                        className="mt-1 text-lg p-2"
                        rows={3}
                    />
                </div>
            )}
             <div>
              <Label htmlFor="role" className="text-base">My Role</Label>
              <Input id="role" type="text" value={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'N/A'} disabled className="mt-1 text-lg p-2 bg-muted/50 capitalize cursor-not-allowed" />
            </div>
            {user.role === 'seller' && (
                <>
                 {profileData.location && (profileData.location as {latitude: number, longitude: number} | GeoPoint).latitude !== undefined && (
                    <div>
                        <Label className="text-base">Current Location</Label>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center">
                            <MapPin className="mr-2 h-4 w-4 text-primary" />
                            Lat: {(profileData.location as {latitude: number, longitude: number} | GeoPoint).latitude.toFixed(4)}, Lng: {(profileData.location as {latitude: number, longitude: number} | GeoPoint).longitude.toFixed(4)}
                        </p>
                    </div>
                 )}
                 {profileData.cylindersAvailable !== undefined && (
                    <div>
                        <Label className="text-base">Cylinders Available</Label>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center">
                            <Package className="mr-2 h-4 w-4 text-primary" />
                            {profileData.cylindersAvailable}
                        </p>
                    </div>
                 )}
                 <p className="text-sm text-muted-foreground">
                    To update stock or location, please go to your <Link href="/dashboard" className="text-primary hover:underline font-medium">Seller Dashboard</Link>.
                 </p>
                </>
            )}

            {/* New License Details Section for Sellers */}
            {user.role === 'seller' && (
              <div className="pt-6 border-t">
                <h3 className="text-xl font-semibold mb-4 flex items-center"><FileText className="mr-2 h-6 w-6 text-primary" />License Information</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input id="licenseNumber" name="licenseNumber" value={profileData.licenseNumber || ""} onChange={handleInputChange} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="licenseeNameAddress">Name and Address of Licensee (Seller/Manufacturer)</Label>
                    <Textarea id="licenseeNameAddress" name="licenseeNameAddress" value={profileData.licenseeNameAddress || ""} onChange={handleInputChange} className="mt-1" rows={3} />
                  </div>
                  <div>
                    <Label htmlFor="licenseValidity">Validity Period (e.g., MM/YYYY - MM/YYYY or Valid Until MM/YYYY)</Label>
                    <Input id="licenseValidity" name="licenseValidity" value={profileData.licenseValidity || ""} onChange={handleInputChange} className="mt-1" placeholder="e.g., 01/2023 - 12/2025"/>
                  </div>
                  <div>
                    <Label htmlFor="licenseType">Type of License (e.g., Manufacturing, Retail, Wholesale)</Label>
                    <Input id="licenseType" name="licenseType" value={profileData.licenseType || ""} onChange={handleInputChange} className="mt-1" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmittingProfile} className="w-full sm:w-auto">
              {isSubmittingProfile ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Profile & License Info
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Removed license file upload card */}

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center"><KeyRound className="mr-3 h-7 w-7 text-primary" />Change Password</CardTitle>
          <CardDescription>Update your account password. You will be logged out after a successful change.</CardDescription>
        </CardHeader>
        <form onSubmit={handlePasswordUpdate}>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="newPassword">New Password (min 8 chars, upper, lower, num, special)</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="mt-1" />
            </div>
            <div>
              <Label htmlFor="confirmNewPassword">Confirm New Password</Label>
              <Input id="confirmNewPassword" type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required className="mt-1" />
            </div>
          </CardContent>
          <CardFooter>
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" disabled={isSubmittingPassword || !currentPassword || !newPassword || !confirmNewPassword} className="w-full sm:w-auto">
                    <KeyRound className="mr-2 h-4 w-4" />
                    Change Password
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Password Change</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to change your password? You will be logged out and need to sign in again with the new password.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handlePasswordUpdate} disabled={isSubmittingPassword} className="bg-primary hover:bg-primary/90">
                    {isSubmittingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Proceed
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardFooter>
        </form>
      </Card>
      
      <Card className="border-destructive shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center text-destructive"><ShieldAlert className="mr-3 h-7 w-7" />Account Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-muted-foreground mb-2">Log out from your current session.</p>
            <Button variant="outline" onClick={async () => { await logout(); router.push('/login');}} className="w-full sm:w-auto">
                <LogOutIcon className="mr-2 h-4 w-4"/> Logout
            </Button>
          </div>
          <div className="pt-4 border-t">
            <p className="text-muted-foreground mb-2">Permanently delete your account and all associated data.</p>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">Delete Account</Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your account and all associated data from OxyConnect. This feature is currently a placeholder.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => toast({ title: "Action Inactive", description: "Account deletion is not yet implemented.", variant: "default" })} className="bg-destructive hover:bg-destructive/90">
                    Delete My Account
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">Account deletion is a permanent action. Please proceed with caution.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

