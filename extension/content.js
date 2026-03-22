// ─── PR Preview Vercel ─ Content Script ───────────────────────────────────────
// Roda em: https://github.com/*/*/pull/*
// Detecta o PR atual, busca o preview deploy na Vercel e injeta o botão/badge.

(function () {
  'use strict';

  const BTN_ID       = 'prpv-btn';
  const BADGE_ID     = 'prpv-badge';
  const PANEL_ID     = 'prpv-panel';

  // ─── Configurações salvas ────────────────────────────────────────────────────

  function getConfig() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        ['vercelToken', 'teamId', 'vercelProjectId', 'ghToken'],
        resolve
      );
    });
  }

  // ─── Parser de URL do GitHub ─────────────────────────────────────────────────

  function parsePRInfo() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length < 4 || parts[2] !== 'pull') return null;
    return { owner: parts[0], repo: parts[1], prNumber: parts[3] };
  }

  // ─── GitHub API ───────────────────────────────────────────────────────────────

  async function fetchPRDetails(owner, repo, prNumber, ghToken) {
    const headers = { Accept: 'application/vnd.github+json' };
    if (ghToken) headers['Authorization'] = `Bearer ${ghToken}`;
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
      { headers }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    return res.json();
  }

  // ─── Vercel API (via objeto global injetado pelo vercel-api.js) ───────────────

  async function findPreview(prInfo, prDetails, config) {
    return window.VercelAPI.findPreviewForPR({
      owner:           prInfo.owner,
      repo:            prInfo.repo,
      headRef:         prDetails.head.ref,
      headSha:         prDetails.head.sha,
      token:           config.vercelToken,
      teamId:          config.teamId   || undefined,
      vercelProjectId: config.vercelProjectId || undefined,
    });
  }

  // ─── UI helpers ───────────────────────────────────────────────────────────────

  function removeExisting() {
    [BTN_ID, BADGE_ID, PANEL_ID].forEach((id) => document.getElementById(id)?.remove());
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id        = BTN_ID;
    btn.className = 'prpv-btn prpv-btn--loading';
    btn.innerHTML = `<span class="prpv-spinner"></span><span class="prpv-btn-text">Buscando preview…</span>`;
    btn.disabled  = true;
    return btn;
  }

  /**
   * Painel inline que aparece abaixo do botão com URL, status e metadados.
   */
  function createPanel(deployment, previewUrl, project) {
    const panel = document.createElement('div');
    panel.id        = PANEL_ID;
    panel.className = 'prpv-panel';

    const stateMap = {
      READY:       { label: 'Pronto',          cls: 'prpv-state--ready'   },
      BUILDING:    { label: 'Em build…',        cls: 'prpv-state--building'},
      QUEUED:      { label: 'Na fila',          cls: 'prpv-state--building'},
      ERROR:       { label: 'Erro no build',    cls: 'prpv-state--error'   },
      CANCELED:    { label: 'Cancelado',        cls: 'prpv-state--error'   },
    };

    const state = stateMap[deployment.readyState] || { label: deployment.readyState, cls: '' };
    const age   = timeAgo(deployment.createdAt);
    const branch = deployment.meta?.githubCommitRef || deployment.gitSource?.ref || '—';
    const sha    = (deployment.meta?.githubCommitSha || deployment.gitSource?.sha || '').slice(0, 7);

    panel.innerHTML = `
      <div class="prpv-panel-row prpv-panel-header">
        <span class="prpv-state-dot ${state.cls}"></span>
        <strong>${state.label}</strong>
        <span class="prpv-panel-meta">${age}</span>
      </div>
      <div class="prpv-panel-row">
        <span class="prpv-panel-label">Projeto</span>
        <span>${escHtml(project.name)}</span>
      </div>
      <div class="prpv-panel-row">
        <span class="prpv-panel-label">Branch</span>
        <code>${escHtml(branch)}</code>
        ${sha ? `<code class="prpv-sha">${sha}</code>` : ''}
      </div>
      <div class="prpv-panel-row prpv-panel-url">
        <span class="prpv-panel-label">URL</span>
        <a href="${previewUrl}" target="_blank" rel="noopener">${previewUrl.replace('https://', '')}</a>
      </div>
    `;

    return panel;
  }

  // ─── Injeção na interface do GitHub ──────────────────────────────────────────

  function findInjectionTarget() {
    const selectors = [
      '.gh-header-actions',
      '[data-target="sticky-scroll-bit.header"] .d-flex',
      '.js-pull-request-meta',
      '#partial-discussion-header',
    ];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  }

  function injectButton() {
    if (document.getElementById(BTN_ID)) return null;

    const btn = createButton();
    const target = findInjectionTarget();

    if (target) {
      target.prepend(btn);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'prpv-fallback';
      fallback.appendChild(btn);
      document.body.prepend(fallback);
    }
    return btn;
  }

  function setButtonReady(btn, previewUrl) {
    btn.className = 'prpv-btn prpv-btn--ready';
    btn.disabled  = false;
    btn.innerHTML = `
      <svg class="prpv-icon" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
        <path d="M8 5a.75.75 0 01.75.75v2.5h2.5a.75.75 0 010 1.5h-3.25A.75.75 0 017.25 9V5.75A.75.75 0 018 5z"/>
      </svg>
      <span class="prpv-btn-text">Ver Preview Vercel</span>
    `;
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openTab', url: previewUrl });
      // Toggle do painel de detalhes
      const panel = document.getElementById(PANEL_ID);
      if (panel) panel.classList.toggle('prpv-panel--hidden');
    });
  }

  function setButtonNotFound(btn) {
    btn.className = 'prpv-btn prpv-btn--notfound';
    btn.disabled  = false;
    btn.innerHTML = `
      <span class="prpv-btn-text">Preview não encontrado</span>
    `;
    btn.title = 'Verifique se o projeto está conectado à Vercel e se o token está configurado corretamente.';
    btn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openPopup' });
    });
  }

  function setButtonError(btn, message) {
    btn.className = 'prpv-btn prpv-btn--error';
    btn.disabled  = false;
    btn.innerHTML = `<span class="prpv-btn-text">Erro — ver detalhes</span>`;
    btn.title     = message;
    btn.addEventListener('click', () => alert(`PR Preview Vercel:\n\n${message}`));
  }

  function setButtonNoToken(btn) {
    btn.className = 'prpv-btn prpv-btn--setup';
    btn.disabled  = false;
    btn.innerHTML = `<span class="prpv-btn-text">Configure o token Vercel</span>`;
    btn.addEventListener('click', () => chrome.runtime.sendMessage({ action: 'openPopup' }));
  }

  // ─── Lógica principal ─────────────────────────────────────────────────────────

  async function run() {
    const prInfo = parsePRInfo();
    if (!prInfo) return;

    removeExisting();
    const btn = injectButton();
    if (!btn) return;

    const config = await getConfig();

    if (!config.vercelToken) {
      setButtonNoToken(btn);
      return;
    }

    try {
      const prDetails = await fetchPRDetails(
        prInfo.owner, prInfo.repo, prInfo.prNumber, config.ghToken
      );

      const result = await findPreview(prInfo, prDetails, config);

      if (!result) {
        setButtonNotFound(btn);
        return;
      }

      const { url, deployment, project } = result;
      setButtonReady(btn, url);

      // Injeta o painel de detalhes logo abaixo do botão (oculto por padrão)
      const panel = createPanel(deployment, url, project);
      panel.classList.add('prpv-panel--hidden');
      btn.insertAdjacentElement('afterend', panel);

      // Se o deploy ainda está buildando, faz polling até ficar pronto
      if (['BUILDING', 'QUEUED', 'INITIALIZING'].includes(deployment.readyState)) {
        pollDeployment(deployment.uid, btn, panel, url, project, config);
      }

    } catch (err) {
      console.error('[PR Preview Vercel]', err);
      setButtonError(btn, err.message);
    }
  }

  // ─── Polling para deploys em andamento ───────────────────────────────────────

  async function pollDeployment(deploymentId, btn, panel, url, project, config) {
    const INTERVAL = 8000; // 8 segundos
    const MAX_TRIES = 40;  // ~5 minutos
    let tries = 0;

    const tick = async () => {
      if (tries++ > MAX_TRIES) return;
      try {
        const dep = await window.VercelAPI.getDeployment(deploymentId, config.vercelToken, config.teamId);
        if (dep.readyState === 'READY') {
          // Atualiza o painel e mantém o botão
          const newPanel = createPanel(dep, url, project);
          newPanel.classList.toggle('prpv-panel--hidden', panel.classList.contains('prpv-panel--hidden'));
          panel.replaceWith(newPanel);
          return;
        }
        if (['ERROR', 'CANCELED'].includes(dep.readyState)) return;
        setTimeout(tick, INTERVAL);
      } catch {
        setTimeout(tick, INTERVAL * 2);
      }
    };

    setTimeout(tick, INTERVAL);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function timeAgo(ms) {
    if (!ms) return '';
    const diff = Date.now() - ms;
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'agora há pouco';
    if (mins < 60) return `há ${mins} min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `há ${hrs}h`;
    return `há ${Math.floor(hrs / 24)} dias`;
  }

  // ─── Observer para navegação Turbo do GitHub ─────────────────────────────────

  let lastUrl = '';
  const obs = new MutationObserver(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      run();
    }
  });
  obs.observe(document.body, { childList: true, subtree: true });

  run();
})();
