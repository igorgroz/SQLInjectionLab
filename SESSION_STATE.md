# SESSION_STATE — DevSecOps Platform Lab

> Load this file first at the start of every session. Update it at the end.
> Keep it under ~80 lines. Detailed runbooks live in PHASE*.md.

## Project framing
DevSecOps platform lab: a hardened CI/CD supply-chain pipeline and EKS
runtime built around a black-box **target application under test**. All
work here is defensive — detection, hardening, signing, and remediation.

## Current phase
**3b-4 + pipeline gate-unification (complete).** Lab destroyed. Full
pipeline operational: SAST → SCA → build → Trivy → push GHCR → sign →
mirror ECR → attest → deploy (cluster-aware). Gates auto-approve via
`AUTO_APPROVE_GATES=true` repo variable. deploy-lab.yml provisions full
stack from scratch via workflow_dispatch.

## Last commit
`fix: replace ALB smoke test with kubectl port-forward health check` (May 15 2026)

## Resolved this session
- **Rename pass complete** (repo-text tokens). Live AWS identifiers remain
  as deliberate separate sub-pass.
- **GitHub Actions OIDC role** (`devseclab-github-actions`) created in
  infra-base via Terraform. Survives nightly destroy. ARN set as
  `AWS_GITHUB_ACTIONS_ROLE_ARN` repo secret.
- **ECR push** added to `push-and-sign` job — mirrors signed images to ECR
  by digest (SHA tag only, IMMUTABLE repos). Skips if tag already exists.
- **deploy job (JOB 9)** added to security-pipeline — runs `kubectl set image`
  + rollout after attest succeeds. Gracefully skips if cluster is down.
- **deploy-lab.yml** added — full provision-and-deploy via workflow_dispatch
  (terraform → ALBC → ESO → workloads → ingress → ALB → port-forward smoke test).
- **AUTO_APPROVE_GATES** repo variable — bypasses all four manual review
  gates during active dev. Delete to reinstate manual approval.
- **EKS access entry** for GitHub Actions role added to infra-lab.
- **Smoke test** replaced with kubectl port-forward (ALB locked to operator IP).
- **#1 closed** — ALBC vpcId now flows from terraform output in deploy-lab.yml.
- **#8 closed** — pipeline pushes to ECR and deploys automatically.
- **#9 confirmed** — all four review environments verified in GitHub.

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
9. **(closed)** All four review environments exist with protection rules:
   `sast-review`, `trivy-review`, `sca-review`, `dast-review`.
10. **Kyverno cosigned admission policy not yet enforced.** Lab cluster
    accepts any signed image; prod policy should require
    `vuln-signoff/v1` attestation with all `gates.*.status` in
    `[clean, accepted]` (with prod-specific further restrictions on
    `accepted`). This is the consumer side of the attestation work.

## Housekeeping pile
`.DS_Store` — add to `.gitignore` (currently showing as modified every session).

## Next actions — roadmap (ordered)
1. **Live AWS identifier rename sub-pass** — namespace `sqlinj`, cluster
   `sqlinj-eks`, ECR repos, IRSA roles, SM secret paths `sqlinj/backend/*`.
   Ripples into running infra; do during next cluster spin-up.
2. **Kyverno cosigned admission policy** (#10) — enforce `vuln-signoff/v1`
   attestation at admission time. Consumer side of the attestation work.
3. **NetworkPolicies + PSS** on the app namespace.
4. **Node-group hop-limit fix** (#1 sub-issue) — drop vpcId pin from
   values.yaml entirely via cluster-info ConfigMap if desired.
5. **Prototype track — "very secure app".** CloudFormation, API Gateway,
   service mesh (mTLS + east-west policy).

## Still-open work (fold in as capacity allows)
- Kyverno cosigned admission policy verifying `vuln-signoff/v1` (#10).
- Node-group hop-limit fix, drop vpcId pin (#1 sub-issue).
- Runtime hardening: NetworkPolicies + PSS on the app namespace.
- GoDaddy CNAME update needed after each cluster recreate (new ALB hostname).

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
