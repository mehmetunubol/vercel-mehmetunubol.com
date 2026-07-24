import { site } from "@/lib/site";

const ALIASES: Record<string, string> = {
  reactjs: "react",
  angularjs: "angular",
};

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[\s/,&()]+/)
    .map((token) => token.replace(/[^a-z0-9+.]/g, ""))
    .filter(Boolean)
    .map((token) => ALIASES[token] ?? token);
}

function tokenSet(value: string): Set<string> {
  return new Set(tokenize(value));
}

function overlaps(a: Set<string>, b: Set<string>): boolean {
  for (const token of a) {
    if (b.has(token)) return true;
  }
  return false;
}

export function isActiveSkill(skillLabel: string): boolean {
  const skillTokens = tokenSet(skillLabel);
  return site.activeSkills.some((active) => overlaps(skillTokens, tokenSet(active)));
}

/** Companies/projects whose stated tech stack shares a word with this skill label. */
export function getSkillUsage(skillLabel: string): string[] {
  const skillTokens = tokenSet(skillLabel);
  const results = new Set<string>();

  for (const exp of site.experience) {
    if (exp.tech?.some((tech) => overlaps(skillTokens, tokenSet(tech)))) {
      results.add(exp.company);
    }
  }

  for (const project of site.projects) {
    if (project.tech.some((tech) => overlaps(skillTokens, tokenSet(tech)))) {
      results.add(project.name);
    }
  }

  return Array.from(results);
}
