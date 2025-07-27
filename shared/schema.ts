import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  subscriptionTier: varchar("subscription_tier").default("free"), // free, standard, premium
  subscriptionStatus: varchar("subscription_status").default("active"),
  applicationCount: integer("application_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  professionalSummary: text("professional_summary"),
  skills: text("skills").array(),
  certifications: text("certifications").array(),
  languages: text("languages").array(),
  linkedinUrl: varchar("linkedin_url"),
  portfolioUrl: varchar("portfolio_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const workExperience = pgTable("work_experience", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: varchar("user_profile_id").references(() => userProfiles.id).notNull(),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company").notNull(),
  location: varchar("location"),
  startDate: varchar("start_date").notNull(), // YYYY-MM format
  endDate: varchar("end_date"), // YYYY-MM format, null for current
  description: text("description").notNull(),
  achievements: text("achievements").array(),
  isCurrentRole: boolean("is_current_role").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const education = pgTable("education", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userProfileId: varchar("user_profile_id").references(() => userProfiles.id).notNull(),
  institution: varchar("institution").notNull(),
  degree: varchar("degree").notNull(),
  fieldOfStudy: varchar("field_of_study"),
  startDate: varchar("start_date"), // YYYY-MM format
  endDate: varchar("end_date"), // YYYY-MM format
  gpa: varchar("gpa"),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const jobApplications = pgTable("job_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  jobTitle: varchar("job_title").notNull(),
  company: varchar("company").notNull(),
  jobDescription: text("job_description").notNull(),
  applicationStatus: varchar("application_status").default("applied"), // applied, interview, rejected, offer
  appliedDate: timestamp("applied_date").defaultNow(),
  interviewDate: timestamp("interview_date"),
  notes: text("notes"),
  resumeContent: text("resume_content"),
  coverLetterContent: text("cover_letter_content"),
  jobUrl: varchar("job_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert and Select schemas
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkExperienceSchema = createInsertSchema(workExperience).omit({
  id: true,
  createdAt: true,
});

export const insertEducationSchema = createInsertSchema(education).omit({
  id: true,
  createdAt: true,
});

export const insertJobApplicationSchema = createInsertSchema(jobApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type WorkExperience = typeof workExperience.$inferSelect;
export type InsertWorkExperience = z.infer<typeof insertWorkExperienceSchema>;
export type Education = typeof education.$inferSelect;
export type InsertEducation = z.infer<typeof insertEducationSchema>;
export type JobApplication = typeof jobApplications.$inferSelect;
export type InsertJobApplication = z.infer<typeof insertJobApplicationSchema>;
