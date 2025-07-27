import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { 
  Sparkles, 
  FileText, 
  Download, 
  CheckCircle,
  Clock,
  Target,
  Lightbulb,
  ExternalLink
} from "lucide-react";

const jobApplicationSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  jobUrl: z.string().url().optional().or(z.literal("")),
  jobDescription: z.string().min(50, "Job description must be at least 50 characters")
});

type JobApplicationForm = z.infer<typeof jobApplicationSchema>;

interface JobAnalysis {
  keyRequirements: string[];
  skills: string[];
  experience: string[];
  education: string[];
  certifications: string[];
  matchScore: number;
}

interface GeneratedApplication {
  application: any;
  jobAnalysis: JobAnalysis;
  resume: string;
  coverLetter: string;
}

export default function ApplicationGenerator() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [generatedApp, setGeneratedApp] = useState<GeneratedApplication | null>(null);
  const [activeTab, setActiveTab] = useState("input");

  // Check authentication
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
  }, [user, authLoading, toast]);

  const form = useForm<JobApplicationForm>({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      jobUrl: "",
      jobDescription: ""
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (data: JobApplicationForm) => {
      const response = await apiRequest("POST", "/api/generate-application", data);
      return await response.json();
    },
    onSuccess: (data: GeneratedApplication) => {
      setGeneratedApp(data);
      setActiveTab("results");
      toast({
        title: "Application Generated!",
        description: "Your tailored resume and cover letter are ready.",
      });
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
        title: "Generation Failed",
        description: (error as Error).message.includes("limit") 
          ? "You've reached your application limit. Please upgrade your plan."
          : "Failed to generate application. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      if (response.body) {
        const url = window.URL.createObjectURL(new Blob([response.body]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'application_documents.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
      
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

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Generate Tailored Application</h1>
            <p className="text-neutral-600">Our AI will analyze the job description and create personalized documents that match the requirements.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="input" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Job Details
              </TabsTrigger>
              <TabsTrigger value="results" className="flex items-center gap-2" disabled={!generatedApp}>
                <Sparkles className="h-4 w-4" />
                Generated Application
              </TabsTrigger>
            </TabsList>

            {/* Job Input Tab */}
            <TabsContent value="input">
              <div className="grid lg:grid-cols-2 gap-8">
                {/* Job Description Input */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-secondary">
                      <Target className="h-5 w-5" />
                      Job Description Analysis
                    </CardTitle>
                    <p className="text-neutral-600">Paste or link to any job posting</p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={form.handleSubmit((data) => generateMutation.mutate(data))} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input
                            id="jobTitle"
                            placeholder="e.g., Senior Financial Analyst"
                            {...form.register("jobTitle")}
                          />
                          {form.formState.errors.jobTitle && (
                            <p className="text-sm text-red-600">{form.formState.errors.jobTitle.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            placeholder="Company Name"
                            {...form.register("company")}
                          />
                          {form.formState.errors.company && (
                            <p className="text-sm text-red-600">{form.formState.errors.company.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobUrl">Job URL (optional)</Label>
                        <Input
                          id="jobUrl"
                          placeholder="https://company.com/careers/job-posting"
                          {...form.register("jobUrl")}
                        />
                        {form.formState.errors.jobUrl && (
                          <p className="text-sm text-red-600">{form.formState.errors.jobUrl.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="jobDescription">Job Description</Label>
                        <Textarea
                          id="jobDescription"
                          className="h-64 text-sm"
                          placeholder="Paste the complete job description here..."
                          {...form.register("jobDescription")}
                        />
                        {form.formState.errors.jobDescription && (
                          <p className="text-sm text-red-600">{form.formState.errors.jobDescription.message}</p>
                        )}
                      </div>

                      <Button 
                        type="submit" 
                        className="w-full bg-primary hover:bg-secondary"
                        disabled={generateMutation.isPending}
                      >
                        {generateMutation.isPending ? (
                          <>
                            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Analyzing & Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Analyze & Generate Application
                          </>
                        )}
                      </Button>

                      {user?.subscriptionTier === 'free' && (
                        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <Lightbulb className="h-4 w-4 text-yellow-600" />
                          <p className="text-sm text-yellow-800">
                            Free tier: {5 - (user.applicationCount || 0)} applications remaining
                          </p>
                        </div>
                      )}
                    </form>
                  </CardContent>
                </Card>

                {/* Tips Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-accent">
                      <Lightbulb className="h-5 w-5" />
                      Tips for Best Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                        <div>
                          <h4 className="font-medium text-neutral-900">Complete Profile</h4>
                          <p className="text-sm text-neutral-600">Ensure your profile is fully completed with detailed work experience and skills.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                        <div>
                          <h4 className="font-medium text-neutral-900">Full Job Description</h4>
                          <p className="text-sm text-neutral-600">Include the complete job posting with requirements, responsibilities, and qualifications.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-accent mt-0.5" />
                        <div>
                          <h4 className="font-medium text-neutral-900">Accurate Company Info</h4>
                          <p className="text-sm text-neutral-600">Provide the exact company name and job title as listed in the posting.</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Clock className="h-5 w-5 text-neutral-400 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-neutral-900">Processing Time</h4>
                          <p className="text-sm text-neutral-600">AI generation typically takes 30-60 seconds for comprehensive analysis.</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Results Tab */}
            <TabsContent value="results">
              {generatedApp && (
                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Analysis Results */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-accent">
                        <Target className="h-5 w-5" />
                        AI Analysis Results
                      </CardTitle>
                      <p className="text-green-100">Tailored documents ready for download</p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        {/* Match Score */}
                        <div className="text-center p-4 bg-accent/10 rounded-lg">
                          <div className="text-3xl font-bold text-accent mb-2">
                            {generatedApp.jobAnalysis.matchScore}%
                          </div>
                          <p className="text-sm text-neutral-600">Profile Match Score</p>
                        </div>

                        {/* Key Matches */}
                        <div>
                          <h4 className="font-semibold text-neutral-900 mb-3">Key Matches Found:</h4>
                          <div className="space-y-2">
                            {generatedApp.jobAnalysis.keyRequirements.slice(0, 4).map((req, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-accent rounded-full" />
                                <span className="text-sm text-neutral-700">{req} ✓</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Skills Match */}
                        <div>
                          <h4 className="font-semibold text-neutral-900 mb-3">Highlighted Skills:</h4>
                          <div className="flex flex-wrap gap-2">
                            {generatedApp.jobAnalysis.skills.slice(0, 6).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Document Status */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" />
                              <span className="font-medium">Tailored Resume</span>
                            </div>
                            <Badge className="bg-accent text-white">OPTIMIZED</Badge>
                          </div>
                          
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-secondary" />
                              <span className="font-medium">Cover Letter</span>
                            </div>
                            <Badge className="bg-accent text-white">PERSONALIZED</Badge>
                          </div>
                        </div>

                        {/* Download Options */}
                        <div className="space-y-3">
                          <Button 
                            className="w-full bg-accent hover:bg-green-600"
                            onClick={() => downloadMutation.mutate({
                              applicationId: generatedApp.application.id,
                              format: 'pdf',
                              type: 'both'
                            })}
                            disabled={downloadMutation.isPending}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download Both (PDF)
                          </Button>
                          
                          <div className="grid grid-cols-2 gap-3">
                            <Button 
                              variant="outline" 
                              className="border-accent text-accent hover:bg-accent hover:text-white"
                              onClick={() => downloadMutation.mutate({
                                applicationId: generatedApp.application.id,
                                format: 'docx',
                                type: 'resume'
                              })}
                            >
                              Resume (Word)
                            </Button>
                            <Button 
                              variant="outline"
                              className="border-accent text-accent hover:bg-accent hover:text-white"
                              onClick={() => downloadMutation.mutate({
                                applicationId: generatedApp.application.id,
                                format: 'docx',
                                type: 'cover-letter'
                              })}
                            >
                              Cover Letter (Word)
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Document Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Document Preview
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="resume" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="resume">Resume</TabsTrigger>
                          <TabsTrigger value="cover-letter">Cover Letter</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="resume" className="mt-4">
                          <div className="max-h-96 overflow-y-auto bg-neutral-50 p-4 rounded-lg border">
                            <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-sans">
                              {generatedApp.resume}
                            </pre>
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="cover-letter" className="mt-4">
                          <div className="max-h-96 overflow-y-auto bg-neutral-50 p-4 rounded-lg border">
                            <pre className="text-sm text-neutral-800 whitespace-pre-wrap font-sans">
                              {generatedApp.coverLetter}
                            </pre>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
