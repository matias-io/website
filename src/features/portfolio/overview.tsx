'use client';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/i18n/provider';
import { ConsoleDevice } from '@/features/console/console';
import { useSound } from '@/features/audio/audio-provider';

export function Overview({ compact }: { compact: boolean }) {
  const { t, content } = usePortfolio();
  const path = usePathname();
  const { play } = useSound();
  const experiences = content.experiences.slice(0, 4);
  const projects = content.projects.filter((project) => project.featured).slice(0, 4);
  return (
    <div className={`overview ${compact ? 'is-compact' : ''}`}>
      <div className="intro">
        <div className="intro-device">
          <ConsoleDevice />
        </div>
        <p className="location">{content.profile.location}</p>
        <h1>
          <Link href="/" scroll={false}>
            {content.profile.name}
            <span className="name-period">.</span>
          </Link>
        </h1>
        <p className="role">{content.profile.role}</p>
        <p className="intro-description">{content.profile.summary}</p>
        <div className="intro-links">
          <a href="https://www.linkedin.com/in/matias-suxo/" target="_blank" rel="noreferrer">
            LinkedIn
            <ArrowUpRight />
          </a>
          <a href="https://github.com/matias-io" target="_blank" rel="noreferrer">
            GitHub
            <ArrowUpRight />
          </a>
          <Link href="/contact/" scroll={false}>
            {t('contact')}
            <ArrowUpRight />
          </Link>
        </div>
      </div>
      <section className="overview-section" id={compact ? undefined : 'experience'}>
        <div className="section-heading">
          <h2>{t('experience')}</h2>
          <Link href="/experience/" scroll={false}>
            {t('viewExperience')}
            <ArrowRight />
          </Link>
        </div>
        <div className="experience-list">
          {experiences.map((item, index) => (
            <Link
              key={item.id}
              href={`/experience/${item.id}/`}
              scroll={false}
              className={`experience-row ${path.includes(item.id) ? 'active' : ''}`}
              onClick={() => play('open')}
            >
              <span className={`organization-mark organization-${item.id}`} aria-hidden="true">
                {item.id.startsWith('uottawa')
                  ? 'uO'
                  : item.id === 'kelpie'
                    ? 'k.'
                    : item.id === 'uosu'
                      ? 'U'
                      : item.organization.slice(0, 1)}
              </span>
              <span className="row-copy">
                <span className="row-title">
                  {item.organization}
                  <ArrowUpRight />
                </span>
                <span className="row-role">{item.role}</span>
                <span className="row-summary">{item.summary}</span>
              </span>
              <span className="row-period">{item.period}</span>
              <span className="timeline-node" aria-hidden="true" data-first={index === 0} />
            </Link>
          ))}
        </div>
      </section>
      <section className="overview-section" id={compact ? undefined : 'projects'}>
        <div className="section-heading">
          <h2>{t('projects')}</h2>
          <Link href="/projects/" scroll={false}>
            {t('viewProjects')}
            <ArrowRight />
          </Link>
        </div>
        <div className="featured-list">
          {projects.map((item, index) => (
            <Link
              key={item.id}
              href={`/projects/${item.id}/`}
              scroll={false}
              className={`project-row ${path.includes(item.id) ? 'active' : ''}`}
              onClick={() => play('open')}
            >
              <span className={`project-glyph glyph-${index}`} aria-hidden="true">
                {item.id === 'elvyn'
                  ? 'e'
                  : item.id === 'altura'
                    ? 'a'
                    : item.id === 'retrieval-service'
                      ? '⌕'
                      : 'u'}
              </span>
              <span>
                <span className="row-title">
                  {item.title}
                  <ArrowUpRight />
                </span>
                <span className="row-summary">{item.summary}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>
      <section className="overview-section overview-skills" id={compact ? undefined : 'skills'}>
        <div className="section-heading">
          <h2>{t('skills')}</h2>
          <Link href="/skills/" scroll={false}>
            {t('viewSkills')}
            <ArrowRight />
          </Link>
        </div>
        {content.skills.slice(0, 3).map((group) => (
          <Link
            className="skill-preview"
            href={`/skills/#${group.id}`}
            key={group.id}
            scroll={true}
          >
            <span>{group.title}</span>
            <span>{group.items.slice(0, 5).join(' · ')}</span>
          </Link>
        ))}
      </section>
      <section className="overview-section overview-education">
        <div className="section-heading">
          <h2>{t('education')}</h2>
        </div>
        <p>{content.profile.education}</p>
        <span>{content.profile.educationPeriod}</span>
        <p className="education-details">{content.profile.educationDetails}</p>
      </section>
      <div className="personal-line">
        <a href="https://rmgn.ca/" target="_blank" rel="noreferrer">
          {t('personalWork')}
          <ArrowUpRight />
        </a>
        <span>Reimagine Media</span>
      </div>
    </div>
  );
}
