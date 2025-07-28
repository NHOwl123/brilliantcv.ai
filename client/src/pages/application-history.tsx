import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  Edit,
  Download,
  ExternalLink,
  MessageSquare,
  TrendingUp,
  Users,
  FileText,
  Target
} from "lucide-react";

interface Application {
  id: string;
  jobTitle: string;
  company: string;
  applicationStatus: string;
  appliedDate: string;
  interviewDate?: string;
  notes?: string;
  jobUrl?: string;
  resumeContent?: string;
  coverLetterContent?: string;
}

interface InterviewPrep {
  questions: string[];
  tips: string[];
  answers: Record<string, string>;
}

export default function ApplicationHistory() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [editingApp, setEditingApp] = useState<Application | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [editForm, setEditForm] = useState({
    applicationStatus: "",
    interviewDate: "",
    notes: ""
  });

  // Check authentication
  useEffect(() => {
    if (!authLoading && !user) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 500);
    }
  }, [user, authLoading, toast]);

  // Fetch applications
  const { data: applications = [], isLoading: applicationsLoading } = useQuery<Application[]>({
    queryKey: ["/api/applications"],
    retry: false,
  });

  // Update application mutation
  const updateApplicationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/applications/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Application Updated",
        description: "Application status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/applications"] });
      setEditingApp(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
        return;
      }
      toast({
        title: "Update Failed",
        description: "Failed to update application. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Interview prep mutation
  const getInterviewPrepMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const response = await apiRequest("POST", `/api/interview-prep/${applicationId}`);
      return await response.json();
    },
    onSuccess: (data) => {
      setInterviewPrep(data);
    },
    onError: (error) => {
      if (isUnauthorizedError(error as Error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
        return;
      }
      toast({
        title: "Interview Prep Failed",
        description: (error as Error).message.includes("requires") 
          ? "Interview preparation requires Standard or Premium subscription."
          : "Failed to generate interview preparation. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Download documents mutation
  const downloadMutation = useMutation({
    mutationFn: async ({ applicationId, format, type }: { applicationId: string; format: string; type: string }) => {
      const response = await apiRequest("POST", "/api/download-documents", {
        applicationId,
        format,
        type
      });
      return response;
    },
    onSuccess: (response) => {
      // Handle file download
      const url = window.URL.createObjectURL(new Blob([response.body]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application_documents.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download Started",
        description: "Your documents are being downloaded.",
      });
    },
    onError: (error) => {
      toast({
        title: "Download Failed",
        description: "Failed to download documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
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

  const stats = {
    total: applications.length,
    applied: applications.filter(app => app.applicationStatus === 'applied').length,
    interviews: applications.filter(app => app.applicationStatus === 'interview').length,
    offers: applications.filter(app => app.applicationStatus === 'offer').length,
    responseRate: applications.length > 0 
      ? Math.round(((applications.filter(app => app.applicationStatus === 'interview' || app.applicationStatus === 'offer').length) / applications.length) * 100)
      : 0
  };

  const handleEditSubmit = () => {
    if (!editingApp) return;
    
    updateApplicationMutation.mutate({
      id: editingApp.id,
      data: {
        ...editForm,
        interviewDate: editForm.interviewDate ? new Date(editForm.interviewDate).toISOString() : undefined
      }
    });
  };

  const openEditDialog = (app: Application) => {
    setEditingApp(app);
    setEditForm({
      applicationStatus: app.applicationStatus,
      interviewDate: app.interviewDate ? new Date(app.interviewDate).toISOString().split('T')[0] : "",
      notes: app.notes || ""
    });
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Application History</h1>
            <p className="text-neutral-600">Track your job applications and manage your job search progress.</p>
          </div>

          {/* Stats Overview */}
          <div className="grid md:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-neutral-900 mb-2">{stats.total}</div>
                <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                  <FileText className="h-4 w-4" />
                  Total Applications
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-600 mb-2">{stats.applied}</div>
                <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4" />
                  Pending
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">{stats.interviews}</div>
                <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Interviews
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">{stats.offers}</div>
                <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  Offers
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-primary mb-2">{stats.responseRate}%</div>
                <div className="text-sm text-neutral-600 flex items-center justify-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  Response Rate
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Applications List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Your Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                </div>
              ) : applications.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-neutral-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">No Applications Yet</h3>
                  <p className="text-neutral-600 mb-4">
                    {user?.subscriptionTier === 'free' 
                      ? "You haven't created any applications yet. Get started by generating your first tailored application."
                      : "Start building your application history by creating tailored applications for your target jobs."
                    }
                  </p>
                  <Button 
                    onClick={() => window.location.href = "/generate-application"}
                    className="bg-primary hover:bg-secondary"
                  >
                    Create First Application
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => (
                    <div key={app.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-xl font-semibold text-neutral-900">{app.jobTitle}</h3>
                            <Badge className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(app.applicationStatus)}`}>
                              {getStatusIcon(app.applicationStatus)}
                              {app.applicationStatus.charAt(0).toUpperCase() + app.applicationStatus.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-neutral-600 mb-2">{app.company}</p>
                          <div className="flex items-center gap-4 text-sm text-neutral-500">
                            <span>Applied: {new Date(app.appliedDate).toLocaleDateString()}</span>
                            {app.interviewDate && (
                              <span>Interview: {new Date(app.interviewDate).toLocaleDateString()}</span>
                            )}
                            {app.jobUrl && (
                              <a 
                                href={app.jobUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-primary hover:text-secondary"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Job
                              </a>
                            )}
                          </div>
                          {app.notes && (
                            <p className="text-sm text-neutral-600 mt-2 p-2 bg-neutral-50 rounded">
                              {app.notes}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => setSelectedApp(app)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>{app.jobTitle} at {app.company}</DialogTitle>
                              </DialogHeader>
                              <Tabs defaultValue="resume" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                  <TabsTrigger value="resume">Resume</TabsTrigger>
                                  <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
                                </TabsList>
                                <TabsContent value="resume" className="mt-4">
                                  <div className="max-h-96 overflow-y-auto bg-neutral-50 p-4 rounded-lg border">
                                    <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-sans">
                                      {app.resumeContent || "Resume content not available"}
                                    </pre>
                                  </div>
                                </TabsContent>
                                <TabsContent value="cover-letter" className="mt-4">
                                  <div className="max-h-96 overflow-y-auto bg-neutral-50 p-4 rounded-lg border">
                                    <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-sans">
                                      {app.coverLetterContent || "Cover letter content not available"}
                                    </pre>
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>

                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(app)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Update Application</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor="status">Application Status</Label>
                                  <select
                                    id="status"
                                    className="w-full p-2 border rounded-lg"
                                    value={editForm.applicationStatus}
                                    onChange={(e) => setEditForm({ ...editForm, applicationStatus: e.target.value })}
                                  >
                                    <option value="applied">Applied</option>
                                    <option value="interview">Interview Scheduled</option>
                                    <option value="rejected">Rejected</option>
                                    <option value="offer">Offer Received</option>
                                  </select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="interviewDate">Interview Date (optional)</Label>
                                  <Input
                                    id="interviewDate"
                                    type="date"
                                    value={editForm.interviewDate}
                                    onChange={(e) => setEditForm({ ...editForm, interviewDate: e.target.value })}
                                  />
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="notes">Notes</Label>
                                  <Textarea
                                    id="notes"
                                    placeholder="Add any notes about this application..."
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                                  />
                                </div>

                                <div className="flex gap-3">
                                  <Button 
                                    onClick={handleEditSubmit}
                                    disabled={updateApplicationMutation.isPending}
                                    className="bg-primary hover:bg-secondary"
                                  >
                                    {updateApplicationMutation.isPending ? (
                                      <>
                                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                        Updating...
                                      </>
                                    ) : (
                                      "Update Application"
                                    )}
                                  </Button>
                                  <Button variant="outline" onClick={() => setEditingApp(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadMutation.mutate({
                              applicationId: app.id,
                              format: 'pdf',
                              type: 'both'
                            })}
                            disabled={downloadMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>

                          {(user?.subscriptionTier === 'standard' || user?.subscriptionTier === 'premium') && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => getInterviewPrepMutation.mutate(app.id)}
                                >
                                  <MessageSquare className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Interview Preparation</DialogTitle>
                                </DialogHeader>
                                {getInterviewPrepMutation.isPending ? (
                                  <div className="text-center py-8">
                                    <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                                    <p>Generating interview preparation...</p>
                                  </div>
                                ) : interviewPrep ? (
                                  <Tabs defaultValue="questions" className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                      <TabsTrigger value="questions">Questions</TabsTrigger>
                                      <TabsTrigger value="tips">Tips</TabsTrigger>
                                      <TabsTrigger value="answers">Answers</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="questions" className="mt-4">
                                      <div className="space-y-3">
                                        {interviewPrep.questions.map((question, index) => (
                                          <div key={index} className="p-3 border rounded-lg">
                                            <h4 className="font-medium text-neutral-900 mb-1">Question {index + 1}</h4>
                                            <p className="text-neutral-700">{question}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </TabsContent>
                                    <TabsContent value="tips" className="mt-4">
                                      <div className="space-y-3">
                                        {interviewPrep.tips.map((tip, index) => (
                                          <div key={index} className="flex items-start gap-3 p-3 border rounded-lg">
                                            <Target className="h-5 w-5 text-accent mt-0.5" />
                                            <p className="text-neutral-700">{tip}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </TabsContent>
                                    <TabsContent value="answers" className="mt-4">
                                      <div className="space-y-4">
                                        {Object.entries(interviewPrep.answers).map(([question, answer], index) => (
                                          <div key={index} className="border rounded-lg p-4">
                                            <h4 className="font-medium text-neutral-900 mb-2">{question}</h4>
                                            <p className="text-neutral-700 whitespace-pre-wrap">{answer}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </TabsContent>
                                  </Tabs>
                                ) : (
                                  <p className="text-neutral-600 text-center py-4">
                                    Click the interview prep button to generate preparation materials.
                                  </p>
                                )}
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
