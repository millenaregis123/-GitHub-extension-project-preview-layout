// ─── PR Preview Vercel ─ Vercel API Client ─────────────────────────────────────
// Encapsula todas as chamadas à Vercel API v9.
// Docs: https://vercel.com/docs/rest-api

'use strict';

const VERCEL_API = 'https://api.vercel.com';

// ─── Utilitários internos ──────────────────────────────────────────────────────

async function vercelFetch(path, token, teamId) {
  const url = new URL(`${VERCEL_API}${path}`);
  if (teamId) url.searchParams.set('teamId', teamId);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new VercelAPIError(res.status, body.error?.message || res.statusText, path);
  }

  return res.json();
}

class VercelAPIError extends Error {
  constructor(status, message, path) {
    super(`Vercel API ${status} em ${path}: ${message}`);
    this.status = status;
    this.path   = path;
  }
}

// ─── API pública do módulo ─────────────────────────────────────────────────────

/**
 * Retorna todos os projetos Vercel do usuário/time.
 * Pagina automaticamente até 200 projetos.
 */
async function listProjects(token, teamId) {
  const projects = [];
  let until;

  while (true) {
    const path = until
      ? `/v9/projects?limit=100&until=${until}`
      : '/v9/projects?limit=100';
    const data = await vercelFetch(path, token, teamId);

    projects.push(...(data.projects || []));

    if (!data.pagination?.next) break;
    until = data.pagination.next;
    if (projects.length >= 200) break; // safety
  }

  return projects;
}

/**
 * Busca deployments de um projeto filtrando pelo branch do PR.
 * Retorna apenas os deployments do tipo PREVIEW.
 *
 * @param {string} projectId  - ID ou nome do projeto Vercel
 * @param {string} branchName - Nome do branch (head ref do PR)
 * @param {string} token
 * @param {string} [teamId]
 * @returns {Promise<Array>}
 */
async function getDeploymentsByBranch(projectId, branchName, token, teamId) {
  const path = `/v6/deployments?projectId=${encodeURIComponent(projectId)}&target=preview&limit=25`;
  const data  = await vercelFetch(path, token, teamId);

  const deployments = data.deployments || [];

  // Filtra pelo branch exato
  return deployments.filter(
    (d) => d.meta?.githubCommitRef === branchName || d.gitSource?.ref === branchName
  );
}

/**
 * Busca o deployment mais recente associado a um SHA específico do Git.
 * Essa é a abordagem mais precisa: cada commit no PR tem um SHA único.
 */
async function getDeploymentBySha(projectId, sha, token, teamId) {
  const path = `/v6/deployments?projectId=${encodeURIComponent(projectId)}&limit=50&target=preview`;
  const data  = await vercelFetch(path, token, teamId);

  return (data.deployments || []).find(
    (d) =>
      d.meta?.githubCommitSha === sha ||
      d.meta?.githubCommitRef === sha ||
      d.gitSource?.sha === sha
  ) || null;
}

/**
 * Retorna os detalhes completos de um deployment pelo ID.
 */
async function getDeployment(deploymentId, token, teamId) {
  return vercelFetch(`/v13/deployments/${deploymentId}`, token, teamId);
}

/**
 * Tenta encontrar o projeto Vercel linkado a um repositório GitHub.
 * Compara pelo campo `link.repo` ou `link.repoId` em cada projeto.
 */
async function findProjectForRepo(owner, repo, token, teamId) {
  const projects = await listProjects(token, teamId);
  const repoFullName = `${owner}/${repo}`.toLowerCase();

  return projects.find((p) => {
    const link = p.link || {};
    const linkedRepo = (link.repo || '').toLowerCase();
    return (
      linkedRepo === repoFullName ||
      linkedRepo === repo.toLowerCase() ||
      linkedRepo.endsWith(`/${repo.toLowerCase()}`)
    );
  }) || null;
}

/**
 * Estratégia completa: dado o PR, tenta encontrar o deployment de preview
 * correspondente usando múltiplas abordagens em sequência.
 *
 * Retorna { url, deployment } ou null se não encontrar.
 */
async function findPreviewForPR({ owner, repo, headRef, headSha, token, teamId, vercelProjectId }) {
  // Se o usuário configurou o ID do projeto diretamente, usa ele.
  // Caso contrário, tenta descobrir automaticamente.
  let project = null;

  if (vercelProjectId) {
    project = { id: vercelProjectId, name: vercelProjectId };
  } else {
    project = await findProjectForRepo(owner, repo, token, teamId);
  }

  if (!project) return null;

  // Tentativa 1: busca pelo SHA exato (mais preciso)
  if (headSha) {
    const dep = await getDeploymentBySha(project.id, headSha, token, teamId);
    if (dep && dep.url) {
      return { url: `https://${dep.url}`, deployment: dep, project };
    }
  }

  // Tentativa 2: busca pelo branch e pega o mais recente
  const deps = await getDeploymentsByBranch(project.id, headRef, token, teamId);
  if (deps.length > 0) {
    // Ordena por data de criação decrescente
    deps.sort((a, b) => b.createdAt - a.createdAt);
    const dep = deps[0];
    if (dep.url) {
      return { url: `https://${dep.url}`, deployment: dep, project };
    }
  }

  return null;
}

/**
 * Valida o token Vercel chamando /v2/user.
 * Retorna { valid: true, user } ou { valid: false, error }.
 */
async function validateToken(token, teamId) {
  try {
    const data = await vercelFetch('/v2/user', token, teamId);
    return { valid: true, user: data.user };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

// Exporta via window para uso no content script (não é módulo ES para compatibilidade MV3)
if (typeof window !== 'undefined') {
  window.VercelAPI = {
    findPreviewForPR,
    listProjects,
    findProjectForRepo,
    getDeploymentsByBranch,
    getDeploymentBySha,
    getDeployment,
    validateToken,
    VercelAPIError,
  };
}
