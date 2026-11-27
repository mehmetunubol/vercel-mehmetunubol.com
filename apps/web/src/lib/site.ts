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

export interface CertificateItem {
  name: string;
  issuer: string;
  date: string;
  credentialUrl: string;
  pdf?: string;
}

export const site = {
  name: "Mehmet Ünübol",
  title: "Backend Engineer",
  resumeTitle: "Backend Engineer | Node.js, TypeScript, AI/LLM Applications",
  tagline: "Node.js · TypeScript · AI/LLM Applications",
  location: "İzmir, Türkiye",
  locality: "İzmir",
  country: "TR",
  email: "mehmetunubol@gmail.com",
  summary:
    "Backend engineer with 10+ years of experience building distributed systems across telecom, satellite, automotive and SaaS platforms. Currently developing event-driven microservices for a live platform with millions of users, using Node.js, TypeScript, Kafka, NATS and ClickHouse. Track record of modernizing legacy systems, leading cloud-native microservices migrations and running large-scale performance testing. Builds LLM-powered applications with the Anthropic API and works daily with AI-assisted development (Claude Code, Cursor). Looking to bring this backend depth to products built on LLMs: agent workflows, data pipelines and evaluation.",
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
      label: "AI & LLM",
      items: ["Anthropic API (Claude)", "Claude Code", "Cursor", "Google Genkit / Gemini"],
    },
    { label: "Languages", items: ["TypeScript / JavaScript", "Go", "Python", "Shell", "C / C++"] },
    {
      label: "Backend",
      items: ["Node.js", "Express", "LoopBack", "Spring Boot", "Kafka", "NATS", "gRPC"],
    },
    { label: "Frontend", items: ["React", "Next.js"] },
    { label: "Databases", items: ["PostgreSQL", "MySQL", "MongoDB", "Redis", "ClickHouse", "InfluxDB"] },
    {
      label: "Testing & QA",
      items: ["pytest", "Jest", "Mocha", "Cypress", "Appium", "Selenium", "JMeter", "Mutation testing"],
    },
    {
      label: "DevOps & Observability",
      items: [
        "Docker",
        "Kubernetes",
        "Jenkins",
        "GitHub Actions",
        "GitLab",
        "Nginx",
        "Elasticsearch",
        "Coralogix",
        "TICK Stack",
      ],
    },
    { label: "Cloud", items: ["Google Cloud (Cloud Run, Cloud Storage)", "Firebase"] },
    {
      label: "Architecture",
      items: [
        "Microservices",
        "Event-Driven",
        "REST / GraphQL",
        "WebSockets",
        "JWT Auth",
        "CQRS",
        "Pub/Sub",
      ],
    },
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
    "Go",
    "Python",
    "pytest",
    "Elasticsearch",
    "Anthropic API (Claude)",
    "Claude Code",
    "Cursor",
  ] as readonly string[],
  languages: ["English — Professional working proficiency (B2+)", "Turkish — Native"],
  certificates: [
    {
      name: "Foundation: Introduction to LangChain - Python",
      issuer: "LangChain Academy",
      date: "2026-08-20",
      credentialUrl: "https://academy.langchain.com/certificates/luxg3dyj8x",
      pdf: "/certificates/langchain-academy-introduction-to-langchain-python.pdf",
    },
    {
      name: "AI Engineering Essentials: Navigating the Tech Revolution",
      issuer: "LinkedIn",
      date: "2024-05",
      credentialUrl:
        "https://www.linkedin.com/learning/certificates/4475c7fbf2ec18387859f14444f5295d45f22ab07e126657017652e07a39f9e8/",
    },
    {
      name: "Microservices: Asynchronous Messaging",
      issuer: "LinkedIn",
      date: "2023-12",
      credentialUrl:
        "https://www.linkedin.com/learning/certificates/9fdee0e33e5df93c439d8d3ef526b7db793ff01cc3442a744e3d609b445006bc/",
    },
    {
      name: "Microservices: Design Patterns",
      issuer: "LinkedIn",
      date: "2023-12",
      credentialUrl:
        "https://www.linkedin.com/learning/certificates/23203fe842b252d65328ec05cb1f79351618b74433d5f1a4270a7c3b2a8b4bb8/",
    },
    {
      name: "Microservices Foundations",
      issuer: "LinkedIn",
      date: "2023-12",
      credentialUrl:
        "https://www.linkedin.com/learning/certificates/94888ee93bffe5c516fa35602330cabf6d8ec7be780a2b334e0a8ce2aef0dd95/",
    },
    {
      name: "App Store Marketing Specialist",
      issuer: "MobileAction",
      date: "2017-07",
      credentialUrl: "https://academy.mobileaction.co/",
    },
  ] satisfies CertificateItem[],
  experience: [
    {
      company: "Brainrocket",
      role: "Backend Developer",
      period: "Feb 2026 — Present",
      location: "Remote",
      summary:
        "Event-driven backend microservices for a live consumer platform with millions of users.",
      highlights: [
        "Developing backend microservices for a live consumer platform with millions of users, built with Node.js, TypeScript, Kafka, NATS and ClickHouse.",
        "Adapting existing applications and services to meet regulatory and licensing requirements in several global markets, working directly on the live production system.",
        "Driving individual features end-to-end, from requirement gathering and solution design to implementation, in close collaboration with Product Owners and Tech Leads.",
        "Using Claude for AI-assisted coding to accelerate implementation and improve code quality.",
      ],
      tech: [
        "Node.js",
        "TypeScript",
        "Microservices",
        "Kafka",
        "NATS",
        "ClickHouse",
        "Claude Code",
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
      company: "DeparSoft",
      role: "Test & Integration Engineer",
      period: "Oct 2026 — Present",
      location: "Remote",
      tag: "Part-time Contract",
      summary:
        "Integration testing and observability migration for a telecom operator's signalling-traffic pipeline.",
      highlights: [
        "Part-time contract on a telecom operator's signalling-traffic pipeline (Diameter, GTPv2, DNS, TCAP/MAP), made up of a Rust packet analyzer and Go storage and query services.",
        "Built the end-to-end integration test harness (Python, pytest, Docker Compose) that runs the full pipeline locally with recorded traffic fixtures, contract tests and KPI checks.",
        "Led testing and implementation of the observability migration from Elasticsearch to Coralogix, including a Go query translator that let the existing UI work without changes.",
      ],
      tech: [
        "Go",
        "Rust",
        "Python",
        "pytest",
        "Docker Compose",
        "Elasticsearch",
        "Coralogix",
        "Diameter",
        "GTPv2",
        "SS7/TCAP",
      ],
    },
    {
      company: "OSF Digital",
      role: "Full Stack Developer",
      period: "2020 — Feb 2026",
      location: "Remote · Türkiye",
      summary: "Modernized legacy telecom / satellite platforms and led cloud-native migrations.",
      highlights: [
        "Migrated legacy Perl/C++ APIs to Node.js (LoopBack), reducing maintenance overhead of the old stack.",
        "Modernized frontend components in AngularJS for better usability and performance.",
        "Led the API migration strategy and coordinated frontend and backend integration.",
        "Set up unit and integration testing frameworks used for QA validation.",
        "Optimized cloud resource usage and tuned time-series database performance.",
        "Debugged live issues directly in customer production environments.",
        "Ran custom Linux/systemd service clustering, with Python scripts to control and monitor services.",
        "Developed a Kafka-based cloud component (Dockerized) that ingests live data from satellites, terminals and other systems (beam, site, map) and stores it in a time-series database for API requests.",
        "Led large-scale performance testing with JMeter, Python, Node.js and Jenkins, reporting metrics through InfluxDB/TICK stack.",
        "Built a data simulator of C++ processes that mimic device reporting, with Python and Shell tooling that pulls data from databases to generate configuration (opt/JSON) files. Ran simulations across 5 VMs with 60 simulator processes each.",
      ],
      tech: [
        "Node.js",
        "AngularJS",
        "PostgreSQL",
        "Python",
        "Linux",
        "Git",
        "Kafka",
        "JMeter",
        "InfluxDB",
        "Docker",
        "Jenkins",
        "Cypress",
        "PM2",
      ],
    },
    {
      company: "Ruut Tech",
      role: "Full Stack Developer",
      period: "2021 — 2022",
      location: "Remote",
      tag: "Freelance",
      summary: "IoT microservices for LED-screen management dashboards (startup).",
      highlights: [
        "Contributed to the implementation of features within an existing IoT microservice architecture for LED screen management dashboards.",
        "Built Node.js backend services containerized with Docker on Google Cloud, communicating over gRPC behind an API Gateway on Kubernetes.",
        "Built and maintained 15 domain services covering users, wallets, cash register, coupons, notifications, locations, advertisers and IoT screen management.",
      ],
      tech: ["Node.js", "MongoDB", "Docker", "gRPC", "Google Cloud", "Kubernetes"],
    },
    {
      company: "Quadified",
      role: "Backend Developer",
      period: "2020 — 2021",
      location: "Remote",
      tag: "Freelance",
      summary: "Remote automation platform for mobile-device testing in the telecom sector.",
      highlights: [
        "Contributed to a remote automation platform for mobile device testing in the telecom sector.",
        "Built the React user interface and the Java server, including a device abstraction layer using Appium, with workflows automated through Selenium and UIAutomator.",
        "Automated complex test flows involving multiple devices, including call and SMS interactions between devices.",
        "Developed dashboard functionality for scheduling, listing, and reporting test executions.",
      ],
      tech: ["React", "Java", "Node.js", "Appium", "Selenium", "UIAutomator"],
    },
    {
      company: "Redpine Software",
      role: "Embedded Software Developer",
      period: "2019 — 2020",
      location: "İzmir, Türkiye",
      summary: "ECU-level features for in-vehicle systems.",
      highlights: [
        "Delivered ECU-level features and patches for in-vehicle systems.",
        "Developed C components for Embedded Linux environments; integrated with Node.js services.",
      ],
      tech: ["C", "Embedded Linux", "Node.js"],
    },
    {
      company: "Depar Teknoloji",
      role: "Software Engineer",
      period: "2015 — 2019",
      location: "İzmir, Türkiye",
      summary: "Telecom SMS infrastructure, portals, and reporting dashboards.",
      highlights: [
        "Built and maintained C-based telecom modules and Java/Perl web portals for SMS infrastructure.",
        "Built portals for SMS traffic reporting, device configuration and release automation, and improved SMS infrastructure performance and monitoring.",
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
      name: "Gmail-to-Sheets Accounting Assistant",
      description:
        "Extracts structured data from accounting emails with Claude and records it in Google Sheets.",
      tech: ["TypeScript", "Anthropic API"],
    },
    {
      name: "Income Idea Validator",
      description:
        "Staged LLM workflow, packaged as a reusable Claude skill, that scores business ideas on demand, competition and saturation and returns a go, caution or stop signal.",
      tech: ["Claude", "Claude Skills"],
    },
    {
      name: "Casual Games Portfolio",
      description:
        "Multi-game PWA with procedural rendering and shared player profiles, built with Claude Code using a documented CLAUDE.md and skills setup.",
      tech: ["Phaser 4", "Matter.js", "PWA", "Claude Code"],
    },
    {
      name: "Personal Website Monorepo",
      description:
        "This site: a multi-app Turborepo monorepo with Cursor rules for consistent AI scaffolding, including a travel-guide prototype that generates a distinct layout per destination.",
      href: "/",
      tech: ["Turborepo", "Next.js", "Cursor"],
    },
    {
      name: "Job Application Helper",
      description:
        "Personal job-search assistant — pulls postings from Greenhouse/Lever boards, aggregators, and LinkedIn saved searches, filters them against a configurable keyword list, scores matches against my CV with Gemini, drafts cover letters, and tracks every application on a kanban board. No auto-apply, by design.",
      href: "https://jah.mehmetunubol.com/",
      tech: ["Next.js", "Drizzle", "Neon", "Gemini", "Auth.js"],
    },
    {
      name: "Checklist",
      description:
        "Personal monthly bookkeeping tool — recurring checklists with configurable per-field defaults, receipt uploads, and a one-click printable monthly summary. No database — every value and file lives in my own Google Drive.",
      href: "https://check.mehmetunubol.com/",
      tech: ["Next.js", "NextAuth", "Google Drive API"],
    },
    {
      name: "Petsitter",
      description:
        "Pet-sitting marketplace that reached 100+ organic users with no paid acquisition. React frontend, Node.js microservices in a monorepo, Angular admin, and a Go event manager, deployed on Google Cloud Run.",
      href: "https://petsittertr.com/",
      tech: ["React", "Node.js", "Angular", "Go", "Google Cloud"],
    },
    {
      name: "Weatherugo",
      description:
        "Activity and clothing suggestions from weather data, with AI-generated recommendations using Genkit and Gemini.",
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
