import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, '.local/knowledge');
const manifestPath = resolve(root, 'src/worker/generated/manifest.json');
const locales = ['en', 'fr', 'es'];
const portfolioContext = {
  en: "From Matias Suxo's professional portfolio.",
  fr: 'Du portfolio professionnel de Matias Suxo.',
  es: 'Del portafolio profesional de Matias Suxo.',
};
const documents = [];
const hash = (text) => createHash('sha256').update(text).digest('hex');

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) return value.map(text).filter(Boolean).join('\n');
  if (value && typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${text(item)}`)
      .join('\n');
  }
  return value == null ? '' : String(value);
}

function slug(value) {
  if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`Content IDs must be lowercase URL slugs: ${String(value)}`);
  }
  return value;
}

function add(locale, category, id, title, href, body) {
  const kind = href ? 'page' : 'note';
  const location = href
    ? `Page: ${href}`
    : 'Source: background note approved by Matias for public answers';
  const content = `# ${text(title)}\n\n${portfolioContext[locale]}\nLanguage: ${locale}\n${location}\n\n${text(body)}\n`;
  const contentHash = hash(content);
  const key = `portfolio-${locale}-${category}-${slug(id)}-${contentHash.slice(0, 12)}.md`;
  if (key.length > 128) throw new Error(`Knowledge filename is too long: ${key}`);
  if (documents.some((document) => document.key === key))
    throw new Error(`Duplicate knowledge key: ${key}`);
  documents.push({
    key,
    title: text(title),
    kind,
    ...(href ? { href } : {}),
    contentHash,
    locale,
    content,
  });
}

for (const locale of locales) {
  const path = resolve(root, `src/content/${locale}.json`);
  let source;
  try {
    source = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(
      `Cannot build knowledge without valid public content at src/content/${locale}.json`,
      { cause: error },
    );
  }
  if (
    !source.profile ||
    !Array.isArray(source.projects) ||
    !Array.isArray(source.experiences) ||
    !Array.isArray(source.skills)
  ) {
    throw new Error(`Public content schema is incomplete: src/content/${locale}.json`);
  }
  const profile = source.profile;
  const relatedProjects = (ids = []) =>
    ids.map((id) => {
      const project = source.projects.find((item) => item.id === id);
      if (!project) throw new Error(`Unknown related project ${id} in ${locale} content.`);
      return `${text(project.title)}: ${text(project.summary)}`;
    });
  add(locale, 'profile', 'matias-suxo', profile.name, '/', [
    text(profile.role),
    text(profile.summary),
    `Location: ${text(profile.location)}`,
    `Education: ${text(profile.education)}`,
    text(profile.educationPeriod),
    text(profile.educationDetails),
    'The Contact page lists currently available contact options, including his LinkedIn profile.',
    ...(profile.links ?? []).map((link) => `${text(link.label)}: ${text(link.url)}`),
  ]);
  for (const item of source.experiences) {
    add(
      locale,
      'experience',
      item.id,
      `${text(item.role)} · ${text(item.organization)}`,
      `/experience/${slug(item.id)}/`,
      [
        `Organization: ${text(item.organization)}`,
        `Role: ${text(item.role)}`,
        `Period: ${text(item.period)}`,
        text(item.summary),
        text(item.details),
        `Documented skills: ${text(item.skills)}`,
        ...relatedProjects(item.projects),
      ],
    );
  }
  for (const item of source.projects) {
    add(locale, 'project', item.id, item.title, `/projects/${slug(item.id)}/`, [
      `Category: ${text(item.category)}`,
      text(item.summary),
      text(item.details),
      `Documented skills: ${text(item.skills)}`,
      ...(item.links ?? []).map((link) => `${text(link.label)}: ${text(link.url)}`),
    ]);
  }
  for (const item of source.skills) {
    add(locale, 'skill', item.id, item.title, `/skills/#${slug(item.id)}`, [
      `Documented skills: ${text(item.items)}`,
      ...relatedProjects(item.projects),
    ]);
  }
  const siteHelp = {
    en: "This portfolio presents Matias Suxo's experience, projects, and skills. Open a project or experience to read its details. The AI guide's page citations open the related pages; background note citations show their title without a link. The language switch changes the site's language without adding a URL prefix. Use the Contact page to contact Matias. The AI guide uses site content and background notes Matias approved for public answers. It is not a live conversation with Matias. Each message requires Turnstile verification.",
    fr: "Ce portfolio présente l'expérience, les projets et les compétences de Matias Suxo. Ouvrez un projet ou une expérience pour lire les détails. Les citations de pages du guide IA ouvrent les pages correspondantes; les notes de contexte affichent leur titre sans lien. Le sélecteur de langue change la langue du site sans ajouter de préfixe à l'adresse. Utilisez la page Contact pour contacter Matias. Le guide IA utilise le contenu du site et les notes que Matias a approuvées pour les réponses publiques. Il ne représente pas une conversation en direct avec Matias. Chaque message nécessite une vérification Turnstile.",
    es: 'Este portafolio presenta la experiencia, los proyectos y las habilidades de Matias Suxo. Abre un proyecto o una experiencia para leer los detalles. Las citas de páginas de la guía de IA abren las páginas correspondientes; las notas de contexto muestran su título sin enlace. El selector cambia el idioma sin añadir un prefijo a la dirección. Usa la página Contacto para contactar con Matias. La guía de IA usa el contenido del sitio y las notas que Matias aprobó para respuestas públicas. No es una conversación en directo con Matias. Cada mensaje requiere verificación de Turnstile.',
  };
  const helpTitles = {
    en: 'Using this website',
    fr: 'Utiliser ce site',
    es: 'Cómo usar este sitio',
  };
  add(locale, 'help', 'website', helpTitles[locale], '/', siteHelp[locale]);
}

// Only this explicit folder and approval flag opt notes into public AI answers.
const notesDirectory = resolve(root, 'content/knowledge');
let notes = [];
try {
  notes = await readdir(notesDirectory, { withFileTypes: true });
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
for (const file of notes.filter((entry) => entry.isFile() && entry.name.endsWith('.json'))) {
  const note = JSON.parse(await readFile(resolve(notesDirectory, file.name), 'utf8'));
  if (note.approvedForPublicAnswers !== true || note.visibility !== 'reference-only') continue;
  if (
    !locales.includes(note.locale) ||
    typeof note.title !== 'string' ||
    !note.title.trim() ||
    typeof note.text !== 'string' ||
    !note.text.trim() ||
    note.text.length > 50_000
  ) {
    throw new Error(`Approved background note has an invalid locale, title, or text: ${file.name}`);
  }
  add(note.locale, 'note', note.id, note.title, undefined, note.text);
}

if (documents.length < 4) throw new Error('Refusing to build an empty knowledge collection.');
documents.sort((left, right) => left.key.localeCompare(right.key));
await mkdir(output, { recursive: true });
await mkdir(dirname(manifestPath), { recursive: true });
for (const document of documents)
  await writeFile(resolve(output, document.key), document.content, 'utf8');
const manifest = documents.map(({ key, title, kind, href, contentHash }) => ({
  key,
  title,
  kind,
  ...(href ? { href } : {}),
  contentHash,
}));
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
await writeFile(
  resolve(output, 'release.json'),
  `${JSON.stringify(
    {
      version: 1,
      contentHash: hash(JSON.stringify(manifest)),
      documents: documents.map((document, index) => ({
        ...manifest[index],
        locale: document.locale,
      })),
    },
    null,
    2,
  )}\n`,
  'utf8',
);
console.log(`Built ${documents.length} public knowledge documents and trusted citation manifest.`);
