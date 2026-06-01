# Manual Testing Checklist

Use this checklist before publishing a release or after making backend/frontend changes that affect service control behavior.

## Test environment

- Distribution:
- Kernel:
- Desktop environment:
- Node.js version:
- Yarn version:
- Rust version:
- `systemctl` path:
- Target service name:
- Tester:
- Test date:

## Pre-flight verification

Run these commands and record the result:

```bash
which systemctl
systemctl is-active mysqld
systemctl status mysqld
sudo -n systemctl start mysqld
sudo -n systemctl stop mysqld
sudo -n systemctl restart mysqld
```

Expected:

- `systemctl` is available
- the `mysqld` unit exists
- `sudo -n` commands do not prompt for a password

Notes:

-

## App startup

Commands:

```bash
yarn install
yarn tauri dev
```

Expected:

- the app window opens successfully
- the initial status loads without crashing
- the output panel remains readable

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

## Functional scenarios

### 1. Active state on launch

Setup:

```bash
sudo -n systemctl start mysqld
```

Expected:

- status badge shows `Active`
- `Start` is disabled
- `Stop` and `Restart` are enabled

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

### 2. Inactive state on launch

Setup:

```bash
sudo -n systemctl stop mysqld
```

Expected:

- status badge shows `Inactive`
- `Start` is enabled
- `Stop` is disabled

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

### 3. Refresh status

Action:

- click `Refresh Status`

Expected:

- latest service state is shown
- the UI does not freeze or crash

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

### 4. Start action

Setup:

```bash
sudo -n systemctl stop mysqld
```

Action:

- click `Start`

Expected:

- loading indicator appears
- status becomes `Active` or transitions correctly
- output panel shows command output or a success message

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

### 5. Stop action

Setup:

```bash
sudo -n systemctl start mysqld
```

Action:

- click `Stop`

Expected:

- loading indicator appears
- status becomes `Inactive` or transitions correctly

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

### 6. Restart action

Setup:

```bash
sudo -n systemctl start mysqld
```

Action:

- click `Restart`

Expected:

- loading indicator appears
- service returns to `Active`

Result:

- [ ] Pass
- [ ] Fail

Notes:

-

## Error scenarios

### 7. Sudoers misconfiguration

Expected:

- the app shows a clear message about non-interactive sudo setup
- the UI does not hang on a password prompt

Result:

- [ ] Pass
- [ ] Fail
- [ ] Not tested

Notes:

-

### 8. Service not found

Expected:

- the app reports that `mysqld` was not found
- the failure is visible in the status message and/or output panel

Result:

- [ ] Pass
- [ ] Fail
- [ ] Not tested

Notes:

-

### 9. Non-systemd environment

Expected:

- the app reports that a systemd-based Linux environment is required

Result:

- [ ] Pass
- [ ] Fail
- [ ] Not tested

Notes:

-

## Screenshot capture

Capture at least these states for README or release notes:

- [ ] `docs/assets/mysql-service-control-active.png`
- [ ] `docs/assets/mysql-service-control-inactive.png`
- [ ] `docs/assets/mysql-service-control-sudo-error.png`

## Final sign-off

- [ ] Frontend build passes with `yarn build`
- [ ] Rust backend check passes with `cargo check`
- [ ] README setup steps match the tested system
- [ ] Screenshots reflect the current UI

Additional notes:

-
