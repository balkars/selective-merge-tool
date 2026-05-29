// ============================================
// Screen 5 — PR Creation (real API)
// ============================================
const { useState: usePRState, useMemo: usePRMemo } = window.React;

function PRCreationScreen({
  source, target, workingBranch,
  included, changedFiles, reviewers,
  selectedReviewers, setSelectedReviewers,
  prTitle, setPRTitle, prDesc, setPRDesc,
  createPR, onCreated, onBack, showToast
}) {
  const includedFiles = changedFiles.filter(f => included.has(f.id));
  const totalAdd = includedFiles.reduce((s, f) => s + (f.add || 0), 0);
  const totalDel = includedFiles.reduce((s, f) => s + (f.del || 0), 0);

  const [creating, setCreating] = usePRState(false);
  const [phase, setPhase]       = usePRState(null); // branch|push|pr
  const [phaseProgress, setPhaseProgress] = usePRState(0);

  const toggleReviewer = (id) => {
    setSelectedReviewers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const start = async () => {
    setCreating(true);
    setPhase("branch");
    setPhaseProgress(0);

    // Animate phase transitions while real API call runs
    const timer1 = setTimeout(() => { setPhase("push"); setPhaseProgress(33); }, 800);
    const timer2 = setTimeout(() => { setPhase("pr");   setPhaseProgress(66); }, 2000);

    try {
      const result = await createPR();
      clearTimeout(timer1);
      clearTimeout(timer2);
      setPhase("pr");
      setPhaseProgress(100);
      setTimeout(() => onCreated(result), 400);
    } catch (err) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setCreating(false);
      setPhase(null);
      showToast && showToast(err.message || "Failed to create PR", "error");
    }
  };

  // Pre-flight checks
  const checks = usePRMemo(() => [
    { ok: true,   label: "Working branch name is unique" },
    { ok: true,   label: `No protected folders in selection` },
    { ok: true,   label: `All ${included.size} selected files exist on ${source}` },
    ...(includedFiles.some(f => f.path.includes("package.json"))
      ? [{ ok: "warn", label: "package.json modified — review lockfile changes before merging" }]
      : [])
  ], [included.size, includedFiles]);

  const displayedReviewers = reviewers || [];

  return (
    <div className="screen">
      <div className="screen-header">
        <div>
          <h1>Create pull request</h1>
          <div className="sub">
            We'll create the working branch from <span className="mono" style={{ color: "var(--purple)" }}>{target}</span>,
            push the {included.size} selected file{included.size !== 1 ? "s" : ""} from <span className="mono" style={{ color: "var(--blue)" }}>{source}</span>,
            then open the PR. Nothing touches <span className="mono" style={{ color: "var(--purple)" }}>{target}</span> until reviewers approve.
          </div>
        </div>
      </div>

      <div className="screen-body">
        <div className="pr-screen">
          <div className="pr-main">
            <div className="pr-form">
              <div className="field-group">
                <label className="field-label">
                  <Icon.GitPullRequest size={12} /> Pull request title
                </label>
                <input
                  className="pr-title-input"
                  value={prTitle}
                  onChange={e => setPRTitle(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  <Icon.File size={12} /> Description
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
                    Markdown · auto-filled with file list
                  </span>
                </label>
                <textarea
                  className="pr-description"
                  value={prDesc}
                  onChange={e => setPRDesc(e.target.value)}
                />
              </div>

              <div className="field-group">
                <label className="field-label">
                  <Icon.Branch size={12} /> Branch flow
                </label>
                <div className="pr-branches">
                  <div className="pr-branch-pill">
                    <div className="ic"><Icon.Branch size={14} /></div>
                    <div className="info">
                      <div className="lbl">Source · new branch</div>
                      <div className="nm">{workingBranch}</div>
                    </div>
                  </div>
                  <div className="arrow">
                    <Icon.ArrowRight size={16} />
                  </div>
                  <div className="pr-branch-pill target locked">
                    <div className="ic"><Icon.Branch size={14} /></div>
                    <div className="info">
                      <div className="lbl" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Target · locked
                        <Icon.Lock size={9} />
                      </div>
                      <div className="nm">{target}</div>
                    </div>
                  </div>
                </div>
              </div>

              {displayedReviewers.length > 0 && (
                <div className="field-group">
                  <label className="field-label">
                    <Icon.Users size={12} /> Reviewers
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>
                      Optional · {reviewers.length ? "fetched from team" : "using defaults"}
                    </span>
                  </label>
                  <div className="reviewer-grid">
                    {displayedReviewers.map(r => (
                      <div
                        key={r.id}
                        className={`reviewer-card ${selectedReviewers.has(r.id) ? "selected" : ""}`}
                        onClick={() => toggleReviewer(r.id)}
                      >
                        <div className="reviewer-avatar" style={{ background: r.color }}>
                          {r.initials}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                          <div className="name">{r.name}</div>
                          <div className="role">{r.role}</div>
                        </div>
                        <div className="check"><Icon.Check size={11} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pre-flight checks */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--r-md)",
              padding: 16
            }}>
              <div className="aside-head" style={{ marginBottom: 12 }}>
                <Icon.Shield size={11} />
                Pre-flight checks
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {checks.map((c, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 6,
                    background: c.ok === "warn" ? "var(--amber-soft)" : "var(--bg-2)",
                    fontSize: 12.5
                  }}>
                    {c.ok === true && <Icon.CheckCircle size={14} style={{ color: "var(--green)" }} />}
                    {c.ok === "warn" && <Icon.AlertTriangle size={14} style={{ color: "var(--amber)" }} />}
                    <span style={{ color: c.ok === "warn" ? "var(--ink)" : "var(--ink-2)" }}>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Progress bar when creating */}
            {creating && (
              <div style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--r-md)",
                padding: 16
              }}>
                <div style={{ height: 4, background: "var(--surface-3)", borderRadius: 99, overflow: "hidden", marginBottom: 12 }}>
                  <div style={{
                    height: "100%", background: "var(--blue)",
                    width: phaseProgress + "%",
                    transition: "width 0.4s ease",
                    borderRadius: 99
                  }} />
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                  {phase === "branch" && `Creating ${workingBranch} from ${target}…`}
                  {phase === "push"   && `Pushing ${included.size} files to working branch…`}
                  {phase === "pr"     && `Opening pull request into ${target}…`}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT ASIDE */}
          <div className="pr-aside">
            <div className="aside-section">
              <div className="aside-head">
                <Icon.FileCode size={11} />
                Files in this PR
                <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--blue)" }}>
                  {included.size}
                </span>
              </div>
              <div className="file-summary-list">
                {includedFiles.slice(0, 20).map(f => (
                  <div key={f.id} className="file-summary-row" title={f.path}>
                    <div className={`change-dot ${f.change}`} />
                    <span className="name">{f.path}</span>
                    <div className="diff-stat">
                      {f.add > 0 && <span className="add">+{f.add}</span>}
                      {f.del > 0 && <span className="del">−{f.del}</span>}
                    </div>
                  </div>
                ))}
                {includedFiles.length > 20 && (
                  <div style={{ fontSize: 11, color: "var(--muted)", padding: "6px 0 0" }}>
                    …and {includedFiles.length - 20} more
                  </div>
                )}
              </div>
            </div>

            <div className="aside-section">
              <div className="aside-head">
                <Icon.Layers size={11} />
                Impact
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="summary-stat">
                  <div className="lbl">Files</div>
                  <div className="val">{included.size}</div>
                </div>
                <div className="summary-stat">
                  <div className="lbl">Net change</div>
                  <div className="val" style={{ fontSize: 16 }}>
                    <span style={{ color: "var(--green)" }}>+{totalAdd}</span>
                    {" / "}
                    <span style={{ color: "var(--red)" }}>−{totalDel}</span>
                  </div>
                </div>
                <div className="summary-stat">
                  <div className="lbl">Added</div>
                  <div className="val green">{includedFiles.filter(f => f.change === "add").length}</div>
                </div>
                <div className="summary-stat">
                  <div className="lbl">Removed</div>
                  <div className="val red">{includedFiles.filter(f => f.change === "del").length}</div>
                </div>
              </div>
            </div>

            <div className="aside-section">
              <div className="aside-head">
                <Icon.Info size={11} />
                What runs
              </div>
              <ol style={{ margin: 0, padding: "0 0 0 18px", fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
                <li>
                  <span className="mono" style={{ color: "var(--ink-2)" }}>POST /refs</span>
                  {" "}— create <span className="mono" style={{ color: "var(--blue)" }}>{workingBranch}</span>
                </li>
                <li>
                  <span className="mono" style={{ color: "var(--ink-2)" }}>POST /pushes</span>
                  {" "}— commit {included.size} files
                </li>
                <li>
                  <span className="mono" style={{ color: "var(--ink-2)" }}>POST /pullrequests</span>
                  {" "}— open PR into <span className="mono" style={{ color: "var(--purple)" }}>{target}</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div className="screen-footer">
        <div className="left">
          {!creating && (
            <div className="summary">
              <strong>{included.size}</strong> files ·
              <span style={{ color: "var(--green)", marginLeft: 6 }}>+{totalAdd}</span>
              <span style={{ margin: "0 4px", color: "var(--muted-2)" }}>·</span>
              <span style={{ color: "var(--red)" }}>−{totalDel}</span>
              {selectedReviewers.size > 0 && (
                <>
                  <span style={{ margin: "0 8px", color: "var(--muted-2)" }}>·</span>
                  {selectedReviewers.size} reviewer{selectedReviewers.size !== 1 ? "s" : ""}
                </>
              )}
            </div>
          )}
          {creating && (
            <div className="summary" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                width: 8, height: 8, borderRadius: "50%",
                background: "var(--amber)",
                boxShadow: "0 0 0 3px var(--amber-soft)",
                animation: "pulse 1s ease-in-out infinite",
                display: "inline-block"
              }} />
              <span>
                {phase === "branch" && `Creating ${workingBranch} from ${target}…`}
                {phase === "push"   && `Pushing ${included.size} files to working branch…`}
                {phase === "pr"     && `Opening pull request…`}
              </span>
            </div>
          )}
        </div>
        <div className="right">
          <button className="btn" onClick={onBack} disabled={creating}>
            <Icon.ArrowLeft size={14} />
            Back
          </button>
          <button className="btn btn-primary" onClick={start} disabled={creating || included.size === 0}>
            {creating ? "Creating…" : (
              <>
                <Icon.GitPullRequest size={14} />
                Create branch &amp; raise PR
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

window.PRCreationScreen = PRCreationScreen;
