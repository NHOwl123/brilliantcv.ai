import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { PricingCards } from "@/components/pricing-cards";
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle,
  Crown,
  Zap
} from "lucide-react";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || "");

interface SubscribeFormProps {
  tier: string;
  onSuccess: () => void;
  onCancel: () => void;
}

function SubscribeForm({ tier, onSuccess, onCancel }: SubscribeFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      console.error('Stripe or Elements not loaded');
      return;
    }

    setIsLoading(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/subscription?success=true`,
        },
        redirect: 'if_required'
      });

      if (error) {
        console.error('Payment error:', error);
        toast({
          title: "Payment Failed",
          description: error.message || "An unexpected error occurred during payment",
          variant: "destructive",
        });
        setIsLoading(false);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', paymentIntent);
        
        // Notify server of successful payment
        try {
          await apiRequest("POST", "/api/payment-success", { 
            paymentIntentId: paymentIntent.id 
          });
        } catch (error) {
          console.error('Failed to notify server of payment success:', error);
        }
        
        toast({
          title: "Payment Successful!",
          description: "Your subscription is now active.",
        });
        onSuccess();
      } else {
        console.log('Payment status:', paymentIntent?.status);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to process payment. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Subscribe to {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <PaymentElement />
          <div className="flex gap-3">
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-secondary"
              disabled={!stripe || isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Processing...
                </>
              ) : (
                `Subscribe to ${tier.charAt(0).toUpperCase() + tier.slice(1)}`
              )}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function Subscription() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string>("");

  // Check authentication and force refresh user data
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
    
    // Force cache invalidation to get fresh user data
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
  }, [user, authLoading, toast, queryClient]);

  // Check for success parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      toast({
        title: "Subscription Successful!",
        description: "Welcome to your new plan. Your subscription is now active.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Clean up URL
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [toast, queryClient]);

  const createSubscriptionMutation = useMutation({
    mutationFn: async (tier: string) => {
      const response = await apiRequest("POST", "/api/create-subscription", { tier });
      return await response.json();
    },
    onSuccess: (data) => {
      console.log('Subscription creation response:', data);
      console.log('Client secret received:', data.clientSecret);
      
      // Handle immediate upgrade (no payment needed)
      if (data.upgraded) {
        toast({
          title: "Upgrade Successful!",
          description: data.message || "Your subscription has been upgraded.",
        });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        setSelectedTier(null);
        return;
      }
      
      setClientSecret(data.clientSecret);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: "Failed to create subscription. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  const downgradeSubscriptionMutation = useMutation({
    mutationFn: async (tier: string) => {
  // Demo mode for Vercel deployment
  const isVercelDemo = window.location.hostname.includes('brilliantcv.ai') || window.location.hostname.includes('vercel.app');
  if (isVercelDemo) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return {
      clientSecret: 'pi_demo_client_secret_for_testing_' + Math.random().toString(36).substring(7)
    };
  }
  
  const response = await apiRequest("POST", "/api/create-subscription", { tier });
  return await response.json();
},
    onSuccess: (data) => {
      if (data.resetToFree) {
        toast({
          title: "Subscription Reset",
          description: "Your incomplete subscription was cancelled. You can now create a new subscription.",
        });
      } else {
        toast({
          title: "Downgrade Successful!",
          description: `You've been downgraded to ${data.tier}. Any credit will be applied to your next bill.`,
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to downgrade subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/cancel-subscription");
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Cancellation Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = (tier: string) => {
    console.log(`handleUpgrade called with tier: ${tier}`);
    setSelectedTier(tier);
    console.log(`About to create subscription mutation for: ${tier}`);
    createSubscriptionMutation.mutate(tier);
  };

  const handleDowngrade = (tier: string) => {
    console.log(`handleDowngrade called with tier: ${tier}`);
    downgradeSubscriptionMutation.mutate(tier);
  };

  const handleCancel = () => {
    setSelectedTier(null);
    setClientSecret("");
  };

  const handleSubscriptionSuccess = () => {
    setSelectedTier(null);
    setClientSecret("");
    toast({
      title: "Subscription Successful!",
      description: "Welcome to your new plan. Redirecting to dashboard...",
    });
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setTimeout(() => {
      window.location.href = "/dashboard";
    }, 2000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-neutral-900 mb-4">
              Subscription Management
            </h1>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">
              Choose the plan that best fits your job search needs.
            </p>
          </div>

          {/* Current Plan Status */}
          {user && (
            <Card className="mb-12 max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {user.subscriptionTier === 'premium' ? (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  ) : user.subscriptionTier === 'standard' ? (
                    <Zap className="h-5 w-5 text-blue-500" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-gray-500" />
                  )}
                  Current Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold capitalize">
                      {user.subscriptionTier || 'free'} Plan
                    </h3>
                    <p className="text-neutral-600">
                      {user.subscriptionTier === 'free' 
                        ? `${5 - (user.applicationCount || 0)} applications remaining`
                        : user.subscriptionStatus === 'active' 
                        ? 'Active subscription'
                        : 'Subscription cancelled'
                      }
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge 
                      className={`capitalize ${
                        user.subscriptionTier === 'premium' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : user.subscriptionTier === 'standard'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.subscriptionTier || 'free'}
                    </Badge>
                    {user.subscriptionTier === 'premium' && user.subscriptionStatus === 'active' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDowngrade('standard')}
                        disabled={downgradeSubscriptionMutation.isPending}
                      >
                        {downgradeSubscriptionMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full mr-2" />
                            Processing...
                          </>
                        ) : (
                          "Downgrade to Standard"
                        )}
                      </Button>
                    )}
                    {user.subscriptionTier === 'standard' && user.subscriptionStatus === 'active' && (
                      <div className="text-sm text-neutral-600">
                        Need to upgrade? Select Premium plan below
                      </div>
                    )}
                    {user.subscriptionTier !== 'free' && user.subscriptionStatus === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => cancelSubscriptionMutation.mutate()}
                        disabled={cancelSubscriptionMutation.isPending}
                      >
                        {cancelSubscriptionMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Cancelling...
                          </>
                        ) : (
                          "Cancel Subscription"
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Form or Pricing Cards */}
          {selectedTier && clientSecret ? (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#2563EB',
                  }
                }
              }}
            >
              <SubscribeForm 
                tier={selectedTier} 
                onSuccess={handleSubscriptionSuccess}
                onCancel={handleCancel}
              />
            </Elements>
          ) : (
            <PricingCards 
              currentTier={user?.subscriptionTier || 'free'}
              onGetStarted={() => window.location.href = "/dashboard"}
              onUpgrade={handleUpgrade}
            />
          )}

          {/* Loading State */}
          {createSubscriptionMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mr-3" />
              <span className="text-neutral-600">Setting up your subscription...</span>
            </div>
          )}

          {/* Benefits Reminder */}
          <div className="mt-16 text-center">
            <h2 className="text-2xl font-bold text-neutral-900 mb-8">
              Why Upgrade?
            </h2>
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">Unlimited Applications</h3>
                <p className="text-neutral-600 text-sm">
                  Apply to as many jobs as you want without restrictions.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">Interview Preparation</h3>
                <p className="text-neutral-600 text-sm">
                  Get AI-powered interview coaching and practice questions.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-2">Job Search Automation</h3>
                <p className="text-neutral-600 text-sm">
                  Let AI find and apply to relevant jobs automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
