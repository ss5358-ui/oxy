"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext'; // We'll create this context
import { LogOut, User, ShoppingCart, Activity, ShieldCheck, Building, MapPin, TrendingUp, Users, LogIn, UserPlus, ListOrdered } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary hover:opacity-80 transition-opacity flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 12l4-4M12 12l-4 4M12 12l4 4M12 12l-4-4"/><path d="M12 6v0M12 18v0M18 12h0M6 12h0"/></svg>
          oxylink
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : user ? (
            <>
              {user.role === 'buyer' && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard"> <MapPin className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Find Cylinders</span></Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard/buyer/my-orders"> <ListOrdered className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">My Orders</span></Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/profile"> <User className="mr-0 sm:mr-2 h-4 w-4" />  <span className="hidden sm:inline">Profile</span></Link>
                  </Button>
                </>
              )}
              {user.role === 'seller' && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard"> <Building className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Dashboard</span></Link>
                  </Button>
                   <Button variant="ghost" asChild>
                    <Link href="/profile"> <User className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Profile & Stock</span></Link>
                  </Button>
                </>
              )}
              {user.role === 'admin' && (
                <>
                  <Button variant="ghost" asChild>
                    <Link href="/dashboard"> <ShieldCheck className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Admin Panel</span></Link>
                  </Button>
                  <Button variant="ghost" asChild>
                    <Link href="/admin/sellers"> <Users className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Sellers</span></Link>
                  </Button>
                </>
              )}
              <Button variant="outline" onClick={handleLogout} size="sm">
                <LogOut className="mr-0 sm:mr-2 h-4 w-4" /> <span className="hidden sm:inline">Logout</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="outline">
                <Link href="/login"><LogIn className="mr-0 sm:mr-2 h-4 w-4" /> Login</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register"><UserPlus className="mr-0 sm:mr-2 h-4 w-4" /> Register</Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
