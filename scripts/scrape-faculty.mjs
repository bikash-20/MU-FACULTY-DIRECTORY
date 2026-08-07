#!/usr/bin/env node
/**
 * scrape-faculty.mjs
 * -----------------------------------------------------------------------------
 * Live faculty scraper for the MU ClassCraft PWA.
 *
 * Fetches the official faculty listing pages on https://www.metrouni.edu.bd
 * for every supported department, extracts the structured name/designation/
 * contact data, and rewrites faculty.json with the same schema the front-end
 * already consumes.
 *
 *   $ node scripts/scrape-faculty.mjs
 *   $ node scripts/scrape-faculty.mjs --only=CSE
 *   $ node scripts/scrape-faculty.mjs --dry-run
 *   $ npm run scrape
 *
 * Run with --dry-run to preview the diff without touching faculty.json.
 *
 * The scraper is defensive: it rate-limits itself (one request every
 * department-ms), retries transient failures, and never deletes fields it
 * can't recover from the live page (those are preserved from the existing
 * faculty.json file so emails, phone numbers, qualifications, etc. that the
 * scraper can't see on the listing page still ship to the UI).
 *
 * Designed to run on Node 18+ (built-in fetch + AbortController).
 * -----------------------------------------------------------------------------
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT      = resolve(__dirname, '..');
const DATA_FILE = resolve(ROOT, 'faculty.json');

const BASE_URL = 'https://www.metrouni.edu.bd';
const USER_AGENT =
  'Mozilla/5.0 (compatible; MU-ClassCraft-Scraper/1.0; +https://github.com/bikashtalukder040/MU-FACULTY-DIRECTORY)';

/**
 * Static department manifest. Each entry maps the short code used in
 * faculty.json to the URL slug and human-readable full name. Add more rows
 * here when the university on-boards a new department.
 */
const DEPARTMENTS = [
  { code: 'CSE', slug: 'department-of-computer-science-engineering', full: 'Department of Computer Science & Engineering' },
  { code: 'SWE', slug: 'department-of-software-engineering',          full: 'Department of Software Engineering' },
  { code: 'DS',  slug: 'department-of-data-science',                  full: 'Department of Data Science' },
  { code: 'EEE', slug: 'department-of-electrical-electronic-engineering', full: 'Department of Electrical & Electronic Engineering' },
  { code: 'BA',  slug: 'department-of-business-administration',      full: 'Department of Business Administration' },
  { code: 'ECO', slug: 'department-of-economics',                     full: 'Department of Economics' },
  { code: 'LJ',  slug: 'department-of-law-justice',                   full: 'Department of Law & Justice' },
  { code: 'EN',  slug: 'department-of-english',                       full: 'Department of English' },
];

/* ----------------------------- CLI parsing ------------------------------- */
const argv = process.argv.slice(2);
const flags = {
  only: null,
  dryRun: false,
  verbose: false,
};
for (const arg of argv) {
  if (arg.startsWith('--only='))    flags.only = arg.split('=')[1].toUpperCase();
  if (arg === '--dry-run')          flags.dryRun = true;
  if (arg === '--verbose' || arg === '-v') flags.verbose = true;
  if (arg === '--help' || arg === '-h') {
    console.log(`
Usage: node scripts/scrape-faculty.mjs [options]

Options:
  --only=CODE       Only scrape the given department code (e.g. CSE)
  --dry-run         Fetch + parse but don't write faculty.json
  --verbose, -v     Print every record fetched
  --help, -h        Show this message
`);
    process.exit(0);
  }
}

/* ----------------------------- fetch helpers ----------------------------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, { retries = 3, timeoutMs = 20_000 } = {}) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html' },
        signal: ctrl.signal,
        redirect: 'follow',
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} for ${url}`);
      return await res.text();
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      const backoff = 600 * Math.pow(2, attempt - 1);
      console.warn(`  ↳ attempt ${attempt}/${retries} failed: ${err.message}; retrying in ${backoff}ms`);
      await sleep(backoff);
    }
  }
  throw lastErr;
}

/* ----------------------------- HTML parsing ------------------------------ */
/**
 * Minimal HTML entity decoder that handles the common ones without pulling
 * in a heavyweight dependency. Good enough for the subset of HTML the live
 * site emits.
 */
function decodeEntities(html) {
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&hellip;/g, '…')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

/**
 * Strip all HTML tags except <br>, normalize whitespace, then decode entities.
 */
function stripTags(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Pull out every faculty entry from a department listing page.
 *
 * Page shape (consistent across departments, confirmed by inspecting the
 * rendered HTML served by https://www.metrouni.edu.bd):
 *
 *   <div class="team-card text-center">
 *     <div class="team-image-wrapper"><img src="..." alt="Name"/></div>
 *     <a href="https://www.metrouni.edu.bd/sites/university/faculty-members/<slug>/<id>"
 *        class="text-decoration-none w-100">
 *       <span class="team-name">Name</span>
 *       <div class="d-flex justify-content-center">
 *         <div class="team-accent-line"></div>
 *       </div>
 *       <div class="team-desc"><p>Designation</p></div>
 *     </a>
 *   </div>
 *
 * We use a regex over the raw HTML rather than a full DOM parser — the page
 * is small, the markup is stable, and avoiding cheerio/jsdom keeps this
 * scraper zero-dependency. The regex captures href, id, name and the
 * designation text inside .team-desc.
 */
function parseListing(html, dept) {
  const entries = [];
  // Anchors on the listing page always contain both a .team-name span and a
  // .team-desc block, which is enough to disambiguate them from the
  // navigation mega-links.
  const cardRe = /<a[^>]+href="https?:\/\/www\.metrouni\.edu\.bd\/sites\/university\/faculty-members\/[^"]+\/(\d+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = cardRe.exec(html)) !== null) {
    const id = match[1];
    const inner = match[2];

    const nameMatch = inner.match(/<span[^>]+class="[^"]*team-name[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
    // .team-desc can either be `<div class="team-desc"><p>Role</p></div>` or
    // `<div class="team-desc">Role</div>` depending on whether the role text
    // is short enough to fit on one line.
    const designationMatch = inner.match(/<div[^>]+class="[^"]*team-desc[^"]*"[^>]*>(?:<p[^>]*>)?([\s\S]*?)(?:<\/p>)?<\/div>/i);

    const name = nameMatch ? stripTags(nameMatch[1]) : '';
    // The team-desc block can hold a designation (e.g. "Lecturer") or both a
    // designation and an additional role/headline separated by a line break
    // (e.g. "Associate Professor\nHead, Dept. of CSE"). Split on the first
    // newline so designation stays a single line and the rest is preserved
    // as a note.
    const descRaw = designationMatch ? stripTags(designationMatch[1]) : '';
    const [firstLine, ...rest] = descRaw.split(/\n+/);
    const designation = firstLine ? firstLine.trim() : '';
    const note = rest.join(' ').trim();

    if (!name) continue;

    entries.push({
      _id: id,
      name,
      designation,
      note,
      profileUrl: `${BASE_URL}/sites/university/faculty-members/${dept.slug}/${id}`,
    });
  }
  return entries;
}

/**
 * Look up an existing record by name+department so we can preserve fields
 * the listing page doesn't expose (email, phone, qualifications, note, etc.).
 */
function findExisting(list, name, deptCode) {
  const key = (s) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const needle = key(name);
  return list.find((f) => f.department === deptCode && key(f.name) === needle);
}

/**
 * Normally an entry's designation is something like "Associate Professor" or
 * "Lecturer (Study Leave)". Some pages, however, use a comma-list like
 * "Professor, Department of CSE, Metropolitan University" — we trim that
 * down to the role prefix.
 */
function cleanDesignation(raw) {
  if (!raw) return '';
  // Cut off the first comma that is followed by a department / university hint
  let v = raw.split(/,\s*(?:Department|School|Faculty|Metropolitan University|MU)/i)[0];
  // Some entries have the name repeated on the next line — drop the duplicate
  v = v.replace(/\s{2,}/g, ' ').trim();
  return v;
}

/* ------------------------------ main ------------------------------------- */
async function main() {
  const t0 = Date.now();
  const existing = JSON.parse(await readFile(DATA_FILE, 'utf8'));

  const departments = flags.only
    ? DEPARTMENTS.filter((d) => d.code === flags.only)
    : DEPARTMENTS;

  if (!departments.length) {
    console.error(`No department matched --only=${flags.only}`);
    process.exit(1);
  }

  console.log(`▶ Scraping ${departments.length} department(s) from ${BASE_URL}`);
  if (flags.dryRun) console.log('  ↳ dry-run: faculty.json will NOT be written');

  const next = [];
  let totalScraped = 0;

  for (const dept of departments) {
    const url = `${BASE_URL}/sites/faculty-members/${dept.slug}`;
    console.log(`\n• ${dept.code} — ${dept.full}`);
    process.stdout.write(`  ↳ GET ${url} …`);

    let html;
    try {
      html = await fetchText(url);
    } catch (err) {
      console.error(`\n  ✖ ${err.message}`);
      console.warn('  ↳ keeping existing entries for this department');
      existing.filter((f) => f.department === dept.code).forEach((f) => next.push(f));
      continue;
    }
    console.log(` ${(html.length / 1024).toFixed(1)} KiB`);

    const entries = parseListing(html, dept);
    console.log(`  ↳ parsed ${entries.length} entries`);

    for (const e of entries) {
      const prev = findExisting(existing, e.name, dept.code) || {};
      // Some cards use the .team-desc slot to display a side role (e.g.
      // "Dean, School of Science & Technology" or "Head, Dept. of CSE")
      // instead of a designation. When we see that, fall back to whatever
      // designation we already had on file and treat the text as a note.
      const looksLikeRole = /^(dean|head|co-ordinator|coordinator|chair)/i.test(
        (e.designation || '').trim()
      );
      let designation;
      let note;
      if (looksLikeRole) {
        designation = cleanDesignation(prev.designation || '');
        note = e.designation;
      } else {
        designation = cleanDesignation(e.designation) || prev.designation || '';
        // Prefer the freshly-scraped multi-line note (e.g. "Head, Dept. of
        // CSE") but fall back to anything we had previously.
        note = e.note || prev.note || '';
      }
      const record = {
        name: e.name,
        designation,
        department: dept.code,
        departmentFull: dept.full,
        profileUrl: e.profileUrl,
        email: prev.email || '',
        phone: prev.phone || '',
        qualifications: prev.qualifications || [],
        specialization: prev.specialization || '',
        note,
        sourceId: Number(e._id),
        lastUpdated: new Date().toISOString(),
      };
      // Make sure we don't accidentally serialise undefined fields
      for (const k of Object.keys(record)) {
        if (record[k] === undefined) delete record[k];
      }
      next.push(record);
      if (flags.verbose) console.log(`    · ${e.name} — ${designation || '?'}`);
    }
    totalScraped += entries.length;

    // Be polite to the university server
    await sleep(800);
  }

  // Stable ordering: department code, then designation priority, then name
  const designationRank = (d) => {
    const r = (d || '').toLowerCase();
    if (r.startsWith('professor emeritus')) return 0;
    if (r.startsWith('professor'))         return 1;
    if (r.startsWith('associate professor')) return 2;
    if (r.startsWith('assistant professor')) return 3;
    if (r.startsWith('lecturer'))          return 4;
    if (r.startsWith('teaching assistant')) return 5;
    return 9;
  };
  next.sort((a, b) => {
    if (a.department !== b.department) return a.department.localeCompare(b.department);
    const dr = designationRank(a.designation) - designationRank(b.designation);
    if (dr !== 0) return dr;
    return a.name.localeCompare(b.name);
  });

  const out = {
    generatedAt: new Date().toISOString(),
    source: BASE_URL,
    count: next.length,
    faculty: next,
  };

  if (flags.dryRun) {
    console.log(`\n— dry-run — would write ${next.length} records to faculty.json`);
    console.log(`  sample: ${next.slice(0, 3).map((f) => f.name).join(', ')}…`);
  } else {
    await writeFile(DATA_FILE, JSON.stringify(out, null, 2) + '\n', 'utf8');
    console.log(`\n✓ wrote ${next.length} records to faculty.json (${totalScraped} scraped, ${Date.now() - t0}ms)`);
  }
}

main().catch((err) => {
  console.error('\n✖ Scrape failed:', err);
  process.exit(1);
});
