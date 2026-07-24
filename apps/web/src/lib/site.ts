export interface NavItem {
  label: string;
  href: string;
}

export interface ExperienceItem {
  company: string;
  role: string;
  period: string;
  location?: string;
  tag?: string;
  summary?: string;
  highlights?: readonly string[];
  tech?: readonly string[];
}

export interface EducationItem {
  school: string;
  degree: string;
  period: string;
  note?: string;
}

export interface SkillGroup {
  label: string;
  items: readonly string[];
}

export interface ProjectItem {
  name: string;
  description: string;
  href?: string;
  tech: readonly string[];
}

export interface SocialLink {
  label: string;
  href: string;
}

export const site = {
  name: "Mehmet Ünübol",
  title: "Software Engineer",
  resumeTitle: "Full Stack Software Engineer",
  tagline: "Node.js · TypeScript · Microservices",
  location: "İzmir, Türkiye",
  locality: "İzmir",
  country: "TR",
  email: "mehmetunubol@gmail.com",
  summary:
    "Full-stack software engineer with 10+ years delivering scalable, secure, and high-performance systems across telecom, automotive, and SaaS. I focus on back-end with Node.js and TypeScript — modernizing legacy systems and leading cloud-native microservices migrations.",
  availability: "Available immediately · Open to remote or hybrid roles · Willing to relocate if required",
  nav: [
    { label: "About", href: "#about" },
    { label: "Experience", href: "#experience" },
    { label: "Skills", href: "#skills" },
    { label: "Projects", href: "#projects" },
    { label: "Blog", href: "/blog" },
    { label: "Contact", href: "#contact" },
  ] satisfies NavItem[],
  skills: ["Node.js", "TypeScript", "Microservices"],
  skillGroups: [
    {
      label: "Languages",
      items: ["JavaScript / TypeScript", "Python", "Shell", "Perl", "Java", "C / C++"],
    },
    { label: "Backend", items: ["Node.js", "Express", "LoopBack", "Spring Boot"] },
    { label: "Frontend", items: ["React", "Angular", "Next.js"] },
    { label: "Databases", items: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "InfluxDB", "ClickHouse"] },
    {
      label: "DevOps & Cloud",
      items: [
        "Docker",
        "Kubernetes",
        "Jenkins",
        "GitHub Actions",
        "PM2",
        "Nginx",
        "Google Cloud",
        "AWS",
        "Firebase",
      ],
    },
    { label: "Testing & QA", items: ["Jest", "Mocha", "Cypress", "Appium", "Selenium", "JMeter"] },
    {
      label: "Architecture",
      items: [
        "Microservices",
        "Event-Driven",
        "REST / GraphQL",
        "WebSockets",
        "gRPC",
        "CQRS",
        "JWT Auth",
        "Pub/Sub",
        "NATS",
      ],
    },
    { label: "Monitoring & Logging", items: ["TICK Stack", "InfluxDB", "Winston", "Coralogix"] },
    {
      label: "Tools",
      items: ["Git", "Jira", "Confluence", "Bitbucket", "Trello", "MS Teams", "Slack"],
    },
  ] satisfies SkillGroup[],
  // Skills in active day-to-day use right now (current role stack + daily tools).
  activeSkills: [
    "Node.js",
    "TypeScript",
    "Microservices",
    "Kafka",
    "NATS",
    "ClickHouse",
    "Slack",
    "Git",
    "Jira",
    "Confluence",
    "MySQL",
    "Redis",
    "Docker",
    "Kubernetes",
    "Pub/Sub",
    "Google Cloud",
    "MongoDB",
    "Coralogix",
    "Event-Driven",
    "REST / GraphQL",
  ] as readonly string[],
  languages: ["English — Professional (B2+)", "Turkish — Native"],
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
      location: "Remote",
      summary:
        "Building backend microservices for new regulatory features, from requirement gathering to implementation.",
      highlights: [
        "Developing backend microservices for new regulatory features, built with Node.js, TypeScript, Kafka, NATS, and ClickHouse.",
        "Driving individual features end-to-end — requirement gathering, solution design, implementation — in close collaboration with Product Owners and Tech Leads.",
        "Using Claude for AI-assisted coding to accelerate implementation and improve code quality.",
      ],
      tech: [
        "Node.js",
        "TypeScript",
        "Microservices",
        "Kafka",
        "NATS",
        "ClickHouse",
        "Docker",
        "Kubernetes",
        "MySQL",
        "MongoDB",
        "Redis",
        "Google Cloud",
        "Pub/Sub",
        "Git",
        "Jira",
        "Confluence",
        "Coralogix",
        "Event-Driven",
        "REST / GraphQL",
      ],
    },
    {
      company: "OSF Digital",
      role: "Full Stack Developer",
      period: "2020 — Jan 2026",
      location: "Remote · Türkiye",
      summary: "Modernized legacy telecom / satellite platforms and led cloud-native migrations.",
      highlights: [
        "Migrated legacy Perl/C++ APIs to Node.js (LoopBack), cutting maintenance overhead.",
        "Built a Kafka-based cloud component processing live satellite/terminal data into a time-series DB, Dockerized for deployment.",
        "Led large-scale performance testing (JMeter, Python, Node.js, Jenkins) with metrics reported via InfluxDB/TICK stack.",
        "Managed custom Linux/systemd service clustering and monitoring with Python support scripts.",
        "Ran data simulations across 5 VMs with 60 simulator processes each.",
      ],
      tech: [
        "Node.js",
        "AngularJS",
        "PostgreSQL",
        "Python",
        "Kafka",
        "InfluxDB",
        "JMeter",
        "Docker",
        "Cypress",
        "PM2",
        "Jenkins",
      ],
    },
    {
      company: "Ruut Tech",
      role: "Full Stack Developer",
      period: "2021 — 2022",
      location: "Remote",
      tag: "Freelance",
      summary: "IoT microservices for LED-screen management dashboards.",
      highlights: [
        "Built Node.js microservices (cron, wallet, screen, IoT, notifications, and more), containerized with Docker.",
        "Integrated services over gRPC behind an API gateway.",
        "Deployed the microservice fleet on Kubernetes on Google Cloud.",
      ],
      tech: ["Node.js", "MongoDB", "Docker", "gRPC", "Kubernetes", "Google Cloud"],
    },
    {
      company: "Quadified",
      role: "Backend Developer",
      period: "2020 — 2021",
      location: "Remote",
      tag: "Freelance",
      summary: "Remote automation platform for telecom mobile-device testing.",
      highlights: [
        "Built a device abstraction layer with Appium; automated workflows with Selenium and UIAutomator.",
        "Automated complex multi-device flows, including call and SMS interactions between devices.",
        "Developed dashboards for scheduling, listing, and reporting test executions.",
      ],
      tech: ["ReactJS", "Java", "Node.js", "Appium", "Selenium"],
    },
    {
      company: "Redpine Software",
      role: "Embedded Software Developer",
      period: "2019 — 2020",
      location: "İzmir, Türkiye",
      summary: "ECU-level features for in-vehicle systems.",
      highlights: [
        "Delivered ECU-level features and patches for in-vehicle systems.",
        "Developed C components for Embedded Linux, integrated with Node.js services.",
      ],
      tech: ["C", "Embedded Linux", "Node.js"],
    },
    {
      company: "Depar Teknoloji",
      role: "Software Engineer",
      period: "Jun 2016 — Apr 2019",
      location: "İzmir, Türkiye",
      summary: "Telecom SMS infrastructure, portals, and reporting dashboards.",
      highlights: [
        "Built C-based telecom modules and Java/Perl web portals for SMS infrastructure.",
        "Developed a Java/MySQL reporting dashboard with scheduled and spam-detection reports.",
        "Built a Perl configuration dashboard and a Java release portal automating customer release cycles.",
      ],
      tech: ["C", "Java", "Perl", "MySQL", "Linux"],
    },
    {
      company: "Aselsan",
      role: "Intern",
      period: "Jul 2015",
      location: "İzmir, Türkiye",
      summary: "Summer internship at REHİS (System Production).",
    },
  ] satisfies ExperienceItem[],
  education: [
    {
      school: "Izmir Institute of Technology",
      degree: "M.Sc., Computer Engineering",
      period: "2017",
      note: "Incomplete — left after the first year",
    },
    {
      school: "Izmir Institute of Technology",
      degree: "B.Sc., Electronics & Communication Engineering",
      period: "2010 — 2015",
    },
  ] satisfies EducationItem[],
  projects: [
    {
      name: "Petsitter",
      description:
        "Marketplace connecting pet owners with sitters — React frontend, Node.js microservices in a monorepo, Angular admin, and a Go event manager. Deployed on Google Cloud Run with the frontend on Vercel.",
      href: "https://vercel-petsitter-client.vercel.app/",
      tech: ["React", "Node.js", "Angular", "Go", "Google Cloud"],
    },
    {
      name: "Weatherugo",
      description:
        "Activity and clothing suggestion platform using weather APIs and AI-powered recommendations (Genkit / Gemini).",
      href: "https://www.weatherugo.com/",
      tech: ["Next.js", "Genkit", "Gemini"],
    },
    {
      name: "Employee Management System",
      description:
        "Full-stack MERN application with MSSQL and physical device integration for attendance tracking.",
      tech: ["React", "Node.js", "MongoDB", "MSSQL"],
    },
    {
      name: "Android Test Automation",
      description:
        "Spring Boot + Appium + React platform for automated device testing with multi-device orchestration.",
      tech: ["Spring Boot", "Appium", "React"],
    },
    {
      name: "E-commerce Platform",
      description:
        "Full-featured Laravel/PHP storefront — products, categories, comments, email tracking, and payments.",
      tech: ["Laravel", "PHP"],
    },
    {
      name: "yt-note-agent",
      description:
        "Pipeline that transcribes a YouTube video (yt-dlp + Whisper), summarizes it with AI, and publishes the result as a categorized post on this site's Blog — diagrams included when relevant.",
      href: "/blog",
      tech: ["Node.js", "Express", "Whisper", "Gemini"],
    },
  ] satisfies ProjectItem[],
  socials: [
    { label: "Email", href: "mailto:mehmetunubol@gmail.com" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/mehmet-unubol" },
  ] satisfies SocialLink[],
} as const;
