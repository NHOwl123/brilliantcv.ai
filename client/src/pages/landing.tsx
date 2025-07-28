import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PricingCards } from "@/components/pricing-cards";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bot, 
  FileText, 
  Search, 
  TrendingUp, 
  Download, 
  Users,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Target
} from "lucide-react";

export default function Landing() {
  const { isAuthenticated } = useAuth();

  const handleLogin = () => {
    // Demo mode for Vercel - skip login
    const isVercelDemo = window.location.hostname.includes('brilliantcv.ai') || window.location.hostname.includes('vercel.app');
    if (isVercelDemo) {
      window.location.href = "/dashboard";
      return;
    }
    window.location.href = "/dashboard";
  };

  const handleGetStarted = () => {
    // Demo mode for Vercel - always go to dashboard
    const isVercelDemo = window.location.hostname.includes('brilliantcv.ai') || window.location.hostname.includes('vercel.app');
    if (isVercelDemo || isAuthenticated) {
      window.location.href = "/dashboard";
      return;
    }
    window.location.href = "/dashboard";
  };

  const handleSubscriptionSelect = (tier: string) => {
    // Demo mode for Vercel
    const isVercelDemo = window.location.hostname.includes('brilliantcv.ai') || window.location.hostname.includes('vercel.app');
    
    if (tier === "free") {
      handleGetStarted();
      return;
    }
    
    if (isVercelDemo) {
      // For demo mode, simulate subscription selection
      localStorage.setItem("selectedTier", tier);
      window.location.href = "/dashboard";
      return;
    }
    
    if (!isAuthenticated) {
      // Store selected tier in localStorage and redirect to dashboard
      localStorage.setItem("selectedTier", tier);
      window.location.href = "/dashboard";
    } else {
      // User is authenticated, redirect to subscription page with tier
      window.location.href = `/subscription?tier=${tier}`;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-neutral-200 fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-primary">Orbial</h1>
              <div className="hidden md:block ml-10">
                <div className="flex items-baseline space-x-8">
                  <a href="#features" className="text-neutral-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors">Features</a>
                  <a href="#pricing" className="text-neutral-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors">Pricing</a>
                  <a href="#how-it-works" className="text-neutral-700 hover:text-primary px-3 py-2 text-sm font-medium transition-colors">How it Works</a>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
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
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-neutral-900 mb-6">
              AI-Powered Resume <span className="text-primary">Tailoring</span> for Every Job
            </h1>
            <p className="text-xl text-neutral-600 mb-8 max-w-3xl mx-auto">
              Stop sending generic resumes. Our AI analyzes job descriptions and crafts personalized resumes and cover letters that get you noticed by recruiters and hiring managers.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={handleLogin}
                className="bg-primary hover:bg-secondary px-8 py-4 text-lg font-semibold shadow-lg"
              >
                Start Free Trial
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border-2 border-primary text-primary hover:bg-primary hover:text-white px-8 py-4 text-lg font-semibold"
              >
                Watch Demo
              </Button>
            </div>
            <p className="text-sm text-neutral-500 mt-4">Free tier includes 5 applications • No credit card required</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Everything You Need to Land Your Dream Job</h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Comprehensive tools designed specifically for finance professionals, with global expansion in mind.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6">
                  <Bot className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">AI Resume Tailoring</h3>
                <p className="text-neutral-600">Advanced AI analyzes job descriptions and automatically optimizes your resume to match specific requirements and keywords.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-6">
                  <FileText className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Smart Cover Letters</h3>
                <p className="text-neutral-600">Generate personalized cover letters that highlight your relevant experience and demonstrate genuine interest in each position.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-6">
                  <Search className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Job Search Automation</h3>
                <p className="text-neutral-600">Premium users get automated job searching that finds relevant positions based on your preferences and criteria.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center mb-6">
                  <TrendingUp className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Application Tracking</h3>
                <p className="text-neutral-600">Keep track of all your applications, interview progress, and receive personalized interview coaching tips.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-accent rounded-lg flex items-center justify-center mb-6">
                  <Download className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Multiple Formats</h3>
                <p className="text-neutral-600">Download your tailored resumes and cover letters in both PDF and Word formats for maximum compatibility.</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center mb-6">
                  <Users className="text-white h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">Interview Preparation</h3>
                <p className="text-neutral-600">Get AI-powered interview coaching with likely questions and suggested answers tailored to your specific applications.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">How It Works</h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Get started in minutes and transform your job application process.</p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">Create Your Profile</h3>
              <p className="text-neutral-600">Build a comprehensive profile with your work experience, skills, education, and achievements. Import from LinkedIn or upload existing resumes.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">Input Job Description</h3>
              <p className="text-neutral-600">Paste the job description or provide a link. Our AI will analyze the requirements and identify key matching opportunities.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">AI Generates Documents</h3>
              <p className="text-neutral-600">Watch as our AI crafts a perfectly tailored resume and personalized cover letter optimized for the specific position.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-white text-xl font-bold">4</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">Download & Apply</h3>
              <p className="text-neutral-600">Download your documents in PDF or Word format and submit your application with confidence. Track your progress in the dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">Choose Your Plan</h2>
            <p className="text-xl text-neutral-600 max-w-2xl mx-auto">Start free and upgrade as your job search accelerates.</p>
          </div>

          <PricingCards 
            onGetStarted={handleGetStarted} 
            onUpgrade={handleSubscriptionSelect}
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-neutral-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <h3 className="text-2xl font-bold mb-4">Orbial</h3>
              <p className="text-neutral-300 mb-6 max-w-md">
                Empowering finance professionals worldwide with AI-powered resume tailoring and job application tools. Land your dream role with applications that get noticed.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-neutral-300 hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="text-neutral-300 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Templates</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-neutral-300 hover:text-white transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-neutral-800 mt-12 pt-8 text-center text-neutral-400">
            <p>&copy; 2024 Orbial, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
