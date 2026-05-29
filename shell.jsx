// ============================================
// Shared layout components: TitleBar, AppBar, StatusBar
// ============================================
const { useState: useStateShell, useEffect: useEffectShell } = window.React;

const STEPS = [
  { id: "branches", num: 1, label: "Branches",  icon: "Branch" },
  { id: "folders",  num: 2, label: "Folders",   icon: "Folder" },
  { id: "diff",     num: 3, label: "Diff",      icon: "FileCode" },
  { id: "pr",       num: 4, label: "Create PR", icon: "GitPullRequest" }
];

function TitleBar({ settings, onSettings, onHelp }) {
  const orgName = (settings?.org || '').replace(/^https?:\/\/dev\.azure\.com\//, '').replace(/\/$/, '');
  const repoName = settings?.repo || '';
  return (
    <div className="titlebar">
      <div className="titlebar-traffic">
        <div className="traffic-dot r" />
        <div className="traffic-dot y" />
        <div className="traffic-dot g" />
      </div>
      <div className="titlebar-title">
        <span>Selective Merge Tool</span>
        <span className="sep">·</span>
        <span style={{ fontFamily: "var(--font-mono)", color: "var(--ink-2)" }}>
          {orgName ? `${orgName}/${repoName}` : "not connected"}
        </span>
      </div>
      <div className="titlebar-right">
        {onHelp && (
          <button className="btn btn-ghost btn-sm" onClick={onHelp}
            style={{ height: 24, padding: "0 8px" }}>
            <Icon.Book size={13} />
            Wiki
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={onSettings}
          style={{ height: 24, padding: "0 8px" }}>
          <Icon.Settings size={13} />
          Settings
        </button>
      </div>
    </div>
  );
}

function AppBar({ step, setStep, completedSteps, settings, onSettings }) {
  const orgName = (settings?.org || '').replace(/^https?:\/\/dev\.azure\.com\//, '').replace(/\/$/, '');
  const repoName = settings?.repo || '';

  return (
    <div className="appbar">
      <div className="appbar-brand">
        <div className="logo-mark">⇄</div>
        <span>SelectiveMerge</span>
        <span className="name-sub">Azure DevOps · v1.0.0</span>
      </div>

      <div className="steps">
        {STEPS.map((s, i) => {
          const isActive = step === s.id;
          const isDone = completedSteps.includes(s.id);
          return (
            <React.Fragment key={s.id}>
              <div
                className={`step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}
                onClick={() => (isDone || isActive) && setStep(s.id)}
              >
                <div className="step-num">
                  {isDone && !isActive ? <Icon.Check size={11} /> : s.num}
                </div>
                <span>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && <div className="step-sep" />}
            </React.Fragment>
          );
        })}
      </div>

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
        <div className="repo-pill" title="Connected">
          <span className="dot" />
          <span className="org">{orgName}</span>
          <span className="slash">/</span>
          <span>{repoName}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onSettings} title="Settings">
          <Icon.Settings size={14} />
        </button>
      </div>
    </div>
  );
}

function StatusBar({ step, settings }) {
  const [time, setTime] = useStateShell(() => new Date());
  useEffectShell(() => {
    const id = setInterval(() => setTime(new Date()), 30000);
    return () => clearInterval(id);
  }, []);
  const hh = String(time.getHours()).padStart(2, "0");
  const mm = String(time.getMinutes()).padStart(2, "0");
  const orgName = (settings?.org || '').replace(/^https?:\/\/dev\.azure\.com\//, '').replace(/\/$/, '');

  return (
    <div className="statusbar">
      <div className="sb-item">
        <div className="sb-dot" />
        <span>connected to dev.azure.com/{orgName}</span>
      </div>
      <div className="sb-item">
        <span>step {STEPS.findIndex(s => s.id === step) + 1}/{STEPS.length}</span>
      </div>
      <div className="sb-item right">
        <span>PAT: {settings?.patMasked || "••••••••"}</span>
      </div>
      <div className="sb-item">
        <span>{hh}:{mm}</span>
      </div>
    </div>
  );
}

window.TitleBar = TitleBar;
window.AppBar = AppBar;
window.StatusBar = StatusBar;
window.STEPS = STEPS;
