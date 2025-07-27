import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Plus, Trash2 } from "lucide-react";

// Schemas
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

interface ProfileFormProps {
  initialData?: Partial<ProfileForm>;
  onSubmit: (data: ProfileForm) => void;
  isLoading?: boolean;
}

export function ProfileFormComponent({ initialData, onSubmit, isLoading }: ProfileFormProps) {
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      professionalSummary: "",
      skills: "",
      certifications: "",
      languages: "",
      linkedinUrl: "",
      portfolioUrl: "",
      ...initialData,
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="professionalSummary">Professional Summary</Label>
            <Textarea
              id="professionalSummary"
              placeholder="Write a compelling summary of your professional background and career goals..."
              className="h-32"
              {...form.register("professionalSummary")}
            />
            {form.formState.errors.professionalSummary && (
              <p className="text-sm text-red-600">{form.formState.errors.professionalSummary.message}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="skills">Skills (comma-separated)</Label>
              <Textarea
                id="skills"
                placeholder="e.g., Financial Analysis, Excel, QuickBooks, GAAP, IFRS"
                {...form.register("skills")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="certifications">Certifications (comma-separated)</Label>
              <Textarea
                id="certifications"
                placeholder="e.g., CPA, CFA, ACCA, CMA"
                {...form.register("certifications")}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="languages">Languages (comma-separated)</Label>
              <Input
                id="languages"
                placeholder="e.g., English, Spanish, French"
                {...form.register("languages")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedinUrl">LinkedIn Profile URL</Label>
              <Input
                id="linkedinUrl"
                placeholder="https://linkedin.com/in/yourprofile"
                {...form.register("linkedinUrl")}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="bg-primary hover:bg-secondary"
            disabled={isLoading}
          >
            {isLoading ? (
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
      </CardContent>
    </Card>
  );
}

interface WorkExperienceFormProps {
  initialData?: Partial<WorkExperienceForm>;
  onSubmit: (data: WorkExperienceForm) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export function WorkExperienceFormComponent({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading, 
  isEditing 
}: WorkExperienceFormProps) {
  const form = useForm<WorkExperienceForm>({
    resolver: zodResolver(workExperienceSchema),
    defaultValues: {
      jobTitle: "",
      company: "",
      location: "",
      startDate: "",
      endDate: "",
      description: "",
      isCurrentRole: false,
      ...initialData,
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Work Experience" : "Add Work Experience"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
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

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="City, State"
                {...form.register("location")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="month"
                {...form.register("startDate")}
              />
              {form.formState.errors.startDate && (
                <p className="text-sm text-red-600">{form.formState.errors.startDate.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="month"
                placeholder="Leave blank if current"
                {...form.register("endDate")}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Key Responsibilities & Achievements</Label>
            <Textarea
              id="description"
              className="h-32"
              placeholder="Describe your main responsibilities and notable achievements..."
              {...form.register("description")}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button 
              type="submit" 
              className="bg-primary hover:bg-secondary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update Experience" : "Add Experience"}
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button 
                type="button" 
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface EducationFormProps {
  initialData?: Partial<EducationForm>;
  onSubmit: (data: EducationForm) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  isEditing?: boolean;
}

export function EducationFormComponent({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isLoading, 
  isEditing 
}: EducationFormProps) {
  const form = useForm<EducationForm>({
    resolver: zodResolver(educationSchema),
    defaultValues: {
      institution: "",
      degree: "",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      gpa: "",
      description: "",
      ...initialData,
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Education" : "Add Education"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="institution">Institution</Label>
              <Input
                id="institution"
                placeholder="University Name"
                {...form.register("institution")}
              />
              {form.formState.errors.institution && (
                <p className="text-sm text-red-600">{form.formState.errors.institution.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="degree">Degree</Label>
              <Input
                id="degree"
                placeholder="e.g., Bachelor of Science"
                {...form.register("degree")}
              />
              {form.formState.errors.degree && (
                <p className="text-sm text-red-600">{form.formState.errors.degree.message}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="fieldOfStudy">Field of Study</Label>
              <Input
                id="fieldOfStudy"
                placeholder="e.g., Accounting"
                {...form.register("fieldOfStudy")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eduStartDate">Start Date</Label>
              <Input
                id="eduStartDate"
                type="month"
                {...form.register("startDate")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eduEndDate">End Date</Label>
              <Input
                id="eduEndDate"
                type="month"
                {...form.register("endDate")}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="gpa">GPA (optional)</Label>
              <Input
                id="gpa"
                placeholder="e.g., 3.8"
                {...form.register("gpa")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eduDescription">Description (optional)</Label>
              <Input
                id="eduDescription"
                placeholder="e.g., Magna Cum Laude, Dean's List"
                {...form.register("description")}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button 
              type="submit" 
              className="bg-primary hover:bg-secondary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? "Update Education" : "Add Education"}
                </>
              )}
            </Button>
            
            {onCancel && (
              <Button 
                type="button" 
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
