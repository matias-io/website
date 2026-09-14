export interface ContentLink {
  label: string;
  url: string;
}
export interface Experience {
  id: string;
  organization: string;
  role: string;
  period: string;
  summary: string;
  details: string[];
  skills: string[];
  projects: string[];
}
export interface Project {
  id: string;
  title: string;
  summary: string;
  category: string;
  details: string[];
  skills: string[];
  links: ContentLink[];
  image?: string;
  featured?: boolean;
}
export interface SkillGroup {
  id: string;
  title: string;
  items: string[];
  projects: string[];
}
export interface PortfolioContent {
  profile: {
    name: string;
    role: string;
    summary: string;
    email: string;
    location: string;
    education: string;
    educationPeriod: string;
    educationDetails: string;
    links: ContentLink[];
  };
  experiences: Experience[];
  projects: Project[];
  skills: SkillGroup[];
}
export type Locale = 'en' | 'fr' | 'es';
