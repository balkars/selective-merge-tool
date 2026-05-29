// ============================================
// Main App — wizard state machine
// Uses real API; falls back gracefully
// ============================================
const { useState, useEffect, useMemo, useCallback } = window.React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accentColor": "#4D8BFF",
  "density": "comfortable",
  "showStatusBar": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  ["#4D8BFF", "#6BA1FF", "#2A6BFF"],
  ["#A371F7", "#C298FF", "#7C4DFF"],
  ["#3FB950", "#7EE787", "#238636"],
  ["#F4A300", "#FFC44D", "#C77800"],
  ["#FF6B6B", "#FF8A8A", "#E14444"]
];

function applyTweaks(t) {
  const root = document.documentElement;
  if (t.accentColor) {
    const a = Array.isArray(t.accentColor) ? t.accentColor : [t.accentColor];
    root.style.setProperty("--blue",        a[0]);
    root.style.setProperty("--blue-bright", a[1] || a[0]);
    root.style.setProperty("--blue-dim",    a[2] || a[0]);
    root.style.setProperty("--blue-soft",   hexAlpha(a[0], 0.12));
    root.style.setProperty("--blue-soft-2", hexAlpha(a[0], 0.22));
  }
  if (t.density === "compact") {
    root.style.setProperty("--r-md", "6px");
    root.style.setProperty("--r-lg", "8px");
  } else {
    root.style.setProperty("--r-md", "8px");
    root.style.setProperty("--r-lg", "12px");
  }
}

function hexAlpha(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ─── Simple API client ────────────────────────────────────────
async function api(method, url, body) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
  return data;
}
window.api = api;

// ─── Loading overlay ──────────────────────────────────────────
function LoadingOverlay({ message }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(10,11,14,0.75)",
      backdropFilter: "blur(4px)",
      zIndex: 200,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      gap: 16
    }}>
      <div style={{ fontSize: 13, color: "var(--ink-2)" }}>{message || "Loading…"}</div>
    </div>
  );
}
window.LoadingOverlay = LoadingOverlay;

// ─── Toast ────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null;
  const colors = { error: "var(--red)", warn: "var(--amber)", ok: "var(--green)" };
  return (
    <div style={{
      position: "fixed", bottom: 36, left: "50%", transform: "translateX(-50%)",
      background: "var(--surface-3)", border: "1px solid var(--hairline-strong)",
      borderLeft: `3px solid ${colors[toast.type] || "var(--blue)"}`,
      borderRadius: "var(--r-md)", padding: "10px 18px",
      fontSize: 13, color: "var(--ink)", zIndex: 300,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      display: "flex", gap: 10, alignItems: "center",
      maxWidth: 480, minWidth: 240
    }}>
      {toast.message}
    </div>
  );
}

function App() {
  const today = new Date().toISOString().slice(0, 10);
  const [t, setTweak] = window.useTweaks(TWEAK_DEFAULTS);
  useEffect(() => applyTweaks(t), [t.accentColor, t.density]);

  // ── App-level state ──────────────────────────────────────────
  const [appReady, setAppReady]       = useState(false);
  const [connected, setConnected]     = useState(false);
  const [settingsMode, setSettingsMode] = useState(null);
  const [helpOpen, setHelpOpen]       = useState(false);
  const [settings, setSettings]       = useState({});
  const [toast, setToast]             = useState(null);
  const [globalLoading, setGlobalLoading] = useState(null);

  // Wizard
  const [step, setStep]               = useState("branches");

  // Branch screen
  const [branches, setBranches]       = useState([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [source, setSource]           = useState("");
  const [target, setTarget]           = useState("");
  const [workingBranch, setWorkingBranch] = useState(
    `merge/source-to-target-${new Date().toISOString().slice(0, 10)}`
  );

  // Folder screen
  const [tree, setTree]               = useState(null);
  const [treeLoading, setTreeLoading] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState([]);

  // Diff screen
  const [changedFiles, setChangedFiles] = useState([]);
  const [diffLoading, setDiffLoading]  = useState(false);
  const [included, setIncluded]        = useState(() => new Set());

  // PR screen
  const [reviewers, setReviewers]     = useState([]);
  const [selectedReviewers, setSelectedReviewers] = useState(() => new Set());
  const [prTitle, setPRTitle]         = useState(`[Selective Merge] ${today}`);
  const [prDesc, setPRDesc]           = useState(() => buildDescription([]));
  const [prResult, setPrResult]       = useState(null);

  const showToast = useCallback((message, type = "error", ms = 4000) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), ms);
  }, []);

  // ── Load settings on startup ──────────────────────────────────
  useEffect(() => {
    api("GET", "/api/settings")
      .then(data => {
        setSettings(data);
        setConnected(!!data.hasCredentials);
        if (data.hasCredentials) loadBranches();
      })
      .catch(() => setConnected(false))
      .finally(() => setAppReady(true));
  }, []);

  // ── Data fetchers (real API) ──────────────────────────────────
  const loadBranches = useCallback(() => {
    setBranchesLoading(true);
    api("GET", "/api/branches")
      .then(data => setBranches(data.branches || []))
      .catch(err => showToast(err.message || "Failed to load branches"))
      .finally(() => setBranchesLoading(false));
  }, [showToast]);

  const loadTree = useCallback((branch) => {
    setTreeLoading(true);
    setTree(null);
    api("GET", `/api/tree?branch=${encodeURIComponent(branch)}`)
      .then(data => setTree(data.tree))
      .catch(err => showToast(err.message || "Failed to load folder tree"))
      .finally(() => setTreeLoading(false));
  }, [showToast]);

  const loadDiff = useCallback((src, tgt, folders) => {
    setDiffLoading(true);
    setChangedFiles([]);
    const folderParam = folders && folders.length ? `&folders=${encodeURIComponent(folders.join(','))}` : '';
    // Show the full source→target delta for the selected folders — every file
    // that actually differs between the branches, like a staging-area diff.
    api("GET", `/api/diff?source=${encodeURIComponent(src)}&target=${encodeURIComponent(tgt)}${folderParam}`)
      .then(data => {
        const files = data.files || [];
        setChangedFiles(files);
        setIncluded(new Set(files.map(f => f.id)));
        setPRDesc(buildDescription(files));
      })
      .catch(err => showToast(err.message || "Failed to compute diff"))
      .finally(() => setDiffLoading(false));
  }, [showToast]);

  const loadReviewers = useCallback(() => {
    api("GET", "/api/reviewers")
      .then(data => {
        const revs = data.reviewers || [];
        setReviewers(revs);
        setSelectedReviewers(new Set(revs.slice(0, 2).map(r => r.id)));
      })
      .catch(() => {});
  }, []);

  // ── Step transitions ──────────────────────────────────────────
  const goToFolders = useCallback(() => {
    setStep("folders");
    setPRTitle(`[Selective Merge] ${source} → ${target} — ${today}`);
    if (!tree) loadTree(source);
  }, [source, target, tree]);

  const goToDiff = useCallback(() => {
    setStep("diff");
    loadDiff(source, target, selectedFolders);
  }, [source, target, selectedFolders]);

  const goToPR = useCallback(() => {
    setStep("pr");
    loadReviewers();
    setPRDesc(buildDescription(changedFiles.filter(f => included.has(f.id))));
  }, [changedFiles, included]);

  const createPR = useCallback(async () => {
    const files = changedFiles
      .filter(f => included.has(f.id))
      .map(f => ({ path: f.path, change: f.change }));
    const revs = reviewers
      .filter(r => selectedReviewers.has(r.id))
      .map(r => ({ id: r.id }));
    return api("POST", "/api/create-pr", {
      source, target, workingBranch,
      files, prTitle, prDesc, reviewers: revs,
    });
  }, [source, target, workingBranch, changedFiles, included, prTitle, prDesc, reviewers, selectedReviewers]);

  const completedSteps = useMemo(() => {
    const all = ["branches", "folders", "diff", "pr", "success"];
    const idx = all.indexOf(step);
    return all.slice(0, Math.max(0, idx));
  }, [step]);

  const startAnother = () => {
    setStep("branches");
    setTree(null);
    setChangedFiles([]);
    setIncluded(new Set());
    setPrResult(null);
  };

  // ── First-run / loading ───────────────────────────────────────
  if (!appReady) {
    return (
      <>
        <TitleBar />
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "var(--muted)", fontSize: 13 }}>Connecting…</div>
        </div>
      </>
    );
  }

  if (!connected) {
    return (
      <>
        <TitleBar settings={settings} onHelp={() => setHelpOpen(true)} />
        {helpOpen && (
          <div
            style={{
              position: "fixed", inset: 0,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
              zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "auto", padding: 24
            }}
            onClick={() => setHelpOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()}>
              <HelpScreen settings={settings} onClose={() => setHelpOpen(false)} />
            </div>
          </div>
        )}
        <SettingsScreen
          mode="first-run"
          settings={settings}
          onConnected={(result) => {
            if (result === "save") {
              setConnected(true);
              api("GET", "/api/settings").then(setSettings).catch(() => {});
              loadBranches();
            }
          }}
        />
        {t.showStatusBar && <StatusBar step="settings" settings={settings} />}
        <TweaksUI t={t} setTweak={setTweak} setStep={setStep} setConnected={setConnected} />
      </>
    );
  }

  return (
    <>
      <TitleBar settings={settings} onSettings={() => setSettingsMode("modal")} onHelp={() => setHelpOpen(true)} />
      <AppBar
        step={step}
        setStep={setStep}
        completedSteps={completedSteps}
        settings={settings}
        onSettings={() => setSettingsMode("modal")}
      />

      <div className="main">
        {step === "branches" && (
          <BranchSetupScreen
            source={source} target={target}
            setSource={setSource} setTarget={setTarget}
            workingBranch={workingBranch} setWorkingBranch={setWorkingBranch}
            branches={branches} branchesLoading={branchesLoading}
            onRefresh={loadBranches}
            onContinue={goToFolders}
          />
        )}
        {step === "folders" && (
          <FolderFilterScreen
            selectedFolders={selectedFolders}
            setSelectedFolders={setSelectedFolders}
            tree={tree} treeLoading={treeLoading}
            source={source}
            onContinue={goToDiff}
            onBack={() => setStep("branches")}
          />
        )}
        {step === "diff" && (
          <DiffViewerScreen
            included={included} setIncluded={setIncluded}
            changedFiles={changedFiles} diffLoading={diffLoading}
            source={source} target={target}
            onContinue={goToPR}
            onBack={() => setStep("folders")}
          />
        )}
        {step === "pr" && (
          <PRCreationScreen
            source={source} target={target} workingBranch={workingBranch}
            included={included}
            changedFiles={changedFiles}
            reviewers={reviewers}
            selectedReviewers={selectedReviewers} setSelectedReviewers={setSelectedReviewers}
            prTitle={prTitle} setPRTitle={setPRTitle}
            prDesc={prDesc} setPRDesc={setPRDesc}
            createPR={createPR}
            onCreated={(result) => { setPrResult(result); setStep("success"); }}
            onBack={() => setStep("diff")}
            showToast={showToast}
          />
        )}
        {step === "success" && (
          <SuccessScreen
            workingBranch={workingBranch} source={source} target={target}
            included={included} changedFiles={changedFiles}
            prTitle={prTitle}
            selectedReviewers={selectedReviewers} reviewers={reviewers}
            prResult={prResult}
            settings={settings}
            onStartAnother={startAnother}
            onSettings={() => setSettingsMode("modal")}
          />
        )}
      </div>

      {t.showStatusBar && <StatusBar step={step} settings={settings} />}

      {settingsMode === "modal" && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "auto", padding: 24
          }}
          onClick={() => setSettingsMode(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <SettingsScreen
              mode="modal"
              settings={settings}
              onConnected={(result) => {
                setSettingsMode(null);
                if (result === "save") {
                  api("GET", "/api/settings").then(setSettings).catch(() => {});
                  loadBranches();
                }
              }}
            />
          </div>
        </div>
      )}

      {helpOpen && (
        <div
          style={{
            position: "fixed", inset: 0,
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)",
            zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "auto", padding: 24
          }}
          onClick={() => setHelpOpen(false)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <HelpScreen settings={settings} onClose={() => setHelpOpen(false)} />
          </div>
        </div>
      )}

      <Toast toast={toast} />
      <TweaksUI t={t} setTweak={setTweak} setStep={setStep} setConnected={setConnected} />
    </>
  );
}

function buildDescription(files) {
  const lines = (files || []).slice(0, 8).map(f =>
    `- \`${f.path}\`${f.change === "add" ? " *(new)*" : f.change === "del" ? " *(deleted)*" : ""}`
  );
  const extra = files.length > 8 ? [`- _…and ${files.length - 8} more_`] : [];
  return [
    "## Selective merge",
    "",
    `**Source:** \`${source}\` → **Target:** \`${target}\``,
    `Generated by Selective Merge Tool on ${new Date().toISOString().slice(0, 10)}.`,
    "",
    "### Files included",
    ...(lines.length ? lines : ["_No files selected yet_"]),
    ...extra,
    "",
    "### Excluded by default (protected)",
    "`/deploy` · `/infra` · `/env` · `/.github`",
    "",
    "### Reviewer notes",
    "- "
  ].join("\n");
}

function TweaksUI({ t, setTweak, setStep, setConnected }) {
  return (
    <window.TweaksPanel>
      <window.TweakSection label="Theme">
        <window.TweakColor
          label="Accent color"
          options={ACCENT_OPTIONS}
          value={Array.isArray(t.accentColor) ? t.accentColor : [t.accentColor]}
          onChange={(v) => setTweak("accentColor", v)}
        />
        <window.TweakRadio
          label="Density"
          options={[
            { value: "comfortable", label: "Comfortable" },
            { value: "compact",     label: "Compact" }
          ]}
          value={t.density}
          onChange={(v) => setTweak("density", v)}
        />
      </window.TweakSection>
      <window.TweakSection label="Chrome">
        <window.TweakToggle
          label="Show status bar"
          value={t.showStatusBar}
          onChange={(v) => setTweak("showStatusBar", v)}
        />
      </window.TweakSection>
      <window.TweakSection label="Jump to screen">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {[
            { id: "branches", label: "1 · Branches" },
            { id: "folders",  label: "2 · Folders" },
            { id: "diff",     label: "3 · Diff" },
            { id: "pr",       label: "4 · Create PR" },
            { id: "success",  label: "5 · Success" }
          ].map(s => (
            <window.TweakButton key={s.id} label={s.label} onClick={() => setStep(s.id)} />
          ))}
          <window.TweakButton label="↻ First-run setup" onClick={() => setConnected(false)} />
        </div>
      </window.TweakSection>
    </window.TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
