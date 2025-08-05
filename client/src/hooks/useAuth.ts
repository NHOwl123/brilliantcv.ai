import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useState, useEffect } from "react";

export function useAuth() {
  // Always use demo mode for now - simplify the logic
  const isVercelDemo = true; // Force demo mode until API is fully working
  const [isLoggedOut, setIsLoggedOut] = useState(false);
  
  // Check if user manually logged out
  useEffect(() => {
    const loggedOut = sessionStorage.getItem('demo-logged-out');
    if (loggedOut) {
      setIsLoggedOut(true);
    }
  }, []);
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: isVercelDemo ? 
      // Demo user for deployment
      async () => ({
        id: 'demo-user-123',
        email: 'demo@brilliantcv.ai',
        firstName: 'Demo',
        lastName: 'User',
        profileImageUrl: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        subscriptionTier: 'premium' as const,
        subscriptionStatus: 'active' as const,
        applicationCount: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      }) :
      // Normal API call for Replit
      getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    user: isLoggedOut ? null : user,
    isLoading: false, // Always false in demo mode
    isAuthenticated: !isLoggedOut, // False if user logged out
    logout: () => {
      sessionStorage.setItem('demo-logged-out', 'true');
      setIsLoggedOut(true);
    },
    login: () => {
      sessionStorage.removeItem('demo-logged-out');
      setIsLoggedOut(false);
    }
  };
}
