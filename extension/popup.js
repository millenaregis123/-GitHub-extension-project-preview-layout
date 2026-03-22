// ─── PR Preview Vercel ─ Popup Script ─────────────────────────────────────────

const $ = (id) => document.getElementById(id);

const vercelTokenInput = $('vercel-token');
const teamIdInput      = $('team-id');
const projectIdInput   = $('project-id');
const ghTokenInput     = $('gh-token');
const btnValidate      = $('btn-validate');
const validateResult   = $('validate-result');
const validateText     = $('validate-text');
const btnLoadProjects  = $('btn-load-projects');
const projectListEl    = $('project-list');
const btnSave          = $('btn-save');
const saveFeedback     = $('save-feedback');

let selectedProjectId = '';
let loadedProjects    = [];

// ─── Carrega valores salvos ───────────────────────────────────────────────────

chrome.storage.sync.get(
  ['vercelToken', 'teamId', 'vercelProjectId', 'ghToken'],
  (data) => {
    if (data.vercelToken)      vercelTokenInput.value = data.vercelToken;
    if (data.teamId)           teamIdInput.value      = data.teamId;
    if (data.vercelProjectId)  projectIdInput.value   = data.vercelProjectId;
    if (data.ghToken)          ghTokenInput.value     = data.ghToken;
    selectedProjectId = data.vercelProjectId || '';
  }
);

// ─── Validar token Vercel ─────────────────────────────────────────────────────

btnValidate.addEventListener('click', validateToken);

async function validateToken() {
  const token  = vercelTokenInput.value.trim();
  const teamId = teamIdInput.value.trim() || undefined;

  if (!token) {
    showValidation('err', 'Insira um token para testar.');
    return;
  }

  btnValidate.textContent = '…';
  btnValidate.disabled    = true;

  try {
    const url = new URL('https://api.vercel.com/v2/user');
    if (teamId) url.searchParams.set('teamId', teamId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      const name = data.user?.name || data.user?.username || 'Usuário';
      showValidation('ok', `Conectado como ${name}`);
    } else {
      const body = await res.json().catch(() => ({}));
      showValidation('err', `Erro ${res.status}: ${body.error?.message || 'Token inválido'}`);
    }
  } catch (err) {
    showValidation('err', `Falha na conexão: ${err.message}`);
  } finally {
    btnValidate.textContent = 'Testar';
    btnValidate.disabled    = false;
  }
}

function showValidation(type, message) {
  validateResult.className = `validate-result show validate-result--${type}`;
  validateText.textContent  = message;
}

// ─── Carregar projetos Vercel ─────────────────────────────────────────────────

btnLoadProjects.addEventListener('click', loadProjects);

async function loadProjects() {
  const token  = vercelTokenInput.value.trim();
  const teamId = teamIdInput.value.trim() || undefined;

  if (!token) {
    alert('Insira o token Vercel antes de carregar os projetos.');
    return;
  }

  btnLoadProjects.textContent = 'Carregando…';
  btnLoadProjects.disabled    = true;

  try {
    const url = new URL('https://api.vercel.com/v9/projects?limit=100');
    if (teamId) url.searchParams.set('teamId', teamId);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`${res.status}: ${body.error?.message || res.statusText}`);
    }

    const data     = await res.json();
    loadedProjects = data.projects || [];

    renderProjectList(loadedProjects);
    projectListEl.style.display = 'block';
    btnLoadProjects.textContent  = 'Recarregar projetos';
  } catch (err) {
    alert(`Erro ao carregar projetos: ${err.message}`);
    btnLoadProjects.textContent = 'Carregar meus projetos';
  } finally {
    btnLoadProjects.disabled = false;
  }
}

function renderProjectList(projects) {
  if (projects.length === 0) {
    projectListEl.innerHTML = '<div class="project-empty">Nenhum projeto encontrado.</div>';
    return;
  }

  projectListEl.innerHTML = projects
    .map((p) => {
      const repo      = p.link?.repo || '';
      const isSelected = p.id === selectedProjectId || p.name === selectedProjectId;
      return `
        <div class="project-item${isSelected ? ' selected' : ''}" data-id="${esc(p.id)}" data-name="${esc(p.name)}">
          <span class="project-radio"></span>
          <span class="project-name">${esc(p.name)}</span>
          ${repo ? `<span class="project-repo">${esc(repo)}</span>` : ''}
        </div>
      `;
    })
    .join('');

  projectListEl.querySelectorAll('.project-item').forEach((item) => {
    item.addEventListener('click', () => {
      projectListEl.querySelectorAll('.project-item').forEach((el) => el.classList.remove('selected'));
      item.classList.add('selected');
      selectedProjectId      = item.dataset.id;
      projectIdInput.value   = item.dataset.name; // usa o nome (slug) que a API aceita
    });
  });
}

// ─── Salvar configurações ─────────────────────────────────────────────────────

btnSave.addEventListener('click', save);

function save() {
  const config = {
    vercelToken:      vercelTokenInput.value.trim(),
    teamId:           teamIdInput.value.trim(),
    vercelProjectId:  projectIdInput.value.trim() || selectedProjectId,
    ghToken:          ghTokenInput.value.trim(),
  };

  if (!config.vercelToken) {
    showSaveFeedback('err', 'Token Vercel é obrigatório.');
    return;
  }

  chrome.storage.sync.set(config, () => {
    showSaveFeedback('ok', 'Configurações salvas!');
  });
}

function showSaveFeedback(type, message) {
  saveFeedback.className   = `save-feedback show save-feedback--${type}`;
  saveFeedback.textContent  = message;
  setTimeout(() => saveFeedback.classList.remove('show'), 3000);
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
