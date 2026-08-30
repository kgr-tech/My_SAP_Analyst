/* ================= GITHUB BACKEND ================= */
const GITHUB = {
    owner: 'kgr-tech',
    contentRepo: 'portfolio',
    branch: 'main',
    contentFile: 'content.json',
};

const CACHE_KEY = 'kgr-github-backend-v3';
const CACHE_MS = 5 * 60 * 1000;

let contentBase = '';
let contentSource = 'GitHub';

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    }[ch]));
}

function isHttpUrl(value) {
    return /^https?:\/\//i.test(value || '');
}

function mediaUrl(path, repo, branch) {
    if (!path) return '';
    if (isHttpUrl(path)) return path;
    const clean = String(path).replace(/^\.\//, '').replace(/^\//, '');
    if (repo) {
        return `https://raw.githubusercontent.com/${GITHUB.owner}/${repo}/${branch || 'main'}/${clean}`;
    }
    return contentBase ? `${contentBase}${clean}` : clean;
}

function githubRawBase(repo, branch) {
    return `https://raw.githubusercontent.com/${GITHUB.owner}/${repo}/${branch || 'main'}/`;
}

async function fetchJson(url) {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`${res.status} ${url}`);
    return res.json();
}

async function fetchText(url, headers) {
    const res = await fetch(url, { cache: 'no-store', headers });
    if (!res.ok) return '';
    return res.text();
}

function youtubeIdFromUrl(url) {
    if (!url) return null;
    try {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, '');
        if (host === 'youtu.be') return parsed.pathname.slice(1).split('/')[0] || null;
        if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
            if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
            const parts = parsed.pathname.split('/').filter(Boolean);
            if (['embed', 'shorts', 'live', 'share'].includes(parts[0])) return parts[1] || null;
        }
    } catch {
        return null;
    }
    return null;
}

function extractYoutube(text) {
    if (!text) return [];
    const found = [];
    const re = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{6,})[^\s)<>"']*/gi;
    let match;
    while ((match = re.exec(text))) {
        const url = match[0].replace(/[.,;]+$/, '');
        const id = youtubeIdFromUrl(url);
        if (!id) continue;
        found.push({ title: '', url, id });
    }
    return found;
}

function extractMarkdownImages(text, repo, branch) {
    if (!text) return [];
    const images = [];
    const re = /!\[[^\]]*]\(([^)]+)\)/g;
    let match;
    while ((match = re.exec(text))) {
        let src = match[1].trim().split(/\s+/)[0].replace(/["']/g, '');
        if (!src || /shields\.io|badge|travis-ci|codecov|github\.com\/.*\/actions|img\.shields/i.test(src)) continue;
        if (!isHttpUrl(src)) src = mediaUrl(src, repo, branch);
        images.push(src);
    }
    return images;
}

function extractNamedLinks(text) {
    if (!text) return [];
    const cleaned = text.replace(/!\[[^\]]*]\([^)]+\)/g, '');
    const links = [];
    const re = /\[([^\]]+)]\((https?:\/\/[^)]+)\)/g;
    let match;
    while ((match = re.exec(cleaned))) {
        const label = match[1].trim();
        const url = match[2].trim();
        if (!label || /^!\[/.test(label)) continue;
        if (/shields\.io|badge|img\.shields|travis-ci|codecov|github\.com\/.*\/actions/i.test(url)) continue;
        links.push({ label, url });
    }
    return links;
}

function usefulReadmeLinks(mdLinks) {
    return mdLinks.filter((link) =>
        /demo|live|try it|play|preview|docs?|document|case study|walkthrough/i.test(link.label)
    ).slice(0, 2);
}

function screenshotFromReadme(images) {
    return images.find((src) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(src.split('?')[0])) || '';
}

function detectGithubPages() {
    const host = location.hostname;
    if (!host.endsWith('.github.io')) return null;
    const owner = host.slice(0, -'.github.io'.length);
    const repo = location.pathname.split('/').filter(Boolean)[0] || `${owner}.github.io`;
    return { owner, repo };
}

async function loadContentFile() {
    const hosted = detectGithubPages();
    if (hosted) {
        GITHUB.owner = hosted.owner;
        GITHUB.contentRepo = hosted.repo;
    }

    const reposToTry = [...new Set([
        GITHUB.contentRepo,
        'portfolio',
        'My-Personal-Portfolio',
        'my-personal-portfolio',
        'personal-portfolio',
    ])];

    for (const repo of reposToTry) {
        const urls = [
            `${githubRawBase(repo, GITHUB.branch)}${GITHUB.contentFile}`,
            `https://cdn.jsdelivr.net/gh/${GITHUB.owner}/${repo}@${GITHUB.branch}/${GITHUB.contentFile}`,
        ];
        for (const url of urls) {
            try {
                const data = await fetchJson(url);
                GITHUB.contentRepo = data.github?.contentRepo || repo;
                GITHUB.branch = data.github?.branch || GITHUB.branch;
                contentBase = githubRawBase(GITHUB.contentRepo, GITHUB.branch);
                contentSource = `GitHub ${GITHUB.owner}/${GITHUB.contentRepo}`;
                return data;
            } catch {
                /* try next location */
            }
        }
    }

    try {
        const data = await fetchJson('content.json');
        contentBase = '';
        contentSource = `GitHub API ${GITHUB.owner} + content.json`;
        return data;
    } catch {
        contentSource = `GitHub ${GITHUB.owner}`;
        return { projects: [], youtube: [], github: { owner: GITHUB.owner, importRepos: true } };
    }
}

async function loadGithubReadme(owner, repo) {
    return fetchText(`https://api.github.com/repos/${owner}/${repo}/readme`, {
        Accept: 'application/vnd.github.raw',
    });
}

async function loadGithubRepos(settings) {
    if (settings?.importRepos === false) return { projects: [], youtube: [] };
    const owner = settings?.owner || GITHUB.owner;
    const exclude = new Set(settings?.excludeRepos || []);
    const res = await fetch(`https://api.github.com/users/${owner}/repos?sort=updated&per_page=30`);
    if (!res.ok) throw new Error('GitHub repos unavailable');
    const repos = await res.json();
    const selected = repos.filter((repo) => !repo.fork && !exclude.has(repo.name));

    const enriched = await Promise.all(selected.map(async (repo) => {
        const readme = await loadGithubReadme(owner, repo.name);
        const images = extractMarkdownImages(readme, repo.name, repo.default_branch);
        const mdLinks = extractNamedLinks(readme);
        const youtube = extractYoutube(readme).map((video) => ({
            ...video,
            title: video.title || `${repo.name} video`,
        }));
        const pagesUrl = repo.has_pages ? `https://${owner}.github.io/${repo.name}/` : '';
        const homepage = (repo.homepage && repo.homepage.trim()) || '';
        const extraLinks = usefulReadmeLinks(mdLinks);
        const demoFromReadme = extraLinks.find((link) => /demo|live|try it|play|preview/i.test(link.label));
        const docFromReadme = extraLinks.find((link) => /doc|case study|pdf|drive|notion/i.test(link.label));

        return {
            project: {
                title: repo.name,
                description: repo.description || `${repo.language || 'GitHub'} project`,
                image: screenshotFromReadme(images) || `https://opengraph.githubassets.com/1/${owner}/${repo.name}`,
                codeUrl: repo.html_url,
                demoUrl: homepage || demoFromReadme?.url || pagesUrl,
                docUrl: docFromReadme?.url || '',
                language: repo.language || 'GitHub',
                fromGithub: true,
                links: extraLinks.filter((link) => link.url !== (homepage || demoFromReadme?.url || pagesUrl)),
            },
            youtube,
        };
    }));

    return {
        projects: enriched.map((item) => item.project),
        youtube: enriched.flatMap((item) => item.youtube),
    };
}

function mergeProjects(manual, repos) {
    const seen = new Set(
        manual.map((p) => (p.codeUrl || p.title || '').toLowerCase()).filter(Boolean)
    );
    const extra = repos.filter((repo) => {
        const key = (repo.codeUrl || repo.title).toLowerCase();
        if (seen.has(key) || seen.has(repo.title.toLowerCase())) return false;
        seen.add(key);
        return true;
    });
    return [...manual, ...extra];
}

function mergeYoutube(...lists) {
    const out = [];
    const seen = new Set();
    lists.flat().forEach((video) => {
        if (!video?.url || /VIDEO_ID/i.test(video.url)) return;
        const id = youtubeIdFromUrl(video.url) || video.url;
        if (seen.has(id)) return;
        seen.add(id);
        out.push(video);
    });
    return out;
}

function projectLinks(project) {
    const links = [];
    if (project.docUrl) {
        links.push(`<a href="${escapeHtml(project.docUrl)}" target="_blank" rel="noopener noreferrer" class="link-btn"><i class="fa-solid fa-file-lines"></i> Document</a>`);
    }
    if (project.demoUrl) {
        links.push(`<a href="${escapeHtml(project.demoUrl)}" target="_blank" rel="noopener noreferrer" class="link-btn"><i class="fa-solid fa-desktop"></i> Demo</a>`);
    }
    if (project.codeUrl) {
        links.push(`<a href="${escapeHtml(project.codeUrl)}" target="_blank" rel="noopener noreferrer" class="link-btn"><i class="fa-brands fa-github"></i> Code</a>`);
    }
    if (Array.isArray(project.links)) {
        project.links.forEach((link) => {
            if (!link?.url) return;
            if (project.demoUrl && link.url === project.demoUrl) return;
            if (project.docUrl && link.url === project.docUrl) return;
            links.push(`<a href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">${escapeHtml(link.label || 'Link')}</a>`);
        });
    }
    return links.join('');
}

function renderProjects(projects) {
    const grid = document.getElementById('projects-grid');
    if (!grid) return;

    if (!projects.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-brands fa-github"></i>
                <h3>Waiting for GitHub</h3>
                <p>Projects, images, and links are imported from <code>github.com/${escapeHtml(GITHUB.owner)}</code>.</p>
            </div>`;
        return;
    }

    grid.innerHTML = projects.map((project) => {
        const image = mediaUrl(project.image);
        const imgBlock = image
            ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(project.title)}" onerror="this.parentElement.classList.add('project-img-placeholder'); this.remove();">`
            : `<i class="fa-solid fa-image"></i><span>Screenshot</span>`;
        const lang = project.language
            ? `<span class="project-lang">${escapeHtml(project.language)}</span>`
            : '';
        return `
        <article class="project-card">
            <div class="project-img-wrapper ${image ? '' : 'project-img-placeholder'}">
                ${imgBlock}
            </div>
            <div class="project-info">
                <div class="project-title-row">
                    <h3>${escapeHtml(project.title)}</h3>
                    ${lang}
                </div>
                <p>${escapeHtml(project.description || '')}</p>
                <div class="project-links">${projectLinks(project)}</div>
            </div>
        </article>`;
    }).join('');
}

function renderYoutube(videos) {
    const grid = document.getElementById('youtube-grid');
    if (!grid) return;

    if (!videos.length) {
        grid.innerHTML = `
            <div class="empty-state">
                <i class="fa-brands fa-youtube"></i>
                <h3>No YouTube share links on GitHub yet</h3>
                <p>Add them in <code>content.json</code> on GitHub, or drop <code>youtu.be</code> / share URLs into a repo README.<br>
                <code>{"title": "Walkthrough", "url": "https://youtu.be/ID?si=SHARE"}</code></p>
            </div>`;
        return;
    }

    grid.innerHTML = videos.map((video) => {
        const id = youtubeIdFromUrl(video.url);
        const title = escapeHtml(video.title || 'YouTube video');
        if (!id) {
            return `
            <article class="video-card">
                <div class="video-info">
                    <h3>${title}</h3>
                    <p class="video-error">That share link could not be embedded.</p>
                    <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">Open link</a>
                </div>
            </article>`;
        }
        return `
        <article class="video-card">
            <div class="video-frame">
                <iframe
                    src="https://www.youtube.com/embed/${escapeHtml(id)}"
                    title="${title}"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen
                    loading="lazy"></iframe>
            </div>
            <div class="video-info">
                <h3>${title}</h3>
                <div class="video-actions">
                    <a href="${escapeHtml(video.url)}" target="_blank" rel="noopener noreferrer" class="link-btn">
                        <i class="fa-brands fa-youtube"></i> Open share link
                    </a>
                </div>
            </div>
        </article>`;
    }).join('');
}

function setSourcePill(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    el.hidden = !text;
    el.innerHTML = text ? `<i class="fa-brands fa-github"></i> ${escapeHtml(text)}` : '';
}

function showLoading(id, label) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = `<div class="empty-state"><i class="fa-solid fa-spinner fa-spin"></i><h3>Loading ${escapeHtml(label)}</h3></div>`;
}

function readCache() {
    try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() - parsed.savedAt > CACHE_MS) return null;
        return parsed.payload;
    } catch {
        return null;
    }
}

function writeCache(payload) {
    try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ savedAt: Date.now(), payload }));
    } catch {
        /* ignore quota */
    }
}

async function bootFromGithub() {
    showLoading('projects-grid', 'GitHub projects, images, and links');
    showLoading('youtube-grid', 'YouTube share links from GitHub');

    const cached = readCache();
    if (cached) {
        contentSource = cached.contentSource;
        renderProjects(cached.projects);
        renderYoutube(cached.youtube);
        setSourcePill('projects-source', `${contentSource} · ${cached.projects.length} projects`);
        setSourcePill('youtube-source', `${contentSource} · ${cached.youtube.length} videos`);
    }

    const content = await loadContentFile();
    if (content.github?.owner) GITHUB.owner = content.github.owner;
    if (content.github?.contentRepo) GITHUB.contentRepo = content.github.contentRepo;
    if (content.github?.branch) GITHUB.branch = content.github.branch;

    let imported = { projects: [], youtube: [] };
    try {
        imported = await loadGithubRepos(content.github || { importRepos: true, owner: GITHUB.owner });
    } catch (err) {
        console.warn(err);
    }

    const projects = mergeProjects(content.projects || [], imported.projects);
    const youtube = mergeYoutube(content.youtube || [], imported.youtube);

    renderProjects(projects);
    renderYoutube(youtube);
    setSourcePill('projects-source', `${contentSource} · ${projects.length} project${projects.length === 1 ? '' : 's'}`);
    setSourcePill('youtube-source', `${contentSource} · ${youtube.length} video${youtube.length === 1 ? '' : 's'}`);
    writeCache({ projects, youtube, contentSource });
}

/* ================= NAVIGATION ================= */
const navToggle = document.getElementById('nav-toggle');
const navMenu = document.getElementById('nav-menu');
const toggleIcon = navToggle ? navToggle.querySelector('i') : null;

if (navToggle && navMenu && toggleIcon) {
    navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('open');
        if (navMenu.classList.contains('open')) {
            toggleIcon.classList.replace('fa-bars', 'fa-xmark');
        } else {
            toggleIcon.classList.replace('fa-xmark', 'fa-bars');
        }
    });
}

document.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
        if (navMenu && toggleIcon && navMenu.classList.contains('open')) {
            navMenu.classList.remove('open');
            toggleIcon.classList.replace('fa-xmark', 'fa-bars');
        }
    });
});

const header = document.getElementById('header');
window.addEventListener('scroll', () => {
    if (!header) return;
    header.style.boxShadow = window.scrollY >= 50 ? '0 4px 20px rgba(0, 0, 0, 0.4)' : 'none';
});

const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Thank you! Your message has been noted.');
        contactForm.reset();
    });
}

bootFromGithub();
