// ============================================
// Screen 3 — Folder Filter (tree view)
// ============================================
const { useState: useFolderState, useMemo: useFolderMemo, useEffect: useFolderEffect } = window.React;

function flattenTree(node, path = "", depth = 0, out = []) {
  if (depth > 0) {
    out.push({
      path,
      name: node.name,
      type: node.type,
      depth: depth - 1,
      protected: !!node.protected,
      count: node.count,
      hasChildren: node.type === "folder" && Array.isArray(node.children),
      expanded: !!node.expanded
    });
  }
  if (node.children) {
    for (const c of node.children) {
      flattenTree(c, (path ? path + "/" : "") + c.name, depth + 1, out);
    }
  }
  return out;
}

function FolderFilterScreen({ selectedFolders, setSelectedFolders, tree, treeLoading, source, onContinue, onBack }) {
  const effectiveTree = tree;

  const [expanded, setExpanded] = useFolderState(() => {
    const set = new Set();
    const walk = (node, path = "") => {
      const p = path ? path + "/" + node.name : node.name;
      if (node.expanded) set.add(p.replace(new RegExp(`^${effectiveTree.name}/?`), ""));
      if (node.children) node.children.forEach(c => walk(c, p));
    };
    if (effectiveTree) walk(effectiveTree);
    return set;
  });

  // Re-init expansion when tree changes
  useFolderEffect(() => {
    if (!effectiveTree) return;
    const set = new Set();
    const walk = (node, path = "") => {
      const p = path ? path + "/" + node.name : node.name;
      if (node.expanded) set.add(p.replace(new RegExp(`^${effectiveTree.name}/?`), ""));
      if (node.children) node.children.forEach(c => walk(c, p));
    };
    walk(effectiveTree);
    setExpanded(set);
  }, [effectiveTree]);

  const [activePreset, setActivePreset] = useFolderState(null);
  const [search, setSearch] = useFolderState("");

  const rows = useFolderMemo(() => {
    if (!effectiveTree) return [];
    return flattenTree(effectiveTree).map(r => {
      const rel = r.path.replace(new RegExp(`^${effectiveTree.name}/?`), "");
      return { ...r, rel };
    });
  }, [effectiveTree]);

  const isExpanded = (rel) => expanded.has(rel);
  const toggleExpand = (rel) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(rel) ? next.delete(rel) : next.add(rel);
      return next;
    });
  };

  const visibleRows = useFolderMemo(() => {
    const out = [];
    for (const r of rows) {
      const parts = r.rel.split("/").filter(Boolean);
      let ok = true;
      for (let i = 0; i < parts.length - 1; i++) {
        const ancestor = parts.slice(0, i + 1).join("/");
        if (!expanded.has(ancestor)) { ok = false; break; }
      }
      if (ok) out.push(r);
    }
    return out;
  }, [rows, expanded]);

  const isSelected = (rel) => selectedFolders.includes(rel);
  const isDescendantSelected = (rel) => selectedFolders.some(s => s.startsWith(rel + "/"));
  const isIndeterminate = (rel) => !isSelected(rel) && isDescendantSelected(rel);

  const toggleSelect = (rel, isProtected) => {
    if (isProtected) return;
    setSelectedFolders(prev => {
      if (prev.includes(rel)) return prev.filter(s => s !== rel && !s.startsWith(rel + "/"));
      const without = prev.filter(s => !s.startsWith(rel + "/"));
      return [...without, rel];
    });
  };

  const selectAll = () => {
    if (!effectiveTree) return;
    setSelectedFolders(
      (effectiveTree.children || []).filter(c => !c.protected && c.type === "folder").map(c => c.name)
    );
  };
  const deselectAll = () => setSelectedFolders([]);

  const totalSelected = selectedFolders.length;
  const protectedCount = effectiveTree ? (effectiveTree.children || []).filter(c => c.protected).length : 0;
  const presets = useFolderMemo(() => {
    if (!effectiveTree) return [];
    const tops = (effectiveTree.children || [])
      .filter(c => c.type === "folder" && !c.protected)
      .map(c => c.name);
    return tops.length ? [{ id: "all", name: "All folders", folders: tops, count: tops.length }] : [];
  }, [effectiveTree]);

  if (treeLoading) {
    return (
      <div className="screen">
        <div className="screen-header">
          <div>
            <h1>Choose folders to compare</h1>
            <div className="sub">Loading folder tree from <span className="mono" style={{ color: "var(--blue)" }}>{source}</span>…</div>
          </div>
        </div>
        <div className="screen-body" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>
            Fetching repository structure…
          </div>
        </div>
        <div className="screen-footer">
          <div className="right">
            <button className="btn" onClick={onBack}>
              <Icon.ArrowLeft size={14} />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <h1>Choose folders to compare</h1>
          <div className="sub">
            Only files inside selected folders will be diff'd. Protected folders
            (<span className="mono">/deploy</span>, <span className="mono">/infra</span>,
            <span className="mono"> /env</span>, <span className="mono">/.github</span>)
            are excluded by default and cannot be selected.
          </div>
        </div>
        <div className="actions">
          <button className="btn btn-sm" onClick={selectAll}>Select all</button>
          <button className="btn btn-sm" onClick={deselectAll}>Deselect all</button>
        </div>
      </div>

      <div className="screen-body">
        <div className="folder-screen">
          <div className="folder-main">
            <div className="folder-toolbar">
              <div className="search-wrap">
                <Icon.Search size={13} />
                <input
                  className="search-input"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter folders..."
                />
              </div>
              <div className="spacer" />
              <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                source: <span style={{ color: "var(--blue)" }}>{source}</span>
                <span style={{ margin: "0 4px", color: "var(--muted-2)" }}>·</span>
                <span>{rows.filter(r => r.type === "folder" && r.depth === 0).length} top-level folders</span>
              </span>
            </div>

            <div className="folder-tree">
              <div className="tree-row" style={{ cursor: "default", paddingLeft: 12 }}>
                <Icon.FolderOpen size={14} style={{ color: "var(--blue)" }} />
                <span className="tree-name" style={{ color: "var(--ink)", fontWeight: 600 }}>
                  {effectiveTree?.name || "repository"}
                </span>
                <span className="tree-count">repository root · {source}</span>
              </div>

              {visibleRows.filter(r => !search || r.rel.toLowerCase().includes(search.toLowerCase())).map((r) => {
                const selected = isSelected(r.rel);
                const indet = isIndeterminate(r.rel);
                const inheritsParent = selectedFolders.some(s => r.rel.startsWith(s + "/"));
                const visuallyChecked = selected || inheritsParent;
                const visuallyIndet = !visuallyChecked && indet;

                return (
                  <div
                    key={r.rel}
                    className={`tree-row ${r.protected ? "excluded" : ""}`}
                    onClick={() => r.hasChildren && toggleExpand(r.rel)}
                    style={{ paddingLeft: 12 }}
                  >
                    {Array(r.depth + 1).fill(0).map((_, i) => (
                      <div key={i} className="indent" />
                    ))}
                    {r.hasChildren ? (
                      <div className={`chev-toggle ${isExpanded(r.rel) ? "open" : ""}`}>
                        <Icon.Chevron size={11} />
                      </div>
                    ) : (
                      <div className="chev-toggle leaf"><Icon.Chevron size={11} /></div>
                    )}

                    <div
                      className={`tree-checkbox ${visuallyChecked ? "checked" : ""} ${visuallyIndet ? "indeterminate" : ""}`}
                      onClick={e => { e.stopPropagation(); toggleSelect(r.rel, r.protected); }}
                    />

                    {r.type === "folder" ? (
                      isExpanded(r.rel) ?
                        <Icon.FolderOpen size={14} className="folder-icon" /> :
                        <Icon.Folder size={14} className="folder-icon" />
                    ) : (
                      <Icon.File size={14} className="file-icon" />
                    )}

                    <span className="tree-name">{r.name}</span>

                    {r.count && (
                      <span className="tree-count">{r.count} items</span>
                    )}
                    {r.protected && (
                      <span className="pill-flag protected">protected</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="folder-aside">
            <div>
              <div className="aside-head">
                <Icon.Layers size={11} />
                Selection summary
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="summary-stat">
                  <div className="lbl">Folders</div>
                  <div className="val"><span className="accent">{totalSelected}</span></div>
                </div>
                <div className="summary-stat">
                  <div className="lbl">Protected</div>
                  <div className="val amber">{protectedCount}</div>
                </div>
              </div>
            </div>

            <div>
              <div className="aside-head" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon.Filter size={11} />
                  Presets
                </span>
              </div>
              <div className="preset-list">
                {presets.map(p => (
                  <div
                    key={p.id}
                    className={`preset-item ${activePreset === p.id ? "active" : ""}`}
                    onClick={() => {
                      setActivePreset(p.id);
                      setSelectedFolders(p.folders);
                    }}
                  >
                    <div className="preset-name">{p.name}</div>
                    <div className="preset-count">{p.count} folders</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="aside-head">
                <Icon.Shield size={11} />
                Always excluded
              </div>
              <div className="excluded-list">
                {(effectiveTree ? (effectiveTree.children || []).filter(c => c.protected) : []).map(c => (
                  <div key={c.name} className="excluded-item">
                    <span className="amber-dot" />
                    <span>/{c.name}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, color: "var(--muted-2)" }}>
                      {c.count ? `${c.count} items` : ""}
                    </span>
                  </div>
                ))}
                {!effectiveTree && ["/deploy", "/infra", "/env", "/.github"].map(name => (
                  <div key={name} className="excluded-item">
                    <span className="amber-dot" />
                    <span>{name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <div className="left">
          <div className="summary">
            <strong>{totalSelected}</strong> folders selected
          </div>
        </div>
        <div className="right">
          <button className="btn" onClick={onBack}>
            <Icon.ArrowLeft size={14} />
            Back
          </button>
          <button className="btn btn-primary" onClick={onContinue} disabled={totalSelected === 0}>
            Compare {totalSelected} folder{totalSelected !== 1 ? "s" : ""}
            <Icon.ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

window.FolderFilterScreen = FolderFilterScreen;
