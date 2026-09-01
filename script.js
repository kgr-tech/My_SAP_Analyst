/* ============================================
   Portfolio Script
   – Mobile nav, scroll effects, GitHub-backed
     projects & YouTube, contact form
   ============================================ */

const GITHUB_USER = "kgr-tech";
const PORTFOLIO_REPO = "My-Personal-Portfolio";
const GITHUB_API = `https://api.github.com/users/${GITHUB_USER}/repos?sort=updated&per_page=50`;
const CONTENT_JSON_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${PORTFOLIO_REPO}/main/content.json`;

// ── DOM refs ──────────────────────────────────
const header = document.getElementById("header");
const navToggle = document.getElementById("nav-toggle");
const navMenu = document.getElementById("nav-menu");
const projectsGrid = document.getElementById("projects-grid");
const projectsSource = document.getElementById("projects-source");
const youtubeGrid = document.getElementById("youtube-grid");
const youtubeSource = document.getElementById("youtube-source");
const contactForm = document.getElementById("contact-form");

// ── Mobile Nav Toggle ─────────────────────────
(function initNav() {
  if (!navToggle || !navMenu) return;

  // Create overlay
  const overlay = document.createElement("div");
  overlay.classList.add("nav-overlay");
  document.body.appendChild(overlay);

  function openMenu() {
    navMenu.classList.add("show-menu");
    overlay.classList.add("show");
  }

  function closeMenu() {
    navMenu.classList.remove("show-menu");
    overlay.classList.remove("show");
  }

  navToggle.addEventListener("click", () => {
    navMenu.classList.contains("show-menu") ? closeMenu() : openMenu();
  });

  overlay.addEventListener("click", closeMenu);

  // Close menu when a nav link is clicked
  navMenu.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
})();

// ── Header Scroll Effect ──────────────────────
window.addEventListener("scroll", () => {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 50);
});

// ── Fade-in on Scroll (Intersection Observer) ──
function initFadeIn() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
}

// ── Skill Bars Animation ──────────────────────
function initSkillBars() {
  const bars = document.querySelectorAll(".skill-bar-fill");
  if (!bars.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const fill = entry.target;
          const width = fill.getAttribute("data-width");
          fill.style.width = width + "%";
          fill.classList.add("animated");
          observer.unobserve(fill);
        }
      });
    },
    { threshold: 0.3 }
  );

  bars.forEach((bar) => observer.observe(bar));
}

// ── Stat Counter Animation ────────────────────
function initStatCounters() {
  const counters = document.querySelectorAll(".stat-number[data-count]");
  if (!counters.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.getAttribute("data-count"), 10);
          animateCounter(el, 0, target, 1200);
          observer.unobserve(el);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((c) => observer.observe(c));
}

function animateCounter(el, start, end, duration) {
  const startTime = performance.now();
  function tick(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(start + (end - start) * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// ── Utility: Show source pill ─────────────────
function showSourcePill(el, text) {
  if (!el) return;
  el.textContent = text;
  el.hidden = false;
  el.style.display = "block";
}

// ── Utility: Toast notification ───────────────
function showToast(message, duration = 3500) {
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.classList.add("toast");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
  }, duration);
}

// ── Projects ──────────────────────────────────
async function loadProjects() {
  if (!projectsGrid) return;

  projectsGrid.innerHTML = `<div class="loading-spinner">Fetching projects from GitHub…</div>`;

  let repos = [];
  let source = "";

  try {
    const res = await fetch(GITHUB_API);
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const allRepos = await res.json();

    // Define allowed projects
    const allowedProjects = [
      'SAP-CPI-Analyst',
      'My_SAP_Analyst',
      'HabitEarn',
      'Vibechain'
    ];

    // Filter to show only specified projects
    repos = allRepos.filter(
      (r) =>
        !r.fork &&
        r.name !== GITHUB_USER &&
        r.name.toLowerCase() !== GITHUB_USER.toLowerCase() &&
        allowedProjects.some(allowed => 
          r.name.toLowerCase() === allowed.toLowerCase() ||
          r.name.toLowerCase().replace(/[-_]/g, '') === allowed.toLowerCase().replace(/[-_]/g, '')
        )
    );

    source = `📡 Live from GitHub · ${repos.length} repos`;
  } catch (err) {
    console.warn("GitHub API failed, falling back to local data:", err);

    // Fallback: use local json.txt
    try {
      const localRes = await fetch("json.txt");
      const localData = await localRes.json();
      repos = (localData.projects || []).map((p) => ({
        name: p.title,
        description: p.description,
        html_url: "#",
        homepage: null,
        language: null,
        topics: [],
        stargazers_count: 0,
      }));
      source = "📂 Local fallback (json.txt)";
    } catch {
      projectsGrid.innerHTML = `<div class="error-message">Could not load projects. Please try again later.</div>`;
      return;
    }
  }

  if (repos.length === 0) {
    projectsGrid.innerHTML = `<div class="error-message">No projects found.</div>`;
    return;
  }

  showSourcePill(projectsSource, source);
  renderProjects(repos);
}

function renderProjects(repos) {
  projectsGrid.innerHTML = "";

  repos.forEach((repo, i) => {
    const card = document.createElement("div");
    card.className = "project-card fade-in";
    card.style.transitionDelay = `${i * 0.07}s`;

    // Social preview image from GitHub
    const imgSrc = repo.html_url && repo.html_url !== "#"
      ? `https://opengraph.githubassets.com/1/${GITHUB_USER}/${repo.name}`
      : "";

    const tags = repo.topics && repo.topics.length
      ? repo.topics
      : repo.language
        ? [repo.language]
        : [];

    const tagsHTML = tags
      .slice(0, 5)
      .map((t) => `<span class="project-tag">${t}</span>`)
      .join("");

    let linksHTML = "";
    if (repo.html_url && repo.html_url !== "#") {
      linksHTML += `<a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" class="project-link">
        <i class="fa-brands fa-github"></i> Code
      </a>`;
    }
    if (repo.homepage) {
      linksHTML += `<a href="${repo.homepage}" target="_blank" rel="noopener noreferrer" class="project-link">
        <i class="fa-solid fa-arrow-up-right-from-square"></i> Live
      </a>`;
    }

    card.innerHTML = `
      ${imgSrc ? `<img src="${imgSrc}" alt="${repo.name}" class="project-image" loading="lazy" onerror="this.style.display='none'">` : ""}
      <div class="project-info">
        <h3 class="project-title">${formatRepoName(repo.name)}</h3>
        <p class="project-description">${repo.description || "No description provided."}</p>
        ${tagsHTML ? `<div class="project-tags">${tagsHTML}</div>` : ""}
        <div class="project-links">${linksHTML}</div>
      </div>
    `;

    projectsGrid.appendChild(card);
  });

  // Trigger fade-in observer
  initFadeIn();
}

function formatRepoName(name) {
  return name
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── YouTube ───────────────────────────────────
const DEFAULT_YOUTUBE_VIDEOS = [
  { id: "TYEJv1fXeLE", title: "SAP APIM - Tutorial Part 1" },
  { id: "ktWSpxzVIvU", title: "SAP APIM - Tutorial Part 2" }
];

async function loadYouTube() {
  if (!youtubeGrid) return;

  youtubeGrid.innerHTML = `<div class="loading-spinner">Loading YouTube videos…</div>`;

  const videoMap = new Map();
  // Pre-load default APIM videos
  DEFAULT_YOUTUBE_VIDEOS.forEach((v) => videoMap.set(v.id, v.title));
  let source = "SAP APIM Tutorials";

  try {
    // 1. Try content.json from the portfolio repo
    try {
      const res = await fetch(CONTENT_JSON_URL);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.youtube)) {
          data.youtube.forEach((item) => {
            if (typeof item === "string") {
              const id = extractYouTubeId(item);
              if (id && !videoMap.has(id)) videoMap.set(id, "YouTube Video");
            } else if (item && typeof item === "object" && (item.id || item.url)) {
              const id = item.id || extractYouTubeId(item.url);
              if (id) videoMap.set(id, item.title || "YouTube Video");
            }
          });
        }
      }
    } catch { /* ignore */ }

    // 2. Scan READMEs from all repos for youtu.be / youtube.com links
    const reposRes = await fetch(GITHUB_API);
    if (reposRes.ok) {
      const repos = await reposRes.json();
      const readmePromises = repos
        .filter((r) => !r.fork)
        .slice(0, 20)
        .map(async (repo) => {
          try {
            const readmeRes = await fetch(
              `https://raw.githubusercontent.com/${GITHUB_USER}/${repo.name}/${repo.default_branch || "main"}/README.md`
            );
            if (!readmeRes.ok) return;
            const text = await readmeRes.text();
            // Match youtu.be/ID or youtube.com/watch?v=ID or youtube.com/embed/ID
            const matches = text.matchAll(
              /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/g
            );
            for (const m of matches) {
              if (!videoMap.has(m[1])) {
                videoMap.set(m[1], `Video from ${formatRepoName(repo.name)}`);
              }
            }
          } catch { /* skip */ }
        });
      await Promise.all(readmePromises);
    }

    source = `📡 Loaded ${videoMap.size} video${videoMap.size !== 1 ? "s" : ""}`;
  } catch (err) {
    console.warn("YouTube scan failed, using default videos:", err);
  }

  if (videoMap.size === 0) {
    youtubeGrid.innerHTML = `<div class="error-message">No YouTube videos found yet. Add <code>youtu.be</code> links to your repo READMEs or a <code>youtube</code> array in <code>content.json</code>.</div>`;
    showSourcePill(youtubeSource, "No videos found");
    return;
  }

  showSourcePill(youtubeSource, source);
  renderYouTube([...videoMap.entries()].map(([id, title]) => ({ id, title })));
}

function renderYouTube(videos) {
  youtubeGrid.innerHTML = "";

  videos.forEach((video, i) => {
    const card = document.createElement("div");
    card.className = "youtube-card fade-in";
    card.style.transitionDelay = `${i * 0.08}s`;

    card.innerHTML = `
      <iframe
        src="https://www.youtube.com/embed/${video.id}"
        title="${video.title}"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
        loading="lazy"
      ></iframe>
      <div class="youtube-card-info">
        <p class="youtube-card-title"><i class="fa-brands fa-youtube"></i> ${video.title}</p>
      </div>
    `;

    youtubeGrid.appendChild(card);
  });

  initFadeIn();
}

function extractYouTubeId(url) {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

// ── Contact Form ──────────────────────────────
if (contactForm) {
  contactForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const formData = new FormData(contactForm);
    const name = formData.get("name");

    // Send to Formspree - they will forward to your email
    try {
      const response = await fetch("https://formspree.io/f/xoeqdqbw", {
        method: "POST",
        body: formData,
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        showToast(`Thanks ${name}! Your message has been sent. 🎉`);
        contactForm.reset();
      } else {
        showToast(`Sorry, there was an error. Please email directly at giresh19reddy@gmail.com`);
      }
    } catch (error) {
      showToast(`Sorry, there was an error. Please email directly at giresh19reddy@gmail.com`);
    }
  });
}

// ── Init ──────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  loadProjects();
  loadYouTube();
  initStatCounters();
  initSkillBars();
  initFadeIn();
});
