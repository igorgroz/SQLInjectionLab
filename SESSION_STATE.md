# SESSION_STATE — DevSecOps Platform Lab

> Load this file first at the start of every session. Update it at the end.
> Keep it under ~80 lines. Detailed runbooks live in PHASE*.md.

## Project framing
DevSecOps platform lab: hardened CI/CD supply-chain pipeline and EKS runtime.
Learning exercise — app has no practical value; all value is in DevSecOps and
modern app security concepts built around it.

## Current phase
**Kyverno admission policy — in progress.** Cluster up (not destroyed).
Policy manifest written and committed. deploy-lab.yml Kyverno install/wait
logic iterated through multiple fixes; blocked on Kyverno TLS initialisation
race condition. Cluster manually cleaned (kyverno namespace + webhook configs
deleted). Ready for clean deploy-lab.yml run next session.

## Last commit
`fix(deploy-lab): wait for Kyverno TLS secret and webhook config` (May 18 2026)

## Resolved this session
- **Rename pass complete** — all `sqlinj` → `dsl` across repo + live AWS.
  ECR repos recreated as `dsl-backend`/`dsl-frontend` (Terraform-managed,
  scan_on_push=true). Old `sqlinj-*` repos destroyed. Pipeline green.
- **ECR state bucket refs** reverted to real `sqlinj-tfstate-*` bucket name
  (rename touched backend.tf — live bucket can't be renamed in-place).
- **Kyverno ClusterPolicy** written: `k8s/kyverno/clusterpolicy-image-verify.yaml`
  — keyless cosign signature + vuln-signoff/v1 attestation enforced on all
  Pods in the `dsl` namespace. postgres (db Pod) excluded via imageReferences.
- **deploy-lab.yml** updated: Kyverno Helm install + webhook wait + policy apply
  steps added before workload deployments.
- **security-pipeline deploy job** fixed: graceful skip if backend/frontend
  Deployments not yet provisioned (`deployment not found` was hard failing).
- **deployment.yaml images** updated from deleted `f814ac7` (sqlinj-backend ECR)
  to `af16635` (exists in new dsl-backend/dsl-frontend ECR repos, signed).

## Open issues
1. **Kyverno TLS race condition** — admission controller pod becomes Ready before
   cert manager writes `kyverno-svc.kyverno.svc.kyverno-tls-pair` secret and
   webhook controller registers MutatingWebhookConfiguration. Wait logic now
   checks all three conditions; needs a clean cluster run to validate.
   **Cluster state:** kyverno namespace deleted, all MutatingWebhookConfigurations
   deleted manually. Ready for fresh deploy-lab.yml with terraform checked.
2. **ALBC vpcId pin** — hop_limit=1 prevents IMDS auto-discovery. Preferred fix:
   cluster-info ConfigMap from Terraform VPC output.
7. **ALB allowlist /32** — `bin/whitelist-me.sh` reduces toil.
10. **Kyverno enforcement** — policy in place, needs successful deploy to validate.

## Next actions — start of next session
1. **Run deploy-lab.yml with terraform checked** — fresh cluster, clean Kyverno
   install, validate admission policy end-to-end (signed image passes, unsigned
   image rejected).
2. **NetworkPolicies + PSS** on the `dsl` namespace.
3. **Node-group hop-limit fix** — cluster-info ConfigMap, drop vpcId pin.
4. **Enterprise platform track** — Kong, Istio mTLS, CloudFront + WAF.
   Decision pending: build new microservices app or use reference workload
   (Google Online Boutique / Weaveworks Sock Shop).

## Lab state
**Destroyed.** 61 resources destroyed via stoplab.sh.
infra-base intact: ECR repos `dsl-backend`/`dsl-frontend` with signed images,
SM entries, ACM cert, Route 53 zone. Next spin-up has working images in ECR.

## Key paths
- Kyverno policy: `k8s/kyverno/clusterpolicy-image-verify.yaml`
- Phase docs: `PHASE2.md`, `PHASE3B3.md`
- Manifests: `k8s/{backend,frontend,db,eso}/`, `k8s/ingress.yaml`
- Helm values: `helm/{alb-controller,external-secrets}/values.yaml`
- IaC: `terraform/infra-lab/`, `terraform/infra-base/`
- Pipeline: `.github/workflows/security-pipeline.yml`, `deploy-lab.yml`
- Attestation schema: `.github/attestations/vuln-signoff.schema.json`

## AWS / cluster identifiers
- Account `510151297987`, region `ap-southeast-2`
- EKS cluster `dsl-eks` (v1.35, AL2023) — **UP**
- ECR: `510151297987.dkr.ecr.ap-southeast-2.amazonaws.com/dsl-{backend,frontend}`
- Current image SHA: `af16635` (signed, in ECR + GHCR)
- IRSA: `dsl-eks-eso-role`, `dsl-backend-sa` (names on next spin-up)
- Secrets: `sqlinj/backend/db-password`, `sqlinj/backend/jwt-secret` (SM rename pending)
- Entra: tenant `487f7bd9-…`, SPA `a6960366-…`, API `af63b7cb-…` (v2 tokens)
- Lab URL: `https://lab.oznetsecure.com.au`
