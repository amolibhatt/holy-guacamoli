import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0f]">
      <Card className="w-full max-w-md mx-4 bg-white/5 border-white/10">
        <CardContent className="pt-6 text-center">
          <div className="flex flex-col items-center gap-3 mb-6">
            <AlertCircle className="h-12 w-12 text-amber-500" />
            <h1 className="text-2xl font-bold text-white">Page Not Found</h1>
          </div>

          <p className="text-white/60 mb-6">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          
          <Link href="/">
            <Button className="bg-gradient-to-r from-lime-400 to-emerald-500 hover:from-lime-500 hover:to-emerald-600 text-black font-bold">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
