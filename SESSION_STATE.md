# SESSION_STATE — SQLInjProject

> Load this file first at the start of every session. Update it at the end.
> Keep it under ~80 lines. Detailed runbooks live in PHASE*.md.

## Current phase
**3b-4 — functionally complete + pipeline hardening + HTTPS.** Full stack
stands up on EKS, ALB serves HTTPS:443 with ACM cert + ELBSecurityPolicy-
TLS13-1-2-2021-06, HTTP:80 issues 301→HTTPS, ALB ingress allowlisted to
the operator's residential /32. Pipeline SCA gate now manual-review based
(mirroring DAST). Lab is **UP** at https://lab.oznetsecure.com.au.

## Last commit
`cee8747 feat(cors): make allowlist configurable via CORS_ALLOWED_ORIGINS env` (May 11 2026)

## Resolved this session
- **Frontend SCA `fast-uri` HIGH (GHSA-q3j6-qgpj-74h6, GHSA-v39h-62p7-jpjc)** —
  ajv@8.18.0 pulled fast-uri@3.0.6 (vuln range ≤3.1.1). Added `overrides:
  { fast-uri: ^3.1.2 }` to `frontend/package.json`; lockfile regenerated.
  `npm audit --omit=dev` now zero across all severities.
- **SCA gate refactored to manual review.** `sca-backend` / `sca-frontend`
  no longer hard-fail; they emit `has_findings` + counts + finding lines as
  step outputs and upload audit JSON + exceptions file as artifacts. New
  `sca-gate` job: if either has findings it enters the `sca-review`
  environment (required reviewers), otherwise auto-approves. `build` now
  depends on `sca-gate` instead of the raw SCA jobs.
- **Frontend audit-exceptions parity.** Added `frontend/audit-exceptions.json`
  scaffold (empty), so future accepted CVEs follow the same documented model
  as `backend/audit-exceptions.json` (GHSA id + severity + justification +
  fix ticket / review date).
- **HTTPS at the ALB.** `k8s/ingress.yaml` now wires the ACM cert
  (`b541a915-…` in ap-southeast-2), listen-ports `[{HTTP:80},{HTTPS:443}]`,
  `ssl-redirect: 443`, `ssl-policy: ELBSecurityPolicy-TLS13-1-2-2021-06`.
  Closes open issue #3.
- **Lab ingress lockdown.** `alb.ingress.kubernetes.io/inbound-cidrs`
  annotation pins ALB SG ingress to operator /32 — ALBC manages it, so
  manual SG edits no longer get reverted (open issue #7).
- **ECR re-population from GHCR.** Lab destroy wiped ECR; mirrored the
  `f814ac7` backend + frontend images from GHCR via `crane`. Deployments
  bumped to that SHA — first end-to-end run where the image deployed
  matches what the pipeline signed (no more manual-push drift).

## Open issues
1. **ALBC vpcId auto-discovery still hard-pinned** — IMDS `httpPutResponseHopLimit=1`.
   Real fix: `metadata_options { http_put_response_hop_limit = 2 }` on the
   node-group launch template in Terraform; remove the workaround from
   `helm/alb-controller/values.yaml`.
2. **CORS-fix image is unsigned** — pushed manually, bypassed the cosign step
   in `.github/workflows/security-pipeline.yml`. Fine while admission policy
   isn't enforced; must be signed before a Kyverno/cosigned policy goes in.
3. **(closed)** Ingress TLS codified — see Resolved this session.
4. **`sca-review` GitHub environment** — configured this session (required
   reviewer = self). Documented for traceability.
5. **Backend uses deprecated `dynamodb_table` for S3 state locking** —
   `terraform/infra-lab/backend.tf` (and likely `terraform/infra-base/`).
   Replace with `use_lockfile = true` (S3-native conditional-write lock,
   GA in AWS provider 5.83+). Once swapped, the lock table in
   `infra-base` can be destroyed. Non-blocking warning today.
6. **ECR repos are in `infra-lab` and get destroyed nightly** — every
   morning we re-mirror images from GHCR. Two options: (a) move the
   `aws_ecr_repository` resources to `infra-base` so they survive; or
   (b) switch the cluster to pull from GHCR directly with an
   `imagePullSecret`. Either kills the daily mirror dance.
7. **ALB allowlist tied to a single residential IP** — `inbound-cidrs`
   in `k8s/ingress.yaml` pins 112.213.131.214/32. Breaks the moment the
   IP rotates. Mitigations: add a `bin/whitelist-me.sh` helper, or
   move to AWS Verified Access / a tiny WireGuard endpoint for a more
   robust lab access pattern.

## Uncommitted / untracked
- M `helm/alb-controller/values.yaml` — vpcId workaround (keep until #1 lands)
- M `k8s/backend/deployment.yaml` — image tag bumped to cee8747 SHA
- ?? `terraform/infra-lab/cluster-bootstrap.tf`, `ebs-csi.tf` — promote to git
- ?? `k8s/backend/deployment.yaml.bak` — sed backup, delete
- ?? `test.json`, root-level `package-lock.json` — investigate / .gitignore

## Next actions (pick one)
1. Move `aws_ecr_repository` into `infra-base` so images survive nightly
   destroys (kills the GHCR→ECR mirror dance — open issue #6).
2. Fix the node-group hop-limit in Terraform and drop the vpcId pin
   (open issue #1).
3. Swap S3 backend `dynamodb_table` for `use_lockfile = true`, destroy
   the lock table (open issue #5).
4. (Phase 4 prep) EKS KMS envelope encryption for etcd Secrets.

## Lab teardown state
**Destroyed.** `terraform -chdir=terraform/infra-lab destroy` removed 65 resources.
Preserved: `infra-base` (nightly-destroy CodeBuild + state backend), AWS Secrets
Manager entries (`sqlinj/backend/db-password`, `sqlinj/backend/jwt-secret`),
ECR images, **ACM cert for `lab.oznetsecure.com.au`**, Route 53 zone.

## Key paths
- Phase docs: `PHASE2.md`, `PHASE3B3.md`
- Security decisions: `LAB_SECURITY_DECISIONS.md`, `COSIGN_SIGNING_DEEP_DIVE.md`
- Architecture: `Architecture.md`
- Manifests: `k8s/{backend,frontend,db,eso}/`, `k8s/ingress.yaml`
- Helm values: `helm/{alb-controller,external-secrets}/values.yaml`
- IaC: `terraform/infra-lab/`, `terraform/infra-base/`

## AWS / cluster identifiers
- Account: `510151297987`, region: `ap-southeast-2`
- EKS cluster: `sqlinj-eks` (v1.35, AL2023) — currently destroyed
- ECR repo: `510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/sqlinj-backend`
- Current backend image SHA: `cee8747` (CORS env-driven)
- IRSA roles: `sqlinj-eks-eso-role`, `sqlinj-backend-sa`, ALBC role, EBS CSI role
- Secrets in AWS SM: `sqlinj/backend/db-password`, `sqlinj/backend/jwt-secret`
- Entra: tenant `487f7bd9-65ec-4967-83e5-94f06e11b6d1`, SPA app `a6960366-…`,
  API app `af63b7cb-…` (accessTokenAcceptedVersion = 2)
- Lab URL: `https://lab.oznetsecure.com.au` (ACM cert in ap-southeast-2)
