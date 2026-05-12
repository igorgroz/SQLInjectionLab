# SESSION_STATE — SQLInjProject

> Load this file first at the start of every session. Update it at the end.
> Keep it under ~80 lines. Detailed runbooks live in PHASE*.md.

## Current phase
**3b-4 — functionally complete + pipeline hardening.** Full stack stands up
on EKS end-to-end. Pipeline SCA gate now manual-review based (mirroring DAST).
Lab itself still destroyed from previous session.

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

## Open issues
1. **ALBC vpcId auto-discovery still hard-pinned** — IMDS `httpPutResponseHopLimit=1`.
   Real fix: `metadata_options { http_put_response_hop_limit = 2 }` on the
   node-group launch template in Terraform; remove the workaround from
   `helm/alb-controller/values.yaml`.
2. **CORS-fix image is unsigned** — pushed manually, bypassed the cosign step
   in `.github/workflows/security-pipeline.yml`. Fine while admission policy
   isn't enforced; must be signed before a Kyverno/cosigned policy goes in.
3. **Ingress TLS not yet codified** — ACM cert for `lab.oznetsecure.com.au`
   exists in ap-southeast-2 (created manually this session, do NOT delete), but
   `k8s/ingress.yaml` still declares HTTP 80 only. Next deploy: add
   `alb.ingress.kubernetes.io/certificate-arn: <ARN>`,
   `alb.ingress.kubernetes.io/listen-ports: '[{"HTTP":80},{"HTTPS":443}]'`,
   and `alb.ingress.kubernetes.io/ssl-redirect: '443'`. Record the ARN in
   `LAB_SECURITY_DECISIONS.md` once captured.
4. **`sca-review` GitHub environment not yet configured** — repo →
   Settings → Environments → New environment `sca-review` → Required
   reviewers: add yourself. Without this, the gate auto-passes on
   findings (because the env name resolves but has no protection rules).

## Uncommitted / untracked
- M `helm/alb-controller/values.yaml` — vpcId workaround (keep until #1 lands)
- M `k8s/backend/deployment.yaml` — image tag bumped to cee8747 SHA
- ?? `terraform/infra-lab/cluster-bootstrap.tf`, `ebs-csi.tf` — promote to git
- ?? `k8s/backend/deployment.yaml.bak` — sed backup, delete
- ?? `test.json`, root-level `package-lock.json` — investigate / .gitignore

## Next actions (pick one)
1. Codify the ACM cert + HTTPS listener in `k8s/ingress.yaml`; remove the
   HTTP-only comment block.
2. Fix the node-group hop-limit in Terraform and drop the vpcId pin.
3. Commit the in-flight terraform files (ebs-csi.tf, cluster-bootstrap.tf).
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
