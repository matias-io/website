'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { usePortfolio } from '@/i18n/provider';
import { ConsoleDevice } from '@/features/console/console';
import { useSound } from '@/features/audio/audio-provider';
import { getOverviewSection, type OverviewSection } from './navigation';
import { Reveal } from '@/components/reveal';

export function Overview({
  compact,
  onNavigate,
}: {
  compact: boolean;
  onNavigate?: (section: OverviewSection) => void;
}) {
  const { t, content } = usePortfolio();
  const path = usePathname();
  const { play } = useSound();
  const currentSection = compact ? getOverviewSection(path) : null;
  const experiences =
    compact && currentSection === 'experience'
      ? content.experiences
      : content.experiences.slice(0, 4);
  const projects =
    compact && currentSection === 'projects'
      ? content.projects
      : content.projects.filter((project) => project.featured).slice(0, 4);
  const skills =
    compact && currentSection === 'skills' ? content.skills : content.skills.slice(0, 3);
  const navigate = (section: OverviewSection) => onNavigate?.(section);
  const sectionHref = (section: OverviewSection) =>
    section === 'contact' ? '/contact/' : `/${section}/`;
  const renderCompactLink = (section: Exclude<OverviewSection, 'contact'>) => (
    <section className="overview-section compact-section" key={section}>
      <Link
        className="compact-section-link"
        href={sectionHref(section)}
        scroll={false}
        onClick={() => navigate(section)}
      >
        <span>{t(section)}</span>
        <ArrowRight />
      </Link>
    </section>
  );
  return (
    <div className={`overview ${compact ? 'is-compact' : ''}`}>
      <div className="intro" id={compact ? undefined : 'contact'}>
        <div className="intro-device">
          <ConsoleDevice />
        </div>
        <div className="profile-identity">
          <Image
            className="profile-headshot"
            src="/media/matias-headshot.webp"
            alt="Matias Suxo"
            width={52}
            height={52}
            priority
          />
          <p className="location">{content.profile.location}</p>
        </div>
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
          <Link href="/contact/" scroll={false} onClick={() => navigate('contact')}>
            {t('contact')}
            <ArrowUpRight />
          </Link>
        </div>
      </div>
      {(!compact || currentSection === 'experience') && (
        <section className="overview-section" id={compact ? undefined : 'experience'}>
          <div className="section-heading">
            <h2>{t('experience')}</h2>
            <Link href="/experience/" scroll={false} onClick={() => navigate('experience')}>
              {t('viewExperience')}
              <ArrowRight />
            </Link>
          </div>
          <div className="experience-list">
            {experiences.map((item, index) => (
              <Reveal key={item.id} delay={index * 35}>
                <Link
                  key={item.id}
                  href={`/experience/${item.id}/`}
                  scroll={false}
                  className={`experience-row ${path.includes(item.id) ? 'active' : ''}`}
                  onClick={() => {
                    navigate('experience');
                    play('open');
                  }}
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
              </Reveal>
            ))}
          </div>
        </section>
      )}
      {compact && currentSection !== 'experience' && renderCompactLink('experience')}
      {(!compact || currentSection === 'projects') && (
        <section className="overview-section" id={compact ? undefined : 'projects'}>
          <div className="section-heading">
            <h2>{t('projects')}</h2>
            <Link href="/projects/" scroll={false} onClick={() => navigate('projects')}>
              {t('viewProjects')}
              <ArrowRight />
            </Link>
          </div>
          <div className="featured-list">
            {projects.map((item, index) => (
              <Reveal key={item.id} delay={index * 35}>
                <Link
                  key={item.id}
                  href={`/projects/${item.id}/`}
                  scroll={false}
                  className={`project-row ${path.includes(item.id) ? 'active' : ''}`}
                  onClick={() => {
                    navigate('projects');
                    play('open');
                  }}
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
              </Reveal>
            ))}
          </div>
        </section>
      )}
      {compact && currentSection !== 'projects' && renderCompactLink('projects')}
      {(!compact || currentSection === 'skills') && (
        <section className="overview-section overview-skills" id={compact ? undefined : 'skills'}>
          <div className="section-heading">
            <h2>{t('skills')}</h2>
            <Link href="/skills/" scroll={false} onClick={() => navigate('skills')}>
              {t('viewSkills')}
              <ArrowRight />
            </Link>
          </div>
          {skills.map((group) => (
            <Reveal key={group.id}>
              <Link
                className="skill-preview"
                href={`/skills/#${group.id}`}
                key={group.id}
                scroll={true}
                onClick={() => navigate('skills')}
              >
                <span>{group.title}</span>
                <span>{group.items.slice(0, 5).join(' · ')}</span>
              </Link>
            </Reveal>
          ))}
        </section>
      )}
      {compact && currentSection !== 'skills' && renderCompactLink('skills')}
      {compact && currentSection === 'contact' && (
        <section className="overview-section overview-contact">
          <div className="section-heading">
            <h2>{t('contact')}</h2>
            <Link href="/contact/" scroll={false} onClick={() => navigate('contact')}>
              {t('contact')}
              <ArrowRight />
            </Link>
          </div>
          <div className="compact-contact-info">
            <span>{content.profile.role}</span>
            <span>{content.profile.location}</span>
            <a href="https://www.linkedin.com/in/matias-suxo/" target="_blank" rel="noreferrer">
              LinkedIn <ArrowUpRight size={12} />
            </a>
          </div>
        </section>
      )}
      {!compact && (
        <section className="overview-section overview-education">
          <div className="section-heading">
            <h2>{t('education')}</h2>
          </div>
          <p>{content.profile.education}</p>
          <span>{content.profile.educationPeriod}</span>
          <p className="education-details">{content.profile.educationDetails}</p>
        </section>
      )}
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
