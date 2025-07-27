import * as fs from 'fs';
import * as path from 'path';

// Simple PDF generation using HTML to PDF conversion
// In a production environment, you might want to use puppeteer or similar
export async function generatePDF(content: string, filename: string): Promise<Buffer> {
  // For now, return the content as a text buffer
  // In production, implement actual PDF generation
  const pdfContent = `PDF Document: ${filename}\n\n${content}`;
  return Buffer.from(pdfContent, 'utf8');
}

export async function generateWordDoc(content: string, filename: string): Promise<Buffer> {
  // For now, return the content as a text buffer
  // In production, implement actual DOCX generation using libraries like officegen or docx
  const docContent = `Word Document: ${filename}\n\n${content}`;
  return Buffer.from(docContent, 'utf8');
}

export function formatResumeForExport(resumeContent: string): string {
  // Clean and format the resume content for export
  return resumeContent
    .replace(/\n\s*\n/g, '\n\n') // Clean up extra line breaks
    .trim();
}

export function formatCoverLetterForExport(coverLetterContent: string): string {
  // Clean and format the cover letter content for export
  return coverLetterContent
    .replace(/\n\s*\n/g, '\n\n') // Clean up extra line breaks
    .trim();
}

export interface DocumentGenerationOptions {
  format: 'pdf' | 'docx';
  type: 'resume' | 'cover-letter' | 'both';
  content: {
    resume?: string;
    coverLetter?: string;
  };
  filename: string;
}

export async function generateApplicationDocuments(options: DocumentGenerationOptions): Promise<{ 
  files: Array<{ name: string; buffer: Buffer; mimeType: string }> 
}> {
  const files: Array<{ name: string; buffer: Buffer; mimeType: string }> = [];

  if (options.type === 'resume' || options.type === 'both') {
    if (options.content.resume) {
      const formattedContent = formatResumeForExport(options.content.resume);
      const filename = `${options.filename}_resume.${options.format === 'pdf' ? 'pdf' : 'docx'}`;
      
      const buffer = options.format === 'pdf' 
        ? await generatePDF(formattedContent, filename)
        : await generateWordDoc(formattedContent, filename);
      
      files.push({
        name: filename,
        buffer,
        mimeType: options.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    }
  }

  if (options.type === 'cover-letter' || options.type === 'both') {
    if (options.content.coverLetter) {
      const formattedContent = formatCoverLetterForExport(options.content.coverLetter);
      const filename = `${options.filename}_cover_letter.${options.format === 'pdf' ? 'pdf' : 'docx'}`;
      
      const buffer = options.format === 'pdf'
        ? await generatePDF(formattedContent, filename)
        : await generateWordDoc(formattedContent, filename);
      
      files.push({
        name: filename,
        buffer,
        mimeType: options.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    }
  }

  return { files };
}
