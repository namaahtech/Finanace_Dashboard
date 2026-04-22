#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
# Namaah Nexus — Livekit + TURN Server Setup for Oracle Free Tier (Ubuntu 22.04)
# Run as root: sudo bash livekit-setup.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -e

# ── CONFIG — fill these before running ────────────────────────────────────────
DOMAIN="meet.yourdomain.com"          # subdomain pointing to this VM
LIVEKIT_API_KEY="namaah_api_key"      # change to something random
LIVEKIT_API_SECRET="namaah_secret_change_this_to_64_char_random_string"  # min 32 chars
TURN_SECRET="namaah_turn_secret_change_this"
VM_PUBLIC_IP=$(curl -s ifconfig.me)

echo "═══════════════════════════════════════════"
echo " Namaah Nexus — Livekit Setup"
echo " IP: $VM_PUBLIC_IP"
echo " Domain: $DOMAIN"
echo "═══════════════════════════════════════════"

# ── 1. System update ──────────────────────────────────────────────────────────
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget nginx certbot python3-certbot-nginx coturn docker.io docker-compose ufw

# ── 2. Firewall (Oracle also needs Security List rules in console) ─────────────
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 7880/tcp
ufw allow 7881/tcp
ufw allow 7882/udp
ufw allow 3478/tcp
ufw allow 3478/udp
ufw allow 5349/tcp
ufw allow 5349/udp
ufw allow 50000:60000/udp
ufw --force enable

# ── 3. coturn (TURN server) ───────────────────────────────────────────────────
cat > /etc/turnserver.conf << EOF
listening-port=3478
tls-listening-port=5349
listening-ip=$VM_PUBLIC_IP
external-ip=$VM_PUBLIC_IP
relay-ip=$VM_PUBLIC_IP
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=$TURN_SECRET
realm=$DOMAIN
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
pkey=/etc/letsencrypt/live/$DOMAIN/privkey.pem
log-file=/var/log/turnserver.log
no-multicast-peers
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
min-port=50000
max-port=60000
EOF

# ── 4. SSL certificate ────────────────────────────────────────────────────────
# Stop nginx temporarily for cert
systemctl stop nginx 2>/dev/null || true
certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN
systemctl start coturn
systemctl enable coturn

# ── 5. Livekit config ─────────────────────────────────────────────────────────
mkdir -p /opt/livekit
cat > /opt/livekit/livekit.yaml << EOF
port: 7880
rtc:
  tcp_port: 7881
  udp_port: 7882
  use_external_ip: true
  enable_loopback_candidate: false
keys:
  $LIVEKIT_API_KEY: $LIVEKIT_API_SECRET
turn:
  enabled: true
  domain: $DOMAIN
  tls_port: 5349
  udp_port: 3478
  external_tls: true
room:
  empty_timeout: 300
  max_participants: 100
  enable_remote_unmute: true
logging:
  level: info
redis:
  address: ""
EOF

# ── 6. Livekit Docker ─────────────────────────────────────────────────────────
cat > /opt/livekit/docker-compose.yml << EOF
version: "3.8"
services:
  livekit:
    image: livekit/livekit-server:latest
    command: --config /etc/livekit.yaml
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
EOF

cd /opt/livekit && docker-compose up -d

# ── 7. Nginx reverse proxy ────────────────────────────────────────────────────
cat > /etc/nginx/sites-available/livekit << EOF
server {
    listen 80;
    server_name $DOMAIN;
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    # Livekit WebSocket + HTTP
    location / {
        proxy_pass http://localhost:7880;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}
EOF

ln -sf /etc/nginx/sites-available/livekit /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx
systemctl enable nginx

# ── 8. Auto-renew SSL ─────────────────────────────────────────────────────────
echo "0 12 * * * root certbot renew --quiet && systemctl reload nginx && systemctl restart coturn" > /etc/cron.d/certbot-renew

# ── 9. Done ───────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════"
echo " ✓ Livekit running at https://$DOMAIN"
echo " ✓ TURN server running on $VM_PUBLIC_IP:3478"
echo ""
echo " Add to your .env.local:"
echo " LIVEKIT_URL=wss://$DOMAIN"
echo " LIVEKIT_API_KEY=$LIVEKIT_API_KEY"
echo " LIVEKIT_API_SECRET=$LIVEKIT_API_SECRET"
echo " NEXT_PUBLIC_LIVEKIT_URL=wss://$DOMAIN"
echo "═══════════════════════════════════════════"
