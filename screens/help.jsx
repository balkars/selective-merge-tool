// ============================================
// In-app Wiki / Help — how to run & use the tool
// ============================================
const { useState: useHelpState } = window.React;

const HELP_SECTIONS = [
  { id: "overview",  label: "Overview" },
  { id: "run",       label: "Running the app" },
  { id: "connect",   label: "Connecting Azure DevOps" },
  { id: "workflow",  label: "The merge workflow" },
  { id: "verify",    label: "Verifying changes" },
  { id: "notes",     label: "Notes & safety" },
];

function CodeBlock({ children }) {
  return (
    <pre style={{
      margin: "8px 0 0", padding: "10px 12px",
      background: "var(--surface)", border: "1px solid var(--hairline)",
      borderRadius: "var(--r-md)", overflowX: "auto",
      fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink)",
      lineHeight: 1.6, whiteSpace: "pre",
    }}>{children}</pre>
  );
}

function Kbd({ children }) {
  return (
    <span className="mono" style={{
      padding: "1px 6px", borderRadius: 5,
      background: "var(--surface-3)", border: "1px solid var(--hairline-strong)",
      fontSize: 12, color: "var(--blue)",
    }}>{children}</span>
  );
}

function HelpSection({ title, children }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{
        fontSize: 15, fontWeight: 600, color: "var(--ink)",
        margin: "0 0 10px", display: "flex", alignItems: "center", gap: 8,
      }}>{title}</h2>
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.7 }}>
        {children}
      </div>
    </section>
  );
}

function Step({ n, children }) {
  return (
    <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
      <div style={{
        flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
        background: "var(--blue-soft)", color: "var(--blue)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 700,
      }}>{n}</div>
      <div style={{ paddingTop: 1 }}>{children}</div>
    </div>
  );
}

function HelpScreen({ onClose, settings }) {
  const [active, setActive] = useHelpState("overview");
  const orgName = (settings?.org || "").replace(/^https?:\/\/dev\.azure\.com\//, "").replace(/\/$/, "");

  const scrollTo = (id) => {
    setActive(id);
    const el = document.getElementById(`help-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div style={{
      width: "min(880px, 92vw)", maxHeight: "88vh",
      background: "var(--surface-2)", border: "1px solid var(--hairline-strong)",
      borderRadius: "var(--r-lg)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "16px 20px", borderBottom: "1px solid var(--hairline)",
        background: "var(--surface-3)",
      }}>
        <Icon.Book size={18} style={{ color: "var(--blue)" }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>
            Selective Merge Tool — Wiki
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            How to run, connect, and use the tool
          </div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ height: 28 }}>
          <Icon.Plus size={14} style={{ transform: "rotate(45deg)" }} />
          Close
        </button>
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar nav */}
        <div style={{
          width: 200, flexShrink: 0, padding: "14px 10px",
          borderRight: "1px solid var(--hairline)", background: "var(--surface)",
          overflowY: "auto",
        }}>
          {HELP_SECTIONS.map(s => (
            <div key={s.id}
              onClick={() => scrollTo(s.id)}
              style={{
                padding: "7px 12px", borderRadius: "var(--r-md)",
                fontSize: 13, cursor: "pointer", marginBottom: 2,
                color: active === s.id ? "var(--blue)" : "var(--ink-2)",
                background: active === s.id ? "var(--blue-soft)" : "transparent",
                fontWeight: active === s.id ? 600 : 400,
              }}>
              {s.label}
            </div>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "22px 28px" }}>
          <div id="help-overview">
            <HelpSection title="What this tool does">
              <p style={{ margin: "0 0 10px" }}>
                It lets you move <strong>only the files and folders you choose</strong> from one
                branch (<span className="mono" style={{ color: "var(--blue)" }}>source branch</span>) into
                another (<span className="mono" style={{ color: "var(--purple)" }}>target branch</span>),
                instead of merging everything.
              </p>
              <p style={{ margin: "0 0 10px" }}>
                This replaces the manual workflow of keeping two local checkouts and hand-copying
                folders. You pick folders, review a side-by-side diff of exactly what differs between
                the branches, then it creates a working branch, pushes the selected files in one
                commit, and opens a Pull Request into the target.
              </p>
              <p style={{ margin: 0 }}>
                It is <strong>deterministic code</strong> — no AI/LLM is involved at runtime. It only
                talks to the Azure DevOps REST API.
              </p>
            </HelpSection>
          </div>

          <div id="help-run">
            <HelpSection title="Running the app">
              <p style={{ margin: "0 0 10px" }}>You need <strong>Node.js</strong> installed. From the project folder:</p>
              <Step n={1}>
                Install dependencies (first time only):
                <CodeBlock>npm install</CodeBlock>
              </Step>
              <Step n={2}>
                Start the server:
                <CodeBlock>{"npm start\n# or, for auto-reload during development:\nnpm run dev"}</CodeBlock>
              </Step>
              <Step n={3}>
                Open the app in your browser at <Kbd>http://localhost:3000</Kbd>
              </Step>
              <p style={{ margin: "10px 0 0", color: "var(--muted)" }}>
                The server (<span className="mono">server.js</span>) is an Express app that proxies
                Azure DevOps and serves the UI. Default port is <span className="mono">3000</span>;
                override with a <span className="mono">PORT</span> environment variable.
              </p>
            </HelpSection>
          </div>

          <div id="help-connect">
            <HelpSection title="Connecting to Azure DevOps">
              <p style={{ margin: "0 0 10px" }}>
                On first run you'll see the connection screen (later reachable via{" "}
                <span style={{ color: "var(--ink)" }}>Settings</span>). Fill in:
              </p>
              <ul style={{ margin: "0 0 10px", paddingLeft: 18 }}>
                <li><strong>Organization URL</strong> — just <span className="mono">https://dev.azure.com/&lt;org&gt;</span> (do <em>not</em> include the project).</li>
                <li><strong>Project</strong> — the Azure DevOps project name.</li>
                <li><strong>Repository</strong> — the Git repo name.</li>
                <li><strong>Personal Access Token (PAT)</strong> — with these scopes:
                  <ul style={{ marginTop: 4, paddingLeft: 18 }}>
                    <li><span className="mono">Code</span> → Read &amp; Write</li>
                    <li><span className="mono">Pull Request</span> → Read &amp; Write</li>
                  </ul>
                </li>
              </ul>
              <p style={{ margin: "0 0 6px" }}>
                Click <strong>Test connection</strong>, then <strong>Save</strong>. Credentials are
                written to a local <span className="mono">.env</span> file and are never sent anywhere
                except the Azure REST API over HTTPS.
              </p>
              {orgName && (
                <p style={{ margin: "8px 0 0", color: "var(--green)", fontSize: 12 }}>
                  Currently connected to <span className="mono">dev.azure.com/{orgName}</span>.
                </p>
              )}
            </HelpSection>
          </div>

          <div id="help-workflow">
            <HelpSection title="The merge workflow">
              <p style={{ margin: "0 0 12px" }}>The wizard has four steps:</p>
              <Step n={1}>
                <strong>Branches</strong> — choose the source (merge from) and target (merge into)
                branches, and name the working branch that will be created.
              </Step>
              <Step n={2}>
                <strong>Folders</strong> — pick which top-level folders to include. Only changes inside
                the selected folders are considered. Protected folders are excluded by default.
              </Step>
              <Step n={3}>
                <strong>Diff</strong> — review a side-by-side diff of every file that differs between
                the branches in those folders. Left is the target (current), right is the source
                (incoming). Uncheck any file to leave it out of the PR.
              </Step>
              <Step n={4}>
                <strong>Create PR</strong> — set the title, description, and reviewers. The tool
                creates the working branch off the target tip, pushes the selected files in a single
                commit, and opens the Pull Request. A success screen links you to it.
              </Step>
            </HelpSection>
          </div>

          <div id="help-verify">
            <HelpSection title="Verifying changes against Azure DevOps">
              <p style={{ margin: "0 0 10px" }}>
                In the Diff step, each file's header shows a <strong>commit badge</strong> (e.g.{" "}
                <span className="mono" style={{ color: "var(--blue)" }}>43c7044</span>). This is the
                most recent commit that touched that file on the source branch.
              </p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li><strong>Hover</strong> the badge to see the commit message, author, and date.</li>
                <li><strong>Click</strong> it to open that commit directly in Azure DevOps and verify the change at the source.</li>
              </ul>
            </HelpSection>
          </div>

          <div id="help-notes">
            <HelpSection title="Notes & safety">
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                <li>Nothing is pushed until you reach the final step and create the PR — the diff review is read-only.</li>
                <li>The tool never force-pushes and never touches the target branch directly; it always goes through a new working branch + PR.</li>
                <li>Your PAT lives only in the local <span className="mono">.env</span> file. Treat it like a password — rotate it in Azure DevOps if it's ever exposed.</li>
                <li>Protected folders (deployment/infra/env-type paths) are excluded from selection by default so you don't accidentally promote environment config.</li>
              </ul>
            </HelpSection>
          </div>
        </div>
      </div>
    </div>
  );
}

window.HelpScreen = HelpScreen;
