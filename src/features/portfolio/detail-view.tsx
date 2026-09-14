'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { ArrowUpRight, ArrowRight, Search, Copy, Check } from 'lucide-react';
import { usePortfolio } from '@/i18n/provider';
import { ContactForm } from '@/features/contact/contact-form';
import { MediaViewer } from '@/components/media-viewer';
import { Reveal } from '@/components/reveal';

export function ProjectDetail({ id }: { id: string }) {
  const { content, t } = usePortfolio();
  const project = content.projects.find((item) => item.id === id);
  if (!project) return null;
  return (
    <article className="detail-article">
      <p className="detail-meta">{project.category}</p>
      <h2 className="detail-title" tabIndex={-1}>
        {project.title}
      </h2>
      <p className="detail-lead">{project.summary}</p>
      {project.image && (
        <Reveal>
          <MediaViewer
            src={project.image}
            alt={project.title}
            caption={project.title}
            width={1200}
            height={760}
            priority
          />
        </Reveal>
      )}
      <Reveal>
        <section id="overview" className="detail-section">
          <h3>{t('overview')}</h3>
          {project.details.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      </Reveal>
      <Reveal delay={35}>
        <section id="skills" className="detail-section">
          <h3>{t('used')}</h3>
          <ul className="tools-list">
            {project.skills.map((skill) => (
              <li key={skill}>{skill}</li>
            ))}
          </ul>
        </section>
      </Reveal>
      {project.links.length > 0 && (
        <Reveal delay={70}>
          <section className="detail-section">
            <h3>{t('sourceIntro')}</h3>
            <div className="source-links">
              {project.links.map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                  <ArrowUpRight />
                </a>
              ))}
            </div>
          </section>
        </Reveal>
      )}
      <Link className="text-link detail-more" href="/projects/" scroll={false}>
        {t('moreProjects')}
        <ArrowRight />
      </Link>
    </article>
  );
}

export function ExperienceDetail({ id }: { id: string }) {
  const { content, t } = usePortfolio();
  const item = content.experiences.find((experience) => experience.id === id);
  if (!item) return null;
  return (
    <article className="detail-article">
      <p className="detail-meta">{item.period}</p>
      <h2 className="detail-title" tabIndex={-1}>
        {item.organization}
      </h2>
      <p className="detail-subtitle">{item.role}</p>
      <p className="detail-lead">{item.summary}</p>
      <Reveal>
        <section className="detail-section" id="overview">
          <h3>{t('overview')}</h3>
          {item.details.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      </Reveal>
      {item.skills.length > 0 && (
        <Reveal delay={35}>
          <section className="detail-section" id="skills">
            <h3>{t('used')}</h3>
            <ul className="tools-list">
              {item.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </section>
        </Reveal>
      )}
      {item.projects.length > 0 && (
        <Reveal delay={70}>
          <section className="detail-section">
            <h3>{t('related')}</h3>
            <div className="related-projects">
              {item.projects.map((id) => {
                const project = content.projects.find((p) => p.id === id);
                return project ? (
                  <Link href={`/projects/${id}/`} key={id} scroll={false}>
                    <span>
                      {project.title}
                      <small>{project.summary}</small>
                    </span>
                    <ArrowUpRight />
                  </Link>
                ) : null;
              })}
            </div>
          </section>
        </Reveal>
      )}
    </article>
  );
}

export function ExperienceIndex() {
  const { content, t } = usePortfolio();
  return (
    <article className="detail-article">
      <h2 className="detail-title" tabIndex={-1}>
        {t('experience')}
      </h2>
      <div className="all-experience">
        {content.experiences.map((item, index) => (
          <Reveal key={item.id} delay={Math.min(index * 20, 100)}>
            <Link href={`/experience/${item.id}/`} scroll={false}>
              <span className="detail-meta">{item.period}</span>
              <h3>
                {item.organization}
                <ArrowUpRight />
              </h3>
              <p className="role">{item.role}</p>
              <p>{item.summary}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </article>
  );
}

export function ProjectIndex() {
  const { content, t } = usePortfolio();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const categories = [...new Set(content.projects.map((p) => p.category))];
  // Keep the selection when its translated label changes.
  const categoryLabel = content.projects.find((project) => project.id === category)?.category;
  const visible = content.projects.filter(
    (p) =>
      (!categoryLabel || p.category === categoryLabel) &&
      [p.title, p.summary, ...p.skills]
        .join(' ')
        .toLocaleLowerCase()
        .includes(query.toLocaleLowerCase()),
  );
  return (
    <article className="detail-article">
      <div className="page-heading">
        <h2 className="detail-title" tabIndex={-1}>
          {t('projects')}
        </h2>
        <span>{t('projectCount', { count: content.projects.length })}</span>
      </div>
      <div className="project-search">
        <Search size={17} />
        <input
          aria-label={t('projectSearch')}
          placeholder={t('projectSearch')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      <div className="project-filters" role="group" aria-label={t('projects')}>
        <button aria-pressed={!category} onClick={() => setCategory('')}>
          {t('all')}
        </button>
        {categories.map((c) => (
          <button
            key={c}
            aria-pressed={categoryLabel === c}
            onClick={() =>
              setCategory(content.projects.find((project) => project.category === c)?.id ?? '')
            }
          >
            {c}
          </button>
        ))}
      </div>
      <div className="project-index">
        {visible.map((project, index) => (
          <Reveal key={project.id} delay={Math.min(index * 15, 90)}>
            <Link href={`/projects/${project.id}/`} scroll={false}>
              <div>
                <h3>
                  {project.title}
                  <ArrowUpRight />
                </h3>
                <p>{project.summary}</p>
                <span>{project.skills.slice(0, 4).join(' · ')}</span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      {!visible.length && <p className="empty-results">{t('noProjects')}</p>}
    </article>
  );
}

export function SkillsPage() {
  const { content, t } = usePortfolio();
  return (
    <article className="detail-article">
      <h2 className="detail-title" tabIndex={-1}>
        {t('skills')}
      </h2>
      <div className="skill-groups">
        {content.skills.map((group) => (
          <Reveal key={group.id}>
            <section className="detail-section" id={group.id}>
              <h3>{group.title}</h3>
              <ul className="tools-list">
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <div className="skill-evidence">
                {group.projects.map((id) => {
                  const project = content.projects.find((item) => item.id === id);
                  return project ? (
                    <Link key={id} href={`/projects/${id}/`} scroll={false}>
                      {project.title}
                      <ArrowUpRight />
                    </Link>
                  ) : null;
                })}
              </div>
            </section>
          </Reveal>
        ))}
      </div>
    </article>
  );
}

export function ContactPage() {
  const { content, t } = usePortfolio();
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(content.profile.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }
  return (
    <article className="detail-article contact-page">
      <h2 className="detail-title" tabIndex={-1}>
        {t('contactTitle')}
      </h2>
      <p className="detail-lead">{t('contactIntro')}</p>
      <Reveal>
        <Image
          className="contact-portrait"
          src="/media/matias-editorial.webp"
          alt="Matias Suxo"
          width={1200}
          height={800}
        />
      </Reveal>
      <ContactForm />
      <div className="contact-links">
        {content.profile.email && (
          <div>
            <a href={`mailto:${content.profile.email}`}>
              <span>{t('email')}</span>
              {content.profile.email}
              <ArrowUpRight />
            </a>
            <button aria-label={copied ? t('emailCopied') : t('copyEmail')} onClick={copy}>
              {copied ? <Check /> : <Copy />}
            </button>
          </div>
        )}
        <a href="https://www.linkedin.com/in/matias-suxo/" target="_blank" rel="noreferrer">
          <span>LinkedIn</span>
          {t('contactLinkedin')}
          <ArrowUpRight />
        </a>
        <a href="https://github.com/matias-io" target="_blank" rel="noreferrer">
          <span>GitHub</span>
          {t('publicCode')}
          <ArrowUpRight />
        </a>
        <a href="https://rmgn.ca/" target="_blank" rel="noreferrer">
          <span>RMGN</span>
          {t('viewRmgn')}
          <ArrowUpRight />
        </a>
      </div>
    </article>
  );
}
