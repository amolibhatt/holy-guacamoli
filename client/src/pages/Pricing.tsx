import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Sparkles, Zap, PartyPopper, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const PLANS = [
  {
    id: "pro_monthly",
    name: "Pro Monthly",
    price: 199,
    period: "month",
    description: "Perfect for regular game nights",
    features: [
      "Unlimited games per month",
      "All game types access",
      "Priority support",
      "Custom branding options",
      "Advanced analytics",
    ],
    popular: false,
    icon: Sparkles,
    gradient: "from-violet-100 via-purple-100 to-indigo-100",
    borderColor: "border-violet-300",
    buttonVariant: "outline" as const,
  },
  {
    id: "pro_yearly",
    name: "Pro Yearly",
    price: 1499,
    period: "year",
    savings: "Save ₹889",
    description: "Best value for party enthusiasts",
    features: [
      "Everything in Pro Monthly",
      "2 months free",
      "Early access to new games",
      "VIP Discord access",
      "Exclusive starter packs",
    ],
    popular: true,
    icon: Crown,
    gradient: "from-amber-100 via-yellow-100 to-orange-100",
    borderColor: "border-amber-400",
    buttonVariant: "default" as const,
  },
  {
    id: "party_pack",
    name: "Party Pack",
    price: 499,
    period: "one-time",
    description: "One epic party, no commitment",
    features: [
      "Unlimited games for 24 hours",
      "All game types access",
      "Up to 50 players",
      "Perfect for events",
      "No subscription needed",
    ],
    popular: false,
    icon: PartyPopper,
    gradient: "from-emerald-100 via-teal-100 to-cyan-100",
    borderColor: "border-emerald-300",
    buttonVariant: "outline" as const,
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: subscription } = useQuery<any>({
    queryKey: ["/api/razorpay/subscription"],
    enabled: !!user,
  });

  const createOrderMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await apiRequest("POST", "/api/razorpay/create-order", { planId });
      return res.json();
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/razorpay/verify-payment", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment Successful!",
        description: "Welcome to Pro! Your subscription is now active.",
      });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({
        title: "Payment verification failed",
        description: error.message || "Please contact support",
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      toast({
        title: "Please log in first",
        description: "You need to be logged in to subscribe",
        variant: "destructive",
      });
      setLocation("/auth");
      return;
    }

    setLoadingPlan(planId);

    try {
      const order = await createOrderMutation.mutateAsync(planId);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "Holy GuacAmoli!",
        description: order.planName,
        order_id: order.orderId,
        prefill: {
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
        },
        theme: {
          color: "#8B5CF6",
        },
        handler: function (response: any) {
          verifyPaymentMutation.mutate({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            planId: order.planId,
          });
        },
        modal: {
          ondismiss: function () {
            setLoadingPlan(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error: any) {
      toast({
        title: "Failed to create order",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planId: string) => {
    if (!subscription) return false;
    return subscription.plan === planId.replace("_monthly", "").replace("_yearly", "");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-pink-50 to-amber-50">
      <div className="container max-w-5xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="mb-8"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Unlock unlimited games and premium features for unforgettable party experiences
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = isCurrentPlan(plan.id);
            const isLoading = loadingPlan === plan.id;

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden bg-gradient-to-br ${plan.gradient} ${plan.borderColor} border-2 ${
                  plan.popular ? "ring-2 ring-amber-400 shadow-lg scale-105" : ""
                }`}
                data-testid={`card-plan-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-amber-500 hover:bg-amber-500 text-white">
                      Most Popular
                    </Badge>
                  </div>
                )}

                {plan.savings && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                      {plan.savings}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-white/50">
                      <Icon className="w-6 h-6 text-violet-600" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">₹{plan.price}</span>
                    <span className="text-muted-foreground">
                      /{plan.period}
                    </span>
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className="w-full"
                    variant={plan.buttonVariant}
                    disabled={isCurrent || isLoading}
                    onClick={() => handleSubscribe(plan.id)}
                    data-testid={`button-subscribe-${plan.id}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Get Started
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Secure payments powered by Razorpay. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}
