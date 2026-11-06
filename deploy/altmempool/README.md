# Self-hosted sidecar pointing at altmempool

Run the same sidecar image as the public devnet, but with **your** node in
front of it. The execution upstream is the public altmempool chain; this node
has its own mempool, data dir, peer identity (standalone mode has no P2P) and,
if you give it a relayer key, its own relayer.

This is the deployment profile for "host the sidecar myself". It does not
replace `https://altmempool.forshtat.com` — it submits to the same ethrex
chain.

## Files

| File | Purpose |
|---|---|
| `config.json` | EIP-8141 sentinel, staking registry, precompiles, and `rpcEndpoint`/`rpcEndpointSubmit` pointing at altmempool. No secrets. |
| `docker-compose.yml` | Runs the published image with the config bind-mounted and a persistent data volume. |
| `.env.example` | Optional `SKANDHA_RELAYERS` / RPC overrides. Copy to `.env`. |

## Run it

```sh
cp .env.example .env          # optional
docker compose up -d
```

The RPC is on `http://localhost:14337/rpc`. Check it:

```sh
curl -s -X POST http://localhost:14337/rpc \
  -H 'content-type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"skandha_config","params":[]}'
```

`BUNDLING_MODE=manual` (the default) admits and forwards frame transactions
but does not relay them itself. Set `BUNDLING_MODE=auto` to relay on
`bundleInterval`, which also requires `SKANDHA_RELAYERS` in `.env` (a funded
key; never commit it).

To pin a specific build instead of `:latest`:

```sh
SIDECAR_IMAGE=ghcr.io/<owner>/<repo>:<sha> docker compose up -d
```

Fork images published by CI require the GHCR package to be public, or a
`docker login ghcr.io` on the host.

## CI

`.github/workflows/publish-docker-image.yml`:

- Pull requests that touch the Dockerfile, lockfile, packages or this profile
  build the image (no push) and run `skandha --help` as a smoke test.
- Pushes to `master` and `v*` tags publish to GHCR with `latest`, branch/tag
  and short-sha tags.

The image is `linux/amd64`, matching the devnet VM. Add
`platform: linux/amd64` to the compose service on an arm64 host.

## Using it from QuotaPay

Point the app at this node instead of the public one:

```env
NEXT_PUBLIC_RPC_URL=http://localhost:14337/rpc
NEXT_PUBLIC_GATEWAY_URL=http://localhost:14337
```

Expose it over HTTPS before pointing a browser at it (Caddy/nginx); the app
also uses `NEXT_PUBLIC_GATEWAY_URL` for the raw transaction fallback.

## anon-rpc: what hosting the sidecar does and does not buy

The sidecar exposes a normal JSON-RPC endpoint. QuotaPay's `lib/anonRpc.tsx`
already routes its transports through an anon-rpc worker, and that worker can
point at this sidecar. That gives you:

- one place where the browser's requests enter the chain (your node), and
- the sandboxed-worker boundary, so app code never gets direct network access.

It does **not** give you anonymity on its own. A real anon-rpc deployment needs
three things beyond the sidecar:

1. a conforming **worker bundle** (the network client, hash-pinned);
2. an on-chain **specifier contract** publishing that hash and its resolvers;
3. an **anonymizing transport** behind the worker (a mixnet, KPS, or similar).

Without those, `NEXT_PUBLIC_ANON_RPC_SPECIFIER` stays at the default
passthrough worker: requests are sandboxed and routed, but not anonymized. See
<https://ethereum.github.io/anon-rpc/> and
[docs/integrate-network.md](https://github.com/ethereum/anon-rpc/blob/main/docs/integrate-network.md).

So: host the sidecar for control and a private relay path — yes. Treat it as
privacy infrastructure — only once a worker + specifier + transport exist.
