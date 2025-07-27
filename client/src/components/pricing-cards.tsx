import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

interface PricingCardsProps {
  onGetStarted: () => void;
  currentTier?: string;
  onUpgrade?: (tier: string) => void;
}

export function PricingCards({ onGetStarted, currentTier, onUpgrade }: PricingCardsProps) {
  const plans = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "",
      description: "Perfect for trying out the platform",
      features: [
        { text: "5 lifetime applications", included: true },
        { text: "AI resume tailoring", included: true },
        { text: "AI cover letter generation", included: true },
        { text: "PDF & Word downloads", included: true },
        { text: "No application history", included: false },
        { text: "Interview preparation", included: false },
      ],
      buttonText: "Get Started Free",
      buttonVariant: "outline" as const,
      popular: false,
    },
    {
      id: "standard",
      name: "Standard",
      price: "$1",
      period: "Per year • Best for active job seekers",
      description: "Most Popular",
      features: [
        { text: "Unlimited applications", included: true },
        { text: "180-day application history", included: true },
        { text: "Interview progress tracking", included: true },
        { text: "AI interview coaching", included: true },
        { text: "All Free features", included: true },
        { text: "Job search automation", included: false },
      ],
      buttonText: "Start Standard Plan",
      buttonVariant: "default" as const,
      popular: true,
    },
    {
      id: "premium",
      name: "Premium",
      price: "$2",
      period: "Per year • For serious professionals",
      description: "",
      features: [
        { text: "Lifetime application history", included: true },
        { text: "Automated job searching", included: true },
        { text: "Custom search criteria", included: true },
        { text: "Direct application submission", included: true },
        { text: "All Standard features", included: true },
        { text: "Priority support", included: true },
      ],
      buttonText: "Start Premium Plan",
      buttonVariant: "secondary" as const,
      popular: false,
    },
  ];

  const handlePlanSelect = (planId: string) => {
    console.log(`Plan selected: ${planId}, Current tier: ${currentTier}`);
    if (planId === "free") {
      onGetStarted();
    } else if (onUpgrade) {
      console.log(`Calling onUpgrade with: ${planId}`);
      onUpgrade(planId);
    } else {
      console.log(`No onUpgrade function, calling onGetStarted`);
      onGetStarted();
    }
  };

  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {plans.map((plan) => (
        <Card 
          key={plan.id}
          className={`relative hover:shadow-lg transition-shadow ${
            plan.popular ? 'border-2 border-primary' : 'border-2 border-neutral-200'
          } ${currentTier === plan.id ? 'ring-2 ring-primary' : ''}`}
        >
          {plan.popular && (
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-primary text-white px-4 py-1 text-sm font-medium">
                Most Popular
              </Badge>
            </div>
          )}
          
          {currentTier === plan.id && (
            <div className="absolute -top-4 right-4">
              <Badge className="bg-accent text-white px-3 py-1 text-xs font-medium">
                Current Plan
              </Badge>
            </div>
          )}

          <CardHeader className="text-center pb-8 pt-8">
            <CardTitle className="text-2xl font-bold text-neutral-900 mb-2">
              {plan.name}
            </CardTitle>
            <div className="mb-2">
              <span className="text-4xl font-bold text-neutral-900">{plan.price}</span>
            </div>
            <p className="text-neutral-600 text-sm">{plan.period}</p>
            {plan.description && (
              <p className="text-neutral-600 mt-2">{plan.description}</p>
            )}
          </CardHeader>

          <CardContent className="px-8 pb-8">
            <ul className="space-y-4 mb-8">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center">
                  {feature.included ? (
                    <Check className="h-5 w-5 text-accent mr-3 flex-shrink-0" />
                  ) : (
                    <X className="h-5 w-5 text-neutral-400 mr-3 flex-shrink-0" />
                  )}
                  <span className={feature.included ? "text-neutral-700" : "text-neutral-400"}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <Button
              className={`w-full py-3 font-semibold transition-colors ${
                plan.buttonVariant === "default" 
                  ? "bg-primary hover:bg-secondary text-white"
                  : plan.buttonVariant === "secondary"
                  ? "bg-accent hover:bg-green-600 text-white"
                  : "bg-neutral-200 hover:bg-neutral-300 text-neutral-700"
              }`}
              onClick={() => handlePlanSelect(plan.id)}
              disabled={currentTier === plan.id}
            >
              {currentTier === plan.id ? "Current Plan" : plan.buttonText}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
