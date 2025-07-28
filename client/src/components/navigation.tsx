import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { 
  User, 
  FileText, 
  Settings, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";

export function Navigation() {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleLogin = () => {
    // Demo mode for Vercel - skip login
    const isVercelDemo = window.location.hostname.includes('brilliantcv.ai') || window.location.hostname.includes('vercel.app');
    if (isVercelDemo) {
      window.location.href = "/dashboard";
      return;
    }
    window.location.href = "/dashboard";
  };

  const isActive = (path: string) => {
    return location === path || (path !== "/" && location.startsWith(path));
  };

  const navItems = isAuthenticated ? [
    { path: "/", label: "Dashboard", icon: FileText },
    { path: "/profile-setup", label: "Profile", icon: User },
    { path: "/generate-application", label: "Generate", icon: FileText },
    { path: "/applications", label: "History", icon: FileText },
    { path: "/subscription", label: "Subscription", icon: Settings },
  ] : [];

  return (
    <nav className="bg-white shadow-sm border-b border-neutral-200 fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <h1 className="text-2xl font-bold text-primary cursor-pointer">Orbial</h1>
            </Link>
            
            {/* Desktop Navigation */}
            {isAuthenticated && (
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-8">
                  {navItems.map((item) => (
                    <Link key={item.path} href={item.path}>
                      <span className={`px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
                        isActive(item.path)
                          ? "text-primary border-b-2 border-primary"
                          : "text-neutral-700 hover:text-primary"
                      }`}>
                        {item.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3">
                  <div className="text-sm">
                    <p className="font-medium text-neutral-900">
                      {user?.firstName || user?.email || "User"}
                    </p>
                    <p className="text-neutral-500 capitalize">
                      {(user?.subscriptionTier === 'premium' && user?.subscriptionStatus === 'active') 
                        ? 'premium plan'
                        : (user?.subscriptionTier === 'standard' && user?.subscriptionStatus === 'active')
                        ? 'standard plan'
                        : 'free plan'}
                    </p>
                  </div>
                  {user?.profileImageUrl && (
                    <img
                      src={user.profileImageUrl}
                      alt="Profile"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-neutral-700 hover:text-primary"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="ghost" 
                  onClick={handleLogin}
                  className="text-neutral-700 hover:text-primary"
                >
                  Login
                </Button>
                <Button onClick={handleLogin} className="bg-primary hover:bg-secondary">
                  Get Started
                </Button>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-neutral-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {isAuthenticated ? (
              <>
                {navItems.map((item) => (
                  <Link key={item.path} href={item.path}>
                    <span
                      className={`block px-3 py-2 text-base font-medium transition-colors cursor-pointer ${
                        isActive(item.path)
                          ? "text-primary bg-primary/10"
                          : "text-neutral-700 hover:text-primary hover:bg-neutral-50"
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4 inline mr-2" />
                      {item.label}
                    </span>
                  </Link>
                ))}
                <div className="border-t border-neutral-200 pt-3 mt-3">
                  <div className="px-3 py-2">
                    <p className="font-medium text-neutral-900">
                      {user?.firstName || user?.email || "User"}
                    </p>
                    <p className="text-sm text-neutral-500 capitalize">
                      {user?.subscriptionTier || "free"} plan
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-neutral-700 hover:text-primary"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-2 px-3 py-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => {
                    handleLogin();
                    setMobileMenuOpen(false);
                  }}
                >
                  Login
                </Button>
                <Button
                  className="w-full bg-primary hover:bg-secondary"
                  onClick={() => {
                    handleLogin();
                    setMobileMenuOpen(false);
                  }}
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
