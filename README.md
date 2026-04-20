# Log Collector Playground

Public web playground for **Vector**, **Fluent Bit**, and **Fluentd**. Paste a config and sample input, hit Run, see the real collector's stdout — backed by ephemeral, sandboxed Docker containers.

## Architecture

```
browser ── HTTPS ──> caddy ── HTTP ──> next.js ── docker run ──> collector container
                                               (mounted docker socket,
                                                spawns per-request,
                                                --network=none, --read-only,
                                                --memory=128m, --cpus=0.5,
                                                --pids-limit=64, 10s wall-clock)
```

Per request the Next.js API route:

1. Validates the collector ID, config size (≤64 KB), input size (≤256 KB).
2. Rate-limits by IP (10/min, 100/hour, in-memory token bucket).
3. Writes the user's config + `input.log` to `/var/tmp/playground/<uuid>/`.
4. Spawns `docker run --rm` with the flags above, bind-mounting the uuid dir at `/run-input:ro`.
5. Caps stdout (1 MB) and stderr (256 KB), kills the container on 10s timeout.
6. Removes the uuid dir in a `finally`.

## Local dev

```
npm install
./scripts/prepull-images.sh
npm run dev
```

Open <http://localhost:3000>. The API route spawns real `docker run` commands, so the Docker daemon has to be up and the host user has to be in the `docker` group.

### Smoke test

```
BASE_URL=http://localhost:3000 ./scripts/smoke.sh
```

## Deploy

Fresh Debian 13 VPS. DNS A record pointing at it. Then:

```
cd infra
# 1. Point inventory.yml `ansible_host` at your VPS IP
# 2. Edit group_vars/all.yml → domain, acme_email, ssh_authorized_keys
ansible-galaxy collection install -r requirements.yml
ansible-playbook site.yml
```

That run installs Docker from `download.docker.com`, hardens SSH, enables ufw, creates a swapfile, clones this repo into `/opt/playground`, renders `.env`, brings up the compose stack, and installs a weekly systemd timer to re-pull collector images.

To update just the app (no re-bootstrap):

```
ansible-playbook site.yml --tags=playground
```

## Adding a new collector

1. Add a spec to `lib/collectors.ts` (image, command, config filename, Monaco language).
2. Add a template in `lib/templates/<id>.ts` and register it in `lib/templates/index.ts`.
3. Add the image to `infra/group_vars/all.yml` `collector_images`.
4. Add a smoke test case in `scripts/smoke.sh`.

## Security model

Strictly public-facing. Defense is container isolation, not config validation:

- `--network=none` — no outbound DNS/HTTP/TCP from the collector, no matter what sink is configured.
- `--read-only` + `--tmpfs=/tmp` — no host writes; scratch writes land in a bounded tmpfs.
- `--memory=128m --memory-swap=128m` — prevents swap amplification.
- `--pids-limit=64` — fork-bomb budget.
- `--security-opt=no-new-privileges`, `--cap-drop=ALL`, `--user=65534:65534` — unprivileged.
- `docker kill` on 10s timeout.

**One open risk:** the app container mounts `/var/run/docker.sock` to spawn sandboxed collector containers. An attacker who RCEs the Next.js process has root on the host. Mitigation: user input never hits a shell — all `docker run` invocations go through `spawn('docker', [...args])` with an argv array. Second-line mitigation (future): rootless Docker or a narrow socket proxy.

## Limits (see `lib/runner.ts`)

| Limit | Value |
|---|---|
| Config size | 64 KB |
| Input size | 256 KB |
| Stdout capture | 1 MB |
| Stderr capture | 256 KB |
| Wall-clock timeout | 10 s |
| Memory | 128 MB |
| CPU | 0.5 cores |
| PIDs | 64 |
| Tmpfs | 16 MB |
| Rate limit | 10 runs / min, 100 / hour, per IP |

## Collector-specific notes

- **Vector** uses a `sources.stdin` source. Input is piped to the container's stdin, vector exits cleanly on EOF. Runs ~150ms.
- **Fluent Bit** uses `[INPUT] Name tail` with `Exit_On_Eof true`. Input is bind-mounted at `/run-input/input.log`. Runs ~1s.
- **Fluentd** uses `<source> @type tail`. Fluentd core has no stdin input and no exit-on-EOF for tail, so the process is killed at the 10s wall-clock. Output is still captured — the `timedOut: true` flag is expected, not an error.
