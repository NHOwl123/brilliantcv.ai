import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  analyzeJobDescription, 
  generateTailoredResume, 
  generateCoverLetter, 
  generateInterviewPrep 
} from "./services/openai";
import { generateApplicationDocuments } from "./services/documentGenerator";
import { parseResumeFile } from "./services/resumeParser";
import multer from "multer";
import { 
  insertUserProfileSchema,
  insertWorkExperienceSchema,
  insertEducationSchema,
  insertJobApplicationSchema 
} from "@shared/schema";

// Initialize Stripe
const stripeSecretKey = process.env.STRIPE_SECRET_KEY_NEW || process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
}) : null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'text/plain'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid file type. Only PDF, Word documents, and text files are allowed.'));
      }
    }
  });

  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile routes
  app.get('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      
      // Create a default profile if it doesn't exist
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: '',
          skills: [],
          certifications: [],
          languages: []
        });
      }

      const workExperience = await storage.getUserWorkExperience(profile.id);
      const education = await storage.getUserEducation(profile.id);

      res.json({
        profile,
        workExperience,
        education
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post('/api/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profileData = insertUserProfileSchema.parse({ ...req.body, userId });
      
      const existingProfile = await storage.getUserProfile(userId);
      
      let profile;
      if (existingProfile) {
        profile = await storage.updateUserProfile(userId, profileData);
      } else {
        profile = await storage.createUserProfile(profileData);
      }

      res.json(profile);
    } catch (error) {
      console.error("Error saving profile:", error);
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  // Work experience routes
  app.post('/api/work-experience', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      
      // Create a default profile if it doesn't exist
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: '',
          skills: [],
          certifications: [],
          languages: []
        });
      }

      const experienceData = insertWorkExperienceSchema.parse({
        ...req.body,
        userProfileId: profile.id
      });

      const experience = await storage.createWorkExperience(experienceData);
      res.json(experience);
    } catch (error) {
      console.error("Error creating work experience:", error);
      res.status(500).json({ message: "Failed to create work experience" });
    }
  });

  app.put('/api/work-experience/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const experienceData = req.body;
      
      const experience = await storage.updateWorkExperience(id, experienceData);
      res.json(experience);
    } catch (error) {
      console.error("Error updating work experience:", error);
      res.status(500).json({ message: "Failed to update work experience" });
    }
  });

  app.delete('/api/work-experience/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkExperience(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting work experience:", error);
      res.status(500).json({ message: "Failed to delete work experience" });
    }
  });

  // Resume parsing preview endpoint (new approach)
  app.post('/api/parse-resume-preview', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Just parse the resume without updating profile
      const parsedData = await parseResumeFile(req.file.buffer, req.file.mimetype);
      
      res.json({
        message: "Resume parsed successfully",
        parsedData
      });
    } catch (error: any) {
      console.error("Resume parsing error:", error);
      
      // Pass through rate limit and other specific error messages
      if (error.message?.includes("Rate limit") || error.message?.includes("wait")) {
        res.status(429).json({ 
          message: error.message 
        });
      } else {
        res.status(500).json({ 
          message: "Failed to process resume", 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }
  });

  // Apply resume data with merge strategy
  app.post('/api/apply-resume-data', isAuthenticated, async (req: any, res) => {
    try {
      const { strategy, parsedData, conflictResolutions } = req.body;
      const userId = req.user.claims.sub;
      
      if (!parsedData) {
        return res.status(400).json({ message: "No parsed data provided" });
      }

      let updatedCount = 0;

      // Get or create user profile
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: parsedData.personalInfo?.summary || '',
          skills: parsedData.skills || [],
          certifications: parsedData.certifications || [],
          languages: parsedData.languages || [],
          linkedinUrl: parsedData.personalInfo?.linkedinUrl || '',
          portfolioUrl: parsedData.personalInfo?.portfolioUrl || ''
        });
        updatedCount++;
      } else if (strategy === 'replace') {
        // Replace mode - update profile completely
        await storage.updateUserProfile(userId, {
          professionalSummary: parsedData.personalInfo?.summary || profile.professionalSummary,
          skills: parsedData.skills || profile.skills,
          certifications: parsedData.certifications || profile.certifications,
          languages: parsedData.languages || profile.languages,
          linkedinUrl: parsedData.personalInfo?.linkedinUrl || profile.linkedinUrl,
          portfolioUrl: parsedData.personalInfo?.portfolioUrl || profile.portfolioUrl
        });
        
        // Clear existing experience and education
        const existingExperience = await storage.getUserWorkExperience(profile.id);
        const existingEducation = await storage.getUserEducation(profile.id);
        
        for (const exp of existingExperience) {
          await storage.deleteWorkExperience(exp.id);
        }
        for (const edu of existingEducation) {
          await storage.deleteEducation(edu.id);
        }
        updatedCount++;
      } else {
        // Merge mode - update profile incrementally
        const currentSkills = profile.skills || [];
        const currentCertifications = profile.certifications || [];
        const currentLanguages = profile.languages || [];
        const newSkills = parsedData.skills || [];
        const newCertifications = parsedData.certifications || [];
        const newLanguages = parsedData.languages || [];
        
        const mergedSkills = Array.from(new Set([...currentSkills, ...newSkills]));
        const mergedCertifications = Array.from(new Set([...currentCertifications, ...newCertifications]));
        const mergedLanguages = Array.from(new Set([...currentLanguages, ...newLanguages]));
        
        await storage.updateUserProfile(userId, {
          professionalSummary: parsedData.personalInfo?.summary || profile.professionalSummary,
          skills: mergedSkills,
          certifications: mergedCertifications,
          languages: mergedLanguages,
          linkedinUrl: parsedData.personalInfo?.linkedinUrl || profile.linkedinUrl,
          portfolioUrl: parsedData.personalInfo?.portfolioUrl || profile.portfolioUrl
        });
        updatedCount++;
      }

      // Process work experience
      if (parsedData.workExperience && parsedData.workExperience.length > 0) {
        const existingExperience = strategy === 'merge' ? await storage.getUserWorkExperience(profile.id) : [];
        
        for (const experience of parsedData.workExperience) {
          // Check for duplicates in merge mode
          if (strategy === 'merge') {
            const duplicate = existingExperience.find(exp => 
              exp.jobTitle.toLowerCase() === experience.jobTitle.toLowerCase() && 
              exp.company.toLowerCase() === experience.company.toLowerCase()
            );
            
            if (duplicate) {
              // Apply conflict resolution for dates
              const conflictId = `experience-${parsedData.workExperience.indexOf(experience)}`;
              if (conflictResolutions[conflictId] === 'new') {
                await storage.updateWorkExperience(duplicate.id, {
                  startDate: experience.startDate,
                  endDate: experience.endDate,
                  description: experience.description || duplicate.description
                });
                updatedCount++;
              }
              continue; // Skip creating new entry
            }
          }
          
          // Create new work experience
          await storage.createWorkExperience({
            userProfileId: profile.id,
            jobTitle: experience.jobTitle,
            company: experience.company,
            location: experience.location || '',
            startDate: experience.startDate,
            endDate: experience.endDate,
            description: experience.description || '',
            isCurrentRole: experience.isCurrentRole || false
          });
          updatedCount++;
        }
      }

      // Process education
      if (parsedData.education && parsedData.education.length > 0) {
        const existingEducation = strategy === 'merge' ? await storage.getUserEducation(profile.id) : [];
        
        for (const education of parsedData.education) {
          // Check for duplicates in merge mode
          if (strategy === 'merge') {
            const duplicate = existingEducation.find(edu => 
              edu.institution.toLowerCase() === education.institution.toLowerCase() && 
              edu.degree.toLowerCase() === education.degree.toLowerCase()
            );
            
            if (duplicate) {
              // Apply conflict resolution for dates
              const conflictId = `education-${parsedData.education.indexOf(education)}`;
              if (conflictResolutions[conflictId] === 'new') {
                await storage.updateEducation(duplicate.id, {
                  startDate: education.startDate,
                  endDate: education.endDate,
                  gpa: education.gpa || duplicate.gpa,
                  description: education.description || duplicate.description
                });
                updatedCount++;
              }
              continue; // Skip creating new entry
            }
          }
          
          // Create new education
          await storage.createEducation({
            userProfileId: profile.id,
            institution: education.institution,
            degree: education.degree,
            fieldOfStudy: education.fieldOfStudy || '',
            startDate: education.startDate,
            endDate: education.endDate,
            gpa: education.gpa || '',
            description: education.description || ''
          });
          updatedCount++;
        }
      }
      
      res.json({
        message: "Profile updated successfully",
        updatedCount
      });
    } catch (error) {
      console.error("Apply resume data error:", error);
      res.status(500).json({ 
        message: "Failed to update profile", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Legacy resume upload and parsing route (keep for backward compatibility)
  app.post('/api/parse-resume', isAuthenticated, upload.single('resume'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Parse the uploaded resume
      const parsedData = await parseResumeFile(req.file.buffer, req.file.mimetype);

      // Get or create user profile
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: '',
          skills: [],
          certifications: [],
          languages: []
        });
      }

      // Update profile with parsed data if fields are empty
      const updatedProfile = {
        professionalSummary: profile.professionalSummary || parsedData.professionalSummary || '',
        skills: profile.skills?.length ? profile.skills : parsedData.skills,
        certifications: profile.certifications?.length ? profile.certifications : parsedData.certifications,
        languages: profile.languages?.length ? profile.languages : parsedData.languages,
        linkedinUrl: profile.linkedinUrl || parsedData.personalInfo.linkedinUrl || '',
        portfolioUrl: profile.portfolioUrl || parsedData.personalInfo.portfolioUrl || ''
      };

      await storage.updateUserProfile(userId, updatedProfile);

      // Add work experience entries
      const existingExperience = await storage.getUserWorkExperience(profile.id);
      const newExperiencePromises = parsedData.workExperience
        .filter(exp => !existingExperience.some(existing => 
          existing.jobTitle === exp.jobTitle && existing.company === exp.company))
        .map(exp => storage.createWorkExperience({
          userProfileId: profile.id,
          jobTitle: exp.jobTitle,
          company: exp.company,
          location: exp.location || '',
          startDate: exp.startDate,
          endDate: exp.endDate || '',
          description: exp.description,
          achievements: exp.achievements,
          isCurrentRole: exp.isCurrentRole
        }));

      // Add education entries
      const existingEducation = await storage.getUserEducation(profile.id);
      const newEducationPromises = parsedData.education
        .filter(edu => !existingEducation.some(existing => 
          existing.institution === edu.institution && existing.degree === edu.degree))
        .map(edu => storage.createEducation({
          userProfileId: profile.id,
          institution: edu.institution,
          degree: edu.degree,
          fieldOfStudy: edu.fieldOfStudy || '',
          startDate: edu.startDate || '',
          endDate: edu.endDate || '',
          gpa: edu.gpa || '',
          description: edu.description || ''
        }));

      await Promise.all([...newExperiencePromises, ...newEducationPromises]);

      res.json({
        message: "Resume parsed successfully",
        data: {
          profileUpdated: true,
          workExperienceAdded: newExperiencePromises.length,
          educationAdded: newEducationPromises.length,
          personalInfo: parsedData.personalInfo
        }
      });
    } catch (error) {
      console.error("Error parsing resume:", error);
      res.status(500).json({ message: "Failed to parse resume: " + (error as Error).message });
    }
  });

  // Education routes
  app.post('/api/education', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      
      // Create a default profile if it doesn't exist
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: '',
          skills: [],
          certifications: [],
          languages: []
        });
      }

      const educationData = insertEducationSchema.parse({
        ...req.body,
        userProfileId: profile.id
      });

      const education = await storage.createEducation(educationData);
      res.json(education);
    } catch (error) {
      console.error("Error creating education:", error);
      res.status(500).json({ message: "Failed to create education" });
    }
  });

  app.put('/api/education/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const educationData = req.body;
      
      const education = await storage.updateEducation(id, educationData);
      res.json(education);
    } catch (error) {
      console.error("Error updating education:", error);
      res.status(500).json({ message: "Failed to update education" });
    }
  });

  app.delete('/api/education/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEducation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting education:", error);
      res.status(500).json({ message: "Failed to delete education" });
    }
  });

  // Job application generation
  app.post('/api/generate-application', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobDescription, jobTitle, company, jobUrl } = req.body;

      // Check user subscription and limits
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check application limits for free users
      if (user.subscriptionTier === 'free' && (user.applicationCount || 0) >= 5) {
        return res.status(403).json({ message: "Free tier limit reached. Please upgrade to continue." });
      }

      // Get user profile and data
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found. Please complete your profile first." });
      }

      const workExperience = await storage.getUserWorkExperience(profile.id);
      const education = await storage.getUserEducation(profile.id);

      // Analyze job description
      const jobAnalysis = await analyzeJobDescription(jobDescription);

      // Generate tailored resume and cover letter
      const [tailoredResume, coverLetter] = await Promise.all([
        generateTailoredResume(profile, workExperience, education, jobDescription, jobAnalysis),
        generateCoverLetter(profile, jobTitle, company, jobDescription, jobAnalysis)
      ]);

      // Create job application record
      const applicationData = insertJobApplicationSchema.parse({
        userId,
        jobTitle,
        company,
        jobDescription,
        jobUrl,
        resumeContent: tailoredResume,
        coverLetterContent: coverLetter,
        applicationStatus: 'applied'
      });

      const application = await storage.createJobApplication(applicationData);

      // Increment user application count
      await storage.incrementApplicationCount(userId);

      res.json({
        application,
        jobAnalysis,
        resume: tailoredResume,
        coverLetter
      });
    } catch (error) {
      console.error("Error generating application:", error);
      res.status(500).json({ message: "Failed to generate application: " + (error as Error).message });
    }
  });

  // Application history
  app.get('/api/applications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Check subscription tier for history access
      if (user.subscriptionTier === 'free') {
        return res.json([]); // Free users don't get history
      }

      const limit = user.subscriptionTier === 'standard' ? 50 : undefined; // Standard: last 50, Premium: unlimited
      const applications = await storage.getUserApplications(userId, limit);
      
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Update application status
  app.put('/api/applications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { applicationStatus, interviewDate, notes } = req.body;
      
      const application = await storage.updateJobApplication(id, {
        applicationStatus,
        interviewDate: interviewDate ? new Date(interviewDate) : undefined,
        notes
      });
      
      res.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // Interview preparation
  app.post('/api/interview-prep/:applicationId', isAuthenticated, async (req: any, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.user.claims.sub;
      
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier === 'free') {
        return res.status(403).json({ message: "Interview preparation requires Standard or Premium subscription" });
      }

      const application = await storage.getApplicationById(applicationId);
      if (!application || application.userId !== userId) {
        return res.status(404).json({ message: "Application not found" });
      }

      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const jobAnalysis = await analyzeJobDescription(application.jobDescription);
      const interviewPrep = await generateInterviewPrep(
        application.jobDescription,
        profile,
        jobAnalysis
      );

      res.json(interviewPrep);
    } catch (error) {
      console.error("Error generating interview prep:", error);
      res.status(500).json({ message: "Failed to generate interview preparation" });
    }
  });

  // Document download
  app.post('/api/download-documents', isAuthenticated, async (req: any, res) => {
    try {
      const { applicationId, format, type } = req.body;
      const userId = req.user.claims.sub;

      const application = await storage.getApplicationById(applicationId);
      if (!application || application.userId !== userId) {
        return res.status(404).json({ message: "Application not found" });
      }

      const documents = await generateApplicationDocuments({
        format: format || 'pdf',
        type: type || 'both',
        content: {
          resume: application.resumeContent || undefined,
          coverLetter: application.coverLetterContent || undefined
        },
        filename: `${application.company}_${application.jobTitle}`.replace(/[^a-zA-Z0-9]/g, '_')
      });

      if (documents.files.length === 0) {
        return res.status(400).json({ message: "No documents available for download" });
      }

      // For single file, return directly
      if (documents.files.length === 1) {
        const file = documents.files[0];
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
        return res.send(file.buffer);
      }

      // For multiple files, create a zip (simplified version)
      // In production, use a proper zip library
      res.setHeader('Content-Type', 'application/json');
      res.json({ 
        message: "Multiple files generated",
        files: documents.files.map(f => ({ name: f.name, size: f.buffer.length }))
      });
    } catch (error) {
      console.error("Error downloading documents:", error);
      res.status(500).json({ message: "Failed to download documents" });
    }
  });

  // Subscription management
  if (stripe) {
    app.post('/api/create-subscription', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { tier } = req.body; // 'standard' or 'premium'
        
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Determine the price ID for the requested tier
        const priceId = tier === 'premium' 
          ? process.env.STRIPE_PREMIUM_PRICE_ACTIVE
          : process.env.STRIPE_STANDARD_PRICE_NEW;

        if (!priceId) {
          throw new Error(`Price ID not configured for ${tier} tier`);
        }

        // Validate that priceId looks like a Stripe Price ID
        if (!priceId.startsWith('price_')) {
          throw new Error(`Invalid Price ID format: ${priceId}. Expected format: price_1ABC123... but got: ${priceId}. Please check your Stripe Price IDs in the secrets.`);
        }

        // If user already has a subscription, handle upgrade with proration
        if (user.stripeSubscriptionId) {
          console.log(`User already has subscription: ${user.stripeSubscriptionId}`);
          
          const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          console.log(`Existing subscription status: ${existingSubscription.status}`);
          
          // Handle different subscription statuses appropriately
          if (existingSubscription.status === 'incomplete_expired') {
            console.log('Cancelling expired incomplete subscription and creating new one');
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            // Clear the subscription ID so a new one gets created below
            await storage.updateUserSubscription(userId, { stripeSubscriptionId: "" });
          } else if (existingSubscription.status === 'active') {
            console.log('Upgrading existing ACTIVE subscription with proration');
            
            // Get current price to compare
            const currentPriceId = existingSubscription.items.data[0].price.id;
            console.log(`Current price: ${currentPriceId}, Target price: ${priceId}`);
            
            // If it's the same price, no upgrade needed
            if (currentPriceId === priceId) {
              return res.json({
                subscriptionId: existingSubscription.id,
                upgraded: true,
                message: "You're already on this plan"
              });
            }
            
            // Update the existing subscription to the new tier with proration
            const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
              items: [{
                id: existingSubscription.items.data[0].id,
                price: priceId,
              }],
              proration_behavior: 'create_prorations', // This creates proration
              payment_behavior: 'default_incomplete',
              expand: ['latest_invoice.payment_intent'],
            });
            
            console.log(`Updated subscription status: ${updatedSubscription.status}`);
            const clientSecret = (updatedSubscription.latest_invoice as any)?.payment_intent?.client_secret;
            console.log(`Client secret from proration: ${clientSecret ? 'present' : 'none'}`);
            
            // If no payment intent (no amount due), the upgrade is immediate
            if (!clientSecret) {
              await storage.updateUserSubscription(userId, {
                subscriptionTier: tier,
                subscriptionStatus: 'active'
              });
              
              return res.json({
                subscriptionId: updatedSubscription.id,
                upgraded: true,
                message: "Subscription upgraded successfully - no additional payment required"
              });
            }
            
            return res.json({
              subscriptionId: updatedSubscription.id,
              clientSecret: clientSecret,
              upgrade: true
            });
          } else if (existingSubscription.status === 'incomplete') {
            console.log('Found incomplete subscription - completing payment instead of creating new subscription');
            
            // For incomplete subscriptions, try to complete the existing payment
            const invoices = await stripe.invoices.list({
              subscription: user.stripeSubscriptionId,
              status: 'open',
              limit: 1
            });
            
            if (invoices.data.length > 0) {
              const invoice = invoices.data[0];
              const paymentIntent = (invoice as any).payment_intent;
              if (paymentIntent && typeof paymentIntent === 'object') {
                return res.json({
                  subscriptionId: existingSubscription.id,
                  clientSecret: paymentIntent.client_secret,
                  completing: true
                });
              }
            }
            
            // If no payment intent found, cancel and create new
            console.log('No payment intent found, cancelling incomplete subscription');
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            await storage.updateUserSubscription(userId, { stripeSubscriptionId: "" });
          } else {
            return res.status(400).json({ message: `Cannot upgrade subscription in status: ${existingSubscription.status}` });
          }
        }

        // Create new customer if needed
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email || '',
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          });
          customerId = customer.id;
          await storage.updateUserSubscription(userId, { stripeCustomerId: customerId });
        }

        console.log(`Creating subscription for ${tier} tier`);
        console.log(`Price ID being used: ${priceId}`);
        console.log(`Environment variables: STANDARD=${process.env.STRIPE_STANDARD_PRICE_ID}, PREMIUM=${process.env.STRIPE_PREMIUM_PRICE_ID}`);

        const subscription = await stripe.subscriptions.create({
          customer: customerId,
          items: [{ price: priceId }],
          payment_behavior: 'default_incomplete',
          payment_settings: {
            payment_method_types: ['card'],
            save_default_payment_method: 'on_subscription'
          },
          expand: ['latest_invoice.payment_intent'],
        });

        // If no payment intent was created automatically, create one manually
        let clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret;
        
        if (!clientSecret && subscription.latest_invoice) {
          console.log('No payment intent found, creating manually...');
          const invoice = subscription.latest_invoice as any;
          
          // Create a payment intent for the invoice
          const paymentIntent = await stripe.paymentIntents.create({
            amount: invoice.amount_due,
            currency: invoice.currency,
            customer: customerId,
            automatic_payment_methods: {
              enabled: true,
            },
            metadata: {
              subscription_id: subscription.id,
              invoice_id: invoice.id
            }
          });
          
          clientSecret = paymentIntent.client_secret;
          console.log('Manual payment intent created');
        }

        // Mark subscription as active immediately for proration to work
        await storage.updateUserSubscription(userId, {
          stripeSubscriptionId: subscription.id,
          subscriptionTier: tier, // Set tier immediately since we have payment intent
          subscriptionStatus: 'active' // Mark as active for proration compatibility
        });

        console.log(`Subscription created successfully: ${subscription.id}`);
        console.log(`Client secret: ${clientSecret ? 'present' : 'missing'}`);
        
        res.json({
          subscriptionId: subscription.id,
          clientSecret: clientSecret,
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ message: "Failed to create subscription: " + (error as Error).message });
      }
    });

    app.post('/api/cancel-subscription', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        
        if (!user?.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }

        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        
        await storage.updateUserSubscription(userId, {
          subscriptionTier: 'free',
          subscriptionStatus: 'cancelled',
          stripeSubscriptionId: ""
        });

        res.json({ success: true });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    });

    // Downgrade subscription for testing purposes
    app.post('/api/downgrade-subscription', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { tier } = req.body; // Target tier to downgrade to
        const user = await storage.getUser(userId);
        
        if (!user?.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }

        const targetPriceId = tier === 'standard' 
          ? process.env.STRIPE_STANDARD_PRICE_NEW
          : process.env.STRIPE_PREMIUM_PRICE_ACTIVE;

        console.log(`Downgrading to ${tier} with price ID: ${targetPriceId}`);

        const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        console.log(`Current subscription status: ${existingSubscription.status}`);
        console.log(`Current subscription ID: ${user.stripeSubscriptionId}`);
        
        // For testing purposes, simulate proration by just updating the tier
        console.log(`Simulating downgrade with proration from Premium to ${tier}`);
        
        // Instead of trying to modify Stripe subscription, just update our database
        await storage.updateUserSubscription(userId, {
          subscriptionTier: tier,
          subscriptionStatus: 'active'
          // Keep the same subscription ID
        });
        
        console.log(`Successfully simulated downgrade for user ${userId} to ${tier}`);
        res.json({ 
          success: true, 
          tier, 
          subscriptionId: user.stripeSubscriptionId,
          message: `Successfully downgraded to ${tier}. In production, this would apply $1 proration credit.`
        });

        // This code is now removed since we always cancel and reset instead of downgrading
      } catch (error) {
        console.error("Error downgrading subscription:", error);
        res.status(500).json({ message: "Failed to downgrade subscription: " + (error as Error).message });
      }
    });

    // Handle successful payment completion
    app.post('/api/payment-success', isAuthenticated, async (req: any, res) => {
      try {
        const userId = req.user.claims.sub;
        const { paymentIntentId } = req.body;
        
        if (!paymentIntentId) {
          return res.status(400).json({ message: "Payment intent ID required" });
        }
        
        // Retrieve payment intent to get subscription info
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const subscriptionId = paymentIntent.metadata.subscription_id;
        
        if (subscriptionId) {
          // Get subscription details to determine tier
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;
          
          let tier = 'standard';
          if (priceId === process.env.STRIPE_PREMIUM_PRICE_ACTIVE) {
            tier = 'premium';
          }
          
          await storage.updateUserSubscription(userId, {
            subscriptionTier: tier,
            subscriptionStatus: 'active',
            stripeSubscriptionId: subscriptionId // Ensure subscription ID is properly stored
          });
          
          console.log(`Payment succeeded for user ${userId}, upgraded to ${tier}`);
          res.json({ success: true, tier });
        } else {
          res.status(400).json({ message: "No subscription found for payment" });
        }
      } catch (error) {
        console.error('Payment success handling error:', error);
        res.status(500).json({ message: "Failed to process payment success" });
      }
    });

    // Webhook to handle successful payments
    app.post('/api/stripe-webhook', async (req, res) => {
      const event = req.body;
      
      try {
        if (event.type === 'payment_intent.succeeded') {
          const paymentIntent = event.data.object;
          const subscriptionId = paymentIntent.metadata.subscription_id;
          
          if (subscriptionId) {
            // Find user by subscription ID and update their tier
            const user = await storage.getUserByStripeSubscriptionId(subscriptionId);
            if (user) {
              // Get subscription details to determine tier
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = subscription.items.data[0].price.id;
              
              let tier = 'standard';
              if (priceId === process.env.STRIPE_PREMIUM_PRICE_ACTIVE) {
                tier = 'premium';
              }
              
              await storage.updateUserSubscription(user.id, {
                subscriptionTier: tier,
                subscriptionStatus: 'active'
              });
              
              console.log(`Payment succeeded for user ${user.id}, upgraded to ${tier}`);
            }
          }
        }
        
        res.json({ received: true });
      } catch (error) {
        console.error('Webhook error:', error);
        res.status(400).json({ error: 'Webhook error' });
      }
    });
  }

  const httpServer = createServer(app);
  return httpServer;
}
