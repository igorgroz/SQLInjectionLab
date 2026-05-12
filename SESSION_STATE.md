# SESSION_STATE — SQLInjProject

> Load this file first at the start of every session. Update it at the end.
> Keep it under ~80 lines. Detailed runbooks live in PHASE*.md.

## Current phase
**3b-4 complete — IaC hygiene pass landed.** Full stack runs on EKS with
HTTPS-terminated ALB, IP-allowlisted to operator /32. Pipeline SCA gate is
manual-review based. ECR repos now live in `infra-base` (survive nightly
destroys). State locking is S3-native (`use_lockfile`). Lab destroyed at
end of session.

## Last commit
`7a34af5 refactor(tf): move ECR repos from infra-lab to infra-base` (May 12 2026)

## Resolved this session
- **Frontend SCA `fast-uri` HIGH** — `overrides: { fast-uri: ^3.1.2 }` in
  `frontend/package.json`; `npm audit --omit=dev` now 0/0/0/0/0.
- **SCA gate → manual review.** `sca-backend` / `sca-frontend` emit
  `has_findings` outputs; `sca-gate` enters the `sca-review` environment
  if findings present, else auto-approves. `build` depends on `sca-gate`.
- **Frontend audit-exceptions parity** — empty `frontend/audit-exceptions.json`
  scaffold mirroring `backend/audit-exceptions.json`.
- **HTTPS at the ALB** — ACM cert wired, HTTP→HTTPS 301,
  `ELBSecurityPolicy-TLS13-1-2-2021-06`. Closes #3.
- **Lab ingress lockdown** — `inbound-cidrs` annotation pins SG to operator
  /32; ALBC manages it (no more manual SG drift). `bin/whitelist-me.sh`
  auto-detects current public IP and patches the annotation. Partially
  mitigates #7.
- **ECR images recovered** — mirrored `f814ac7` from GHCR via crane; first
  deploy where running image matches what the pipeline signed.
- **S3-native state locking** — `dynamodb_table → use_lockfile = true` on
  both stacks. DDB lock table deleted, IAM policy + dangling output
  cleaned up. Closes #5.
- **Promoted `cluster-bootstrap.tf` + `ebs-csi.tf`** to git; `**/*.tfplan`
  in `.gitignore`. Closes the "untracked in-flight TF" item.
- **ECR repos moved to `infra-base`** — 6 state imports, 1 state rm. No
  AWS-side recreate. Repos + images now survive `infra-lab` destroys.
  Closes #6.

## Open issues
1. **ALBC vpcId auto-discovery still hard-pinned** — IMDS hop limit = 1.
   Fix: `metadata_options { http_put_response_hop_limit = 2 }` on the
   node-group launch template; drop the workaround from
   `helm/alb-controller/values.yaml`.
2. **(closed)** CORS-fix image unsigned — current `f814ac7` is the first
   pipeline-signed image actually deployed.
3. **(closed)** Ingress TLS codified.
5. **(closed)** S3-native state locking.
6. **(closed)** ECR durability across teardowns.
7. **ALB allowlist still tied to one residential /32** — `bin/whitelist-me.sh`
   reduces toil; long-term fix is AWS Verified Access or WireGuard endpoint.
8. **No automatic deploy on `git push`** — pipeline signs to GHCR but
   nothing pushes to ECR or updates `k8s/*/deployment.yaml`. Manual
   mirror + SHA bump + apply per release. Next session: add an OIDC-
   authed ECR push job to `security-pipeline.yml`; further out, Argo
   Image Updater or similar for end-to-end automation.

## Uncommitted / untracked (housekeeping pile)
- M `helm/alb-controller/values.yaml` — vpcId workaround (keep until #1)
- M `.DS_Store`, `backend/backend_dev_notes.md` — drift, ignore
- ?? `CLAUDE.md`, root `package-lock.json`, `test.json` — decide+commit/gitignore

## Next actions (pick one)
1. Add ECR push to `security-pipeline.yml` (closes #8 cheap fix path).
2. Fix node-group hop-limit, drop vpcId pin (#1).
3. Runtime hardening track: NetworkPolicies + Pod Security Standards on
   `sqlinj` namespace + Kyverno cosign admission policy.
4. (Phase 4 prep) EKS KMS envelope encryption for etcd Secrets.

## Lab teardown state
**Destroyed at session end.** `terraform -chdir=terraform/infra-lab destroy`
removed the ~65 lab resources. Preserved in `infra-base`: state backend,
nightly-destroy CodeBuild, **ECR repos with `f814ac7` images**, AWS Secrets
Manager entries, ACM cert for `lab.oznetsecure.com.au`, Route 53 zone.

## Key paths
- Phase docs: `PHASE2.md`, `PHASE3B3.md`
- Security decisions: `LAB_SECURITY_DECISIONS.md`, `COSIGN_SIGNING_DEEP_DIVE.md`
- Architecture: `Architecture.md`
- Manifests: `k8s/{backend,frontend,db,eso}/`, `k8s/ingress.yaml`
- Helm values: `helm/{alb-controller,external-secrets}/values.yaml`
- IaC: `terraform/infra-lab/`, `terraform/infra-base/` (now owns ECR)
- Tools: `bin/whitelist-me.sh`

## AWS / cluster identifiers
- Account `510151297987`, region `ap-southeast-2`
- EKS cluster `sqlinj-eks` (v1.35, AL2023) — destroyed
- ECR: `510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/sqlinj-{backend,frontend}`
- Current image SHA: `f814ac7` (pipeline-signed, in ECR + GHCR)
- IRSA: `sqlinj-eks-eso-role`, `sqlinj-backend-sa`, ALBC, EBS CSI
- Secrets: `sqlinj/backend/db-password`, `sqlinj/backend/jwt-secret`
- Entra: tenant `487f7bd9-…`, SPA `a6960366-…`, API `af63b7cb-…` (v2 tokens)
- Lab URL: `https://lab.oznetsecure.com.au`
