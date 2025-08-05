import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { apiRequest } from "@/lib/queryClient";
import { Navigation } from "@/components/navigation";
import { 
  Plus, 
  Trash2, 
  Save, 
  User, 
  Briefcase, 
  GraduationCap,
  Award,
  Globe,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react";

const profileSchema = z.object({
  professionalSummary: z.string().min(50, "Professional summary must be at least 50 characters"),
  skills: z.string(),
  certifications: z.string(),
  languages: z.string(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  portfolioUrl: z.string().url().optional().or(z.literal(""))
});

const workExperienceSchema = z.object({
  jobTitle: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company is required"),
  location: z.string(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string(),
  description: z.string().min(50, "Description must be at least 50 characters"),
  isCurrentRole: z.boolean().default(false)
});

const educationSchema = z.object({
  institution: z.string().min(1, "Institution is required"),
  degree: z.string().min(1, "Degree is required"),
  fieldOfStudy: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  gpa: z.string(),
  description: z.string()
});

type ProfileForm = z.infer<typeof profileSchema>;
type WorkExperienceForm = z.infer<typeof workExperienceSchema>;
type EducationForm = z.infer<typeof educationSchema>;

export default function ProfileSetup() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("profile");
  const [editingExperience, setEditingExperience] = useState<string | null>(null);
  const [editingEducation, setEditingEducation] = useState<string | null>(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [showMergeDialog, setShowMergeDialog] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState<any>(null);
  const [mergeStrategy, setMergeStrategy] = useState<'replace' | 'merge'>('merge');
  const [dateConflicts, setDateConflicts] = useState<any[]>([]);
  const [conflictResolutions, setConflictResolutions] = useState<Record<string, 'existing' | 'new'>>({});

  // Remove problematic auth check in demo mode

  // Fetch profile data
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      // Demo profile data
      return {
        professionalSummary: "Experienced software engineer with 5+ years in full-stack development.",
        skills: "JavaScript, React, Node.js, Python, SQL",
        certifications: "AWS Certified Developer",
        languages: "English (Native), Spanish (Conversational)",
        linkedinUrl: "https://linkedin.com/in/demo-user",
        portfolioUrl: "https://demo-portfolio.com"
      };
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Profile form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      professionalSummary: "",
      skills: "",
      certifications: "",
      languages: "",
      linkedinUrl: "",
      portfolioUrl: ""
    }
  });

  // Work experience form
  const experienceForm = useForm<WorkExperienceForm>({
    resolver: zodResolver(workExperienceSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      description: "",
      isCurrentRole: false
    }
  });

  // Education form
  const educationForm = useForm<EducationForm>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      gpa: "",
      description: ""
    }
  });

  // Set form defaults when data loads
  useEffect(() => {
    if ((profileData as any)?.profile) {
      const profile = (profileData as any).profile;
      profileForm.reset({
        professionalSummary: profile.professionalSummary || "",
        skills: profile.skills?.join(", ") || "",
        certifications: profile.certifications?.join(", ") || "",
        languages: profile.languages?.join(", ") || "",
        linkedinUrl: profile.linkedinUrl || "",
        portfolioUrl: profile.portfolioUrl || ""
      });
    }
  }, [profileData, profileForm]);

  // Helper function to detect conflicts between new and existing data
  const detectDataConflicts = (newData: any, existingData: any) => {
    const conflicts: any[] = [];
    
    if (!existingData) return conflicts;

    const existingExperience = existingData.workExperience || [];
    const existingEducation = existingData.education || [];

    // Check work experience conflicts
    newData.workExperience?.forEach((newExp: any, index: number) => {
      const matchingExp = existingExperience.find((exp: any) => 
        exp.jobTitle.toLowerCase() === newExp.jobTitle.toLowerCase() && 
        exp.company.toLowerCase() === newExp.company.toLowerCase()
      );
      
      if (matchingExp && (matchingExp.startDate !== newExp.startDate || matchingExp.endDate !== newExp.endDate)) {
        conflicts.push({
          id: `experience-${index}`,
          type: 'work_experience',
          field: 'dates',
          jobTitle: newExp.jobTitle,
          company: newExp.company,
          existing: { startDate: matchingExp.startDate, endDate: matchingExp.endDate },
          new: { startDate: newExp.startDate, endDate: newExp.endDate }
        });
      }
    });

    // Check education conflicts
    newData.education?.forEach((newEdu: any, index: number) => {
      const matchingEdu = existingEducation.find((edu: any) => 
        edu.institution.toLowerCase() === newEdu.institution.toLowerCase() && 
        edu.degree.toLowerCase() === newEdu.degree.toLowerCase()
      );
      
      if (matchingEdu && (matchingEdu.startDate !== newEdu.startDate || matchingEdu.endDate !== newEdu.endDate)) {
        conflicts.push({
          id: `education-${index}`,
          type: 'education',
          field: 'dates',
          institution: newEdu.institution,
          degree: newEdu.degree,
          existing: { startDate: matchingEdu.startDate, endDate: matchingEdu.endDate },
          new: { startDate: newEdu.startDate, endDate: newEdu.endDate }
        });
      }
    });

    return conflicts;
  };

  // Mutations
  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const profileData = {
        ...data,
        skills: data.skills.split(",").map(s => s.trim()).filter(Boolean),
        certifications: data.certifications.split(",").map(s => s.trim()).filter(Boolean),
        languages: data.languages.split(",").map(s => s.trim()).filter(Boolean)
      };
      return await apiRequest("POST", "/api/profile", profileData);
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
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
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveExperienceMutation = useMutation({
    mutationFn: async (data: WorkExperienceForm & { id?: string }) => {
      if (data.id) {
        return await apiRequest("PUT", `/api/work-experience/${data.id}`, data);
      } else {
        return await apiRequest("POST", "/api/work-experience", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Experience Saved",
        description: "Work experience has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      experienceForm.reset();
      setEditingExperience(null);
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
        title: "Error",
        description: "Failed to save work experience. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteExperienceMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/work-experience/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Experience Deleted",
        description: "Work experience has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete work experience. Please try again.",
        variant: "destructive",
      });
    },
  });

  const saveEducationMutation = useMutation({
    mutationFn: async (data: EducationForm & { id?: string }) => {
      if (data.id) {
        return await apiRequest("PUT", `/api/education/${data.id}`, data);
      } else {
        return await apiRequest("POST", "/api/education", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Education Saved",
        description: "Education has been saved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      educationForm.reset();
      setEditingEducation(null);
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
        title: "Error",
        description: "Failed to save education. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteEducationMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/education/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Education Deleted",
        description: "Education has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete education. Please try again.",
        variant: "destructive",
      });
    },
  });

  const parseResumeMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('resume', file);
      
      const response = await fetch('/api/parse-resume-preview', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setParsedResumeData(data.parsedData);
      
      // Detect conflicts with existing data
      const conflicts = detectDataConflicts(data.parsedData, profileData);
      setDateConflicts(conflicts);
      
      // Initialize conflict resolutions to prefer existing data
      const initialResolutions: Record<string, 'existing' | 'new'> = {};
      conflicts.forEach(conflict => {
        initialResolutions[conflict.id] = 'existing';
      });
      setConflictResolutions(initialResolutions);
      
      setShowMergeDialog(true);
      setUploadingResume(false);
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
      setUploadingResume(false);
    },
  });

  const applyResumeMutation = useMutation({
    mutationFn: async (data: { strategy: 'replace' | 'merge'; parsedData: any; conflictResolutions: Record<string, 'existing' | 'new'> }) => {
      return await apiRequest("POST", "/api/apply-resume-data", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Profile Updated Successfully",
        description: `Updated profile with ${data.updatedCount} new entries.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setShowMergeDialog(false);
      setParsedResumeData(null);
      setDateConflicts([]);
      setConflictResolutions({});
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const workExperience = (profileData as any)?.workExperience || [];
  const education = (profileData as any)?.education || [];

  return (
    <div className="min-h-screen bg-neutral-50">
      <Navigation />
      
      <div className="pt-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-900 mb-2">Build Your Professional Profile</h1>
            <p className="text-neutral-600">The more detailed your profile, the better our AI can tailor your applications.</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="experience" className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Experience
              </TabsTrigger>
              <TabsTrigger value="education" className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Education
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Professional Profile
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={profileForm.handleSubmit((data) => saveProfileMutation.mutate(data))} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="professionalSummary">Professional Summary</Label>
                      <Textarea
                        id="professionalSummary"
                        placeholder="Write a compelling summary of your professional background and career goals..."
                        className="h-32"
                        {...profileForm.register("professionalSummary")}
                      />
                      {profileForm.formState.errors.professionalSummary && (
                        <p className="text-sm text-red-600">{profileForm.formState.errors.professionalSummary.message}</p>
                      )}
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="skills">Skills (comma-separated)</Label>
                        <Textarea
                          id="skills"
                          placeholder="e.g., Financial Analysis, Excel, QuickBooks, GAAP, IFRS"
                          {...profileForm.register("skills")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="certifications">Certifications (comma-separated)</Label>
                        <Textarea
                          id="certifications"
                          placeholder="e.g., CPA, CFA, ACCA, CMA"
                          {...profileForm.register("certifications")}
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="languages">Languages (comma-separated)</Label>
                        <Input
                          id="languages"
                          placeholder="e.g., English, Spanish, French"
                          {...profileForm.register("languages")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
                        <Input
                          id="linkedinUrl"
                          placeholder="https://linkedin.com/in/yourprofile"
                          {...profileForm.register("linkedinUrl")}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      className="bg-primary hover:bg-secondary"
                      disabled={saveProfileMutation.isPending}
                    >
                      {saveProfileMutation.isPending ? (
                        <>
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Profile
                        </>
                      )}
                    </Button>
                  </form>

                  {/* Resume Upload Section */}
                  <div className="mt-8 pt-6 border-t">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Quick Setup with Resume Upload
                    </h3>
                    <p className="text-sm text-neutral-600 mb-4">
                      Upload your existing resume to automatically populate your profile, work experience, and education. 
                      We support PDF, Word documents, and text files.
                    </p>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <input
                          type="file"
                          id="resume-upload"
                          accept=".pdf,.docx,.doc,.txt"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setUploadingResume(true);
                              parseResumeMutation.mutate(file);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => document.getElementById('resume-upload')?.click()}
                          disabled={parseResumeMutation.isPending}
                          className="flex items-center gap-2"
                        >
                          <FileText className="h-4 w-4" />
                          {parseResumeMutation.isPending ? "Uploading..." : "Upload Resume"}
                        </Button>
                      </div>
                      
                      {uploadingResume && (
                        <div className="flex items-center gap-2 text-sm text-neutral-600">
                          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
                          Parsing your resume...
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-neutral-500">
                      Supported formats: PDF, Word (.docx, .doc), and Text files (up to 10MB)
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Experience Tab */}
            <TabsContent value="experience">
              <div className="space-y-6">
                {/* Add/Edit Experience Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Briefcase className="h-5 w-5" />
                      {editingExperience ? "Edit Work Experience" : "Add Work Experience"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={experienceForm.handleSubmit((data) => {
                      saveExperienceMutation.mutate(editingExperience ? { ...data, id: editingExperience } : data);
                    })} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="jobTitle">Job Title</Label>
                          <Input
                            id="jobTitle"
                            placeholder="e.g., Senior Financial Analyst"
                            {...experienceForm.register("jobTitle")}
                          />
                          {experienceForm.formState.errors.jobTitle && (
                            <p className="text-sm text-red-600">{experienceForm.formState.errors.jobTitle.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="company">Company</Label>
                          <Input
                            id="company"
                            placeholder="Company Name"
                            {...experienceForm.register("company")}
                          />
                          {experienceForm.formState.errors.company && (
                            <p className="text-sm text-red-600">{experienceForm.formState.errors.company.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            placeholder="City, State"
                            {...experienceForm.register("location")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            id="startDate"
                            type="month"
                            {...experienceForm.register("startDate")}
                          />
                          {experienceForm.formState.errors.startDate && (
                            <p className="text-sm text-red-600">{experienceForm.formState.errors.startDate.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            id="endDate"
                            type="month"
                            placeholder="Leave blank if current"
                            {...experienceForm.register("endDate")}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Key Responsibilities & Achievements</Label>
                        <Textarea
                          id="description"
                          className="h-32"
                          placeholder="Describe your main responsibilities and notable achievements..."
                          {...experienceForm.register("description")}
                        />
                        {experienceForm.formState.errors.description && (
                          <p className="text-sm text-red-600">{experienceForm.formState.errors.description.message}</p>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          className="bg-primary hover:bg-secondary"
                          disabled={saveExperienceMutation.isPending}
                        >
                          {saveExperienceMutation.isPending ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {editingExperience ? "Update Experience" : "Add Experience"}
                            </>
                          )}
                        </Button>
                        
                        {editingExperience && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setEditingExperience(null);
                              experienceForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Experience List */}
                {workExperience.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Work Experience</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {workExperience.map((exp: any) => (
                          <div key={exp.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-neutral-900">{exp.jobTitle}</h3>
                                <p className="text-neutral-600">{exp.company} • {exp.location}</p>
                                <p className="text-sm text-neutral-500">
                                  {exp.startDate} - {exp.endDate || "Present"}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingExperience(exp.id);
                                    experienceForm.reset(exp);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteExperienceMutation.mutate(exp.id)}
                                  disabled={deleteExperienceMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-neutral-700 text-sm">{exp.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Education Tab */}
            <TabsContent value="education">
              <div className="space-y-6">
                {/* Add/Edit Education Form */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GraduationCap className="h-5 w-5" />
                      {editingEducation ? "Edit Education" : "Add Education"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={educationForm.handleSubmit((data) => {
                      saveEducationMutation.mutate(editingEducation ? { ...data, id: editingEducation } : data);
                    })} className="space-y-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="institution">Institution</Label>
                          <Input
                            id="institution"
                            placeholder="University Name"
                            {...educationForm.register("institution")}
                          />
                          {educationForm.formState.errors.institution && (
                            <p className="text-sm text-red-600">{educationForm.formState.errors.institution.message}</p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="degree">Degree</Label>
                          <Input
                            id="degree"
                            placeholder="e.g., Bachelor of Science"
                            {...educationForm.register("degree")}
                          />
                          {educationForm.formState.errors.degree && (
                            <p className="text-sm text-red-600">{educationForm.formState.errors.degree.message}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="fieldOfStudy">Field of Study</Label>
                          <Input
                            id="fieldOfStudy"
                            placeholder="e.g., Accounting"
                            {...educationForm.register("fieldOfStudy")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="eduStartDate">Start Date</Label>
                          <Input
                            id="eduStartDate"
                            type="month"
                            {...educationForm.register("startDate")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="eduEndDate">End Date</Label>
                          <Input
                            id="eduEndDate"
                            type="month"
                            {...educationForm.register("endDate")}
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="gpa">GPA (optional)</Label>
                          <Input
                            id="gpa"
                            placeholder="e.g., 3.8"
                            {...educationForm.register("gpa")}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="eduDescription">Description (optional)</Label>
                          <Input
                            id="eduDescription"
                            placeholder="e.g., Magna Cum Laude, Dean's List"
                            {...educationForm.register("description")}
                          />
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button 
                          type="submit" 
                          className="bg-primary hover:bg-secondary"
                          disabled={saveEducationMutation.isPending}
                        >
                          {saveEducationMutation.isPending ? (
                            <>
                              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4 mr-2" />
                              {editingEducation ? "Update Education" : "Add Education"}
                            </>
                          )}
                        </Button>
                        
                        {editingEducation && (
                          <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                              setEditingEducation(null);
                              educationForm.reset();
                            }}
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* Education List */}
                {education.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Your Education</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {education.map((edu: any) => (
                          <div key={edu.id} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-semibold text-neutral-900">{edu.degree} in {edu.fieldOfStudy}</h3>
                                <p className="text-neutral-600">{edu.institution}</p>
                                <p className="text-sm text-neutral-500">
                                  {edu.startDate} - {edu.endDate}
                                </p>
                                {edu.gpa && <p className="text-sm text-neutral-500">GPA: {edu.gpa}</p>}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setEditingEducation(edu.id);
                                    educationForm.reset(edu);
                                  }}
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteEducationMutation.mutate(edu.id)}
                                  disabled={deleteEducationMutation.isPending}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            {edu.description && (
                              <p className="text-neutral-700 text-sm">{edu.description}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Merge Strategy Dialog */}
      <Dialog open={showMergeDialog} onOpenChange={setShowMergeDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Resume Uploaded Successfully
            </DialogTitle>
            <DialogDescription>
              We've extracted information from your resume. How would you like to integrate this data with your existing profile?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Merge Strategy Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Choose merge strategy:</Label>
              <RadioGroup
                value={mergeStrategy}
                onValueChange={(value) => setMergeStrategy(value as 'replace' | 'merge')}
                className="space-y-3"
              >
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-neutral-50">
                  <RadioGroupItem value="merge" id="merge" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="merge" className="font-medium cursor-pointer">
                      Incrementally add to current profile (Recommended)
                    </Label>
                    <p className="text-sm text-neutral-600">
                      Keep your existing information and add new entries from the resume. Great for building a comprehensive profile.
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-neutral-50">
                  <RadioGroupItem value="replace" id="replace" className="mt-1" />
                  <div className="space-y-1">
                    <Label htmlFor="replace" className="font-medium cursor-pointer">
                      Replace current profile
                    </Label>
                    <p className="text-sm text-neutral-600">
                      Clear your existing profile and replace it entirely with data from this resume.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {/* Date Conflicts */}
            {dateConflicts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <Label className="text-base font-medium">Resolve Date Conflicts</Label>
                </div>
                <p className="text-sm text-neutral-600">
                  We found some date conflicts between your existing profile and the uploaded resume. Please choose which dates to keep:
                </p>
                
                <div className="space-y-4">
                  {dateConflicts.map((conflict) => (
                    <Card key={conflict.id} className="p-4">
                      <div className="space-y-3">
                        <div className="font-medium">
                          {conflict.type === 'work_experience' 
                            ? `${conflict.jobTitle} at ${conflict.company}`
                            : `${conflict.degree} at ${conflict.institution}`
                          }
                        </div>
                        
                        <RadioGroup
                          value={conflictResolutions[conflict.id] || 'existing'}
                          onValueChange={(value) => 
                            setConflictResolutions(prev => ({
                              ...prev,
                              [conflict.id]: value as 'existing' | 'new'
                            }))
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="existing" id={`${conflict.id}-existing`} />
                            <Label htmlFor={`${conflict.id}-existing`} className="text-sm">
                              Keep existing: {conflict.existing.startDate} - {conflict.existing.endDate || 'Present'}
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="new" id={`${conflict.id}-new`} />
                            <Label htmlFor={`${conflict.id}-new`} className="text-sm">
                              Use from resume: {conflict.new.startDate} - {conflict.new.endDate || 'Present'}
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Summary of Changes */}
            {parsedResumeData && (
              <div className="bg-neutral-50 p-4 rounded-lg space-y-2">
                <Label className="text-base font-medium">What will be added:</Label>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Work Experience:</span> {parsedResumeData.workExperience?.length || 0} entries
                  </div>
                  <div>
                    <span className="font-medium">Education:</span> {parsedResumeData.education?.length || 0} entries
                  </div>
                  <div>
                    <span className="font-medium">Skills:</span> {parsedResumeData.skills?.length || 0} skills
                  </div>
                  <div>
                    <span className="font-medium">Certifications:</span> {parsedResumeData.certifications?.length || 0} items
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowMergeDialog(false);
                  setParsedResumeData(null);
                  setDateConflicts([]);
                  setConflictResolutions({});
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  applyResumeMutation.mutate({
                    strategy: mergeStrategy,
                    parsedData: parsedResumeData,
                    conflictResolutions
                  });
                }}
                disabled={applyResumeMutation.isPending}
                className="flex items-center gap-2"
              >
                {applyResumeMutation.isPending ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    Applying Changes...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Apply Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
