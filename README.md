# MySQL Service Control

MySQL Service Control is a small Tauri desktop app for Linux that lets you inspect and manage the `mysqld` systemd service through a simple UI.

It is designed for environments where you want a narrow desktop control surface for service operations instead of a full database client.

## Screenshot

Add project screenshots to `docs/assets/` and embed them here before publishing broadly.

Suggested files:

- `docs/assets/mysql-service-control-active.png`
- `docs/assets/mysql-service-control-inactive.png`
- `docs/assets/mysql-service-control-sudo-error.png`

## Features

- Check the current `mysqld` status
- Start the service
- Stop the service
- Restart the service
- Refresh the service state at any time
- Show command output and setup-related errors in the UI

## How it works

This app does not connect to MySQL over SQL protocol and it does not manage database credentials.

Instead, the Tauri backend runs a fixed set of Linux commands against the `mysqld` systemd unit and sends the result back to the React frontend.

The app currently uses these commands:

- `systemctl is-active mysqld`
- `sudo -n systemctl start mysqld`
- `sudo -n systemctl stop mysqld`
- `sudo -n systemctl restart mysqld`

The `-n` flag keeps `sudo` non-interactive so the desktop UI does not block on a password prompt.

## Requirements

- Linux with `systemd`
- A `mysqld` systemd unit available on the machine
- `sudo` installed
- A user account allowed to run the required `systemctl` commands without an interactive password prompt
- Rust and Node.js tooling for local development

## Security model

The app does not execute arbitrary shell commands.

It only calls a fixed set of `systemctl` operations for `mysqld`. This keeps the scope intentionally narrow and easier to audit in an open-source setting.

For `start`, `stop`, and `restart`, the app expects a tightly scoped `sudoers` rule instead of broad root access.

## Sudoers setup

Create a dedicated sudoers rule that only allows the required commands.

Run `visudo` and add a rule like this, replacing `youruser` with your Linux username:

```sudoers
youruser ALL=(root) NOPASSWD: /usr/bin/systemctl start mysqld, /usr/bin/systemctl stop mysqld, /usr/bin/systemctl restart mysqld
```

On some distributions, `systemctl` may live in a different path. Check it with:

```bash
which systemctl
```

After that, validate the rule before using the app:

```bash
sudo -n systemctl start mysqld
sudo -n systemctl stop mysqld
sudo -n systemctl restart mysqld
```

If those commands still ask for a password or fail with a sudo policy error, the app will not be able to perform service actions.

## Development

Install dependencies:

```bash
yarn install
```

Run the frontend in development mode:

```bash
yarn dev
```

Run the Tauri desktop app:

```bash
yarn tauri dev
```

Build the frontend:

```bash
yarn build
```

Check the Rust backend:

```bash
cd src-tauri
cargo check
```

## Manual testing

Use `docs/manual-testing.md` as the release checklist for Linux verification, sudoers validation, and screenshot capture.

## CI

The repository includes a basic GitHub Actions workflow that runs:

- `yarn build`
- `cargo check`

This keeps frontend and backend changes validated on every push and pull request.

## Troubleshooting

### `sudo: a password is required`

Your `sudoers` rule is missing, too broad, too narrow, or using the wrong `systemctl` path.

Check:

- the output of `which systemctl`
- the exact username in the sudoers entry
- whether `sudo -n systemctl restart mysqld` works in the terminal

### `Unit mysqld.service could not be found`

Your distribution may use a different unit name such as `mysql`.

Check available units with:

```bash
systemctl list-units --type=service | grep -E 'mysql|mysqld'
```

If your machine uses a different unit name, update the `SERVICE_NAME` constant in `src-tauri/src/main.rs` before building.

### `systemctl` is missing or not working

This app is only intended for systemd-based Linux environments.

If the machine does not use systemd, service control will not work.

### The app only shows status but actions fail

This usually means:

- `systemctl is-active mysqld` works without privilege
- but `sudo -n systemctl start|stop|restart mysqld` is not allowed yet

Re-check your sudoers configuration and validate the exact commands manually in the terminal.

## Limitations

- Linux only
- systemd only
- Default target service is `mysqld`
- No runtime configuration for alternate unit names yet
- Requires passwordless sudo for service-changing actions

## Open-source roadmap

Good next improvements for the repository:

- add a screenshot to this README
- make the service name configurable
- add issue templates and contribution guidelines
- add release packaging and signed artifacts if distribution becomes a goal

## License

MIT
