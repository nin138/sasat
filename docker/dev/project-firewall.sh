#!/bin/bash
set -euo pipefail
IFS=$'\n\t'

# Run by /usr/local/bin/entrypoint.sh as root on container start. The container
# needs NET_ADMIN and NET_RAW (granted in docker-compose.yml) for iptables and
# ipset to work.

# Docker's embedded DNS (127.0.0.11:53) works through DNAT rules that dockerd
# installs in this container's nat table. Flushing the nat table without
# restoring them breaks all name resolution for the container's lifetime.
echo "Preserving Docker embedded DNS rules..."
docker_dns_rules=$(iptables-save -t nat | grep '127\.0\.0\.11' || true)

echo "Flushing existing firewall rules..."
iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X
ipset destroy allowed-domains 2>/dev/null || true

if [ -n "$docker_dns_rules" ]; then
  echo "Restoring Docker embedded DNS rules..."
  iptables -t nat -N DOCKER_OUTPUT 2>/dev/null || true
  iptables -t nat -N DOCKER_POSTROUTING 2>/dev/null || true
  echo "$docker_dns_rules" | xargs -L 1 iptables -t nat
fi

# Allow loopback and DNS before any restriction is applied
iptables -A OUTPUT -o lo -j ACCEPT
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -p udp --dport 53 -j ACCEPT
iptables -A OUTPUT -p tcp --dport 53 -j ACCEPT
iptables -A INPUT -p udp --sport 53 -j ACCEPT

ipset create allowed-domains hash:net

add_domain() {
  local domain="$1"
  local ips
  ips=$(dig +short A "$domain" | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$' || true)
  if [ -z "$ips" ]; then
    echo "WARN: could not resolve $domain" >&2
    return
  fi
  while read -r ip; do
    ipset add allowed-domains "$ip" 2>/dev/null || true
  done <<< "$ips"
}

# GitHub rotates IPs too often for a one-shot dig; use the published ranges.
add_github_ranges() {
  local meta
  if ! meta=$(curl -fsSL --connect-timeout 10 https://api.github.com/meta); then
    return 1
  fi
  echo "$meta" \
    | jq -r '(.web + .api + .git + .pages)[]' \
    | grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+/[0-9]+$' \
    | while read -r range; do
        ipset add allowed-domains "$range" 2>/dev/null || true
      done
}

echo "Resolving Claude Code / Anthropic endpoints..."
for domain in \
  api.anthropic.com \
  claude.ai \
  console.anthropic.com \
  platform.claude.com \
  statsig.anthropic.com \
  statsig.com \
  sentry.io; do
  add_domain "$domain"
done

echo "Resolving package registry endpoints..."
for domain in \
  registry.npmjs.org \
  registry.yarnpkg.com; do
  add_domain "$domain"
done

echo "Resolving Codex / OpenAI endpoints..."
for domain in \
  api.openai.com \
  auth.openai.com \
  chatgpt.com; do
  add_domain "$domain"
done

echo "Adding GitHub IP ranges..."
if ! add_github_ranges; then
  echo "WARN: could not fetch https://api.github.com/meta; falling back to DNS lookups" >&2
  for domain in github.com api.github.com raw.githubusercontent.com codeload.github.com; do
    add_domain "$domain"
  done
fi
add_domain objects.githubusercontent.com

# Internal compose services (db, azurite, ...) get new IPs whenever their
# containers are recreated, so allow the local docker network subnets instead
# of individual addresses.
echo "Allowing local docker network subnets..."
while read -r subnet; do
  iptables -A OUTPUT -d "$subnet" -j ACCEPT
  iptables -A INPUT -s "$subnet" -j ACCEPT
done < <(ip -4 route show scope link | awk '$1 ~ /\// {print $1}')

# Default-deny
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT DROP

iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
iptables -A OUTPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

iptables -A OUTPUT -m set --match-set allowed-domains dst -j ACCEPT

echo "Verifying firewall..."
if ! getent hosts db >/dev/null 2>&1; then
  echo "ERROR: firewall verification failed - cannot resolve internal service 'db'" >&2
  exit 1
fi
if curl --connect-timeout 5 -sS https://example.com >/dev/null 2>&1; then
  echo "ERROR: firewall verification failed - reached https://example.com" >&2
  exit 1
fi
if ! curl --connect-timeout 5 -sS https://api.anthropic.com >/dev/null 2>&1; then
  echo "ERROR: firewall verification failed - cannot reach https://api.anthropic.com" >&2
  exit 1
fi

echo "Firewall initialized."
