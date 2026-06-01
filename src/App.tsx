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

type ServiceResponse = {
  status: ServiceStatus;
  message: string;
  rawOutput: string;
  success: boolean;
};

function App() {
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>("unknown");
  const [statusMessage, setStatusMessage] = useState("Checking mysqld status...");
  const [rawOutput, setRawOutput] = useState("");
  const [loading, setLoading] = useState(false);

  const refreshStatus = async () => {
    setLoading(true);

    try {
      const response = await invoke<ServiceResponse>("get_mysql_status");
      syncState(response);
    } catch (error) {
      setServiceStatus("unknown");
      setStatusMessage(`Failed to load mysqld status: ${String(error)}`);
      setRawOutput("");
    } finally {
      setLoading(false);
    }
  };

  const runAction = async (command: "start_mysql" | "stop_mysql" | "restart_mysql") => {
    setLoading(true);
    setStatusMessage(`Running ${labelForCommand(command)}...`);
    setRawOutput("");

    try {
      const response = await invoke<ServiceResponse>(command);
      syncState(response);
    } catch (error) {
      setServiceStatus("unknown");
      setStatusMessage(`Action failed: ${String(error)}`);
      setRawOutput("");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshStatus();
  }, []);

  const startDisabled = loading || serviceStatus === "active" || serviceStatus === "activating";
  const stopDisabled = loading || serviceStatus === "inactive" || serviceStatus === "deactivating";
  const restartDisabled = loading || serviceStatus === "inactive" || serviceStatus === "deactivating";

  return (
    <main className="app-shell">
      <section className="panel hero-panel">
        <p className="eyebrow">Linux only</p>
        <h1>MySQL Service Control</h1>
        <p className="hero-copy">
          Start, stop, restart, and inspect the <code>mysqld</code> service on
          systemd-based Linux environments.
        </p>
      </section>

      <section className="panel status-panel">
        <div>
          <p className="section-label">Current status</p>
          <div className={`status-badge status-${serviceStatus}`}>
            {formatStatus(serviceStatus)}
          </div>
        </div>

        <p className="status-message">{statusMessage}</p>
      </section>

      <section className="panel action-panel">
        <button disabled={startDisabled} onClick={() => void runAction("start_mysql")}>Start</button>
        <button disabled={stopDisabled} onClick={() => void runAction("stop_mysql")}>Stop</button>
        <button disabled={restartDisabled} onClick={() => void runAction("restart_mysql")}>Restart</button>
        <button disabled={loading} onClick={() => void refreshStatus()}>Refresh Status</button>
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
    setStatusMessage(response.message);
    setRawOutput(response.rawOutput);
  }
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

function labelForCommand(command: "start_mysql" | "stop_mysql" | "restart_mysql") {
  switch (command) {
    case "start_mysql":
      return "start";
    case "stop_mysql":
      return "stop";
    case "restart_mysql":
      return "restart";
  }
}

export default App;
