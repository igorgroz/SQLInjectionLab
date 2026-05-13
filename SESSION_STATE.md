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

## Resolved this session (closes #3, #5, #6 + untracked-TF)
- Frontend SCA `fast-uri` HIGH cleared via `overrides` in package.json.
- SCA pipeline → manual-review gate (`sca-review` env). Frontend
  `audit-exceptions.json` scaffold mirrors backend.
- HTTPS at the ALB (ACM cert, TLS 1.3/1.2 policy, HTTP→301).
- ALB inbound-cidrs pinned to operator /32; `bin/whitelist-me.sh` auto-
  patches on IP rotation.
- ECR images mirrored from GHCR (`f814ac7`), first deploy where running
  image matches pipeline-signed image.
- `use_lockfile = true` on both backends; DDB lock table deleted.
- Promoted `cluster-bootstrap.tf` + `ebs-csi.tf` to git; `**/*.tfplan`
  gitignored.
- ECR repos moved to `infra-base` (6 state imports, 1 state rm; no
  AWS-side recreate).

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
   mirror + SHA bump + apply per release. Next session: add an OIDC-
   authed ECR push job to `security-pipeline.yml`; further out, Argo
   Image Updater or similar for end-to-end automation.

## Housekeeping pile
M `helm/alb-controller/values.yaml` (keep until #1). Drift/junk to
decide on next pass: `.DS_Store`, `backend/backend_dev_notes.md`,
`CLAUDE.md`, root `package-lock.json`, `test.json`.

## Next actions (pick one)
1. Add ECR push to `security-pipeline.yml` (closes #8 cheap fix path).
2. Fix node-group hop-limit, drop vpcId pin (#1).
3. Runtime hardening track: NetworkPolicies + Pod Security Standards on
   `sqlinj` namespace + Kyverno cosign admission policy.
4. (Phase 4 prep) EKS KMS envelope encryption for etcd Secrets.

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

## AWS / cluster identifiers
- Account `510151297987`, region `ap-southeast-2`
- EKS cluster `sqlinj-eks` (v1.35, AL2023) — destroyed
- ECR: `510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/sqlinj-{backend,frontend}`
- Current image SHA: `f814ac7` (pipeline-signed, in ECR + GHCR)
- IRSA: `sqlinj-eks-eso-role`, `sqlinj-backend-sa`, ALBC, EBS CSI
- Secrets: `sqlinj/backend/db-password`, `sqlinj/backend/jwt-secret`
- Entra: tenant `487f7bd9-…`, SPA `a6960366-…`, API `af63b7cb-…` (v2 tokens)
- Lab URL: `https://lab.oznetsecure.com.au`
