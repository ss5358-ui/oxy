"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth, UserProfile } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc, GeoPoint, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, UserCircle, Phone, Mail, MapPin, Package, Edit, Save, Loader2, CheckCircle, XCircle, ShieldCheck, Building, FileText } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
// import Link from "next/link"; // No longer needed for license URL

type SellerAdminDetails = UserProfile & { uid: string }; // Ensure uid is part of the type

export default function AdminSellerDetailPage() {
  const { user: adminUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sellerId = params.sellerId as string;
  const { toast } = useToast();

  const [seller, setSeller] = useState<SellerAdminDetails | null>(null);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<SellerAdminDetails>>({});
  const [isSaving, setIsSaving] = useState(false);

  const fetchSellerDetails = useCallback(async () => {
    if (!sellerId) return;
    setLoadingSeller(true);
    try {
      const sellerDocRef = doc(db, "users", sellerId);
      const docSnap = await getDoc(sellerDocRef);
      if (docSnap.exists() && docSnap.data().role === 'seller') {
        const data = { uid: docSnap.id, ...docSnap.data() } as SellerAdminDetails;
        setSeller(data);
        setEditData({ 
          contactName: data.contactName,
          phoneNumber: data.phoneNumber,
          cylindersAvailable: data.cylindersAvailable,
          approved: data.approved,
          active: data.active,
          // License fields are not editable by admin here, just viewable
        });
      } else {
        toast({ title: "Seller Not Found", description: "The requested seller could not be found or is not a seller.", variant: "destructive" });
        router.push("/admin/sellers");
      }
    } catch (error: any) {
      console.error("Error fetching seller details:", error);
      toast({ title: "Error", description: `Could not load seller information: ${error.message}`, variant: "destructive" });
    } finally {
      setLoadingSeller(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, router, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!adminUser) {
      router.push(`/login?redirect=/admin/seller/${sellerId}`);
      return;
    }
    if (adminUser.role !== 'admin') {
      toast({ title: "Access Denied", description: "You are not authorized to view this page.", variant: "destructive" });
      router.push('/dashboard');
      return;
    }
    fetchSellerDetails();
  }, [sellerId, adminUser, authLoading, router, toast, fetchSellerDetails]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const val = name === 'cylindersAvailable' ? Math.max(0, parseInt(value)) : value;
    setEditData(prev => ({ ...prev, [name]: val }));
  };
  
  const handleSwitchChange = (name: 'approved' | 'active', checked: boolean) => {
     setEditData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSaveChanges = async () => {
    if (!seller || !sellerId) return;
    setIsSaving(true);
    try {
      const sellerDocRef = doc(db, "users", sellerId);
      const updatePayload: any = { 
        contactName: editData.contactName || seller.contactName,
        phoneNumber: editData.phoneNumber || seller.phoneNumber,
        cylindersAvailable: Number(editData.cylindersAvailable) >= 0 ? Number(editData.cylindersAvailable) : seller.cylindersAvailable,
        approved: editData.approved !== undefined ? editData.approved : seller.approved,
        active: editData.active !== undefined ? editData.active : seller.active,
        updatedAt: serverTimestamp(),
      };
      await updateDoc(sellerDocRef, updatePayload);
      
      await fetchSellerDetails(); 

      toast({ title: "Changes Saved", description: "Seller details have been updated." });
      setIsEditing(false);
    } catch (error: any) {
      console.error("Error saving changes:", error);
      toast({ title: "Save Failed", description: `Could not save changes: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || loadingSeller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading seller details...</p>
      </div>
    );
  }

  if (!seller) { 
    return (
      <div className="text-center py-10">
        <h2 className="text-2xl font-semibold text-destructive">Seller Not Found</h2>
        <Button onClick={() => router.push('/admin/sellers')} className="mt-4">Back to Seller List</Button>
      </div>
    );
  }
  
  const DetailItem = ({ icon: Icon, label, value, children }: { icon: React.ElementType, label: string, value?: string | number | null | undefined, children?: React.ReactNode }) => (
    <div className="flex items-start space-x-3 py-3 border-b last:border-b-0">
      <Icon className="h-5 w-5 text-primary mt-1 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {children ? children : <p className="text-base text-foreground break-words">{value !== null && value !== undefined && String(value).trim() !== "" ? String(value) : 'N/A'}</p>}
      </div>
    </div>
  );


  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={() => router.push('/admin/sellers')} className="flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Seller List
        </Button>
        <h1 className="text-2xl sm:text-3xl font-bold text-primary flex items-center text-center truncate">
            <Building className="mr-2 h-7 w-7 sm:h-8 sm:w-8 shrink-0"/>Seller: {seller.contactName}
        </h1>
        <Button onClick={() => {
            setIsEditing(!isEditing);
            if (!isEditing) { 
                 setEditData({
                    contactName: seller.contactName,
                    phoneNumber: seller.phoneNumber,
                    cylindersAvailable: seller.cylindersAvailable,
                    approved: seller.approved,
                    active: seller.active,
                });
            }
        }} variant={isEditing ? "secondary" : "default"} className="shrink-0">
          {isEditing ? <XCircle className="mr-2 h-4 w-4" /> : <Edit className="mr-2 h-4 w-4" />}
          {isEditing ? "Cancel" : "Edit"}
        </Button>
      </div>

      <Card className="shadow-xl overflow-hidden">
         <div className="md:flex">
            <div className="md:w-1/3 bg-gradient-to-br from-primary/10 to-secondary/10 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r">
                 <h2 className="text-2xl font-semibold text-primary text-center break-words">{seller.contactName}</h2>
                <p className="text-sm text-muted-foreground break-all">{seller.email}</p>
                <div className="mt-4 space-x-2">
                    <Badge variant={seller.approved ? "default" : "destructive"} className={`${seller.approved ? "bg-green-600 text-white" : "bg-yellow-500 text-black"} cursor-default`}>
                        {seller.approved ? "Approved" : "Pending"}
                    </Badge>
                     <Badge variant="outline" className={`${seller.active ? "border-green-600 text-green-700" : "border-red-600 text-red-700"} cursor-default`}>
                        {seller.active ? "Visible" : "Hidden"}
                    </Badge>
                </div>
            </div>
            <div className="md:w-2/3 p-6 md:p-8">
                <CardHeader className="px-0 pt-0 mb-4">
                    <CardTitle className="text-2xl">Seller Information</CardTitle>
                    <CardDescription>Detailed view and management options for this seller.</CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-1">
                    {!isEditing ? (
                        <>
                            <DetailItem icon={UserCircle} label="Contact Name" value={seller.contactName} />
                            <DetailItem icon={Mail} label="Email" value={seller.email} />
                            <DetailItem icon={Phone} label="Phone Number" value={seller.phoneNumber} />
                            <DetailItem icon={Package} label="Cylinders Available" value={seller.cylindersAvailable} />
                            <DetailItem icon={MapPin} label="Location (Lat, Lng)">
                                {seller.location instanceof GeoPoint ? `${seller.location.latitude.toFixed(4)}, ${seller.location.longitude.toFixed(4)}` : 
                                 (seller.location && typeof seller.location.latitude === 'number') ? `${seller.location.latitude.toFixed(4)}, ${seller.location.longitude.toFixed(4)}` : 'Not Set'}
                                {seller.location && (
                                    <a 
                                        href={`https://www.google.com/maps/search/?api=1&query=${seller.location instanceof GeoPoint ? seller.location.latitude : seller.location?.latitude},${seller.location instanceof GeoPoint ? seller.location.longitude : seller.location?.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="ml-2 text-xs text-primary hover:underline"
                                    >
                                        (View Map)
                                    </a>
                                )}
                            </DetailItem>
                            <DetailItem icon={FileText} label="License Number" value={seller.licenseNumber} />
                            <DetailItem icon={FileText} label="Licensee Name & Address" value={seller.licenseeNameAddress} />
                            <DetailItem icon={FileText} label="License Validity" value={seller.licenseValidity} />
                            <DetailItem icon={FileText} label="License Type" value={seller.licenseType} />
                             <DetailItem icon={ShieldCheck} label="Approval Status">
                                {seller.approved ? <span className="text-green-600 font-semibold">Approved</span> : <span className="text-yellow-600 font-semibold">Pending Approval</span>}
                            </DetailItem>
                            <DetailItem icon={CheckCircle} label="Visibility Status">
                                {seller.active ? <span className="text-green-600 font-semibold">Visible to Buyers</span> : <span className="text-red-600 font-semibold">Hidden from Buyers</span>}
                            </DetailItem>
                             <DetailItem icon={UserCircle} label="Member Since" value={seller.createdAt?.toDate().toLocaleDateString() || 'N/A'} />
                             <DetailItem icon={UserCircle} label="Last Updated" value={seller.updatedAt?.toDate().toLocaleDateString() || 'N/A'} />
                        </>
                    ) : (
                        <form onSubmit={(e) => { e.preventDefault(); handleSaveChanges(); }} className="space-y-6">
                             <div>
                                <Label htmlFor="contactNameEdit">Contact Name</Label>
                                <Input id="contactNameEdit" name="contactName" value={editData.contactName || ''} onChange={handleInputChange} />
                            </div>
                            <div>
                                <Label htmlFor="phoneNumberEdit">Phone Number</Label>
                                <Input id="phoneNumberEdit" name="phoneNumber" value={editData.phoneNumber || ''} onChange={handleInputChange} />
                            </div>
                             <div>
                                <Label htmlFor="cylindersAvailableEdit">Cylinders Available</Label>
                                <Input id="cylindersAvailableEdit" name="cylindersAvailable" type="number" value={editData.cylindersAvailable === undefined ? '' : editData.cylindersAvailable} onChange={handleInputChange} min="0" />
                            </div>
                            <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                    <Switch id="approvedEdit" name="approved" checked={!!editData.approved} onCheckedChange={(checked) => handleSwitchChange('approved', checked)} />
                                    <Label htmlFor="approvedEdit">Approved</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <Switch id="activeEdit" name="active" checked={!!editData.active} onCheckedChange={(checked) => handleSwitchChange('active', checked)} />
                                    <Label htmlFor="activeEdit">Visible to Buyers</Label>
                                </div>
                            </div>
                            <Button type="submit" disabled={isSaving} className="w-full sm:w-auto">
                                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                            </Button>
                        </form>
                    )}
                </CardContent>
            </div>
        </div>
      </Card>
    </div>
  );
}

