import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export function useAuth() {
  // Demo mode for Vercel deployment until API functions are working
  const isVercelDemo = window.location.hostname.includes('brilliantcv.ai') || window.location.hostname.includes('vercel.app');
  
  const { data: user, isLoading } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    queryFn: isVercelDemo ? 
      // Demo user for Vercel deployment
      async () => ({
  id: 'demo-user-123',
  email: 'demo@brilliantcv.ai',
  firstName: 'Demo',
  lastName: 'User',
  profileImageUrl: null,
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  subscriptionTier: 'free' as const,
  subscriptionStatus: 'active' as const,
  applicationCount: 0,
  createdAt: new Date(),
  updatedAt: new Date()
}):
      // Normal API call for Replit
      getQueryFn({ on401: "returnNull" }),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    user,
    isLoading: isVercelDemo ? false : isLoading,
    isAuthenticated: isVercelDemo ? true : !!user,
  };
}
