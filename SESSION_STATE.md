# SESSION_STATE — SQLInjProject

> Load this file first at the start of every session. Update it at the end.
> Keep it under ~80 lines. Detailed runbooks live in PHASE*.md.

## Current phase
**3b-4 + pipeline gate-unification (in progress).** Lab destroyed. Pipeline
now has four manual-review gates (SAST, SCA, Trivy, DAST), each producing
a decision that aggregates into a single cosign `vuln-signoff/v1`
attestation on each image digest. Predicate schema in
`.github/attestations/vuln-signoff.schema.json`.

## Last commit
`038870a docs(session): expand issue #1 (vpcId/IMDS hop-limit trade-offs)` (May 13 2026)

## Resolved this session
- **SAST `--error` removed.** Was failing every push on the deliberately
  vulnerable demo routes. Now emits findings as outputs, sast-gate enters
  `sast-review` env if any finding present, else auto-passes.
- **Trivy refactored to gate-with-exceptions.** New `trivy-exceptions.json`
  at repo root (CVE/advisory ID allowlist). Trivy emits JSON + table,
  parses minus exceptions, sets outputs. trivy-gate uses `trivy-review`
  environment on findings, auto on clean. No more `exit-code: 1`.
- **DAST gate skip-then-approve bug fixed.** `if: always()` replaced with
  `needs.dast.result == 'success'`. Gate now correctly skips when DAST
  didn't run, instead of auto-approving a non-existent scan.
- **Vuln-signoff attestation step (`attest` job).** Aggregates all four
  gate decisions into one predicate of type
  `https://oznetsecure.com.au/attestations/vuln-signoff/v1`, attached to
  each image digest via `cosign attest`. Verified back with
  `cosign verify-attestation`.
- **Predicate schema** documented at
  `.github/attestations/vuln-signoff.schema.json`.

## Open issues
1. **ALBC vpcId requires manual `--set` every cluster recreate.** Root
   cause: node-group launch template ships `http_put_response_hop_limit=1`
   (EKS default, hardens pod→IMDS-credential-theft), but the VPC CNI
   namespace traversal counts as one hop, so the IMDSv2 token response
   never reaches pods. ALBC can't auto-discover vpcId, hence the helm
   `--set vpcId="$(tf output -raw vpc_id)"` workaround.
   - **Don't just bump to hop_limit=2.** That re-opens pod→IMDS for the
     whole node group. Only safe if `http_tokens="required"` (IMDSv2
     enforced) AND NetworkPolicy denies pod egress to
     `169.254.169.254/32` in `sqlinj` (and any future app namespace).
   - **Preferred fix:** generate a `cluster-info` ConfigMap from
     terraform (`module.vpc.vpc_id`) and point ALBC's helm values at it
     via env-var substitution. Same UX as IMDS auto-discovery, value
     flows through cluster state instead of IMDS, no hop_limit change,
     generalises to any other pod that needs to know its VPC.
2. **(closed)** CORS-fix image unsigned — current `f814ac7` is the first
   pipeline-signed image actually deployed.
3. **(closed)** Ingress TLS codified.
5. **(closed)** S3-native state locking.
6. **(closed)** ECR durability across teardowns.
7. **ALB allowlist still tied to one residential /32** — `bin/whitelist-me.sh`
   reduces toil; long-term fix is AWS Verified Access or WireGuard endpoint.
8. **No automatic deploy on `git push`** — pipeline signs to GHCR but
   nothing pushes to ECR or updates `k8s/*/deployment.yaml`. Manual
   mirror + SHA bump + apply per release.
9. **New `sast-review` and `trivy-review` environments need creation.**
   GitHub repo → Settings → Environments → New environment → Required
   reviewers: add yourself. Without these, gates auto-pass on findings.
   `sca-review` and `dast-review` already exist.
10. **Kyverno cosigned admission policy not yet enforced.** Lab cluster
    accepts any signed image; prod policy should require
    `vuln-signoff/v1` attestation with all `gates.*.status` in
    `[clean, accepted]` (with prod-specific further restrictions on
    `accepted`). This is the consumer side of the attestation work.

## Housekeeping pile
M `helm/alb-controller/values.yaml` (keep until #1). Drift/junk to
decide on next pass: `.DS_Store`, `backend/backend_dev_notes.md`,
`CLAUDE.md`, root `package-lock.json`, `test.json`.

## Next actions (pick one)
1. Create the new GitHub environments `sast-review` and `trivy-review`
   (closes #9) — required before next push or those gates auto-pass on
   findings.
2. Add ECR push to `security-pipeline.yml` (closes #8 cheap fix path).
3. Author Kyverno cosigned admission policy that verifies the
   `vuln-signoff/v1` attestation predicate (closes #10).
4. Fix node-group hop-limit, drop vpcId pin (#1).
5. Runtime hardening track: NetworkPolicies + PSS on `sqlinj` namespace.

## Lab teardown state
**Destroyed.** Preserved in `infra-base`: state backend, nightly-destroy
CodeBuild, **ECR repos with `f814ac7` images**, AWS SM entries, ACM cert,
Route 53 zone. Tomorrow's spin-up has working images already in ECR.

## Key paths
- Phase docs: `PHASE2.md`, `PHASE3B3.md`
- Security decisions: `LAB_SECURITY_DECISIONS.md`, `COSIGN_SIGNING_DEEP_DIVE.md`
- Architecture: `Architecture.md`
- Manifests: `k8s/{backend,frontend,db,eso}/`, `k8s/ingress.yaml`
- Helm values: `helm/{alb-controller,external-secrets}/values.yaml`
- IaC: `terraform/infra-lab/`, `terraform/infra-base/` (now owns ECR)
- Tools: `bin/whitelist-me.sh`
- Pipeline: `.github/workflows/security-pipeline.yml`,
  `.github/attestations/vuln-signoff.schema.json`,
  `{backend,frontend}/audit-exceptions.json`, `trivy-exceptions.json`

## AWS / cluster identifiers
- Account `510151297987`, region `ap-southeast-2`
- EKS cluster `sqlinj-eks` (v1.35, AL2023) — destroyed
- ECR: `510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/sqlinj-{backend,frontend}`
- Current image SHA: `f814ac7` (pipeline-signed, in ECR + GHCR)
- IRSA: `sqlinj-eks-eso-role`, `sqlinj-backend-sa`, ALBC, EBS CSI
- Secrets: `sqlinj/backend/db-password`, `sqlinj/backend/jwt-secret`
- Entra: tenant `487f7bd9-…`, SPA `a6960366-…`, API `af63b7cb-…` (v2 tokens)
- Lab URL: `https://lab.oznetsecure.com.au`
