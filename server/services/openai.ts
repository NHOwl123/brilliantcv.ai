import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_SECRET_KEY || ""
});

export interface JobAnalysis {
  keyRequirements: string[];
  skills: string[];
  experience: string[];
  education: string[];
  certifications: string[];
  matchScore: number;
}

export interface ProfileMatch {
  relevantExperience: string[];
  skillMatches: string[];
  gaps: string[];
  recommendations: string[];
}

export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysis> {
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
          content: `Analyze this job description:\n\n${jobDescription}`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result as JobAnalysis;
  } catch (error) {
    throw new Error("Failed to analyze job description: " + (error as Error).message);
  }
}

export async function generateTailoredResume(
  userProfile: any,
  workExperience: any[],
  education: any[],
  jobDescription: string,
  jobAnalysis: JobAnalysis
): Promise<string> {
  try {
    const profileData = {
      summary: userProfile.professionalSummary,
      skills: userProfile.skills || [],
      certifications: userProfile.certifications || [],
      languages: userProfile.languages || [],
      workExperience,
      education
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
          
          Key Requirements to Address: ${jobAnalysis.keyRequirements.join(', ')}
          
          Please reorder and rewrite the experience to best match this specific role, emphasizing relevant achievements and skills.`
        }
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate tailored resume: " + (error as Error).message);
  }
}

export async function generateCoverLetter(
  userProfile: any,
  jobTitle: string,
  companyName: string,
  jobDescription: string,
  jobAnalysis: JobAnalysis
): Promise<string> {
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
          
          Key Requirements: ${jobAnalysis.keyRequirements.join(', ')}
          
          Make it specific to this role and company, showing how the candidate's background aligns with their needs.`
        }
      ],
    });

    return response.choices[0].message.content || "";
  } catch (error) {
    throw new Error("Failed to generate cover letter: " + (error as Error).message);
  }
}

export async function generateInterviewPrep(
  jobDescription: string,
  userProfile: any,
  jobAnalysis: JobAnalysis
): Promise<{ questions: string[]; tips: string[]; answers: Record<string, string> }> {
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
          
          Key Requirements: ${jobAnalysis.keyRequirements.join(', ')}
          
          Focus on behavioral questions, technical questions relevant to the role, and questions about gaps or weaknesses.`
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result;
  } catch (error) {
    throw new Error("Failed to generate interview preparation: " + (error as Error).message);
  }
}
