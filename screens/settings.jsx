// ============================================
// Screen 1 — Settings / Connection Setup
// ============================================
const { useState: useSettingsState } = window.React;

function SettingsScreen({ onConnected, mode = "first-run", settings }) {
  // Pre-fill from saved settings (App.jsx loads these from /api/settings)
  const orgDefault = settings?.org || "";

  const [org,     setOrg]     = useSettingsState(orgDefault);
  const [project, setProject] = useSettingsState(settings?.project || "");
  const [repo,    setRepo]    = useSettingsState(settings?.repo || "");
  const [pat,     setPat]     = useSettingsState("");
  const [revealPat, setRevealPat] = useSettingsState(false);
  const [testState, setTestState] = useSettingsState("idle"); // idle|testing|ok|err
  const [testMsg,   setTestMsg]   = useSettingsState("");
  const [saving,    setSaving]    = useSettingsState(false);

  const canTest = org.trim() && project.trim() && repo.trim() && pat.trim();

  const test = async () => {
    if (!canTest) return;
    setTestState("testing");
    setTestMsg("");
    try {
      const r = await window.api("POST", "/api/test-connection", { org, project, repo, pat });
      setTestState("ok");
      setTestMsg(r.message || "Connected successfully");
    } catch (err) {
      setTestState("err");
      setTestMsg(err.message || "Connection failed");
    }
  };

  const save = async () => {
    if (testState !== "ok") return;
    setSaving(true);
    try {
      await window.api("POST", "/api/settings", { org, project, repo, pat });
      onConnected && onConnected("save");
    } catch (err) {
      setTestState("err");
      setTestMsg("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-screen">
      <div className="settings-card">
        <div className="settings-head">
          <div className="badge">
            <Icon.Sparkle size={11} />
            {mode === "first-run" ? "First-run setup" : "Connection settings"}
          </div>
          <h1>Connect to Azure DevOps</h1>
          <div className="sub">
            Stored locally in <span className="mono" style={{ color: "var(--ink-2)" }}>.env</span> on
            your machine. PAT is never sent anywhere except the Azure REST API over HTTPS.
          </div>
        </div>

        <div className="settings-body">
          <div className="field">
            <label className="field-label">
              <Icon.ExternalLink size={12} /> Organization URL
            </label>
            <input
              className="field-input mono"
              value={org}
              onChange={e => setOrg(e.target.value)}
              placeholder="https://dev.azure.com/your-org"
            />
          </div>

          <div className="settings-row">
            <div className="field">
              <label className="field-label">
                <Icon.Layers size={12} /> Project
              </label>
              <input
                className="field-input"
                value={project}
                onChange={e => setProject(e.target.value)}
                placeholder="Project name"
              />
            </div>
            <div className="field">
              <label className="field-label">
                <Icon.Code size={12} /> Repository
              </label>
              <input
                className="field-input mono"
                value={repo}
                onChange={e => setRepo(e.target.value)}
                placeholder="repo-name"
              />
            </div>
          </div>

          <div className="field">
            <label className="field-label" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icon.Shield size={12} /> Personal Access Token (PAT)
              </span>
            </label>
            <div style={{ position: "relative" }}>
              <input
                className="field-input mono"
                type={revealPat ? "text" : "password"}
                value={pat}
                onChange={e => setPat(e.target.value)}
                placeholder="paste your PAT here"
                style={{ paddingRight: 38 }}
              />
              <button
                onClick={() => setRevealPat(v => !v)}
                style={{
                  position: "absolute", right: 6, top: 6,
                  height: 26, width: 26,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--muted)", borderRadius: 4
                }}
                title={revealPat ? "Hide" : "Show"}
              >
                {revealPat ? <Icon.EyeOff size={14} /> : <Icon.Eye size={14} />}
              </button>
            </div>
            <div className="field-hint">
              Required scopes: <span className="mono">Code (read &amp; write)</span>, <span className="mono">Pull Request (read &amp; write)</span>
            </div>
          </div>
        </div>

        <div className="settings-test">
          {testState === "idle" && (
            <div className="status">
              <span className="pulse" />
              <span>Not tested yet</span>
            </div>
          )}
          {testState === "testing" && (
            <div className="status testing">
              <span className="pulse" />
              <span>Reaching Azure DevOps…</span>
            </div>
          )}
          {testState === "ok" && (
            <div className="status ok">
              <span className="pulse" />
              <span>{testMsg || "Connected"}</span>
            </div>
          )}
          {testState === "err" && (
            <div className="status err">
              <span className="pulse" />
              <span>{testMsg || "Connection failed"}</span>
            </div>
          )}
          <button className="btn btn-sm" style={{ marginLeft: "auto" }} onClick={test} disabled={!canTest || testState === "testing"}>
            <Icon.Refresh size={12} />
            Test Connection
          </button>
        </div>

        <div className="settings-foot">
          <div className="secure">
            <Icon.Lock size={12} />
            <span>Saved to ./.env — never committed</span>
          </div>
          <div className="right">
            {mode !== "first-run" && (
              <button className="btn" onClick={() => onConnected && onConnected("cancel")}>
                Cancel
              </button>
            )}
            <button
              className="btn btn-primary"
              disabled={testState !== "ok" || saving}
              onClick={save}
            >
              {saving ? "Saving…" : (mode === "first-run" ? "Continue →" : "Save")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

window.SettingsScreen = SettingsScreen;
