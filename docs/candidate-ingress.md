# Secure Candidate ingress

Issue #110 exposed a tooling gap: scheduled/interactive agents could inspect GitHub and write Supabase through connectors, but could not execute the repository's canonical Candidate apply command. The supported fix is an encrypted GitHub Actions handshake that transports a transient Candidate pack without committing manuscript text or creating a second database queue.

## Invariants

- The only Candidate persistence command remains `node scripts/apply-content.mjs --stdin --apply`.
- The Action owns `SUPABASE_SERVICE_ROLE_KEY`; the agent never receives it.
- Candidate plaintext is never committed to Git, added to an Issue, stored as an artifact, or written to a staging table.
- Public GitHub only sees an authenticated encrypted envelope plus sanitized counts/audit metadata.
- Direct connector SQL into `newsflow_candidates` is not a supported fallback.
- Reader publication remains downstream of Editor-in-Chief adoption and `publication-sync.yml`.

## Transport endpoint

The transport address is Issue **#110**. It may be closed after the defect is resolved, but it must remain unlocked so the repository owner can post machine requests.

Only a comment created by the repository owner with this exact shape starts the workflow:

```text
NEWSFLOW_APPLY_REQUEST_V1 <request_id>
```

`request_id` must contain 16–80 characters from `A-Z a-z 0-9 _ -`.

The Action answers with a one-time RSA public key:

```text
NEWSFLOW_APPLY_CHALLENGE_V1 <request_id>
<base64-encoded PEM SubjectPublicKeyInfo>
```

The RSA private key exists only in that Action process and is discarded when the run exits.

## Payload encryption

The agent:

1. validates that the challenge was posted by `github-actions[bot]` for the same request id;
2. generates a random 32-byte AES key and 12-byte IV;
3. encrypts the UTF-8 Candidate-pack JSON with AES-256-GCM;
4. authenticates the exact AAD `newsflow-candidate-ingress-v1:<request_id>`;
5. wraps the AES key with the challenge RSA key using RSA-OAEP + SHA-256;
6. posts the base64-encoded compact JSON envelope.

Envelope before outer base64 encoding:

```json
{
  "v": 1,
  "request_id": "<request_id>",
  "wrapped_key": "<base64>",
  "iv": "<base64>",
  "tag": "<base64 16-byte GCM tag>",
  "ciphertext": "<base64>"
}
```

Payload comment:

```text
NEWSFLOW_APPLY_PAYLOAD_V1 <request_id>
<base64-encoded envelope JSON>
```

Candidate plaintext is capped at 32 KiB so the encrypted envelope remains below GitHub's comment size limit.

### Python reference

This reference uses `cryptography` and deliberately prints only the encrypted payload comment body.

```python
import base64
import json
import os

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

def encrypt_candidate_pack(request_id: str, challenge_b64: str, candidate_pack: dict) -> str:
    public_pem = base64.b64decode(challenge_b64)
    public_key = serialization.load_pem_public_key(public_pem)

    plaintext = json.dumps(candidate_pack, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    if len(plaintext) > 32768:
        raise ValueError("Candidate pack exceeds the 32 KiB ingress limit")

    aes_key = os.urandom(32)
    iv = os.urandom(12)
    aad = f"newsflow-candidate-ingress-v1:{request_id}".encode("utf-8")
    encrypted = AESGCM(aes_key).encrypt(iv, plaintext, aad)
    ciphertext, tag = encrypted[:-16], encrypted[-16:]

    wrapped_key = public_key.encrypt(
        aes_key,
        padding.OAEP(
            mgf=padding.MGF1(algorithm=hashes.SHA256()),
            algorithm=hashes.SHA256(),
            label=None,
        ),
    )

    envelope = {
        "v": 1,
        "request_id": request_id,
        "wrapped_key": base64.b64encode(wrapped_key).decode(),
        "iv": base64.b64encode(iv).decode(),
        "tag": base64.b64encode(tag).decode(),
        "ciphertext": base64.b64encode(ciphertext).decode(),
    }
    outer = base64.b64encode(
        json.dumps(envelope, separators=(",", ":")).encode("utf-8")
    ).decode()
    return f"NEWSFLOW_APPLY_PAYLOAD_V1 {request_id}\n{outer}"
```

## Server-side execution

`.github/workflows/candidate-ingress.yml` accepts only owner requests on Issue #110. The Action decrypts and authenticates the envelope in memory, checks the exchange-envelope shape, and pipes the plaintext directly to:

```bash
node scripts/apply-content.mjs --stdin --apply
```

The existing apply script re-runs deterministic preflight, writes only reviewable Candidates to private Supabase, and creates the normal sanitized `content/runs/*.json` audit.

The workflow commits only that sanitized audit, then runs:

```bash
npm run check
npm run build
```

It posts one sanitized result:

```text
NEWSFLOW_APPLY_RESULT_V1 <request_id>
status: applied
candidate_count: <n>
reviewable_count: <n>
audit: content/runs/<file>.json
```

or a failure containing only a stage and safe error code. Request, challenge, and encrypted payload comments are deleted after processing.

## Scheduled-agent procedure

When an agent has a reviewable Candidate pack but no repository command-execution surface:

1. post a `NEWSFLOW_APPLY_REQUEST_V1` comment on #110;
2. poll #110 for the matching `NEWSFLOW_APPLY_CHALLENGE_V1`;
3. encrypt the pack exactly as above and post `NEWSFLOW_APPLY_PAYLOAD_V1`;
4. poll for the matching `NEWSFLOW_APPLY_RESULT_V1`;
5. verify the resulting Candidate/Review/Adoption state in Supabase and the sanitized audit on GitHub.

Do not fall back to direct SQL if the handshake fails. Treat a failed handshake as a workflow defect, preserve the Candidate pack only in the agent's transient workspace, and report/update the relevant Issue.
