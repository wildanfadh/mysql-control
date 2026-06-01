use serde::Serialize;
use std::process::{Command, Output};

const SERVICE_NAME: &str = "mysqld";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ServiceResponse {
    status: String,
    message: String,
    raw_output: String,
    success: bool,
}

#[tauri::command]
fn get_mysql_status() -> Result<ServiceResponse, String> {
    Ok(read_service_status())
}

#[tauri::command]
fn start_mysql() -> Result<ServiceResponse, String> {
    control_mysql_service("start")
}

#[tauri::command]
fn stop_mysql() -> Result<ServiceResponse, String> {
    control_mysql_service("stop")
}

#[tauri::command]
fn restart_mysql() -> Result<ServiceResponse, String> {
    control_mysql_service("restart")
}

fn control_mysql_service(action: &str) -> Result<ServiceResponse, String> {
    let output = Command::new("sudo")
        .args(["-n", "systemctl", action, SERVICE_NAME])
        .output()
        .map_err(|error| format!("Failed to execute sudo/systemctl: {error}"))?;

    let status_after_action = read_service_status();

    if output.status.success() {
        Ok(ServiceResponse {
            status: status_after_action.status,
            message: format!(
                "Successfully executed `systemctl {action} {SERVICE_NAME}`. {}",
                status_after_action.message
            ),
            raw_output: combine_output(&output),
            success: true,
        })
    } else {
        Ok(ServiceResponse {
            status: status_after_action.status,
            message: map_control_error(action, &output),
            raw_output: combine_output(&output),
            success: false,
        })
    }
}

fn read_service_status() -> ServiceResponse {
    let output = match Command::new("systemctl")
        .args(["is-active", SERVICE_NAME])
        .output()
    {
        Ok(output) => output,
        Err(error) => {
            return ServiceResponse {
                status: "unknown".to_string(),
                message: format!(
                    "Unable to run `systemctl`. This app requires a systemd-based Linux distribution. {error}"
                ),
                raw_output: String::new(),
                success: false,
            }
        }
    };

    let raw_output = combine_output(&output);
    let normalized_output = String::from_utf8_lossy(&output.stdout).trim().to_string();

    let status = match normalized_output.as_str() {
        "active" => "active",
        "inactive" => "inactive",
        "failed" => "failed",
        "activating" => "activating",
        "deactivating" => "deactivating",
        _ => "unknown",
    }
    .to_string();

    let message = match status.as_str() {
        "active" => format!("The `{SERVICE_NAME}` service is running."),
        "inactive" => format!("The `{SERVICE_NAME}` service is stopped."),
        "failed" => format!("The `{SERVICE_NAME}` service is in a failed state."),
        "activating" => format!("The `{SERVICE_NAME}` service is starting."),
        "deactivating" => format!("The `{SERVICE_NAME}` service is stopping."),
        _ => format!(
            "Could not determine the `{SERVICE_NAME}` service status. Check whether the service exists on this machine."
        ),
    };

    ServiceResponse {
        success: output.status.success(),
        status,
        message,
        raw_output,
    }
}

fn map_control_error(action: &str, output: &Output) -> String {
    let stderr = String::from_utf8_lossy(&output.stderr).to_lowercase();
    let stdout = String::from_utf8_lossy(&output.stdout).to_lowercase();
    let combined = format!("{stdout}\n{stderr}");

    if combined.contains("password is required")
        || combined.contains("a password is required")
        || combined.contains("sudo:")
    {
        return format!(
            "Sudo is not configured for non-interactive `{SERVICE_NAME}` control. Follow the README instructions to allow `systemctl {action} {SERVICE_NAME}` without a password prompt."
        );
    }

    if combined.contains("unit") && combined.contains("could not be found") {
        return format!("The `{SERVICE_NAME}` service was not found on this system.");
    }

    format!("Failed to execute `systemctl {action} {SERVICE_NAME}`.")
}

fn combine_output(output: &Output) -> String {
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();

    match (stdout.is_empty(), stderr.is_empty()) {
        (true, true) => String::new(),
        (false, true) => stdout,
        (true, false) => stderr,
        (false, false) => format!("stdout:\n{stdout}\n\nstderr:\n{stderr}"),
    }
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_mysql_status,
            start_mysql,
            stop_mysql,
            restart_mysql
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
