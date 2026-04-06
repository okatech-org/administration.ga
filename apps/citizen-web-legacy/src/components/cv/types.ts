/**
 * CV Data type used by all theme components and forms.
 * Mirrors the Convex schema structure.
 */
export interface CVData {
  firstName?: string;
  lastName?: string;
  title?: string;
  objective?: string;
  email?: string;
  phone?: string;
  address?: string;
  summary?: string;
  experiences: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }>;
  education: Array<{
    degree: string;
    school: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current: boolean;
    description?: string;
  }>;
  skills: Array<{
    name: string;
    level: string;
  }>;
  languages: Array<{
    name: string;
    level: string;
  }>;
  hobbies?: string[];
  portfolioUrl?: string;
  linkedinUrl?: string;
}

export interface CVThemeProps {
  data: CVData;
}

export type CVTheme =
  | "modern"
  | "classic"
  | "minimalist"
  | "professional"
  | "creative"
  | "elegant";
