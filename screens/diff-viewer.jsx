// ============================================
// Screen 4 — Side-by-side Diff Viewer
// ============================================
const { useState: useDiffState, useMemo: useDiffMemo, useEffect: useDiffEffect, useRef: useDiffRef } = window.React;

const KEYWORDS = new Set([
  "import", "export", "from", "const", "let", "var", "function", "async", "await",
  "return", "if", "else", "for", "while", "in", "of", "new", "throw", "try", "catch",
  "class", "extends", "interface", "type", "as", "true", "false", "null", "undefined",
  "this", "default", "switch", "case", "break", "continue", "Promise"
]);

function tokenize(line) {
  if (!line) return [{ t: "p", v: "" }];
  const tokens = [];
  let i = 0;
  while (i < line.length) {
    const c = line[i];
    if (/\s/.test(c)) {
      let j = i; while (j < line.length && /\s/.test(line[j])) j++;
      tokens.push({ t: "p", v: line.slice(i, j) }); i = j; continue;
    }
    if (c === "/" && line[i + 1] === "/") { tokens.push({ t: "c", v: line.slice(i) }); break; }
    if (c === "#" && i === 0) { tokens.push({ t: "c", v: line.slice(i) }); break; }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1; while (j < line.length && line[j] !== c) { if (line[j] === "\\") j++; j++; }
      tokens.push({ t: "s", v: line.slice(i, j + 1) }); i = j + 1; continue;
    }
    if (/\d/.test(c)) {
      let j = i; while (j < line.length && /[\d.]/.test(line[j])) j++;
      tokens.push({ t: "n", v: line.slice(i, j) }); i = j; continue;
    }
    if (/[A-Za-z_$]/.test(c)) {
      let j = i; while (j < line.length && /[A-Za-z0-9_$]/.test(line[j])) j++;
      const word = line.slice(i, j);
      let next = j; while (next < line.length && /\s/.test(line[next])) next++;
      const isCall = line[next] === "(";
      const looksType = /^[A-Z]/.test(word) && !isCall;
      tokens.push({ t: KEYWORDS.has(word) ? "k" : isCall ? "f" : looksType ? "t" : "v", v: word });
      i = j; continue;
    }
    let j = i;
    while (j < line.length && !/[A-Za-z0-9_$'"`\s]/.test(line[j]) && line[j] !== "/") j++;
    tokens.push({ t: "p", v: line.slice(i, Math.max(j, i + 1)) });
    i = Math.max(j, i + 1);
  }
  return tokens;
}

function CodeLine({ code }) {
  const tokens = useDiffMemo(() => tokenize(code || ""), [code]);
  return <span>{tokens.map((t, i) => <span key={i} className={`tok-${t.t}`}>{t.v}</span>)}</span>;
}

function StatBar({ add, del, max = 5 }) {
  const total = add + del;
  if (total === 0) return null;
  const a = Math.min(max, Math.max(1, Math.round(add / total * max)));
  const blocks = [];
  for (let i = 0; i < a; i++) blocks.push(<span key={`a${i}`} />);
  for (let i = 0; i < max - a; i++) blocks.push(<span key={`d${i}`} className="del" />);
  return <span className="stat-bar">{blocks}</span>;
}

// Convert unified diff lines → split pairs for side-by-side view
function toSplitLines(lines) {
  const result = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.type === 'hunk') {
      result.push({ type: 'hunk', text: line.a, ctx: line.ctx });
      i++; continue;
    }
    if (line.type === 'ctx') {
      result.push({ type: 'ctx', left: { ln: line.la, code: line.code }, right: { ln: line.lb, code: line.code } });
      i++; continue;
    }
    const dels = [], adds = [];
    while (i < lines.length && lines[i].type === 'del') { dels.push(lines[i]); i++; }
    while (i < lines.length && lines[i].type === 'add') { adds.push(lines[i]); i++; }
    const maxLen = Math.max(dels.length, adds.length);
    for (let j = 0; j < maxLen; j++) {
      const d = dels[j], a = adds[j];
      result.push({
        type: d && a ? 'mod' : d ? 'del' : 'add',
        left:  d ? { ln: d.la, code: d.code } : { ln: '', code: '' },
        right: a ? { ln: a.lb, code: a.code } : { ln: '', code: '' },
      });
    }
  }
  return result;
}

function FileList({ files, selectedId, setSelectedId, included, toggleInclude, search, setSearch, mode, setMode }) {
  const groups = useDiffMemo(() => {
    const map = new Map();
    for (const f of files) {
      if (search && !f.path.toLowerCase().includes(search.toLowerCase())) continue;
      if (mode === "included" && !included.has(f.id)) continue;
      if (mode === "excluded" && included.has(f.id)) continue;
      const parts = f.path.split("/");
      const group = parts.length > 1 ? parts.slice(0, parts.length - 1).join("/") : "(root)";
      if (!map.has(group)) map.set(group, []);
      map.get(group).push(f);
    }
    return Array.from(map.entries());
  }, [files, search, mode, included]);

  const [collapsedGroups, setCollapsedGroups] = useDiffState(new Set());
  const fileName = (path) => path.split("/").pop();

  return (
    <div className="file-list-pane">
      <div className="file-list-head">
        <div className="title">
          <Icon.FileCode size={12} />
          <span>Changed files</span>
          <span className="count-chip">{included.size}/{files.length}</span>
        </div>
        <div className="filter-row">
          <div className="search-wrap">
            <Icon.Search size={11} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter files..." />
          </div>
        </div>
        <div className="seg">
          <button className={mode === "all" ? "active" : ""} onClick={() => setMode("all")}>All</button>
          <button className={mode === "included" ? "active" : ""} onClick={() => setMode("included")}>Included</button>
          <button className={mode === "excluded" ? "active" : ""} onClick={() => setMode("excluded")}>Excluded</button>
        </div>
      </div>
      <div className="file-list">
        {groups.map(([groupPath, fs]) => {
          const collapsed = collapsedGroups.has(groupPath);
          return (
            <div key={groupPath} className="file-group">
              <div className="file-group-head" onClick={() => setCollapsedGroups(prev => {
                const n = new Set(prev); n.has(groupPath) ? n.delete(groupPath) : n.add(groupPath); return n;
              })}>
                <Icon.Chevron size={10} className={`chev ${collapsed ? "" : "open"}`} />
                <Icon.Folder size={12} style={{ color: "var(--muted)" }} />
                <span>{groupPath}</span>
                <span className="group-count">{fs.length}</span>
              </div>
              {!collapsed && fs.map(f => (
                <div key={f.id}
                  className={`file-row ${selectedId === f.id ? "selected" : ""} ${!included.has(f.id) ? "excluded" : ""}`}
                  onClick={() => setSelectedId(f.id)}
                >
                  <div className={`tree-checkbox ${included.has(f.id) ? "checked" : ""}`}
                    style={{ width: 13, height: 13 }}
                    onClick={e => { e.stopPropagation(); toggleInclude(f.id); }} />
                  <div className={`change-dot ${f.change}`} />
                  <span className="file-name">{fileName(f.path)}</span>
                  <div className="file-changes">
                    {f.add > 0 && <span className="add">+{f.add}</span>}
                    {f.del > 0 && <span className="del">−{f.del}</span>}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
        {groups.length === 0 && (
          <div style={{ padding: "32px 24px", textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
            No files match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}

function relTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000), hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000), weeks = Math.floor(days / 7), months = Math.floor(days / 30);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 4) return `${weeks}w ago`;
  return `${months}mo ago`;
}

// Commit attribution badge — hover for details, click to open in Azure DevOps.
function CommitBadge({ commit }) {
  const [hover, setHover] = useDiffState(false);
  if (!commit) return null;
  const when = relTime(commit.date);
  const fullDate = commit.date ? new Date(commit.date).toLocaleString() : "";
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <a
        href={commit.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={e => e.stopPropagation()}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          padding: "2px 8px", borderRadius: "var(--r-md)",
          border: "1px solid var(--hairline-strong)", background: "var(--surface-3)",
          fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)",
          textDecoration: "none", cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <Icon.GitCommit size={11} />
        {commit.shortId}
        <Icon.ExternalLink size={10} style={{ color: "var(--muted)" }} />
      </a>
      {hover && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
          width: 320, maxWidth: "70vw", padding: "10px 12px",
          background: "var(--surface-3)", border: "1px solid var(--hairline-strong)",
          borderRadius: "var(--r-md)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          textAlign: "left", whiteSpace: "normal", cursor: "default",
        }}>
          <div style={{ fontSize: 12, color: "var(--ink)", fontWeight: 500, lineHeight: 1.4, marginBottom: 6 }}>
            {commit.message || "(no commit message)"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)", marginBottom: 6 }}>
            <span style={{ color: "var(--ink-2)" }}>{commit.author}</span>
            {when && <><span>·</span><span title={fullDate}>{when}</span></>}
            <span>·</span>
            <span style={{ fontFamily: "var(--font-mono)", color: "var(--blue)" }}>{commit.shortId}</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>
            Last commit on <span className="mono" style={{ color: "var(--ink-2)" }}>{commit.branch}</span> touching this file
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--blue)" }}>
            <Icon.ExternalLink size={10} />
            Click to verify on Azure DevOps
          </div>
        </div>
      )}
    </span>
  );
}

function SplitDiffPane({ file, diffLines, diffLoading, commit, source, target }) {
  const leftRef = useDiffRef(null);
  const rightRef = useDiffRef(null);
  const syncing = useDiffRef(false);

  const splitLines = useDiffMemo(() => toSplitLines(diffLines || []), [diffLines]);

  const syncScroll = (srcRef, dstRef) => {
    if (syncing.current) return;
    syncing.current = true;
    if (dstRef.current && srcRef.current) {
      dstRef.current.scrollTop = srcRef.current.scrollTop;
    }
    requestAnimationFrame(() => { syncing.current = false; });
  };

  if (!file) {
    return (
      <div className="diff-pane">
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--muted)", fontSize: 13 }}>
          Select a file to view its side-by-side diff
        </div>
      </div>
    );
  }

  return (
    <div className="diff-pane">
      <div className="diff-head">
        <Icon.FileCode size={15} style={{ color: "var(--blue)" }} />
        <div className="path">
          {file.path.split("/").map((seg, i, arr) => (
            <React.Fragment key={i}>
              <span className="seg">{seg}</span>
              {i < arr.length - 1 && <span className="sep">/</span>}
            </React.Fragment>
          ))}
        </div>
        <div className="meta">
          <span className={`tag tag-${file.change}`}>
            {file.change === "mod" ? "Modified" : file.change === "add" ? "Added" : "Deleted"}
          </span>
          {(file.add > 0 || file.del > 0) && (
            <div className="stat">
              <span className="add">+{file.add}</span> <span className="del">−{file.del}</span>
              <StatBar add={file.add} del={file.del} />
            </div>
          )}
          <CommitBadge commit={commit} />
        </div>
      </div>

      {/* Split header */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 32px 1fr',
        borderBottom: '1px solid var(--hairline)',
        background: 'var(--surface)',
      }}>
        <div style={{
          padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--purple)',
          display: 'flex', alignItems: 'center', gap: 6,
          borderRight: '1px solid var(--hairline)',
        }}>
          <Icon.Branch size={11} />
          {target}
          <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>current</span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--surface-3)', borderRight: '1px solid var(--hairline)',
          borderLeft: '1px solid var(--hairline)',
        }}>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>→</span>
        </div>
        <div style={{
          padding: '6px 12px', fontSize: 11, fontWeight: 600, color: 'var(--blue)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon.Branch size={11} />
          {source}
          <span style={{ fontWeight: 400, color: 'var(--muted)', marginLeft: 4 }}>incoming</span>
        </div>
      </div>

      {/* Split diff body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {diffLoading && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 12, fontFamily: "var(--font-mono)" }}>
            Computing diff…
          </div>
        )}

        {!diffLoading && splitLines.length === 0 && (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
            No differences — files are identical.
          </div>
        )}

        {!diffLoading && splitLines.length > 0 && (
          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 32px 1fr', minWidth: 0 }}>
              {splitLines.map((row, i) => {
                if (row.type === 'hunk') {
                  return (
                    <React.Fragment key={i}>
                      <div style={{
                        padding: '4px 12px', background: 'var(--surface-3)',
                        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--muted)',
                        borderBottom: '1px solid var(--hairline)',
                        gridColumn: '1 / -1',
                      }}>
                        {row.text} {row.ctx && <span style={{ color: 'var(--ink-2)' }}>{row.ctx}</span>}
                      </div>
                    </React.Fragment>
                  );
                }

                const isChange = row.type === 'mod' || row.type === 'add' || row.type === 'del';
                const leftBg = row.type === 'del' ? 'rgba(248,81,73,0.10)' : row.type === 'mod' ? 'rgba(248,81,73,0.08)' : 'transparent';
                const rightBg = row.type === 'add' ? 'rgba(63,185,80,0.10)' : row.type === 'mod' ? 'rgba(63,185,80,0.08)' : 'transparent';

                return (
                  <React.Fragment key={i}>
                    {/* Left side (target / PRODUCTION) */}
                    <div style={{
                      display: 'flex', alignItems: 'stretch',
                      background: leftBg,
                      borderBottom: '1px solid var(--hairline)',
                      minHeight: 22,
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                    }}>
                      <span style={{
                        width: 42, flexShrink: 0, textAlign: 'right', padding: '2px 8px 2px 4px',
                        color: 'var(--muted-2)', fontSize: 11, userSelect: 'none',
                        borderRight: '1px solid var(--hairline)',
                      }}>{row.left?.ln ?? ''}</span>
                      <span style={{
                        width: 16, flexShrink: 0, textAlign: 'center', padding: '2px 0',
                        color: row.type === 'del' || row.type === 'mod' ? 'var(--red)' : 'transparent',
                        fontWeight: 600, userSelect: 'none',
                      }}>{(row.type === 'del' || row.type === 'mod') ? '−' : ' '}</span>
                      <span style={{ padding: '2px 8px', whiteSpace: 'pre', overflow: 'hidden' }}>
                        <CodeLine code={row.left?.code || ''} />
                      </span>
                    </div>

                    {/* Arrow gutter */}
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: isChange ? 'var(--surface-3)' : 'var(--surface)',
                      borderBottom: '1px solid var(--hairline)',
                      borderLeft: '1px solid var(--hairline)',
                      borderRight: '1px solid var(--hairline)',
                    }}>
                      {isChange && (
                        <span style={{
                          fontSize: 12, fontWeight: 700,
                          color: row.type === 'add' ? 'var(--green)' : row.type === 'del' ? 'var(--red)' : 'var(--blue)',
                        }}>
                          {row.type === 'del' ? '✕' : '→'}
                        </span>
                      )}
                    </div>

                    {/* Right side (source / UAT) */}
                    <div style={{
                      display: 'flex', alignItems: 'stretch',
                      background: rightBg,
                      borderBottom: '1px solid var(--hairline)',
                      minHeight: 22,
                      fontFamily: 'var(--font-mono)', fontSize: 12,
                    }}>
                      <span style={{
                        width: 42, flexShrink: 0, textAlign: 'right', padding: '2px 8px 2px 4px',
                        color: 'var(--muted-2)', fontSize: 11, userSelect: 'none',
                        borderRight: '1px solid var(--hairline)',
                      }}>{row.right?.ln ?? ''}</span>
                      <span style={{
                        width: 16, flexShrink: 0, textAlign: 'center', padding: '2px 0',
                        color: row.type === 'add' || row.type === 'mod' ? 'var(--green)' : 'transparent',
                        fontWeight: 600, userSelect: 'none',
                      }}>{(row.type === 'add' || row.type === 'mod') ? '+' : ' '}</span>
                      <span style={{ padding: '2px 8px', whiteSpace: 'pre', overflow: 'hidden' }}>
                        <CodeLine code={row.right?.code || ''} />
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DiffViewerScreen({ included, setIncluded, changedFiles, diffLoading, source, target, onContinue, onBack }) {
  const files = changedFiles.length ? changedFiles : [];

  const [selectedId, setSelectedId] = useDiffState(files[0]?.id || null);
  const [search, setSearch]         = useDiffState("");
  const [mode, setMode]             = useDiffState("all");
  const [fileDiffCache, setFileDiffCache] = useDiffState({});
  const [fileDiffLoading, setFileDiffLoading] = useDiffState(false);
  const [currentDiffLines, setCurrentDiffLines] = useDiffState([]);

  useDiffEffect(() => {
    if (files.length && (!selectedId || !files.find(f => f.id === selectedId))) {
      setSelectedId(files[0].id);
    }
  }, [files]);

  useDiffEffect(() => {
    if (!selectedId) return;
    const file = files.find(f => f.id === selectedId);
    if (!file) return;

    if (fileDiffCache[selectedId]) {
      setCurrentDiffLines(fileDiffCache[selectedId].lines);
      return;
    }

    setFileDiffLoading(true);
    const q = `path=${encodeURIComponent(file.path)}&source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}&change=${encodeURIComponent(file.change || 'mod')}`;
    window.api("GET", `/api/file-diff?${q}`)
      .then(data => {
        const lines = data.diffLines || [];
        setCurrentDiffLines(lines);
        setFileDiffCache(prev => ({ ...prev, [selectedId]: { lines, add: data.add || 0, del: data.del || 0, commit: data.commit || null } }));
      })
      .catch(() => setCurrentDiffLines([]))
      .finally(() => setFileDiffLoading(false));
  }, [selectedId, source, target]);

  const selectedFile = files.find(f => f.id === selectedId);
  const selectedStats = fileDiffCache[selectedId];
  const displayFile = selectedFile
    ? { ...selectedFile, add: selectedStats?.add ?? selectedFile.add, del: selectedStats?.del ?? selectedFile.del }
    : selectedFile;

  const toggleInclude = (id) => {
    setIncluded(prev => {
      const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
    });
  };

  if (diffLoading) {
    return (
      <div className="screen">
        <div className="screen-header">
          <div><h1>Loading diff…</h1>
          <div className="sub">Computing changes between <span className="mono" style={{ color: "var(--blue)" }}>{source}</span> and <span className="mono" style={{ color: "var(--purple)" }}>{target}</span></div></div>
        </div>
        <div className="screen-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Computing diff…</div>
        </div>
        <div className="screen-footer"><div className="right">
          <button className="btn" onClick={onBack}><Icon.ArrowLeft size={14} /> Back</button>
        </div></div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="screen">
        <div className="screen-header">
          <div><h1>Review changes</h1>
          <div className="sub">No changed files found between branches for the selected folders.</div></div>
        </div>
        <div className="screen-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            No differences found. Try selecting more folders.
          </div>
        </div>
        <div className="screen-footer"><div className="right">
          <button className="btn" onClick={onBack}><Icon.ArrowLeft size={14} /> Back</button>
        </div></div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <h1>Review changes</h1>
          <div className="sub">
            Side-by-side diff — left is <span className="mono" style={{ color: "var(--purple)" }}>{target}</span> (current),
            right is <span className="mono" style={{ color: "var(--blue)" }}>{source}</span> (incoming).
            Arrows show changes that will be applied. Uncheck files to exclude them from the PR.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-sm" onClick={() => setIncluded(new Set(files.map(f => f.id)))}>Include all</button>
          <button className="btn btn-sm" onClick={() => setIncluded(new Set())}>Exclude all</button>
        </div>
      </div>

      <div className="screen-body">
        <div className="diff-screen">
          <FileList
            files={files} selectedId={selectedId} setSelectedId={setSelectedId}
            included={included} toggleInclude={toggleInclude}
            search={search} setSearch={setSearch} mode={mode} setMode={setMode}
          />
          <SplitDiffPane
            file={displayFile}
            diffLines={currentDiffLines}
            diffLoading={fileDiffLoading}
            commit={selectedStats?.commit}
            source={source}
            target={target}
          />
        </div>
      </div>

      <div className="screen-footer">
        <div className="left">
          <div className="summary">
            <strong>{included.size}</strong> of {files.length} files included
            <span style={{ margin: "0 8px", color: "var(--muted-2)" }}>·</span>
            <span style={{ color: "var(--muted)" }}>
              <span className="mono" style={{ color: "var(--purple)" }}>{target}</span>
              <span style={{ margin: "0 4px" }}>←</span>
              <span className="mono" style={{ color: "var(--blue)" }}>{source}</span>
            </span>
          </div>
        </div>
        <div className="right">
          <button className="btn" onClick={onBack}><Icon.ArrowLeft size={14} /> Back</button>
          <button className="btn btn-primary" onClick={onContinue} disabled={included.size === 0}>
            Continue to PR
            <Icon.ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

window.DiffViewerScreen = DiffViewerScreen;
