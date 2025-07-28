import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Navigation } from "@/components/navigation";
import { 
  Plus, 
  User, 
  Search, 
  TrendingUp, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  applicationStatus: string;
  appliedDate: string;
  interviewDate?: string;
}

export default function Dashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();

  const { data: applications, isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    }
  }, [user, isLoading, toast]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied': return 'bg-yellow-100 text-yellow-800';
      case 'interview': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'offer': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'applied': return <Clock className="h-4 w-4" />;
      case 'interview': return <Calendar className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      case 'offer': return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const recentApplications = applications?.slice(0, 3) || [];
  const applicationCount = user.applicationCount || 0;
  const interviewCount = applications?.filter(app => app.applicationStatus === 'interview').length || 0;
  const responseRate = applications?.length ? Math.round((interviewCount / applications.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="pt-16">
        {/* Dashboard Header */}
        <div className="bg-gradient-to-r from-primary to-secondary text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">
                  Welcome back, {user.firstName || 'User'}!
                </h1>
                <p className="text-blue-100 mt-2">
                  {user.subscriptionTier === 'free' ? 'Free Plan' : 
                   user.subscriptionTier === 'standard' ? 'Standard Plan' : 'Premium Plan'}
                  {user.subscriptionTier === 'free' && (
                    <span className="ml-2">• {5 - applicationCount} applications remaining</span>
                  )}
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{applicationCount}</div>
                <div className="text-blue-100">Total Applications</div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Quick Stats */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900">Recent Activity</h3>
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Applications Sent</span>
                    <span className="font-semibold">{applicationCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Interviews Scheduled</span>
                    <span className="font-semibold text-accent">{interviewCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Response Rate</span>
                    <span className="font-semibold">{responseRate}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Applications */}
            <Card className="md:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-neutral-900">Recent Applications</h3>
                  <Link href="/applications">
                    <Button variant="ghost" size="sm" className="text-primary hover:text-secondary">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {applicationsLoading ? (
                    <div className="text-center py-4">
                      <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                    </div>
                  ) : recentApplications.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-neutral-300" />
                      <p>No applications yet</p>
                      <p className="text-sm">Create your first application to get started</p>
                    </div>
                  ) : (
                    recentApplications.map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div>
                          <h4 className="font-medium text-neutral-900">{app.jobTitle}</h4>
                          <p className="text-sm text-neutral-600">
                            {app.company} • Applied {new Date(app.appliedDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(app.applicationStatus)}`}>
                          {getStatusIcon(app.applicationStatus)}
                          {app.applicationStatus.charAt(0).toUpperCase() + app.applicationStatus.slice(1)}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/generate-application">
              <Button className="bg-primary hover:bg-secondary text-white flex items-center gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Create New Application
              </Button>
            </Link>
            <Link href="/profile-setup">
              <Button variant="outline" className="border-2 border-primary text-primary hover:bg-primary hover:text-white flex items-center gap-2 w-full sm:w-auto">
                <User className="h-4 w-4" />
                Edit Profile
              </Button>
            </Link>
            {user.subscriptionTier === 'premium' && (
              <Button variant="outline" className="border-2 border-accent text-accent hover:bg-accent hover:text-white flex items-center gap-2 w-full sm:w-auto">
                <Search className="h-4 w-4" />
                Find Jobs
              </Button>
            )}
          </div>

          {/* Upgrade prompt for free users */}
          {user.subscriptionTier === 'free' && applicationCount >= 3 && (
            <Card className="mt-8 border-primary/20 bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-neutral-900 mb-2">
                      Running low on applications
                    </h3>
                    <p className="text-neutral-600">
                      You have {5 - applicationCount} applications remaining. Upgrade to continue with unlimited applications.
                    </p>
                  </div>
                  <Link href="/subscription">
                    <Button className="bg-primary hover:bg-secondary">
                      Upgrade Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
