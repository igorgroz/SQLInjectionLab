#!/usr/bin/env bash
# =============================================================================
# whitelist-me.sh — patch the lab ALB ingress allowlist to your current IP
#
# Why this exists:
#   k8s/ingress.yaml has alb.ingress.kubernetes.io/inbound-cidrs pinned to a
#   single residential /32 (open issue #7 in SESSION_STATE). When your ISP
#   rotates that IP — overnight, on a coffee-shop wifi switch, on mobile
#   tether — the lab silently stops responding to you while still serving
#   the new occupant of your old IP. This script:
#
#     1. Detects your current public IP (icanhazip.com → ifconfig.me fallback)
#     2. Reads the current inbound-cidrs from k8s/ingress.yaml
#     3. If it already matches, exits — no churn
#     4. Otherwise: shows the diff, prompts (unless -y), patches the file,
#        kubectl applies, and waits for ALBC to reconcile the SG
#
# Usage:
#   bin/whitelist-me.sh             # interactive
#   bin/whitelist-me.sh -y          # no prompt
#   bin/whitelist-me.sh 1.2.3.4     # explicit IP override (skips detection)
#   bin/whitelist-me.sh 1.2.3.0/24  # explicit CIDR (no /32 munging)
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
INGRESS="${ROOT}/k8s/ingress.yaml"
NS="sqlinj"

YES=false
EXPLICIT=""
for a in "$@"; do
  case "$a" in
    -y|--yes) YES=true ;;
    -h|--help) sed -n '2,/^# =\{20,\}/p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    */[0-9]|*/[0-9][0-9]) EXPLICIT="$a" ;;        # already has /mask
    [0-9]*.[0-9]*.[0-9]*.[0-9]*) EXPLICIT="$a/32" ;;
    *) echo "unrecognised arg: $a" >&2; exit 2 ;;
  esac
done

[[ -f "$INGRESS" ]] || { echo "ingress manifest not found at $INGRESS" >&2; exit 1; }

# 1. Discover current public IP (or use override)
if [[ -n "$EXPLICIT" ]]; then
  NEW_CIDR="$EXPLICIT"
else
  IP="$(curl -fsS --max-time 5 https://icanhazip.com 2>/dev/null \
        || curl -fsS --max-time 5 https://ifconfig.me 2>/dev/null \
        || true)"
  IP="${IP//[$'\r\n ']/}"
  if [[ ! "$IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "could not detect a valid public IPv4 (got: '$IP')" >&2
    echo "pass it explicitly: $0 1.2.3.4" >&2
    exit 1
  fi
  NEW_CIDR="${IP}/32"
fi

# 2. Read current value from the manifest
CURRENT="$(grep -E 'inbound-cidrs:' "$INGRESS" \
           | sed -E 's/.*"([^"]+)".*/\1/' || true)"

if [[ -z "$CURRENT" ]]; then
  echo "no inbound-cidrs annotation found in $INGRESS — bailing." >&2
  exit 1
fi

echo "Current allowlist : ${CURRENT}"
echo "Detected CIDR     : ${NEW_CIDR}"

if [[ "$CURRENT" == "$NEW_CIDR" ]]; then
  echo "Already matches — nothing to do."
  exit 0
fi

# 3. Confirm
if ! $YES; then
  read -r -p "Patch ingress + apply? [y/N] " ans
  [[ "$ans" =~ ^[Yy]$ ]] || { echo "Aborted."; exit 0; }
fi

# 4. Patch and apply (sed in-place, BSD/GNU compatible via .bak then rm)
sed -i.bak -E "s#(inbound-cidrs:\s*\")[^\"]+(\")#\1${NEW_CIDR}\2#" "$INGRESS"
rm -f "${INGRESS}.bak"

echo
echo "Diff:"
git -C "$ROOT" --no-pager diff -- "$INGRESS" || true
echo

kubectl apply -f "$INGRESS"

# 5. Verify ALBC actually wrote the new CIDR into the managed SG
echo
echo "Waiting 10s for ALBC reconcile..."
sleep 10

SG_ID="$(aws elbv2 describe-load-balancers --region ap-southeast-2 \
          --names k8s-sqlinj-sqlinjin-856dc041e7 \
          --query 'LoadBalancers[0].SecurityGroups[0]' --output text 2>/dev/null || true)"

if [[ -n "$SG_ID" && "$SG_ID" != "None" ]]; then
  aws ec2 describe-security-groups --region ap-southeast-2 --group-ids "$SG_ID" \
    --query 'SecurityGroups[0].IpPermissions[].{Port:FromPort,Cidrs:IpRanges[].CidrIp}' \
    --output table
else
  echo "(ALB SG lookup failed — check manually if needed)"
fi

echo
echo "Done. Smoke:"
echo "  curl -sI https://lab.oznetsecure.com.au/health"
