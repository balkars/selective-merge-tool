// ============================================
// Screen 1 — Branch Setup with commit previews
// ============================================
const { useState: useBranchState, useRef: useBranchRef, useEffect: useBranchEffect } = window.React;

function BranchDropdown({ value, onSelect, branches, loading }) {
  const [open, setOpen] = useBranchState(false);
  const [q, setQ]       = useBranchState("");
  const wrapRef = useBranchRef(null);

  useBranchEffect(() => {
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const filtered = branches.filter(b => b.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ position: "relative" }} ref={wrapRef}>
      <div className={`branch-select ${open ? "open" : ""}`} onClick={() => !loading && setOpen(o => !o)}>
        <div className="branch-icon">
          <Icon.Branch size={14} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
          <div className="branch-name">{value}</div>
          <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
            {loading ? "Loading branches…" : (() => {
              const b = branches.find(x => x.name === value);
              return b ? `${b.commit} · ${b.author} · ${b.when}` : "—";
            })()}
          </div>
        </div>
        <Icon.ChevronUpDown size={14} className="chev" />
      </div>

      {open && (
        <div className="dropdown">
          <div className="dropdown-search">
            <input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Filter branches…" />
          </div>
          <div className="dropdown-list">
            {filtered.length === 0 && (
              <div style={{ padding: "12px 16px", color: "var(--muted)", fontSize: 12 }}>
                No branches match
              </div>
            )}
            {filtered.map(b => (
              <div
                key={b.name}
                className={`dropdown-item ${b.name === value ? "selected" : ""}`}
                onClick={() => { onSelect(b.name); setOpen(false); }}
              >
                <Icon.Branch size={12} className="ic" />
                <span>{b.name}</span>
                <span className="stale">{b.when}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommitPreview({ branch }) {
  const [commits, setCommits] = useBranchState([]);
  const [loading, setLoading] = useBranchState(false);
  const prevBranch = useBranchRef(null);

  useBranchEffect(() => {
    if (!branch || branch === prevBranch.current) return;
    prevBranch.current = branch;
    setLoading(true);
    window.api("GET", `/api/branch-commits?branch=${encodeURIComponent(branch)}&top=6`)
      .then(data => setCommits(data.commits || []))
      .catch(() => setCommits([]))
      .finally(() => setLoading(false));
  }, [branch]);

  const formatRelative = (iso) => {
    if (!iso) return '';
    const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <div style={{
      marginTop: 8,
      padding: "10px 12px",
      background: "var(--bg-2)",
      borderRadius: "var(--r-md)",
      border: "1px solid var(--hairline)",
    }}>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: "0.1em",
        textTransform: "uppercase", color: "var(--muted)",
        marginBottom: 8, display: "flex", alignItems: "center", gap: 6,
      }}>
        <Icon.Clock size={10} />
        Recent commits
      </div>
      {loading && (
        <div style={{ fontSize: 11, color: "var(--muted)", padding: "4px 0" }}>Loading…</div>
      )}
      {!loading && commits.length === 0 && (
        <div style={{ fontSize: 11, color: "var(--muted)", padding: "4px 0" }}>No commits found</div>
      )}
      {!loading && commits.map(c => (
        <div key={c.id} style={{
          display: "grid",
          gridTemplateColumns: "50px 1fr auto",
          gap: 8,
          padding: "5px 0",
          borderBottom: "1px solid var(--hairline)",
          fontSize: 11,
          alignItems: "center",
        }}>
          <span className="mono" style={{ color: "var(--muted)", fontSize: 10 }}>{c.shortId}</span>
          <span style={{
            color: "var(--ink-2)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{c.message}</span>
          <span style={{ color: "var(--muted-2)", fontSize: 10, whiteSpace: "nowrap" }}>
            {formatRelative(c.date)}
          </span>
        </div>
      ))}
    </div>
  );
}

function BranchSetupScreen({ source, target, setSource, setTarget, workingBranch, setWorkingBranch, branches, branchesLoading, onRefresh, onContinue }) {
  const effectiveBranches = branches;
  const sb = effectiveBranches.find(b => b.name === source);
  const tb = effectiveBranches.find(b => b.name === target);

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <h1>Select branches to merge</h1>
          <div className="sub">
            Source branch is read; target branch is the merge destination. A working branch is created
            from the target tip — nothing touches <span className="mono">{target}</span> until the PR is approved.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-sm" onClick={onRefresh} disabled={branchesLoading}>
            <Icon.Refresh size={12} />
            {branchesLoading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="screen-body">
        <div className="branch-screen">
          <div className="branch-main">
            <div>
              <div className="branch-flow">
                <div className="branch-card source">
                  <div className="card-head">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--blue)" }} />
                    Source · merge from
                  </div>
                  <BranchDropdown
                    value={source}
                    onSelect={setSource}
                    branches={effectiveBranches}
                    loading={branchesLoading}
                  />
                  <CommitPreview branch={source} />
                </div>

                <div className="arrow">
                  <div className="chip">
                    <Icon.Merge size={12} />
                    selective merge
                  </div>
                </div>

                <div className="branch-card target">
                  <div className="card-head">
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: "var(--purple)" }} />
                    Target · merge into
                  </div>
                  <BranchDropdown
                    value={target}
                    onSelect={setTarget}
                    branches={effectiveBranches}
                    loading={branchesLoading}
                  />
                  <CommitPreview branch={target} />
                </div>
              </div>
            </div>

            <div className="working-branch">
              <div className="icon-box">
                <Icon.Branch size={16} />
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                <div className="lbl">Working branch (auto-generated, editable)</div>
                <input
                  className="branch-name-input"
                  value={workingBranch}
                  onChange={e => setWorkingBranch(e.target.value)}
                />
              </div>
              <div style={{
                fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)",
                padding: "6px 10px", background: "var(--bg-2)", borderRadius: 6,
                border: "1px solid var(--hairline)"
              }}>
                branched from <span style={{ color: "var(--purple)" }}>{target}@{tb?.commit || "tip"}</span>
              </div>
            </div>
          </div>

          <div className="branch-aside">
            <div>
              <div className="aside-head">
                <Icon.Info size={11} />
                How it works
              </div>
              <ol style={{
                margin: 0, padding: "0 0 0 18px",
                fontSize: 12, color: "var(--muted)", lineHeight: 1.7
              }}>
                <li>Select folders to include</li>
                <li>Review side-by-side diff</li>
                <li>Create branch + push selected files</li>
                <li>Open PR into <span className="mono" style={{ color: "var(--ink-2)" }}>{target}</span></li>
              </ol>
            </div>

            <div>
              <div className="aside-head">
                <Icon.Shield size={11} />
                Live from Azure DevOps
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6 }}>
                {branchesLoading ? (
                  <span style={{ color: "var(--amber)" }}>Loading branches…</span>
                ) : (
                  <span style={{ color: "var(--green)" }}>
                    {effectiveBranches.length} branches loaded
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <div className="left">
          <div className="summary">
            <span className="mono" style={{ color: "var(--blue)" }}>{source}</span>
            <span style={{ margin: "0 6px", color: "var(--muted-2)" }}>→</span>
            <span className="mono" style={{ color: "var(--purple)" }}>{target}</span>
          </div>
        </div>
        <div className="right">
          <button className="btn btn-primary" onClick={onContinue} disabled={branchesLoading || !source || !target}>
            Choose folders
            <Icon.ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

window.BranchSetupScreen = BranchSetupScreen;
