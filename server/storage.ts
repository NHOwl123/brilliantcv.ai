import {
  users,
  userProfiles,
  workExperience,
  education,
  jobApplications,
  type User,
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type WorkExperience,
  type InsertWorkExperience,
  type Education,
  type InsertEducation,
  type JobApplication,
  type InsertJobApplication,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscription(userId: string, subscriptionData: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionTier?: string; subscriptionStatus?: string }): Promise<User>;
  incrementApplicationCount(userId: string): Promise<void>;
  
  // Profile operations
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  createUserProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  // Work experience operations
  getUserWorkExperience(userProfileId: string): Promise<WorkExperience[]>;
  createWorkExperience(experience: InsertWorkExperience): Promise<WorkExperience>;
  updateWorkExperience(id: string, experience: Partial<InsertWorkExperience>): Promise<WorkExperience>;
  deleteWorkExperience(id: string): Promise<void>;
  
  // Education operations
  getUserEducation(userProfileId: string): Promise<Education[]>;
  createEducation(education: InsertEducation): Promise<Education>;
  updateEducation(id: string, education: Partial<InsertEducation>): Promise<Education>;
  deleteEducation(id: string): Promise<void>;
  
  // Job application operations
  getUserApplications(userId: string, limit?: number): Promise<JobApplication[]>;
  createJobApplication(application: InsertJobApplication): Promise<JobApplication>;
  updateJobApplication(id: string, application: Partial<InsertJobApplication>): Promise<JobApplication>;
  deleteJobApplication(id: string): Promise<void>;
  getApplicationById(id: string): Promise<JobApplication | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByStripeSubscriptionId(subscriptionId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.stripeSubscriptionId, subscriptionId));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserSubscription(userId: string, subscriptionData: { stripeCustomerId?: string; stripeSubscriptionId?: string; subscriptionTier?: string; subscriptionStatus?: string }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...subscriptionData, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async incrementApplicationCount(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ 
        applicationCount: sql`${users.applicationCount} + 1`,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Profile operations
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.userId, userId));
    return profile;
  }

  async createUserProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [created] = await db
      .insert(userProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateUserProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  // Work experience operations
  async getUserWorkExperience(userProfileId: string): Promise<WorkExperience[]> {
    return await db
      .select()
      .from(workExperience)
      .where(eq(workExperience.userProfileId, userProfileId))
      .orderBy(desc(workExperience.startDate));
  }

  async createWorkExperience(experience: InsertWorkExperience): Promise<WorkExperience> {
    const [created] = await db
      .insert(workExperience)
      .values(experience)
      .returning();
    return created;
  }

  async updateWorkExperience(id: string, experience: Partial<InsertWorkExperience>): Promise<WorkExperience> {
    const [updated] = await db
      .update(workExperience)
      .set(experience)
      .where(eq(workExperience.id, id))
      .returning();
    return updated;
  }

  async deleteWorkExperience(id: string): Promise<void> {
    await db.delete(workExperience).where(eq(workExperience.id, id));
  }

  // Education operations
  async getUserEducation(userProfileId: string): Promise<Education[]> {
    return await db
      .select()
      .from(education)
      .where(eq(education.userProfileId, userProfileId))
      .orderBy(desc(education.startDate));
  }

  async createEducation(educationData: InsertEducation): Promise<Education> {
    const [created] = await db
      .insert(education)
      .values(educationData)
      .returning();
    return created;
  }

  async updateEducation(id: string, educationData: Partial<InsertEducation>): Promise<Education> {
    const [updated] = await db
      .update(education)
      .set(educationData)
      .where(eq(education.id, id))
      .returning();
    return updated;
  }

  async deleteEducation(id: string): Promise<void> {
    await db.delete(education).where(eq(education.id, id));
  }

  // Job application operations
  async getUserApplications(userId: string, limit?: number): Promise<JobApplication[]> {
    const query = db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.userId, userId))
      .orderBy(desc(jobApplications.appliedDate));
    
    if (limit) {
      return await query.limit(limit);
    }
    
    return await query;
  }

  async createJobApplication(application: InsertJobApplication): Promise<JobApplication> {
    const [created] = await db
      .insert(jobApplications)
      .values(application)
      .returning();
    return created;
  }

  async updateJobApplication(id: string, application: Partial<InsertJobApplication>): Promise<JobApplication> {
    const [updated] = await db
      .update(jobApplications)
      .set({ ...application, updatedAt: new Date() })
      .where(eq(jobApplications.id, id))
      .returning();
    return updated;
  }

  async deleteJobApplication(id: string): Promise<void> {
    await db.delete(jobApplications).where(eq(jobApplications.id, id));
  }

  async getApplicationById(id: string): Promise<JobApplication | undefined> {
    const [application] = await db
      .select()
      .from(jobApplications)
      .where(eq(jobApplications.id, id));
    return application;
  }
}

export const storage = new DatabaseStorage();
