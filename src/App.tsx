import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

type ServiceStatus =
  | "active"
  | "inactive"
  | "failed"
  | "activating"
  | "deactivating"
  | "unknown";

type EnablementStatus =
  | "enabled"
  | "disabled"
  | "static"
  | "masked"
  | "unknown";

type ServiceResponse = {
  status: ServiceStatus;
  enablementStatus: EnablementStatus;
  message: string;
  rawOutput: string;
  success: boolean;
};

type ActiveAction = "start" | "stop" | "restart" | "enable" | "disable" | "refresh" | null;

const MIN_LOADING_MS = 500;

function App() {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("unknown");
  const [enablementStatus, setEnablementStatus] = useState<EnablementStatus>("unknown");
  const [statusMessage, setStatusMessage] = useState("Checking mysqld status...");
  const [rawOutput, setRawOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>("refresh");

  const refreshStatus = async () => {
    const startedAt = Date.now();

    setLoading(true);
    setActiveAction("refresh");
    setStatusMessage("Refreshing mysqld status...");

    try {
      const response = await invoke<ServiceResponse>("get_mysql_status");
      syncState(response);
    } catch (error) {
      setServiceStatus("unknown");
      setEnablementStatus("unknown");
      setStatusMessage(`Failed to load mysqld status: ${String(error)}`);
      setRawOutput("");
    } finally {
      await ensureMinimumLoadingTime(startedAt);
      setLoading(false);
      setActiveAction(null);
    }
  };

  const runAction = async (command: "start_mysql" | "stop_mysql" | "restart_mysql" | "enable_mysql" | "disable_mysql") => {
    const action = actionForCommand(command);
    const startedAt = Date.now();

    setLoading(true);
    setActiveAction(action);
    setStatusMessage(`Running ${labelForCommand(command)}...`);
    setRawOutput("");

    try {
      const response = await invoke<ServiceResponse>(command);
      syncState(response);
    } catch (error) {
      setServiceStatus("unknown");
      setEnablementStatus("unknown");
      setStatusMessage(`Action failed: ${String(error)}`);
      setRawOutput("");
    } finally {
      await ensureMinimumLoadingTime(startedAt);
      setLoading(false);
      setActiveAction(null);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const startDisabled = loading || serviceStatus === "active" || serviceStatus === "activating";
  const stopDisabled = loading || serviceStatus === "inactive" || serviceStatus === "deactivating";
  const restartDisabled = loading || serviceStatus === "inactive" || serviceStatus === "deactivating";
  const enableDisabled = loading || enablementStatus === "enabled";
  const disableDisabled = loading || enablementStatus === "disabled";

  return (
    <main className="app-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Linux only</p>
        <h1>MySQL Service Control</h1>
        <p className="hero-copy">
          Start, stop, restart, enable, disable, and inspect the <code>mysqld</code> service on
          systemd-based Linux environments.
        </p>
      </section>

      <section className="panel status-panel">
        <div className="status-grid">
          <div>
            <p className="section-label">Service status</p>
            <div className={`status-badge status-${serviceStatus}`}>
              {formatStatus(serviceStatus)}
            </div>
          </div>
          <div>
            <p className="section-label">Startup</p>
            <div className={`status-badge enablement-${enablementStatus}`}>
              {formatEnablement(enablementStatus)}
            </div>
          </div>
        </div>

        <p className="status-message">{statusMessage}</p>
      </section>

      <section className="panel action-panel">
        <button
          className={activeAction === "start" ? "is-loading" : undefined}
          disabled={startDisabled}
          onClick={() => void runAction("start_mysql")}
        >
          <ButtonLabel idleLabel="Start" loadingLabel="Starting..." active={activeAction === "start"} />
        </button>
        <button
          className={activeAction === "stop" ? "is-loading" : undefined}
          disabled={stopDisabled}
          onClick={() => void runAction("stop_mysql")}
        >
          <ButtonLabel idleLabel="Stop" loadingLabel="Stopping..." active={activeAction === "stop"} />
        </button>
        <button
          className={activeAction === "restart" ? "is-loading" : undefined}
          disabled={restartDisabled}
          onClick={() => void runAction("restart_mysql")}
        >
          <ButtonLabel idleLabel="Restart" loadingLabel="Restarting..." active={activeAction === "restart"} />
        </button>
        <button
          className={activeAction === "enable" ? "is-loading" : undefined}
          disabled={enableDisabled}
          onClick={() => void runAction("enable_mysql")}
        >
          <ButtonLabel idleLabel="Enable" loadingLabel="Enabling..." active={activeAction === "enable"} />
        </button>
        <button
          className={activeAction === "disable" ? "is-loading" : undefined}
          disabled={disableDisabled}
          onClick={() => void runAction("disable_mysql")}
        >
          <ButtonLabel idleLabel="Disable" loadingLabel="Disabling..." active={activeAction === "disable"} />
        </button>
        <button
          className={activeAction === "refresh" ? "is-loading" : undefined}
          disabled={loading}
          onClick={() => void refreshStatus()}
        >
          <ButtonLabel idleLabel="Refresh Status" loadingLabel="Refreshing..." active={activeAction === "refresh"} />
        </button>
      </section>

      <section className="panel output-panel">
        <div className="output-header">
          <h2>Last command output</h2>
          {loading ? <span className="loading-pill">Working...</span> : null}
        </div>

        <pre>{rawOutput || "No command output available."}</pre>
      </section>
    </main>
  );

  function syncState(response: ServiceResponse) {
    setServiceStatus(response.status);
    setEnablementStatus(response.enablementStatus);
    setStatusMessage(response.message);
    setRawOutput(response.rawOutput);
  }

  async function ensureMinimumLoadingTime(startedAt: number) {
    const elapsed = Date.now() - startedAt;
    const remaining = MIN_LOADING_MS - elapsed;

    if (remaining > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
    }
  }
}

type ButtonLabelProps = {
  idleLabel: string;
  loadingLabel: string;
  active: boolean;
};

function ButtonLabel({ idleLabel, loadingLabel, active }: ButtonLabelProps) {
  if (!active) {
    return <>{idleLabel}</>;
  }

  return (
    <span className="button-label">
      <span className="spinner" aria-hidden="true" />
      {loadingLabel}
    </span>
  );
}

function formatStatus(status: ServiceStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "inactive":
      return "Inactive";
    case "failed":
      return "Failed";
    case "activating":
      return "Activating";
    case "deactivating":
      return "Deactivating";
    default:
      return "Unknown";
  }
}

function formatEnablement(status: EnablementStatus) {
  switch (status) {
    case "enabled":
      return "Enabled";
    case "disabled":
      return "Disabled";
    case "static":
      return "Static";
    case "masked":
      return "Masked";
    default:
      return "Unknown";
  }
}

function labelForCommand(command: "start_mysql" | "stop_mysql" | "restart_mysql" | "enable_mysql" | "disable_mysql") {
  switch (command) {
    case "start_mysql":
      return "start";
    case "stop_mysql":
      return "stop";
    case "restart_mysql":
      return "restart";
    case "enable_mysql":
      return "enable";
    case "disable_mysql":
      return "disable";
  }
}

function actionForCommand(command: "start_mysql" | "stop_mysql" | "restart_mysql" | "enable_mysql" | "disable_mysql"): Exclude<ActiveAction, "refresh" | null> {
  switch (command) {
    case "start_mysql":
      return "start";
    case "stop_mysql":
      return "stop";
    case "restart_mysql":
      return "restart";
    case "enable_mysql":
      return "enable";
    case "disable_mysql":
      return "disable";
  }
}

export default App;
