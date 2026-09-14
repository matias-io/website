import { describe, expect, it } from 'vitest';
import en from './en.json';
import es from './es.json';
import fr from './fr.json';
import type { Locale, PortfolioContent } from './types';
import languageEn from '../../content/knowledge/language-background-en.json';
import languageEs from '../../content/knowledge/language-background-es.json';
import languageFr from '../../content/knowledge/language-background-fr.json';

const supportedLocales: readonly Locale[] = ['en', 'fr', 'es'];
const contents: Record<Locale, PortfolioContent> = { en, fr, es };
const referenceContent = contents.en;

function ids(values: Array<{ id: string }>): string[] {
  return values.map((value) => value.id);
}

function relations(content: PortfolioContent) {
  return {
    experiences: content.experiences.map((item) => [item.id, item.projects] as const),
    skills: content.skills.map((item) => [item.id, item.projects] as const),
  };
}

function publicUrls(content: PortfolioContent) {
  return {
    profile: content.profile.links.map((link) => link.url),
    projects: content.projects.map(
      (project) => [project.id, project.links.map((link) => link.url)] as const,
    ),
  };
}

describe('portfolio content catalog', () => {
  it('keeps the runtime locale set explicit', () => {
    expect(Object.keys(contents).sort()).toEqual([...supportedLocales].sort());
    expect(new Set(supportedLocales).size).toBe(supportedLocales.length);
  });

  it('keeps IDs, relationships and public URLs in locale parity', () => {
    const baseIds = {
      experiences: ids(referenceContent.experiences),
      projects: ids(referenceContent.projects),
      skills: ids(referenceContent.skills),
    };
    const baseRelations = relations(referenceContent);
    const baseUrls = publicUrls(referenceContent);

    for (const locale of supportedLocales) {
      const content = contents[locale];
      expect(ids(content.experiences)).toEqual(baseIds.experiences);
      expect(ids(content.projects)).toEqual(baseIds.projects);
      expect(ids(content.skills)).toEqual(baseIds.skills);
      expect(relations(content)).toEqual(baseRelations);
      expect(publicUrls(content)).toEqual(baseUrls);
    }
  });

  it('keeps internal project references resolvable and link URLs valid', () => {
    const projectIds = new Set(referenceContent.projects.map((project) => project.id));

    for (const content of Object.values(contents)) {
      expect(new Set(ids(content.experiences)).size).toBe(content.experiences.length);
      expect(new Set(ids(content.projects)).size).toBe(content.projects.length);
      expect(new Set(ids(content.skills)).size).toBe(content.skills.length);

      for (const experience of content.experiences) {
        for (const projectId of experience.projects) expect(projectIds.has(projectId)).toBe(true);
      }
      for (const skill of content.skills) {
        for (const projectId of skill.projects) expect(projectIds.has(projectId)).toBe(true);
      }

      for (const link of [
        ...content.profile.links,
        ...content.projects.flatMap((project) => project.links),
      ]) {
        const url = new URL(link.url);
        expect(['http:', 'https:']).toContain(url.protocol);
      }
    }
  });

  it('requires every approved background note to carry the explicit public-answer schema', () => {
    const notes = [languageEn, languageFr, languageEs];
    expect(notes.map((note) => note.locale).sort()).toEqual([...supportedLocales].sort());

    for (const note of notes) {
      expect(Object.keys(note).sort()).toEqual([
        'approvedForPublicAnswers',
        'id',
        'locale',
        'text',
        'title',
        'visibility',
      ]);
      expect(note.id).toBe('language-background');
      expect(note.visibility).toBe('reference-only');
      expect(note.approvedForPublicAnswers).toBe(true);
      expect(note.title.trim()).not.toBe('');
      expect(note.text.trim()).not.toBe('');
    }
  });
});
