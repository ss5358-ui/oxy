"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; 
import { useAuth, UserProfile } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, runTransaction, serverTimestamp, GeoPoint, collection } from "firebase/firestore";
import { Loader2, ShoppingCart, CreditCard, Package, User, Phone, MapPinIcon, AlertTriangle, Home } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { processPayment, PaymentInfo } from "@/services/payment"; 
import Image from "next/image";

interface SellerInfoForPurchase extends UserProfile { 
  id: string; 
}

export default function PurchasePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const sellerId = params.sellerId as string;
  const { toast } = useToast();

  const [sellerInfo, setSellerInfo] = useState<SellerInfoForPurchase | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [maxQuantity, setMaxQuantity] = useState<number>(1);
  const [loadingSeller, setLoadingSeller] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [buyerAddress, setBuyerAddress] = useState<string>("");

  const [paymentDetails, setPaymentDetails] = useState<PaymentInfo>({
    cardNumber: "",
    expirationDate: "",
    cvv: "",
  });

  const fetchSellerDetails = useCallback(async () => {
    if (!sellerId) return;
    setLoadingSeller(true);
    try {
      const sellerDocRef = doc(db, "users", sellerId);
      const docSnap = await getDoc(sellerDocRef);
      if (docSnap.exists() && docSnap.data().role === 'seller') {
        const data = { id: docSnap.id, ...docSnap.data() } as SellerInfoForPurchase;
        if (data.approved && data.active && data.cylindersAvailable && data.cylindersAvailable > 0) {
          setSellerInfo(data);
          const availableQty = data.cylindersAvailable;
          setMaxQuantity(availableQty);
          setQuantity(Math.min(1, availableQty)); 
        } else {
          let reason = "This seller is not available for purchases at the moment.";
          if (!data.approved) reason = "This seller is not yet approved.";
          else if (!data.active) reason = "This seller is currently not active.";
          else if (!data.cylindersAvailable || data.cylindersAvailable <= 0) reason = "This seller is out of stock.";
          toast({ title: "Cannot Purchase", description: reason, variant: "destructive" });
          router.push("/dashboard");
        }
      } else {
        toast({ title: "Seller Not Found", description: "The requested seller could not be found or is not a seller.", variant: "destructive" });
        router.push("/dashboard");
      }
    } catch (error: any) {
      console.error("Error fetching seller details:", error);
      toast({ title: "Error", description: `Could not load seller information: ${error.message}`, variant: "destructive" });
      router.push("/dashboard");
    } finally {
      setLoadingSeller(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sellerId, router, toast]);


  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push(`/login?redirect=/purchase/${sellerId}`);
      return;
    }
    if (user.role !== 'buyer') {
        toast({ title: "Access Denied", description: "Only buyers can make purchases.", variant: "destructive" });
        router.push('/dashboard');
        return;
    }
    if (user.address) {
      setBuyerAddress(user.address);
    }
    fetchSellerDetails();
  }, [user, authLoading, router, toast, sellerId, fetchSellerDetails]);

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) val = 1;
    if (sellerInfo && val > sellerInfo.cylindersAvailable!) val = sellerInfo.cylindersAvailable!; 
    setQuantity(val);
  };

  const handlePaymentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPaymentDetails(prev => ({ ...prev, [name]: value }));
  };
  
  const validatePaymentDetails = (): boolean => {
    if (!paymentDetails.cardNumber.replace(/\s/g, '').match(/^\d{15,16}$/)) {
      toast({ title: "Invalid Card", description: "Card number must be 15 or 16 digits.", variant: "destructive" });
      return false;
    }
    if (!paymentDetails.expirationDate.match(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/)) {
      toast({ title: "Invalid Expiry", description: "Expiration date should be MM/YY.", variant: "destructive" });
      return false;
    }
     if (!paymentDetails.cvv.match(/^\d{3,4}$/)) {
      toast({ title: "Invalid CVV", description: "CVV must be 3 or 4 digits.", variant: "destructive" });
      return false;
    }
    return true;
  };


  const handlePurchase = async () => {
    if (!user || !sellerInfo || !sellerInfo.cylindersAvailable || quantity <= 0 || quantity > sellerInfo.cylindersAvailable) {
      toast({ title: "Invalid Purchase", description: "Cannot proceed with this quantity or seller.", variant: "destructive" });
      return;
    }
    
    if (!validatePaymentDetails()) return;

    setIsProcessingPayment(true);
    try {
      const paymentSuccessful = await processPayment(paymentDetails, quantity * 50); 

      if (paymentSuccessful) {
        const sellerDocRef = doc(db, "users", sellerId);
        const purchaseLogRef = doc(collection(db, "purchases")); 

        await runTransaction(db, async (transaction) => {
          // --- READS FIRST ---
          const sellerDoc = await transaction.get(sellerDocRef);
          if (!sellerDoc.exists()) {
            throw new Error("Seller document does not exist!");
          }

          let buyerLocationData: GeoPoint | { latitude: number, longitude: number } | null = null;
          let finalBuyerAddress = buyerAddress; // Use the state value (form input)

          // Fetch buyer's existing data if needed to supplement
          if (user.uid) {
            const buyerDocRef = doc(db, "users", user.uid);
            const buyerDocSnap = await transaction.get(buyerDocRef); // READ
            if (buyerDocSnap.exists()) {
                const buyerData = buyerDocSnap.data();
                if (buyerData) {
                    if (buyerData.location) { // This is GeoPoint for buyer's coordinates, not necessarily delivery address
                        buyerLocationData = buyerData.location;
                    }
                    // If the form address is empty, fall back to the buyer's profile address
                    if (!finalBuyerAddress && buyerData.address) {
                        finalBuyerAddress = buyerData.address;
                    }
                }
            }
          }
          // --- END OF READS ---


          // --- WRITES ---
          const currentStock = sellerDoc.data().cylindersAvailable;
          if (currentStock < quantity) {
            throw new Error("Not enough stock available. The seller might have updated their stock.");
          }
          const newStock = currentStock - quantity;
          
          transaction.update(sellerDocRef, { 
            cylindersAvailable: newStock,
            updatedAt: serverTimestamp() 
          });

          transaction.set(purchaseLogRef, {
            buyerId: user.uid,
            buyerEmail: user.email,
            buyerContactName: user.contactName || user.displayName,
            sellerId: sellerInfo.id,
            sellerName: sellerInfo.contactName,
            quantity: quantity,
            pricePerCylinder: 50, 
            totalAmount: quantity * 50, 
            purchaseDate: serverTimestamp(),
            status: "completed", 
            paymentCardLast4: paymentDetails.cardNumber.slice(-4),
            buyerLocation: buyerLocationData, 
            buyerAddress: finalBuyerAddress || null, 
          });
          
          // Optionally, update buyer's profile address if it was provided/updated in the form
          if (user.uid && buyerAddress && buyerAddress !== (user.address || "")) {
            const buyerProfileRef = doc(db, "users", user.uid);
            transaction.update(buyerProfileRef, { address: buyerAddress, updatedAt: serverTimestamp() });
          }
          // --- END OF WRITES ---
        });

        toast({ title: "Purchase Successful!", description: `You have purchased ${quantity} cylinder(s). Seller contact: ${sellerInfo.phoneNumber}` });
        router.push("/dashboard/buyer/my-orders"); 
      } else {
        toast({ title: "Payment Failed", description: "Your payment could not be processed. Please check your details or try another card.", variant: "destructive" });
      }
    } catch (error: any) { 
      console.error("Purchase error:", error);
      toast({ title: "Purchase Failed", description: error.message || "An unexpected error occurred during purchase.", variant: "destructive" });
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (authLoading || loadingSeller) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading purchase details...</p>
      </div>
    );
  }

  if (!sellerInfo) { 
    return (
      <div className="text-center py-10">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-destructive">Seller Information Not Available</h2>
        <p className="text-muted-foreground">Could not load details for this seller, or they are not available for purchase.</p>
        <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Card className="shadow-xl overflow-hidden">
        <div className="md:flex">
            <div className="md:w-1/2">
                 <Image 
                    src={`https://picsum.photos/seed/${sellerInfo.id}/600/400`} 
                    alt={sellerInfo.contactName || "Seller"} 
                    width={600} 
                    height={400} 
                    className="w-full h-64 md:h-full object-cover"
                    data-ai-hint="medical supply store"
                />
            </div>
            <div className="md:w-1/2 p-6 md:p-8 flex flex-col">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-3xl font-bold text-primary mb-2 flex items-center">
                        <ShoppingCart className="mr-3 h-8 w-8" /> Purchase Cylinders
                    </CardTitle>
                    <CardDescription>
                        You are purchasing from: <span className="font-semibold text-foreground">{sellerInfo.contactName}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="px-0 space-y-6 flex-grow">
                    <div className="space-y-1">
                        <p className="flex items-center text-muted-foreground"><User className="mr-2 h-5 w-5 text-primary shrink-0" /> Seller: {sellerInfo.contactName}</p>
                        <p className="flex items-center text-muted-foreground"><Phone className="mr-2 h-5 w-5 text-primary shrink-0" /> Contact: {sellerInfo.phoneNumber}</p>
                        <p className="flex items-center text-muted-foreground"><Package className="mr-2 h-5 w-5 text-primary shrink-0" /> Available: {sellerInfo.cylindersAvailable} cylinders</p>
                         {sellerInfo.location && (sellerInfo.location as GeoPoint).latitude && ( 
                             <a 
                                href={`https://www.google.com/maps/search/?api=1&query=${(sellerInfo.location as GeoPoint).latitude},${(sellerInfo.location as GeoPoint).longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center text-sm text-primary hover:underline"
                                >
                                <MapPinIcon className="mr-2 h-4 w-4 shrink-0" /> View Seller Location
                            </a>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="quantity" className="text-base font-medium">Quantity to Purchase</Label>
                        <Input
                        id="quantity"
                        type="number"
                        value={quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        max={sellerInfo.cylindersAvailable} 
                        className="mt-1 text-lg p-2"
                        />
                        {quantity > (sellerInfo.cylindersAvailable || 0) && <p className="text-xs text-destructive mt-1">Requested quantity exceeds available stock.</p>}
                    </div>

                    <div>
                        <Label htmlFor="buyerAddress" className="text-base font-medium">Your Delivery Address</Label>
                        <Textarea
                            id="buyerAddress"
                            placeholder="123 Main St, Anytown, USA 12345"
                            value={buyerAddress}
                            onChange={(e) => setBuyerAddress(e.target.value)}
                            className="mt-1"
                            rows={3}
                        />
                         <p className="text-xs text-muted-foreground mt-1">Confirm or update your delivery address. This will be saved to your profile if this field is filled.</p>
                    </div>


                    <div className="space-y-3 pt-4 border-t">
                        <h3 className="text-lg font-semibold flex items-center"><CreditCard className="mr-2 h-5 w-5 text-primary"/>Payment Details</h3>
                        <div>
                        <Label htmlFor="cardNumber">Card Number</Label>
                        <Input id="cardNumber" name="cardNumber" type="text" placeholder="•••• •••• •••• ••••" value={paymentDetails.cardNumber} onChange={handlePaymentInputChange} className="mt-1"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="expirationDate">Expiry (MM/YY)</Label>
                            <Input id="expirationDate" name="expirationDate" type="text" placeholder="MM/YY" value={paymentDetails.expirationDate} onChange={handlePaymentInputChange} className="mt-1"/>
                        </div>
                        <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input id="cvv" name="cvv" type="text" placeholder="•••" value={paymentDetails.cvv} onChange={handlePaymentInputChange} className="mt-1"/>
                        </div>
                        </div>
                         <p className="text-xs text-muted-foreground">This is a simulated payment form. For demonstration purposes only.</p>
                    </div>
                </CardContent>

                <CardFooter className="px-0 pb-0 mt-auto">
                    <Button 
                        onClick={handlePurchase} 
                        disabled={isProcessingPayment || quantity <= 0 || quantity > (sellerInfo.cylindersAvailable || 0) } 
                        className="w-full text-lg py-3 bg-accent hover:bg-accent/80 text-accent-foreground"
                    >
                        {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CreditCard className="mr-2 h-5 w-5" />}
                        {isProcessingPayment ? "Processing..." : `Pay & Purchase ${quantity} Cylinder(s)`}
                    </Button>
                </CardFooter>
            </div>
        </div>
      </Card>
    </div>
  );
}

