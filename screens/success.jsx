// ============================================
// Screen 6 — Success / PR Summary
// ============================================
const { useState: useSuccessState } = window.React;

function SuccessScreen({ workingBranch, source, target, included, changedFiles, prTitle, selectedReviewers, reviewers, prResult, settings, onStartAnother, onSettings }) {
  const orgName = (settings?.org || '').replace(/^https?:\/\/dev\.azure\.com\//, '').replace(/\/$/, '');
  const repoName = settings?.repo || '';
  const includedFiles = changedFiles.filter(f => included.has(f.id));
  const totalAdd = includedFiles.reduce((s, f) => s + (f.add || 0), 0);
  const totalDel = includedFiles.reduce((s, f) => s + (f.del || 0), 0);

  const prId  = prResult?.prId || 0;
  const prUrl = prResult?.prUrl || "";

  const [copied, setCopied] = useSuccessState(false);
  const copy = () => {
    if (navigator.clipboard && prUrl) {
      navigator.clipboard.writeText(prUrl).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const reviewerCount = selectedReviewers?.size || 0;

  return (
    <div className="screen">
      <div className="success-screen">
        <div className="success-card">
          <div className="success-head">
            <div className="success-check">
              <Icon.CheckCircle size={28} />
            </div>
            <div>
              <div style={{
                fontSize: 11, fontWeight: 600, letterSpacing: "0.18em",
                textTransform: "uppercase", color: "var(--green)", marginBottom: 8,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <span style={{ width: 18, height: 1, background: "var(--green)" }} />
                PR created
              </div>
              <h1>Pull request opened</h1>
              <div className="sub" style={{ marginTop: 8 }}>
                <span className="mono" style={{ color: "var(--blue)" }}>{workingBranch}</span> was created from <span className="mono" style={{ color: "var(--purple)" }}>{target}</span>,
                {" "}<strong style={{ color: "var(--ink)" }}>{included.size} files</strong> were pushed
                {reviewerCount > 0 && `, and the PR is waiting for ${reviewerCount} reviewer${reviewerCount !== 1 ? "s" : ""}`}.
              </div>
            </div>
          </div>

          {prUrl ? (
            <div className="success-pr-link">
              <div className="pr-num">#{prId}</div>
              <div className="pr-info">
                <div className="title">{prTitle}</div>
                <div className="url">{prUrl.replace(/^https?:\/\//, "")}</div>
              </div>
              <button className="btn btn-sm" onClick={copy}>
                {copied ? <Icon.Check size={12} /> : <Icon.Copy size={12} />}
                {copied ? "Copied" : "Copy link"}
              </button>
              <button className="btn btn-sm btn-primary" onClick={() => window.open(prUrl, "_blank")}>
                <Icon.ExternalLink size={12} />
                Open in Azure
              </button>
            </div>
          ) : (
            <div style={{
              padding: "16px 36px",
              borderBottom: "1px solid var(--hairline)",
              color: "var(--muted)", fontSize: 13
            }}>
              PR created successfully.
            </div>
          )}

          <div className="success-stats">
            <div className="stat">
              <div className="val blue">{included.size}</div>
              <div className="lbl">Files</div>
            </div>
            <div className="stat">
              <div className="val green">+{totalAdd}</div>
              <div className="lbl">Lines added</div>
            </div>
            <div className="stat">
              <div className="val red">−{totalDel}</div>
              <div className="lbl">Lines removed</div>
            </div>
            <div className="stat">
              <div className="val">{reviewerCount}</div>
              <div className="lbl">Reviewers</div>
            </div>
          </div>

          {/* Operation log */}
          <div style={{ padding: "20px 36px", borderBottom: "1px solid var(--hairline)" }}>
            <div className="aside-head" style={{ marginBottom: 12 }}>
              <Icon.Clock size={11} />
              Operation log
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { ms: "+0ms",   label: `Fetched refs from ${orgName}/${repoName}` },
                { ms: "…",      label: `Created branch ${workingBranch} from ${target}` },
                { ms: "…",      label: `Pushed ${included.size} files in a single commit` },
                { ms: "…",      label: prId ? `Opened PR #${prId} into ${target}` : `Opened PR into ${target}` },
                ...(reviewerCount > 0 ? [{ ms: "…", label: `Assigned ${reviewerCount} reviewer${reviewerCount !== 1 ? "s" : ""}` }] : [])
              ].map((entry, i) => (
                <div key={i} style={{
                  display: "grid",
                  gridTemplateColumns: "70px 14px 1fr",
                  alignItems: "center",
                  gap: 8,
                  fontFamily: "var(--font-mono)",
                  fontSize: 11.5,
                  letterSpacing: "-0.01em",
                  color: "var(--ink-2)"
                }}>
                  <span style={{ color: "var(--muted-2)" }}>{entry.ms}</span>
                  <Icon.Check size={11} style={{ color: "var(--green)" }} />
                  <span>{entry.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="success-foot">
            <div className="secure" style={{ fontSize: 11.5, color: "var(--muted)", display: "flex", alignItems: "center", gap: 6 }}>
              <Icon.Shield size={12} />
              <span><span className="mono">{target}</span> is unchanged until reviewers approve in Azure DevOps</span>
            </div>
            <div className="right">
              <button className="btn" onClick={onSettings}>
                <Icon.Settings size={13} />
                Settings
              </button>
              <button className="btn btn-primary" onClick={onStartAnother}>
                <Icon.Refresh size={13} />
                Start another merge
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SuccessScreen = SuccessScreen;
