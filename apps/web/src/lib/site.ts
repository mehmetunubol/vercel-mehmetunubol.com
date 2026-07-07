export interface NavItem {
  label: string;
  href: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location?: string;
}

export interface EducationItem {
  school: string;
  degree: string;
  period: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export const site = {
  name: "Mehmet Ünübol",
  title: "Back-end Developer",
  tagline: "Node.js · TypeScript · Full-Stack Development",
  location: "İzmir, Türkiye",
  email: "mehmetunubol@gmail.com",
  summary:
    "Back-end developer based in İzmir, Türkiye. I build reliable server-side systems and full-stack applications with Node.js and TypeScript, with a focus on microservices and clean, maintainable architecture.",
  nav: [
    { label: "About", href: "#about" },
    { label: "Experience", href: "#experience" },
    { label: "Skills", href: "#skills" },
    { label: "Contact", href: "#contact" },
  ] satisfies NavItem[],
  skills: ["TypeScript", "Node.js", "Full-Stack Development", "Microservices"],
  certifications: [
    "Microservices: Asynchronous Messaging",
    "Microservices: Design Patterns",
    "Microservices Foundations",
    "AI Engineering Essentials: Navigating the Tech Revolution",
    "App Store Marketing Specialist",
  ],
  experience: [
    {
      company: "BrainRocket",
      role: "Back End Developer",
      period: "Feb 2026 — Present",
    },
    {
      company: "OSF Digital",
      role: "Full Stack Engineer",
      period: "Sep 2020 — Feb 2026",
      location: "Türkiye",
    },
    {
      company: "Red Pine Software",
      role: "Software Engineer",
      period: "May 2019 — Sep 2020",
      location: "İzmir, Türkiye",
    },
    {
      company: "Depar Teknoloji",
      role: "Software Engineer",
      period: "Jun 2016 — Apr 2019",
      location: "İzmir, Türkiye",
    },
    {
      company: "Aselsan",
      role: "Intern",
      period: "Jul 2015",
      location: "İzmir, Türkiye",
    },
  ] satisfies ExperienceItem[],
  education: [
    {
      school: "Izmir Institute of Technology",
      degree: "M.Sc., Computer Engineering",
      period: "2017 — 2020",
    },
    {
      school: "Izmir Institute of Technology",
      degree: "B.Sc., Electronics & Communication Engineering",
      period: "2010 — 2016",
    },
  ] satisfies EducationItem[],
  socials: [
    { label: "Email", href: "mailto:mehmetunubol@gmail.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/mehmet-unubol" },
  ] satisfies SocialLink[],
} as const;
