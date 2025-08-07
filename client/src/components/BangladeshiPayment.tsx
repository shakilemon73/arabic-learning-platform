import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Phone, CreditCard, Wallet } from "lucide-react";

interface BangladeshiPaymentProps {
  userId: string;
  onPaymentSuccess: () => void;
}

export default function BangladeshiPayment({ userId, onPaymentSuccess }: BangladeshiPaymentProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("bkash");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const { toast } = useToast();

  // bKash payment mutation
  const bkashPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/bkash/create-payment", { userId });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.bkashURL) {
        // Redirect to bKash payment page
        window.open(data.bkashURL, '_blank');
        toast({
          title: "পেমেন্ট শুরু হয়েছে",
          description: "bKash পেজে পেমেন্ট সম্পন্ন করুন। সফল হলে আপনার কোর্স সক্রিয় হবে।",
        });
      } else {
        throw new Error(data.message || "bKash payment creation failed");
      }
    },
    onError: (error) => {
      toast({
        title: "পেমেন্ট ব্যর্থ",
        description: "bKash পেমেন্ট তৈরি করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    },
  });

  // Manual payment verification mutation (for Nagad/Rocket)
  const manualPaymentMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/manual-payment", {
        userId,
        paymentMethod,
        transactionId,
        amount: 600,
        phoneNumber,
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "পেমেন্ট জমা দেওয়া হয়েছে",
          description: "আপনার পেমেন্ট যাচাইয়ের জন্য জমা দেওয়া হয়েছে। ২৪ ঘণ্টার মধ্যে নিশ্চিত করা হবে।",
        });
        setTransactionId("");
        setPhoneNumber("");
      } else {
        throw new Error(data.message || "Manual payment submission failed");
      }
    },
    onError: (error) => {
      toast({
        title: "পেমেন্ট জমা দিতে ব্যর্থ",
        description: "সব তথ্য সঠিকভাবে দিয়েছেন কিনা দেখুন এবং আবার চেষ্টা করুন।",
        variant: "destructive",
      });
    },
  });

  const handlePayment = () => {
    if (paymentMethod === "bkash") {
      bkashPaymentMutation.mutate();
    } else {
      if (!phoneNumber || !transactionId) {
        toast({
          title: "তথ্য অসম্পূর্ণ",
          description: "অনুগ্রহ করে মোবাইল নম্বর এবং ট্রানজেকশন আইডি দিন।",
          variant: "destructive",
        });
        return;
      }
      manualPaymentMutation.mutate();
    }
  };

  const paymentMethods = [
    {
      id: "bkash",
      name: "bKash",
      description: "স্বয়ংক্রিয় পেমেন্ট",
      icon: Wallet,
      color: "text-pink-600",
      available: true
    },
    {
      id: "nagad",
      name: "Nagad",
      description: "ম্যানুয়াল যাচাই",
      icon: CreditCard,
      color: "text-orange-600",
      available: true
    },
    {
      id: "rocket",
      name: "Rocket",
      description: "ম্যানুয়াল যাচাই",
      icon: Phone,
      color: "text-purple-600",
      available: true
    }
  ];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-bold text-gray-900 dark:text-white">
          কোর্স ফি পরিশোধ
        </CardTitle>
        <CardDescription className="text-lg font-semibold text-green-600">
          ৬০০ টাকা
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Payment Method Selection */}
        <div>
          <Label className="text-base font-medium mb-4 block">পেমেন্ট পদ্ধতি নির্বাচন করুন</Label>
          <RadioGroup
            value={paymentMethod}
            onValueChange={setPaymentMethod}
            className="grid gap-3"
          >
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center space-x-3">
                <RadioGroupItem value={method.id} id={method.id} />
                <Label
                  htmlFor={method.id}
                  className={`flex-1 flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                    paymentMethod === method.id ? 'border-green-500 bg-green-50 dark:bg-green-950' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <method.icon className={`w-6 h-6 ${method.color}`} />
                  <div className="flex-1">
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{method.description}</div>
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <Separator />

        {/* bKash Instructions */}
        {paymentMethod === "bkash" && (
          <div className="space-y-3">
            <div className="bg-pink-50 dark:bg-pink-950 p-4 rounded-lg">
              <h3 className="font-medium text-pink-800 dark:text-pink-200 mb-2">bKash পেমেন্ট নির্দেশনা:</h3>
              <ol className="text-sm text-pink-700 dark:text-pink-300 space-y-1 list-decimal list-inside">
                <li>"পেমেন্ট করুন" বাটনে ক্লিক করুন</li>
                <li>bKash পেজে ৬০০ টাকা পেমেন্ট সম্পন্ন করুন</li>
                <li>সফল পেমেন্টের পর আপনার কোর্স সক্রিয় হবে</li>
              </ol>
            </div>
          </div>
        )}

        {/* Manual Payment Form for Nagad/Rocket */}
        {(paymentMethod === "nagad" || paymentMethod === "rocket") && (
          <div className="space-y-4">
            <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
              <h3 className="font-medium text-orange-800 dark:text-orange-200 mb-2">
                {paymentMethod === "nagad" ? "Nagad" : "Rocket"} পেমেন্ট নির্দেশনা:
              </h3>
              <ol className="text-sm text-orange-700 dark:text-orange-300 space-y-1 list-decimal list-inside">
                <li>আপনার {paymentMethod === "nagad" ? "Nagad" : "Rocket"} অ্যাপে যান</li>
                <li>Send Money অপশনে ক্লিক করুন</li>
                <li>আমাদের নম্বরে ৬০০ টাকা পাঠান: <strong>01XXXXXXXXX</strong></li>
                <li>পেমেন্ট সম্পন্ন হওয়ার পর নিচের ফর্ম পূরণ করুন</li>
              </ol>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="phoneNumber">আপনার মোবাইল নম্বর</Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="01XXXXXXXXX"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="transactionId">ট্রানজেকশন আইডি</Label>
                <Input
                  id="transactionId"
                  type="text"
                  placeholder="TXN123456789"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Payment Button */}
        <Button
          onClick={handlePayment}
          disabled={bkashPaymentMutation.isPending || manualPaymentMutation.isPending}
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 text-lg"
        >
          {bkashPaymentMutation.isPending || manualPaymentMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              প্রক্রিয়াকরণ...
            </>
          ) : (
            <>
              {paymentMethod === "bkash" ? "bKash দিয়ে পেমেন্ট করুন" : "পেমেন্ট যাচাইয়ের জন্য জমা দিন"}
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          পেমেন্টে কোনো সমস্যা হলে আমাদের সাথে যোগাযোগ করুন
        </p>
      </CardContent>
    </Card>
  );
}