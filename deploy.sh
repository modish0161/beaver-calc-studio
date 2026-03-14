#!/bin/bash
# ============================================================
# BeaverCalc Studio — VPS Deploy Script
# Run this on your Hostinger VPS after uploading the project
# ============================================================
set -e

DOMAIN="beavercalcstudio.com"
EMAIL="admin@beavercalcstudio.com"   # Change to your real email for Let's Encrypt

echo "=== BeaverCalc Studio Deploy ==="

# 1. Check Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "Docker installed. Log out and back in, then re-run this script."
    exit 0
fi

# 2. Copy .env if not present
if [ ! -f .env ]; then
    if [ -f .env.production ]; then
        cp .env.production .env
        echo "!! IMPORTANT: Edit .env and set real passwords/secrets before continuing !!"
        echo "   Run: nano .env"
        exit 1
    else
        echo "No .env or .env.production found. Create .env first."
        exit 1
    fi
fi

# 3. Create certbot dirs
mkdir -p certbot/conf certbot/www

# 4. Initial SSL certificate (first time only)
if [ ! -d "certbot/conf/live/$DOMAIN" ]; then
    echo "=== Getting initial SSL certificate ==="

    # Start nginx temporarily without SSL for ACME challenge
    # Create a temp nginx conf that only serves HTTP
    cat > /tmp/nginx-init.conf << 'INITCONF'
server {
    listen 80;
    server_name beavercalcstudio.com www.beavercalcstudio.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'Setting up SSL...'; add_header Content-Type text/plain; }
}
INITCONF

    # Run temp nginx
    docker run -d --name nginx-init \
        -p 80:80 \
        -v /tmp/nginx-init.conf:/etc/nginx/conf.d/default.conf:ro \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        nginx:1.25-alpine

    # Get certificate
    docker run --rm \
        -v "$(pwd)/certbot/conf:/etc/letsencrypt" \
        -v "$(pwd)/certbot/www:/var/www/certbot" \
        certbot/certbot certonly \
        --webroot --webroot-path=/var/www/certbot \
        --email "$EMAIL" --agree-tos --no-eff-email \
        -d "$DOMAIN" -d "www.$DOMAIN"

    # Clean up temp nginx
    docker stop nginx-init && docker rm nginx-init
    echo "SSL certificate obtained!"
fi

# 5. Build and start everything
echo "=== Building and starting services ==="
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo ""
echo "=== Deployment complete! ==="
echo "Site: https://$DOMAIN"
echo ""
echo "Useful commands:"
echo "  docker compose -f docker-compose.prod.yml logs -f    # View logs"
echo "  docker compose -f docker-compose.prod.yml restart    # Restart all"
echo "  docker compose -f docker-compose.prod.yml down       # Stop all"
