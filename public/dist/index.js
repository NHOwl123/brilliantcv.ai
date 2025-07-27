var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/index.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import Stripe from "stripe";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  education: () => education,
  insertEducationSchema: () => insertEducationSchema,
  insertJobApplicationSchema: () => insertJobApplicationSchema,
  insertUserProfileSchema: () => insertUserProfileSchema,
  insertWorkExperienceSchema: () => insertWorkExperienceSchema,
  jobApplications: () => jobApplications,
  sessions: () => sessions,
  userProfiles: () => userProfiles,
  users: () => users,
  workExperience: () => workExperience
});
import { sql } from "drizzle-orm";
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull()
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: varchar("subscription_tier").default("free"),
  // free, standard, premium
  subscriptionStatus: varchar("subscription_status").default("active"),
  applicationCount: integer("application_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  professionalSummary: text("professional_summary"),
  skills: text("skills").array(),
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  linkedinUrl: varchar("linkedin_url"),
  portfolioUrl: varchar("portfolio_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var workExperience = pgTable("work_experience", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: varchar("user_profile_id").references(() => userProfiles.id).notNull(),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location"),
  startDate: varchar("start_date").notNull(),
  // YYYY-MM format
  endDate: varchar("end_date"),
  // YYYY-MM format, null for current
  description: text("description").notNull(),
  achievements: text("achievements").array(),
  isCurrentRole: boolean("is_current_role").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var education = pgTable("education", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: varchar("user_profile_id").references(() => userProfiles.id).notNull(),
  institution: varchar("institution").notNull(),
  degree: varchar("degree").notNull(),
  fieldOfStudy: varchar("field_of_study"),
  startDate: varchar("start_date"),
  // YYYY-MM format
  endDate: varchar("end_date"),
  // YYYY-MM format
  gpa: varchar("gpa"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow()
});
var jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company").notNull(),
  jobDescription: text("job_description").notNull(),
  applicationStatus: varchar("application_status").default("applied"),
  // applied, interview, rejected, offer
  appliedDate: timestamp("applied_date").defaultNow(),
  interviewDate: timestamp("interview_date"),
  notes: text("notes"),
  resumeContent: text("resume_content"),
  coverLetterContent: text("cover_letter_content"),
  jobUrl: varchar("job_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var insertWorkExperienceSchema = createInsertSchema(workExperience).omit({
  id: true,
  createdAt: true
});
var insertEducationSchema = createInsertSchema(education).omit({
  id: true,
  createdAt: true
});
var insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

// server/db.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";
neonConfig.webSocketConstructor = ws;
neonConfig.useSecureWebSocket = true;
neonConfig.pipelineConnect = false;
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 3e4,
  connectionTimeoutMillis: 1e4
});
pool.on("error", (err) => {
  console.error("Database pool error:", err);
});
var db = drizzle({ client: pool, schema: schema_exports });

// server/storage.ts
import { eq, desc, sql as sql2 } from "drizzle-orm";
var DatabaseStorage = class {
  // User operations
  async getUser(id) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  async getUserByStripeSubscriptionId(subscriptionId) {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }
  async upsertUser(userData) {
    const [user] = await db.insert(users).values(userData).onConflictDoUpdate({
      target: users.id,
      set: {
        ...userData,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return user;
  }
  async updateUserSubscription(userId, subscriptionData) {
    const [user] = await db.update(users).set({ ...subscriptionData, updatedAt: /* @__PURE__ */ new Date() }).where(eq(users.id, userId)).returning();
    return user;
  }
  async incrementApplicationCount(userId) {
    await db.update(users).set({
      applicationCount: sql2`${users.applicationCount} + 1`,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq(users.id, userId));
  }
  // Profile operations
  async getUserProfile(userId) {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }
  async createUserProfile(profile) {
    const [created] = await db.insert(userProfiles).values(profile).returning();
    return created;
  }
  async updateUserProfile(userId, profile) {
    const [updated] = await db.update(userProfiles).set({ ...profile, updatedAt: /* @__PURE__ */ new Date() }).where(eq(userProfiles.userId, userId)).returning();
    return updated;
  }
  // Work experience operations
  async getUserWorkExperience(userProfileId) {
    return await db.select().from(workExperience).where(eq(workExperience.userProfileId, userProfileId)).orderBy(desc(workExperience.startDate));
  }
  async createWorkExperience(experience) {
    const [created] = await db.insert(workExperience).values(experience).returning();
    return created;
  }
  async updateWorkExperience(id, experience) {
    const [updated] = await db.update(workExperience).set(experience).where(eq(workExperience.id, id)).returning();
    return updated;
  }
  async deleteWorkExperience(id) {
    await db.delete(workExperience).where(eq(workExperience.id, id));
  }
  // Education operations
  async getUserEducation(userProfileId) {
    return await db.select().from(education).where(eq(education.userProfileId, userProfileId)).orderBy(desc(education.startDate));
  }
  async createEducation(educationData) {
    const [created] = await db.insert(education).values(educationData).returning();
    return created;
  }
  async updateEducation(id, educationData) {
    const [updated] = await db.update(education).set(educationData).where(eq(education.id, id)).returning();
    return updated;
  }
  async deleteEducation(id) {
    await db.delete(education).where(eq(education.id, id));
  }
  // Job application operations
  async getUserApplications(userId, limit) {
    const query = db.select().from(jobApplications).where(eq(jobApplications.userId, userId)).orderBy(desc(jobApplications.appliedDate));
    if (limit) {
      return await query.limit(limit);
    }
    return await query;
  }
  async createJobApplication(application) {
    const [created] = await db.insert(jobApplications).values(application).returning();
    return created;
  }
  async updateJobApplication(id, application) {
    const [updated] = await db.update(jobApplications).set({ ...application, updatedAt: /* @__PURE__ */ new Date() }).where(eq(jobApplications.id, id)).returning();
    return updated;
  }
  async deleteJobApplication(id) {
    await db.delete(jobApplications).where(eq(jobApplications.id, id));
  }
  async getApplicationById(id) {
    const [application] = await db.select().from(jobApplications).where(eq(jobApplications.id, id));
    return application;
  }
};
var storage = new DatabaseStorage();

// server/replitAuth.ts
import * as client from "openid-client";
import { Strategy } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
if (!process.env.REPLIT_DOMAINS) {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}
var getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID
    );
  },
  { maxAge: 3600 * 1e3 }
);
function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1e3;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions"
  });
  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl
    }
  });
}
function updateUserSession(user, tokens) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}
async function upsertUser(claims) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"]
  });
}
async function setupAuth(app2) {
  app2.set("trust proxy", 1);
  app2.use(getSession());
  app2.use(passport.initialize());
  app2.use(passport.session());
  const config = await getOidcConfig();
  const verify = async (tokens, verified) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };
  for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
    const strategy = new Strategy(
      {
        name: `replitauth:${domain}`,
        config,
        scope: "openid email profile offline_access",
        callbackURL: `https://${domain}/api/callback`
      },
      verify
    );
    passport.use(strategy);
  }
  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user));
  app2.get("/api/login", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"]
    })(req, res, next);
  });
  app2.get("/api/callback", (req, res, next) => {
    passport.authenticate(`replitauth:${req.hostname}`, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login"
    })(req, res, next);
  });
  app2.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`
        }).href
      );
    });
  });
}
var isAuthenticated = async (req, res, next) => {
  const user = req.user;
  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const now = Math.floor(Date.now() / 1e3);
  if (now <= user.expires_at) {
    return next();
  }
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// server/services/openai.ts
import OpenAI from "openai";
var openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET_KEY || ""
});
async function analyzeJobDescription(jobDescription) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert HR analyst. Analyze the job description and extract key information. 
          Respond with JSON in this format: {
            "keyRequirements": ["requirement1", "requirement2"],
            "skills": ["skill1", "skill2"], 
            "experience": ["exp1", "exp2"],
            "education": ["education requirement"],
            "certifications": ["cert1", "cert2"],
            "matchScore": 85
          }`
        },
        {
          role: "user",
          content: `Analyze this job description:

${jobDescription}`
        }
      ],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error("Failed to analyze job description: " + error.message);
  }
}
async function generateTailoredResume(userProfile, workExperience2, education2, jobDescription, jobAnalysis) {
  try {
    const profileData = {
      summary: userProfile.professionalSummary,
      skills: userProfile.skills || [],
      certifications: userProfile.certifications || [],
      languages: userProfile.languages || [],
      workExperience: workExperience2,
      education: education2
    };
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert resume writer specializing in finance and accounting roles. 
          Create a tailored resume that emphasizes the most relevant experience and skills for the target job.
          Focus on quantifiable achievements and use industry-specific terminology.
          Format the resume in a clean, professional text format suitable for ATS systems.`
        },
        {
          role: "user",
          content: `Create a tailored resume for this profile:
          
          Profile: ${JSON.stringify(profileData, null, 2)}
          
          Target Job Description: ${jobDescription}
          
          Key Requirements to Address: ${jobAnalysis.keyRequirements.join(", ")}
          
          Please reorder and rewrite the experience to best match this specific role, emphasizing relevant achievements and skills.`
        }
      ]
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate tailored resume: " + error.message);
  }
}
async function generateCoverLetter(userProfile, jobTitle, companyName, jobDescription, jobAnalysis) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert cover letter writer. Create personalized, engaging cover letters 
          that demonstrate genuine interest in the role and company while highlighting relevant qualifications.
          Keep the tone professional but personable. Focus on specific achievements and how they relate to the job requirements.`
        },
        {
          role: "user",
          content: `Create a cover letter for:
          
          Position: ${jobTitle}
          Company: ${companyName}
          
          Candidate Profile: ${JSON.stringify(userProfile, null, 2)}
          
          Job Description: ${jobDescription}
          
          Key Requirements: ${jobAnalysis.keyRequirements.join(", ")}
          
          Make it specific to this role and company, showing how the candidate's background aligns with their needs.`
        }
      ]
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate cover letter: " + error.message);
  }
}
async function generateInterviewPrep(jobDescription, userProfile, jobAnalysis) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an interview coach specializing in finance and accounting roles. 
          Generate likely interview questions, preparation tips, and suggested answers based on the job requirements and candidate profile.
          Respond with JSON in this format: {
            "questions": ["question1", "question2"],
            "tips": ["tip1", "tip2"],
            "answers": {"question1": "suggested answer"}
          }`
        },
        {
          role: "user",
          content: `Generate interview preparation for:
          
          Job Description: ${jobDescription}
          
          Candidate Profile: ${JSON.stringify(userProfile, null, 2)}
          
          Key Requirements: ${jobAnalysis.keyRequirements.join(", ")}
          
          Focus on behavioral questions, technical questions relevant to the role, and questions about gaps or weaknesses.`
        }
      ],
      response_format: { type: "json_object" }
    });
    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error("Failed to generate interview preparation: " + error.message);
  }
}

// server/services/documentGenerator.ts
async function generatePDF(content, filename) {
  const pdfContent = `PDF Document: ${filename}

${content}`;
  return Buffer.from(pdfContent, "utf8");
}
async function generateWordDoc(content, filename) {
  const docContent = `Word Document: ${filename}

${content}`;
  return Buffer.from(docContent, "utf8");
}
function formatResumeForExport(resumeContent) {
  return resumeContent.replace(/\n\s*\n/g, "\n\n").trim();
}
function formatCoverLetterForExport(coverLetterContent) {
  return coverLetterContent.replace(/\n\s*\n/g, "\n\n").trim();
}
async function generateApplicationDocuments(options) {
  const files = [];
  if (options.type === "resume" || options.type === "both") {
    if (options.content.resume) {
      const formattedContent = formatResumeForExport(options.content.resume);
      const filename = `${options.filename}_resume.${options.format === "pdf" ? "pdf" : "docx"}`;
      const buffer = options.format === "pdf" ? await generatePDF(formattedContent, filename) : await generateWordDoc(formattedContent, filename);
      files.push({
        name: filename,
        buffer,
        mimeType: options.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
    }
  }
  if (options.type === "cover-letter" || options.type === "both") {
    if (options.content.coverLetter) {
      const formattedContent = formatCoverLetterForExport(options.content.coverLetter);
      const filename = `${options.filename}_cover_letter.${options.format === "pdf" ? "pdf" : "docx"}`;
      const buffer = options.format === "pdf" ? await generatePDF(formattedContent, filename) : await generateWordDoc(formattedContent, filename);
      files.push({
        name: filename,
        buffer,
        mimeType: options.format === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });
    }
  }
  return { files };
}

// server/services/resumeParser.ts
import Anthropic from "@anthropic-ai/sdk";
var DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";
var anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
async function parseResumeText(resumeText) {
  if (resumeText.length > 1e5) {
    resumeText = resumeText.substring(0, 1e5) + "\n\n[Resume content truncated for processing]";
  }
  const prompt = `
You are an expert resume parser. Extract structured information from the following resume text and return it as JSON.

Please extract:
1. Personal information (name, email, phone, location, LinkedIn URL, portfolio URL)
2. Professional summary or objective
3. Skills (as an array of individual skills)
4. Work experience (job title, company, location, dates, description, key achievements)
5. Education (institution, degree, field of study, dates, GPA if mentioned)
6. Certifications
7. Languages

For dates, convert them to YYYY-MM format. If only year is provided, use YYYY-01.
For current positions, set isCurrentRole to true and leave endDate empty.
Extract key achievements separately from job descriptions.

Resume text:
${resumeText}

Return the data in this exact JSON format:
{
  "personalInfo": {
    "name": "string",
    "email": "string", 
    "phone": "string",
    "location": "string",
    "linkedinUrl": "string",
    "portfolioUrl": "string"
  },
  "professionalSummary": "string",
  "skills": ["skill1", "skill2"],
  "workExperience": [
    {
      "jobTitle": "string",
      "company": "string", 
      "location": "string",
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "description": "string",
      "achievements": ["achievement1", "achievement2"],
      "isCurrentRole": false
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "fieldOfStudy": "string", 
      "startDate": "YYYY-MM",
      "endDate": "YYYY-MM",
      "gpa": "string",
      "description": "string"
    }
  ],
  "certifications": ["cert1", "cert2"],
  "languages": ["language1", "language2"]
}
`;
  try {
    const response = await anthropic.messages.create({
      // "claude-sonnet-4-20250514"
      model: DEFAULT_MODEL_STR,
      max_tokens: 4e3,
      system: "You are an expert resume parser. Extract information accurately and return valid JSON only.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1
    });
    let responseText = response.content[0].text || "{}";
    responseText = responseText.trim();
    if (responseText.startsWith("```json")) {
      responseText = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
    } else if (responseText.startsWith("```")) {
      responseText = responseText.replace(/^```\s*/, "").replace(/\s*```$/, "");
    }
    const parsedData = JSON.parse(responseText);
    return parsedData;
  } catch (error) {
    console.error("Error parsing resume:", error);
    if (error.status === 429) {
      const resetTime = error.headers?.["anthropic-ratelimit-input-tokens-reset"];
      if (resetTime) {
        const resetDate = new Date(resetTime);
        const waitMinutes = Math.ceil((resetDate.getTime() - Date.now()) / 1e3 / 60);
        throw new Error(`Rate limit exceeded. Please wait ${waitMinutes} minutes and try again.`);
      }
      throw new Error("Rate limit exceeded. Please wait a few minutes and try again.");
    }
    throw new Error("Failed to parse resume content");
  }
}
async function parseResumeFile(fileBuffer, mimeType) {
  let resumeText = "";
  if (mimeType === "application/pdf") {
    throw new Error("PDF upload temporarily unavailable. Please upload a Word document (.docx) or text file (.txt) for now.");
  } else if (mimeType.includes("text") || mimeType.includes("word") || mimeType.includes("document")) {
    resumeText = fileBuffer.toString("utf-8");
    resumeText = resumeText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "").replace(/\s+/g, " ").trim();
    if (resumeText.length > 15e4) {
      resumeText = resumeText.substring(0, 15e4) + "\n\n[Document truncated for processing]";
    }
  } else {
    throw new Error("Unsupported file format. Please upload a Word document (.docx) or text file (.txt).");
  }
  return await parseResumeText(resumeText);
}

// server/routes.ts
import multer from "multer";
var stripeSecretKey = process.env.STRIPE_SECRET_KEY_NEW || process.env.STRIPE_SECRET_KEY;
var stripe = stripeSecretKey ? new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil"
}) : null;
async function registerRoutes(app2) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    // 10MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // .docx
        "application/msword",
        // .doc
        "text/plain"
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("Invalid file type. Only PDF, Word documents, and text files are allowed."));
      }
    }
  });
  await setupAuth(app2);
  app2.get("/api/auth/user", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
  app2.get("/api/profile", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: "",
          skills: [],
          certifications: [],
          languages: []
        });
      }
      const workExperience2 = await storage.getUserWorkExperience(profile.id);
      const education2 = await storage.getUserEducation(profile.id);
      res.json({
        profile,
        workExperience: workExperience2,
        education: education2
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });
  app2.post("/api/profile", isAuthenticated, async (req, res) => {
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
  app2.post("/api/work-experience", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: "",
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
  app2.put("/api/work-experience/:id", isAuthenticated, async (req, res) => {
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
  app2.delete("/api/work-experience/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkExperience(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting work experience:", error);
      res.status(500).json({ message: "Failed to delete work experience" });
    }
  });
  app2.post("/api/parse-resume-preview", isAuthenticated, upload.single("resume"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const parsedData = await parseResumeFile(req.file.buffer, req.file.mimetype);
      res.json({
        message: "Resume parsed successfully",
        parsedData
      });
    } catch (error) {
      console.error("Resume parsing error:", error);
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
  app2.post("/api/apply-resume-data", isAuthenticated, async (req, res) => {
    try {
      const { strategy, parsedData, conflictResolutions } = req.body;
      const userId = req.user.claims.sub;
      if (!parsedData) {
        return res.status(400).json({ message: "No parsed data provided" });
      }
      let updatedCount = 0;
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: parsedData.personalInfo?.summary || "",
          skills: parsedData.skills || [],
          certifications: parsedData.certifications || [],
          languages: parsedData.languages || [],
          linkedinUrl: parsedData.personalInfo?.linkedinUrl || "",
          portfolioUrl: parsedData.personalInfo?.portfolioUrl || ""
        });
        updatedCount++;
      } else if (strategy === "replace") {
        await storage.updateUserProfile(userId, {
          professionalSummary: parsedData.personalInfo?.summary || profile.professionalSummary,
          skills: parsedData.skills || profile.skills,
          certifications: parsedData.certifications || profile.certifications,
          languages: parsedData.languages || profile.languages,
          linkedinUrl: parsedData.personalInfo?.linkedinUrl || profile.linkedinUrl,
          portfolioUrl: parsedData.personalInfo?.portfolioUrl || profile.portfolioUrl
        });
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
        const currentSkills = profile.skills || [];
        const currentCertifications = profile.certifications || [];
        const currentLanguages = profile.languages || [];
        const newSkills = parsedData.skills || [];
        const newCertifications = parsedData.certifications || [];
        const newLanguages = parsedData.languages || [];
        const mergedSkills = Array.from(/* @__PURE__ */ new Set([...currentSkills, ...newSkills]));
        const mergedCertifications = Array.from(/* @__PURE__ */ new Set([...currentCertifications, ...newCertifications]));
        const mergedLanguages = Array.from(/* @__PURE__ */ new Set([...currentLanguages, ...newLanguages]));
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
      if (parsedData.workExperience && parsedData.workExperience.length > 0) {
        const existingExperience = strategy === "merge" ? await storage.getUserWorkExperience(profile.id) : [];
        for (const experience of parsedData.workExperience) {
          if (strategy === "merge") {
            const duplicate = existingExperience.find(
              (exp) => exp.jobTitle.toLowerCase() === experience.jobTitle.toLowerCase() && exp.company.toLowerCase() === experience.company.toLowerCase()
            );
            if (duplicate) {
              const conflictId = `experience-${parsedData.workExperience.indexOf(experience)}`;
              if (conflictResolutions[conflictId] === "new") {
                await storage.updateWorkExperience(duplicate.id, {
                  startDate: experience.startDate,
                  endDate: experience.endDate,
                  description: experience.description || duplicate.description
                });
                updatedCount++;
              }
              continue;
            }
          }
          await storage.createWorkExperience({
            userProfileId: profile.id,
            jobTitle: experience.jobTitle,
            company: experience.company,
            location: experience.location || "",
            startDate: experience.startDate,
            endDate: experience.endDate,
            description: experience.description || "",
            isCurrentRole: experience.isCurrentRole || false
          });
          updatedCount++;
        }
      }
      if (parsedData.education && parsedData.education.length > 0) {
        const existingEducation = strategy === "merge" ? await storage.getUserEducation(profile.id) : [];
        for (const education2 of parsedData.education) {
          if (strategy === "merge") {
            const duplicate = existingEducation.find(
              (edu) => edu.institution.toLowerCase() === education2.institution.toLowerCase() && edu.degree.toLowerCase() === education2.degree.toLowerCase()
            );
            if (duplicate) {
              const conflictId = `education-${parsedData.education.indexOf(education2)}`;
              if (conflictResolutions[conflictId] === "new") {
                await storage.updateEducation(duplicate.id, {
                  startDate: education2.startDate,
                  endDate: education2.endDate,
                  gpa: education2.gpa || duplicate.gpa,
                  description: education2.description || duplicate.description
                });
                updatedCount++;
              }
              continue;
            }
          }
          await storage.createEducation({
            userProfileId: profile.id,
            institution: education2.institution,
            degree: education2.degree,
            fieldOfStudy: education2.fieldOfStudy || "",
            startDate: education2.startDate,
            endDate: education2.endDate,
            gpa: education2.gpa || "",
            description: education2.description || ""
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
  app2.post("/api/parse-resume", isAuthenticated, upload.single("resume"), async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const parsedData = await parseResumeFile(req.file.buffer, req.file.mimetype);
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: "",
          skills: [],
          certifications: [],
          languages: []
        });
      }
      const updatedProfile = {
        professionalSummary: profile.professionalSummary || parsedData.professionalSummary || "",
        skills: profile.skills?.length ? profile.skills : parsedData.skills,
        certifications: profile.certifications?.length ? profile.certifications : parsedData.certifications,
        languages: profile.languages?.length ? profile.languages : parsedData.languages,
        linkedinUrl: profile.linkedinUrl || parsedData.personalInfo.linkedinUrl || "",
        portfolioUrl: profile.portfolioUrl || parsedData.personalInfo.portfolioUrl || ""
      };
      await storage.updateUserProfile(userId, updatedProfile);
      const existingExperience = await storage.getUserWorkExperience(profile.id);
      const newExperiencePromises = parsedData.workExperience.filter((exp) => !existingExperience.some((existing) => existing.jobTitle === exp.jobTitle && existing.company === exp.company)).map((exp) => storage.createWorkExperience({
        userProfileId: profile.id,
        jobTitle: exp.jobTitle,
        company: exp.company,
        location: exp.location || "",
        startDate: exp.startDate,
        endDate: exp.endDate || "",
        description: exp.description,
        achievements: exp.achievements,
        isCurrentRole: exp.isCurrentRole
      }));
      const existingEducation = await storage.getUserEducation(profile.id);
      const newEducationPromises = parsedData.education.filter((edu) => !existingEducation.some((existing) => existing.institution === edu.institution && existing.degree === edu.degree)).map((edu) => storage.createEducation({
        userProfileId: profile.id,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy || "",
        startDate: edu.startDate || "",
        endDate: edu.endDate || "",
        gpa: edu.gpa || "",
        description: edu.description || ""
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
      res.status(500).json({ message: "Failed to parse resume: " + error.message });
    }
  });
  app2.post("/api/education", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      let profile = await storage.getUserProfile(userId);
      if (!profile) {
        profile = await storage.createUserProfile({
          userId,
          professionalSummary: "",
          skills: [],
          certifications: [],
          languages: []
        });
      }
      const educationData = insertEducationSchema.parse({
        ...req.body,
        userProfileId: profile.id
      });
      const education2 = await storage.createEducation(educationData);
      res.json(education2);
    } catch (error) {
      console.error("Error creating education:", error);
      res.status(500).json({ message: "Failed to create education" });
    }
  });
  app2.put("/api/education/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const educationData = req.body;
      const education2 = await storage.updateEducation(id, educationData);
      res.json(education2);
    } catch (error) {
      console.error("Error updating education:", error);
      res.status(500).json({ message: "Failed to update education" });
    }
  });
  app2.delete("/api/education/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteEducation(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting education:", error);
      res.status(500).json({ message: "Failed to delete education" });
    }
  });
  app2.post("/api/generate-application", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const { jobDescription, jobTitle, company, jobUrl } = req.body;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.subscriptionTier === "free" && (user.applicationCount || 0) >= 5) {
        return res.status(403).json({ message: "Free tier limit reached. Please upgrade to continue." });
      }
      const profile = await storage.getUserProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found. Please complete your profile first." });
      }
      const workExperience2 = await storage.getUserWorkExperience(profile.id);
      const education2 = await storage.getUserEducation(profile.id);
      const jobAnalysis = await analyzeJobDescription(jobDescription);
      const [tailoredResume, coverLetter] = await Promise.all([
        generateTailoredResume(profile, workExperience2, education2, jobDescription, jobAnalysis),
        generateCoverLetter(profile, jobTitle, company, jobDescription, jobAnalysis)
      ]);
      const applicationData = insertJobApplicationSchema.parse({
        userId,
        jobTitle,
        company,
        jobDescription,
        jobUrl,
        resumeContent: tailoredResume,
        coverLetterContent: coverLetter,
        applicationStatus: "applied"
      });
      const application = await storage.createJobApplication(applicationData);
      await storage.incrementApplicationCount(userId);
      res.json({
        application,
        jobAnalysis,
        resume: tailoredResume,
        coverLetter
      });
    } catch (error) {
      console.error("Error generating application:", error);
      res.status(500).json({ message: "Failed to generate application: " + error.message });
    }
  });
  app2.get("/api/applications", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      if (user.subscriptionTier === "free") {
        return res.json([]);
      }
      const limit = user.subscriptionTier === "standard" ? 50 : void 0;
      const applications = await storage.getUserApplications(userId, limit);
      res.json(applications);
    } catch (error) {
      console.error("Error fetching applications:", error);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });
  app2.put("/api/applications/:id", isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { applicationStatus, interviewDate, notes } = req.body;
      const application = await storage.updateJobApplication(id, {
        applicationStatus,
        interviewDate: interviewDate ? new Date(interviewDate) : void 0,
        notes
      });
      res.json(application);
    } catch (error) {
      console.error("Error updating application:", error);
      res.status(500).json({ message: "Failed to update application" });
    }
  });
  app2.post("/api/interview-prep/:applicationId", isAuthenticated, async (req, res) => {
    try {
      const { applicationId } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      if (!user || user.subscriptionTier === "free") {
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
  app2.post("/api/download-documents", isAuthenticated, async (req, res) => {
    try {
      const { applicationId, format, type } = req.body;
      const userId = req.user.claims.sub;
      const application = await storage.getApplicationById(applicationId);
      if (!application || application.userId !== userId) {
        return res.status(404).json({ message: "Application not found" });
      }
      const documents = await generateApplicationDocuments({
        format: format || "pdf",
        type: type || "both",
        content: {
          resume: application.resumeContent || void 0,
          coverLetter: application.coverLetterContent || void 0
        },
        filename: `${application.company}_${application.jobTitle}`.replace(/[^a-zA-Z0-9]/g, "_")
      });
      if (documents.files.length === 0) {
        return res.status(400).json({ message: "No documents available for download" });
      }
      if (documents.files.length === 1) {
        const file = documents.files[0];
        res.setHeader("Content-Type", file.mimeType);
        res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
        return res.send(file.buffer);
      }
      res.setHeader("Content-Type", "application/json");
      res.json({
        message: "Multiple files generated",
        files: documents.files.map((f) => ({ name: f.name, size: f.buffer.length }))
      });
    } catch (error) {
      console.error("Error downloading documents:", error);
      res.status(500).json({ message: "Failed to download documents" });
    }
  });
  if (stripe) {
    app2.post("/api/create-subscription", isAuthenticated, async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const { tier } = req.body;
        const user = await storage.getUser(userId);
        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }
        const priceId = tier === "premium" ? process.env.STRIPE_PREMIUM_PRICE_ACTIVE : process.env.STRIPE_STANDARD_PRICE_NEW;
        if (!priceId) {
          throw new Error(`Price ID not configured for ${tier} tier`);
        }
        if (!priceId.startsWith("price_")) {
          throw new Error(`Invalid Price ID format: ${priceId}. Expected format: price_1ABC123... but got: ${priceId}. Please check your Stripe Price IDs in the secrets.`);
        }
        if (user.stripeSubscriptionId) {
          console.log(`User already has subscription: ${user.stripeSubscriptionId}`);
          const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
          console.log(`Existing subscription status: ${existingSubscription.status}`);
          if (existingSubscription.status === "incomplete_expired") {
            console.log("Cancelling expired incomplete subscription and creating new one");
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            await storage.updateUserSubscription(userId, { stripeSubscriptionId: "" });
          } else if (existingSubscription.status === "active") {
            console.log("Upgrading existing ACTIVE subscription with proration");
            const currentPriceId = existingSubscription.items.data[0].price.id;
            console.log(`Current price: ${currentPriceId}, Target price: ${priceId}`);
            if (currentPriceId === priceId) {
              return res.json({
                subscriptionId: existingSubscription.id,
                upgraded: true,
                message: "You're already on this plan"
              });
            }
            const updatedSubscription = await stripe.subscriptions.update(user.stripeSubscriptionId, {
              items: [{
                id: existingSubscription.items.data[0].id,
                price: priceId
              }],
              proration_behavior: "create_prorations",
              // This creates proration
              payment_behavior: "default_incomplete",
              expand: ["latest_invoice.payment_intent"]
            });
            console.log(`Updated subscription status: ${updatedSubscription.status}`);
            const clientSecret2 = updatedSubscription.latest_invoice?.payment_intent?.client_secret;
            console.log(`Client secret from proration: ${clientSecret2 ? "present" : "none"}`);
            if (!clientSecret2) {
              await storage.updateUserSubscription(userId, {
                subscriptionTier: tier,
                subscriptionStatus: "active"
              });
              return res.json({
                subscriptionId: updatedSubscription.id,
                upgraded: true,
                message: "Subscription upgraded successfully - no additional payment required"
              });
            }
            return res.json({
              subscriptionId: updatedSubscription.id,
              clientSecret: clientSecret2,
              upgrade: true
            });
          } else if (existingSubscription.status === "incomplete") {
            console.log("Found incomplete subscription - completing payment instead of creating new subscription");
            const invoices = await stripe.invoices.list({
              subscription: user.stripeSubscriptionId,
              status: "open",
              limit: 1
            });
            if (invoices.data.length > 0) {
              const invoice = invoices.data[0];
              const paymentIntent = invoice.payment_intent;
              if (paymentIntent && typeof paymentIntent === "object") {
                return res.json({
                  subscriptionId: existingSubscription.id,
                  clientSecret: paymentIntent.client_secret,
                  completing: true
                });
              }
            }
            console.log("No payment intent found, cancelling incomplete subscription");
            await stripe.subscriptions.cancel(user.stripeSubscriptionId);
            await storage.updateUserSubscription(userId, { stripeSubscriptionId: "" });
          } else {
            return res.status(400).json({ message: `Cannot upgrade subscription in status: ${existingSubscription.status}` });
          }
        }
        let customerId = user.stripeCustomerId;
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: user.email || "",
            name: `${user.firstName || ""} ${user.lastName || ""}`.trim()
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
          payment_behavior: "default_incomplete",
          payment_settings: {
            payment_method_types: ["card"],
            save_default_payment_method: "on_subscription"
          },
          expand: ["latest_invoice.payment_intent"]
        });
        let clientSecret = subscription.latest_invoice?.payment_intent?.client_secret;
        if (!clientSecret && subscription.latest_invoice) {
          console.log("No payment intent found, creating manually...");
          const invoice = subscription.latest_invoice;
          const paymentIntent = await stripe.paymentIntents.create({
            amount: invoice.amount_due,
            currency: invoice.currency,
            customer: customerId,
            automatic_payment_methods: {
              enabled: true
            },
            metadata: {
              subscription_id: subscription.id,
              invoice_id: invoice.id
            }
          });
          clientSecret = paymentIntent.client_secret;
          console.log("Manual payment intent created");
        }
        await storage.updateUserSubscription(userId, {
          stripeSubscriptionId: subscription.id,
          subscriptionTier: tier,
          // Set tier immediately since we have payment intent
          subscriptionStatus: "active"
          // Mark as active for proration compatibility
        });
        console.log(`Subscription created successfully: ${subscription.id}`);
        console.log(`Client secret: ${clientSecret ? "present" : "missing"}`);
        res.json({
          subscriptionId: subscription.id,
          clientSecret
        });
      } catch (error) {
        console.error("Error creating subscription:", error);
        res.status(500).json({ message: "Failed to create subscription: " + error.message });
      }
    });
    app2.post("/api/cancel-subscription", isAuthenticated, async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const user = await storage.getUser(userId);
        if (!user?.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }
        await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        await storage.updateUserSubscription(userId, {
          subscriptionTier: "free",
          subscriptionStatus: "cancelled",
          stripeSubscriptionId: ""
        });
        res.json({ success: true });
      } catch (error) {
        console.error("Error cancelling subscription:", error);
        res.status(500).json({ message: "Failed to cancel subscription" });
      }
    });
    app2.post("/api/downgrade-subscription", isAuthenticated, async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const { tier } = req.body;
        const user = await storage.getUser(userId);
        if (!user?.stripeSubscriptionId) {
          return res.status(404).json({ message: "No active subscription found" });
        }
        const targetPriceId = tier === "standard" ? process.env.STRIPE_STANDARD_PRICE_NEW : process.env.STRIPE_PREMIUM_PRICE_ACTIVE;
        console.log(`Downgrading to ${tier} with price ID: ${targetPriceId}`);
        const existingSubscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        console.log(`Current subscription status: ${existingSubscription.status}`);
        console.log(`Current subscription ID: ${user.stripeSubscriptionId}`);
        console.log(`Simulating downgrade with proration from Premium to ${tier}`);
        await storage.updateUserSubscription(userId, {
          subscriptionTier: tier,
          subscriptionStatus: "active"
          // Keep the same subscription ID
        });
        console.log(`Successfully simulated downgrade for user ${userId} to ${tier}`);
        res.json({
          success: true,
          tier,
          subscriptionId: user.stripeSubscriptionId,
          message: `Successfully downgraded to ${tier}. In production, this would apply $1 proration credit.`
        });
      } catch (error) {
        console.error("Error downgrading subscription:", error);
        res.status(500).json({ message: "Failed to downgrade subscription: " + error.message });
      }
    });
    app2.post("/api/payment-success", isAuthenticated, async (req, res) => {
      try {
        const userId = req.user.claims.sub;
        const { paymentIntentId } = req.body;
        if (!paymentIntentId) {
          return res.status(400).json({ message: "Payment intent ID required" });
        }
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
        const subscriptionId = paymentIntent.metadata.subscription_id;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;
          let tier = "standard";
          if (priceId === process.env.STRIPE_PREMIUM_PRICE_ACTIVE) {
            tier = "premium";
          }
          await storage.updateUserSubscription(userId, {
            subscriptionTier: tier,
            subscriptionStatus: "active",
            stripeSubscriptionId: subscriptionId
            // Ensure subscription ID is properly stored
          });
          console.log(`Payment succeeded for user ${userId}, upgraded to ${tier}`);
          res.json({ success: true, tier });
        } else {
          res.status(400).json({ message: "No subscription found for payment" });
        }
      } catch (error) {
        console.error("Payment success handling error:", error);
        res.status(500).json({ message: "Failed to process payment success" });
      }
    });
    app2.post("/api/stripe-webhook", async (req, res) => {
      const event = req.body;
      try {
        if (event.type === "payment_intent.succeeded") {
          const paymentIntent = event.data.object;
          const subscriptionId = paymentIntent.metadata.subscription_id;
          if (subscriptionId) {
            const user = await storage.getUserByStripeSubscriptionId(subscriptionId);
            if (user) {
              const subscription = await stripe.subscriptions.retrieve(subscriptionId);
              const priceId = subscription.items.data[0].price.id;
              let tier = "standard";
              if (priceId === process.env.STRIPE_PREMIUM_PRICE_ACTIVE) {
                tier = "premium";
              }
              await storage.updateUserSubscription(user.id, {
                subscriptionTier: tier,
                subscriptionStatus: "active"
              });
              console.log(`Payment succeeded for user ${user.id}, upgraded to ${tier}`);
            }
          }
        }
        res.json({ received: true });
      } catch (error) {
        console.error("Webhook error:", error);
        res.status(400).json({ error: "Webhook error" });
      }
    });
  }
  const httpServer = createServer(app2);
  return httpServer;
}

// server/vite.ts
import express from "express";
import fs from "fs";
import path2 from "path";
import { createServer as createViteServer, createLogger } from "vite";

// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    ...process.env.NODE_ENV !== "production" && process.env.REPL_ID !== void 0 ? [
      await import("@replit/vite-plugin-cartographer").then(
        (m) => m.cartographer()
      )
    ] : []
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/vite.ts
import { nanoid } from "nanoid";
var viteLogger = createLogger();
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
async function setupVite(app2, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      }
    },
    server: serverOptions,
    appType: "custom"
  });
  app2.use(vite.middlewares);
  app2.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app2) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/index.ts
var app = express2();
app.use(express2.json());
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path3 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path3.startsWith("/api")) {
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
(async () => {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
})();
