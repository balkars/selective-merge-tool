// ============================================================
// Selective Merge Tool — Express backend
// Proxies Azure DevOps REST API, stores settings in .env
// ============================================================
const express = require('express');
const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const Diff    = require('diff');

require('dotenv').config();

const app = express();
app.use(express.json({ limit: '50mb' }));
// No-cache for dev: always serve fresh JSX/CSS
app.use((req, res, next) => {
  if (req.path.endsWith('.jsx') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});
app.use(express.static(__dirname));

// ─── Env helpers ──────────────────────────────────────────────
function getSettings() {
  return {
    org:     process.env.AZURE_ORG_URL  || '',
    project: process.env.AZURE_PROJECT  || '',
    repo:    process.env.AZURE_REPO     || '',
    pat:     process.env.AZURE_PAT      || '',
  };
}

function saveSettings({ org, project, repo, pat }) {
  const envPath = path.join(__dirname, '.env');
  let existing = {};
  try {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
      const m = line.match(/^([^=]+)=(.*)$/);
      if (m) existing[m[1].trim()] = m[2].trim();
    });
  } catch {}
  Object.assign(existing, {
    AZURE_ORG_URL: org,
    AZURE_PROJECT: project,
    AZURE_REPO:    repo,
    AZURE_PAT:     pat,
  });
  const lines = Object.entries(existing).map(([k, v]) => `${k}=${v}`);
  fs.writeFileSync(envPath, lines.join('\n') + '\n');
  // Apply to current process
  process.env.AZURE_ORG_URL  = org;
  process.env.AZURE_PROJECT  = project;
  process.env.AZURE_REPO     = repo;
  process.env.AZURE_PAT      = pat;
}

function parseOrgName(org) {
  return (org || '')
    .replace(/^https?:\/\/dev\.azure\.com\//, '')
    .replace(/\/.*$/, '')
    .trim();
}

// ─── Azure API client factory ─────────────────────────────────
function makeClient(settings) {
  const { org, project, repo, pat } = settings || getSettings();
  const orgName = parseOrgName(org);
  const auth = Buffer.from(`:${pat}`).toString('base64');
  const baseURL = `https://dev.azure.com/${orgName}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/`;
  const client = axios.create({
    baseURL,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json', Accept: 'application/json' },
    params:  { 'api-version': '7.0' },
  });
  return { client, orgName, project, repo };
}

// ─── Utilities ────────────────────────────────────────────────
function relativeTime(date) {
  if (!date) return '?';
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d)) return '?';
  const diff = Date.now() - d.getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  const weeks = Math.floor(days / 7);
  const months= Math.floor(days / 30);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)  return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

function getInitials(name) {
  return (name || 'U').split(/\s+/).map(p => p[0] || '').join('').toUpperCase().slice(0, 2);
}

function buildTree(items, repoName) {
  const PROTECTED = new Set(['deploy', 'infra', 'env', '.github']);
  const root = { name: repoName, type: 'folder', children: [] };
  const nodeMap = new Map([['', root]]);

  const sorted = (items || [])
    .filter(i => i.path && i.path !== '/')
    .sort((a, b) => a.path.length - b.path.length);

  for (const item of sorted) {
    const clean  = item.path.replace(/^\//, '');
    const parts  = clean.split('/');
    const name   = parts[parts.length - 1];
    const parentKey = parts.slice(0, -1).join('/');
    const parent = nodeMap.get(parentKey);
    if (!parent) continue;

    const node = {
      name,
      type: item.isFolder ? 'folder' : 'file',
      protected: PROTECTED.has(name) && parts.length === 1,
    };
    if (item.isFolder) {
      node.children = [];
      node.expanded  = parts.length <= 2;
      nodeMap.set(clean, node);
    }
    if (!parent.children) parent.children = [];
    parent.children.push(node);
  }

  // Count files in each folder
  function countFiles(node) {
    if (node.type === 'file') return 1;
    let total = 0;
    for (const c of (node.children || [])) total += countFiles(c);
    if (node !== root && total > 0) node.count = total;
    return total;
  }
  countFiles(root);
  return root;
}

function computeDiff(oldText, newText) {
  if (typeof oldText !== 'string') oldText = '';
  if (typeof newText !== 'string') newText = '';

  const patch = Diff.structuredPatch('target', 'source', oldText, newText, '', '', { context: 3 });
  const result = [];

  for (const hunk of (patch.hunks || [])) {
    result.push({
      type: 'hunk',
      a: `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
      ctx: '',
    });
    let la = hunk.oldStart;
    let lb = hunk.newStart;
    for (const line of hunk.lines) {
      const m = line[0], code = line.slice(1);
      if (m === ' ')      { result.push({ type: 'ctx', la, lb, code }); la++; lb++; }
      else if (m === '-') { result.push({ type: 'del', la, lb: null, code }); la++; }
      else if (m === '+') { result.push({ type: 'add', la: null, lb, code }); lb++; }
    }
  }

  if (result.length === 0 && oldText === newText && oldText) {
    // No changes - show a few context lines
    const lines = oldText.split('\n').slice(0, 5);
    lines.forEach((code, i) => result.push({ type: 'ctx', la: i+1, lb: i+1, code }));
  }

  return result;
}

// ─── Routes ───────────────────────────────────────────────────

// GET /api/settings
app.get('/api/settings', (_req, res) => {
  const s = getSettings();
  res.json({
    org:            s.org,
    project:        s.project,
    repo:           s.repo,
    patMasked:      s.pat ? s.pat.slice(-4).padStart(Math.min(s.pat.length, 16), '•') : '',
    hasCredentials: !!(s.org && s.project && s.repo && s.pat),
  });
});

// POST /api/settings
app.post('/api/settings', (req, res) => {
  try {
    saveSettings(req.body);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/test-connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const { client } = makeClient(req.body);
    // maxRedirects:0 so 302 (invalid org) throws instead of being silently followed
    const r = await client.get('refs', {
      params: { filter: 'heads/', $top: 5 },
      maxRedirects: 0,
    });
    // Validate the response looks like an Azure DevOps JSON response
    if (!r.data || typeof r.data !== 'object' || (!Array.isArray(r.data.value) && r.data.count === undefined)) {
      throw new Error('Unexpected response — check org URL, project, and repo name');
    }
    const count = r.data.count ?? r.data.value?.length ?? 0;
    res.json({ ok: true, message: `Connected — ${count} branch${count !== 1 ? 'es' : ''} found` });
  } catch (err) {
    const status = err.response?.status;
    const msg = status === 302 ? 'Organization not found — check your org URL'
              : status === 401 ? 'Unauthorized — check your PAT and its scopes'
              : status === 403 ? 'Forbidden — PAT may lack Code (read) scope'
              : status === 404 ? 'Repository not found — check org, project, and repo name'
              : err.response?.data?.message || err.message;
    res.status(400).json({ ok: false, error: msg });
  }
});

// GET /api/branches
app.get('/api/branches', async (req, res) => {
  try {
    const { client } = makeClient();
    const refsResp = await client.get('refs', { params: { filter: 'heads/' } });
    const refs = refsResp.data.value || [];

    // Get last commit for top 15 branches
    const branches = await Promise.all(refs.slice(0, 15).map(async ref => {
      const name = ref.name.replace('refs/heads/', '');
      let commit = ref.objectId.slice(0, 7);
      let commitId = ref.objectId;
      let author = ref.creator?.uniqueName?.split('@')[0] || ref.creator?.displayName || 'unknown';
      let when = '?';
      let stale = false;

      try {
        const cr = await client.get('commits', {
          params: {
            'searchCriteria.itemVersion.version': name,
            'searchCriteria.itemVersion.versionType': 'branch',
            '$top': 1,
          },
        });
        const c = cr.data.value?.[0];
        if (c) {
          commit   = c.commitId.slice(0, 7);
          commitId = c.commitId;
          author   = c.author?.name || c.committer?.name || author;
          const d  = new Date(c.author?.date || c.committer?.date);
          when     = relativeTime(d);
          stale    = (Date.now() - d.getTime()) > 30 * 24 * 60 * 60 * 1000;
        }
      } catch {}

      return { name, commit, commitId, author, when, stale };
    }));

    // Append remaining branches without commit detail
    for (const ref of refs.slice(15)) {
      branches.push({
        name: ref.name.replace('refs/heads/', ''),
        commit: ref.objectId.slice(0, 7),
        commitId: ref.objectId,
        author: ref.creator?.displayName || 'unknown',
        when: '?',
        stale: false,
      });
    }

    res.json({ branches });
  } catch (err) {
    console.error('GET /api/branches:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// GET /api/branch-commits?branch=source-branch&top=8
app.get('/api/branch-commits', async (req, res) => {
  const { branch = 'source-branch', top = 8 } = req.query;
  try {
    const { client } = makeClient();
    const r = await client.get('commits', {
      params: {
        'searchCriteria.itemVersion.version': branch,
        'searchCriteria.itemVersion.versionType': 'branch',
        '$top': Math.min(parseInt(top) || 8, 50),
      },
    });
    const commits = (r.data.value || []).map(c => ({
      id: c.commitId,
      shortId: c.commitId.slice(0, 7),
      message: (c.comment || '').split('\n')[0].trim(),
      author: c.author?.name || c.committer?.name || 'Unknown',
      date: c.author?.date || c.committer?.date || '',
    }));
    res.json({ commits });
  } catch (err) {
    console.error('GET /api/branch-commits:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// GET /api/tree?branch=source-branch
app.get('/api/tree', async (req, res) => {
  const { branch = 'source-branch' } = req.query;
  try {
    const { client, repo } = makeClient();
    const r = await client.get('items', {
      params: {
        scopePath: '/',
        recursionLevel: 'Full',
        'versionDescriptor.version': branch,
        'versionDescriptor.versionType': 'branch',
      },
    });
    const tree = buildTree(r.data.value, repo);
    res.json({ tree });
  } catch (err) {
    console.error('GET /api/tree:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// GET /api/diff?source=source-branch&target=target-branch&folders=src,lib
app.get('/api/diff', async (req, res) => {
  const { source = 'source-branch', target = 'target-branch', folders } = req.query;
  try {
    const { client } = makeClient();
    const r = await client.get('diffs/commits', {
      params: {
        baseVersion:        target,
        baseVersionType:    'branch',
        targetVersion:      source,
        targetVersionType:  'branch',
        '$top': 500,
      },
    });

    let changes = (r.data.changes || []).filter(c => !c.item?.isFolder);

    if (folders) {
      const fl = folders.split(',').map(f => f.trim()).filter(Boolean);
      if (fl.length) {
        changes = changes.filter(c => {
          const p = (c.item?.path || '').replace(/^\//, '');
          return fl.some(f => p === f || p.startsWith(f + '/'));
        });
      }
    }

    function mapChangeType(ct) {
      if (typeof ct === 'number') {
        if (ct & 2) return 'mod';   // edit
        if (ct & 1) return 'add';   // add
        if (ct & 4) return 'del';   // delete
        if (ct & 8) return 'mod';   // rename → treat as mod
        return 'mod';
      }
      const s = String(ct).toLowerCase();
      if (s.includes('edit')) return 'mod';
      if (s.includes('delete')) return 'del';
      if (s.includes('add')) return 'add';
      if (s.includes('rename')) return 'mod';
      return 'mod';
    }

    const files = changes.map((c, idx) => ({
      id: `f${idx + 1}`,
      path: (c.item?.path || '').replace(/^\//, ''),
      change: mapChangeType(c.changeType),
      add: 0,
      del: 0,
      selected: true,
    }));

    res.json({ files });
  } catch (err) {
    console.error('GET /api/diff:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// GET /api/commit-log?source=source-branch&target=target-branch&folders=src,lib
app.get('/api/commit-log', async (req, res) => {
  const { source = 'source-branch', target = 'target-branch', folders } = req.query;
  try {
    const { client } = makeClient();
    const fl = folders ? folders.split(',').map(f => f.trim()).filter(Boolean) : [];

    // 1. Get divergence info (aheadCount, commonCommit) from diffs/commits
    let commonCommit = null, aheadCount = 0, behindCount = 0;
    try {
      const diffResp = await client.get('diffs/commits', {
        params: {
          baseVersion: target,
          baseVersionType: 'branch',
          targetVersion: source,
          targetVersionType: 'branch',
        },
      });
      commonCommit = diffResp.data.commonCommit || null;
      aheadCount = diffResp.data.aheadCount || 0;
      behindCount = diffResp.data.behindCount || 0;
    } catch (e) {
      console.warn('diffs/commits failed, falling back:', e.message);
    }

    // 2. Get actual commits on source that are not on target
    const commitsResp = await client.get('commits', {
      params: {
        'searchCriteria.itemVersion.version': source,
        'searchCriteria.itemVersion.versionType': 'branch',
        'searchCriteria.compareVersion.version': target,
        'searchCriteria.compareVersion.versionType': 'branch',
        '$top': 200,
      },
    });
    const rawCommits = commitsResp.data.value || [];
    if (!aheadCount) aheadCount = rawCommits.length;

    // 3. Resolve common ancestor date
    let divergenceDate = null;
    if (commonCommit) {
      try {
        const baseResp = await client.get(`commits/${commonCommit}`);
        divergenceDate = baseResp.data.author?.date || baseResp.data.committer?.date || null;
      } catch { /* ignore */ }
    }

    // 4. Fetch file changes per commit (parallel, capped at 50 for performance)
    const sliced = rawCommits.slice(0, 50);
    const commitDetails = await Promise.all(sliced.map(async (commit) => {
      let files = [];
      try {
        const changesResp = await client.get(`commits/${commit.commitId}/changes`);
        const changes = (changesResp.data.changes || []).filter(c => !c.item?.isFolder);
        files = changes
          .map(c => ({
            path: (c.item?.path || '').replace(/^\//, ''),
            change: (() => {
              const ct = c.changeType;
              if (typeof ct === 'number') {
                if (ct & 2) return 'mod';
                if (ct & 1) return 'add';
                if (ct & 4) return 'del';
                if (ct & 8) return 'mod';
                return 'mod';
              }
              const s = String(ct).toLowerCase();
              if (s.includes('edit')) return 'mod';
              if (s.includes('delete')) return 'del';
              if (s.includes('add')) return 'add';
              return 'mod';
            })(),
          }))
          .filter(f => f.path);

        if (fl.length) {
          files = files.filter(f => fl.some(folder => f.path === folder || f.path.startsWith(folder + '/')));
        }
      } catch { /* skip if commit details unavailable */ }

      return {
        id: commit.commitId,
        shortId: commit.commitId.slice(0, 7),
        message: commit.comment || '',
        author: commit.author?.name || commit.committer?.name || 'Unknown',
        email: commit.author?.email || '',
        date: commit.author?.date || commit.committer?.date || '',
        files,
        fileCount: files.length,
      };
    }));

    // Only include commits that touched the requested folders (if folders specified)
    const filtered = fl.length
      ? commitDetails.filter(c => c.fileCount > 0)
      : commitDetails;

    res.json({
      commits: filtered,
      divergenceDate,
      commonCommit,
      aheadCount,
      behindCount,
      totalCommits: rawCommits.length,
      truncated: rawCommits.length > 50,
    });
  } catch (err) {
    console.error('GET /api/commit-log:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// GET /api/file-diff?path=src/foo.ts&source=source-branch&target=target-branch&change=mod
app.get('/api/file-diff', async (req, res) => {
  const { path: filePath, source = 'source-branch', target = 'target-branch', change = 'mod' } = req.query;
  try {
    const { client, orgName, project, repo } = makeClient();

    const fetchText = async (branch) => {
      try {
        const r = await client.get('items', {
          params: {
            path: '/' + filePath,
            'versionDescriptor.version': branch,
            'versionDescriptor.versionType': 'branch',
            '$format': 'text',
          },
          headers: { Accept: 'text/plain' },
          responseType: 'text',
        });
        return typeof r.data === 'string' ? r.data : JSON.stringify(r.data, null, 2);
      } catch {
        return '';
      }
    };

    // Find the most recent commit that touched this file. For a deleted file we
    // look on the target branch (it no longer exists on source); otherwise on
    // source — that's the commit that introduced the incoming change.
    const fetchLastCommit = async () => {
      const branch = change === 'del' ? target : source;
      try {
        const r = await client.get('commits', {
          params: {
            'searchCriteria.itemPath': '/' + filePath,
            'searchCriteria.itemVersion.version': branch,
            'searchCriteria.itemVersion.versionType': 'branch',
            '$top': 1,
          },
        });
        const c = r.data.value?.[0];
        if (!c) return null;
        return {
          id:      c.commitId,
          shortId: c.commitId.slice(0, 7),
          message: (c.comment || '').split('\n')[0].trim(),
          author:  c.author?.name || c.committer?.name || 'Unknown',
          date:    c.author?.date || c.committer?.date || '',
          branch,
          url: `https://dev.azure.com/${orgName}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}/commit/${c.commitId}`,
        };
      } catch {
        return null;
      }
    };

    const [targetContent, sourceContent, commit] = await Promise.all([
      change === 'add' ? Promise.resolve('') : fetchText(target),
      change === 'del' ? Promise.resolve('') : fetchText(source),
      fetchLastCommit(),
    ]);

    const diffLines = computeDiff(targetContent, sourceContent);
    res.json({
      diffLines,
      commit,
      add: diffLines.filter(l => l.type === 'add').length,
      del: diffLines.filter(l => l.type === 'del').length,
    });
  } catch (err) {
    console.error('GET /api/file-diff:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/reviewers
app.get('/api/reviewers', async (req, res) => {
  const s = getSettings();
  const orgName = parseOrgName(s.org);
  const auth = Buffer.from(`:${s.pat}`).toString('base64');
  const COLORS = ['#4D8BFF', '#A371F7', '#3FB950', '#F4A300', '#F85149', '#5B8DFF'];

  try {
    const teamsResp = await axios.get(
      `https://dev.azure.com/${orgName}/_apis/projects/${encodeURIComponent(s.project)}/teams?api-version=7.0`,
      { headers: { Authorization: `Basic ${auth}` } }
    );
    const team = teamsResp.data.value?.[0];
    if (!team) return res.json({ reviewers: [] });

    const membersResp = await axios.get(
      `https://dev.azure.com/${orgName}/_apis/projects/${encodeURIComponent(s.project)}/teams/${team.id}/members?api-version=7.0`,
      { headers: { Authorization: `Basic ${auth}` } }
    );

    const reviewers = (membersResp.data.value || []).map((m, idx) => {
      const identity = m.identity || m;
      return {
        id:         identity.id || identity.descriptor || String(idx),
        name:       identity.displayName || 'Team Member',
        role:       team.name,
        initials:   getInitials(identity.displayName),
        color:      COLORS[idx % COLORS.length],
        uniqueName: identity.uniqueName || '',
      };
    });

    res.json({ reviewers });
  } catch (err) {
    console.error('GET /api/reviewers:', err.response?.data?.message || err.message);
    res.json({ reviewers: [], warning: 'Could not fetch team members' });
  }
});

// POST /api/create-pr
app.post('/api/create-pr', async (req, res) => {
  const { source, target, workingBranch, files, prTitle, prDesc, reviewers: reviewerList = [] } = req.body;

  try {
    const { client, orgName, project, repo } = makeClient();
    const s = getSettings();

    // 1. Get target branch tip OID
    const refsR = await client.get('refs', { params: { filter: `heads/${target}` } });
    const targetRef = (refsR.data.value || []).find(r => r.name === `refs/heads/${target}`);
    if (!targetRef) throw new Error(`Branch '${target}' not found`);
    const targetOid = targetRef.objectId;

    // 2. Create working branch
    await client.post('refs', [
      { name: `refs/heads/${workingBranch}`, oldObjectId: '0000000000000000000000000000000000000000', newObjectId: targetOid }
    ]);

    // 3. Build changes array — fetch content from source for each file
    const changes = [];
    for (const file of files) {
      if (file.change === 'del') {
        changes.push({ changeType: 'delete', item: { path: '/' + file.path } });
        continue;
      }
      try {
        const cr = await client.get('items', {
          params: {
            path: '/' + file.path,
            'versionDescriptor.version': source,
            'versionDescriptor.versionType': 'branch',
            '$format': 'text',
          },
          headers: { Accept: 'text/plain' },
          responseType: 'text',
        });
        const text = typeof cr.data === 'string' ? cr.data : JSON.stringify(cr.data, null, 2);
        changes.push({
          changeType: file.change === 'add' ? 'add' : 'edit',
          item: { path: '/' + file.path },
          newContent: { content: Buffer.from(text).toString('base64'), contentType: 'base64encoded' },
        });
      } catch (e) {
        console.warn(`Skip ${file.path}: ${e.message}`);
      }
    }

    if (changes.length === 0) throw new Error('No file content could be fetched from source branch');

    // 4. Push all changes in one commit
    await client.post('pushes', {
      refUpdates: [{ name: `refs/heads/${workingBranch}`, oldObjectId: targetOid }],
      commits: [{
        comment: `[Selective Merge] ${files.length} files from ${source}\n\nGenerated by Selective Merge Tool`,
        changes,
      }],
    });

    // 5. Create PR
    const prR = await client.post('pullrequests', {
      title:         prTitle,
      description:   prDesc,
      sourceRefName: `refs/heads/${workingBranch}`,
      targetRefName: `refs/heads/${target}`,
      reviewers:     reviewerList.map(r => ({ id: r.id })),
    });

    const prId = prR.data.pullRequestId;
    const prUrl = `https://dev.azure.com/${orgName}/${encodeURIComponent(project)}/_git/${encodeURIComponent(repo)}/pullrequest/${prId}`;

    res.json({ ok: true, prId, prUrl, workingBranch, filesCount: changes.length });
  } catch (err) {
    console.error('POST /api/create-pr:', err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// ─── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const s = getSettings();
  console.log(`\n  Selective Merge Tool  http://localhost:${PORT}`);
  if (!s.org || !s.pat) {
    console.log(`  First-run: open the app and enter your Azure DevOps credentials.\n`);
  } else {
    console.log(`  Connected to: ${s.org} / ${s.project} / ${s.repo}\n`);
  }
});
