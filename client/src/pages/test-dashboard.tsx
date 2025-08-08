import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

export default function TestDashboard() {
  const testUser = {
    email: "test@example.com",
    first_name: "টেস্ট ব্যবহারকারী"
  };

  const clearTest = () => {
    localStorage.removeItem("fake-user");
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            স্বাগতম, {testUser.first_name}!
          </h1>
          <p className="text-gray-600">আপনার আরবি শিক্ষার যাত্রা শুরু করুন</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-islamic-green">কোর্স অগ্রগতি</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">৭৫%</div>
              <p className="text-sm text-gray-600">মোট কোর্স সম্পন্ন</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-islamic-green">সম্পন্ন পাঠ</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">১২</div>
              <p className="text-sm text-gray-600">মোট ১৬টি পাঠের মধ্যে</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-islamic-green">আগামী ক্লাস</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">৩</div>
              <p className="text-sm text-gray-600">আগামী সপ্তাহে</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-800">🎉 টেস্ট ড্যাশবোর্ড সফল!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-700 mb-4">
              অভিনন্দন! আপনি সফলভাবে ড্যাশবোর্ডে পৌঁছেছেন। এটি প্রমাণ করে যে লগইন এবং নেভিগেশন সিস্টেম কাজ করছে।
            </p>
            <div className="space-x-4">
              <Button className="bg-islamic-green hover:bg-islamic-green/90">
                লাইভ ক্লাসে যোগদান
              </Button>
              <Button variant="outline" onClick={clearTest}>
                টেস্ট শেষ করুন
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}