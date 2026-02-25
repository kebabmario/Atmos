(() => {
  'use strict';

  /* ── Helpers ─────────────────────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  /* ── Elements ────────────────────────────────────────── */
  const sidebar       = $('#sidebar');
  const overlay       = $('#sidebarOverlay');
  const menuBtn       = $('#menuBtn');
  const searchInput   = $('#searchInput');
  const searchResults = $('#searchResults');
  const tocNav        = $('#tocNav');
  const mainContent   = $('#mainContent');

  /* ══════════════════════════════════════════════════════
     1. Mobile sidebar toggle
  ══════════════════════════════════════════════════════ */
  function openSidebar() {
    sidebar.classList.add('open');
    overlay.classList.add('open');
    menuBtn.textContent = '✕';
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    menuBtn.textContent = '☰';
  }

  menuBtn.addEventListener('click', () =>
    sidebar.classList.contains('open') ? closeSidebar() : openSidebar()
  );

  overlay.addEventListener('click', closeSidebar);

  /* Close sidebar on nav link click (mobile) */
  $$('.sidebar-nav a').forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  /* ══════════════════════════════════════════════════════
     2. Build right-hand TOC from headings in content sections
  ══════════════════════════════════════════════════════ */
  function buildTOC() {
    const headings = $$('#mainContent .content-section h1, #mainContent .content-section h2, #mainContent .content-section h3');
    if (!headings.length) return;

    headings.forEach((h, i) => {
      // Ensure each heading has an id
      if (!h.id) {
        h.id = 'heading-' + i;
      }

      const li = document.createElement('li');
      li.className = h.tagName === 'H3' ? 'toc-h3' : '';

      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      a.dataset.target = h.id;

      a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.getElementById(h.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });

      li.appendChild(a);
      tocNav.appendChild(li);
    });
  }

  buildTOC();

  /* ══════════════════════════════════════════════════════
     3. Scroll-spy (sidebar + TOC)
  ══════════════════════════════════════════════════════ */
  const sections = $$('#mainContent .content-section');
  const tocLinks = () => $$('#tocNav a');
  const navLinks = () => $$('.sidebar-nav a[href^="#"]');

  // Map of section id → sidebar anchor
  const sidebarMap = {};
  navLinks().forEach(a => {
    const id = a.getAttribute('href').replace('#', '');
    sidebarMap[id] = a;
  });

  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      updateActiveStates();
      ticking = false;
    });
  }

  function updateActiveStates() {
    const scrollY = window.scrollY;
    const offset  = 100; // px before section top triggers active

    // Find the current section
    let currentSection = sections[0];
    sections.forEach(section => {
      const rect = section.getBoundingClientRect();
      if (rect.top - offset <= 0) {
        currentSection = section;
      }
    });

    // Update sidebar active state
    navLinks().forEach(a => a.classList.remove('active'));
    if (currentSection && sidebarMap[currentSection.id]) {
      sidebarMap[currentSection.id].classList.add('active');
    }

    // Update TOC active state — find nearest heading above viewport midpoint
    const allHeadings = $$('#mainContent h1[id], #mainContent h2[id], #mainContent h3[id]');
    let activeHeading = allHeadings[0];
    allHeadings.forEach(h => {
      if (h.getBoundingClientRect().top - offset <= 0) {
        activeHeading = h;
      }
    });

    tocLinks().forEach(a => a.classList.remove('active'));
    if (activeHeading) {
      const activeTocLink = tocNav.querySelector(`a[data-target="${activeHeading.id}"]`);
      if (activeTocLink) activeTocLink.classList.add('active');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  updateActiveStates(); // run once on load

  /* ══════════════════════════════════════════════════════
     4. Client-side Search
  ══════════════════════════════════════════════════════ */

  // Build search index from sections
  const searchIndex = [];

  sections.forEach(section => {
    const sectionId = section.id;
    const sectionTitle = ($('.section-title', section) || $('h1,h2', section))?.textContent || sectionId;

    // Index h3 headings within section
    $$('h3', section).forEach(h => {
      searchIndex.push({
        id: h.id || null,
        sectionId,
        title: h.textContent.trim(),
        section: sectionTitle,
        type: 'heading'
      });
    });

    // Index the section itself
    searchIndex.unshift({
      id: sectionId,
      sectionId,
      title: sectionTitle,
      section: null,
      type: 'section'
    });
  });

  function runSearch(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return searchIndex.filter(item =>
      item.title.toLowerCase().includes(q)
    ).slice(0, 8);
  }

  function renderResults(results, query) {
    searchResults.innerHTML = '';

    if (!results.length) {
      searchResults.innerHTML = `<div class="search-no-results">No results for "<strong>${escapeHtml(query)}</strong>"</div>`;
      return;
    }

    results.forEach((item, i) => {
      const el = document.createElement('a');
      el.className = 'search-result-item';
      el.href = '#' + (item.id || item.sectionId);
      el.dataset.index = i;

      const icon = item.type === 'section' ? '📄' : '#';
      el.innerHTML = `
        <span class="result-icon">${icon}</span>
        <span class="search-result-title">${escapeHtml(item.title)}</span>
        ${item.section ? `<span class="search-result-section">${escapeHtml(item.section)}</span>` : ''}
      `;

      el.addEventListener('click', e => {
        e.preventDefault();
        const targetId = item.id || item.sectionId;
        const target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        closeSearch();
      });

      searchResults.appendChild(el);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function openSearch() {
    searchResults.classList.add('open');
  }

  function closeSearch() {
    searchResults.classList.remove('open');
    searchInput.value = '';
  }

  searchInput.addEventListener('input', () => {
    const q = searchInput.value;
    if (!q.trim()) {
      searchResults.classList.remove('open');
      return;
    }
    openSearch();
    renderResults(runSearch(q), q);
  });

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) openSearch();
  });

  // Close on outside click
  document.addEventListener('click', e => {
    const search = $('#headerSearch');
    if (!search.contains(e.target)) closeSearch();
  });

  // Keyboard: Esc closes, ↑↓ navigate results, Enter selects
  searchInput.addEventListener('keydown', e => {
    const items = $$('.search-result-item', searchResults);
    const focusedIdx = items.findIndex(el => el.classList.contains('focused'));

    if (e.key === 'Escape') {
      closeSearch();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIdx + 1;
      items.forEach(el => el.classList.remove('focused'));
      if (items[next]) items[next].classList.add('focused');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusedIdx - 1;
      items.forEach(el => el.classList.remove('focused'));
      if (prev >= 0 && items[prev]) items[prev].classList.add('focused');
    } else if (e.key === 'Enter') {
      const focused = items.find(el => el.classList.contains('focused'));
      if (focused) focused.click();
    }
  });

  // ⌘K / Ctrl+K shortcut
  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });

  /* ══════════════════════════════════════════════════════
     5. Sidebar nav filter (live filter as you type in search)
     Also filter sidebar items to match search query
  ══════════════════════════════════════════════════════ */
  function filterSidebar(query) {
    const q = query.trim().toLowerCase();
    $$('.sidebar-nav li[data-section]').forEach(li => {
      if (!q) {
        li.classList.remove('hidden');
        return;
      }
      const text = li.textContent.toLowerCase();
      li.classList.toggle('hidden', !text.includes(q));
    });
  }

  searchInput.addEventListener('input', () => filterSidebar(searchInput.value));

  // Clear filter when search closes
  const origClose = closeSearch;
  // already defined above — extend it
  window.__atmosCloseSearch = closeSearch;
  const _close = closeSearch;
  closeSearch = function() {
    _close();
    filterSidebar('');
  };

  /* ══════════════════════════════════════════════════════
     6. Smooth scrolling for sidebar links
  ══════════════════════════════════════════════════════ */
  $$('.sidebar-nav a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      const id = a.getAttribute('href').replace('#', '');
      const target = document.getElementById(id);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

})();
