#!/bin/bash
# Simple user data script to set up hello-world server (no Python required)

set -e

echo "Setting up hello-world server..."

# Update system packages
sudo apt-get update -y

# Install socat for simple HTTP server (more reliable than netcat)
sudo apt-get install -y socat

# Create directory for the server script
sudo mkdir -p /opt/hello-world-server
sudo chown ubuntu:ubuntu /opt/hello-world-server

# Create response script (plain text, no UI)
sudo tee /opt/hello-world-server/respond.sh > /dev/null <<'RESPOND_EOF'
#!/bin/bash
# Read request to get client IP (simplified)
read -r request_line
read -r headers

# Extract client IP from headers if available
CLIENT_IP=$(echo "$headers" | grep -i "x-forwarded-for" | cut -d' ' -f2 || echo "unknown")

# Send plain text response
echo -e "HTTP/1.1 200 OK\r"
echo -e "Content-Type: text/plain\r"
echo -e "Connection: close\r"
echo -e "\r"
echo "Hello World"
echo "Your IP: $CLIENT_IP"
RESPOND_EOF

sudo chmod +x /opt/hello-world-server/respond.sh

# Create main server script
sudo tee /opt/hello-world-server/hello-world-server.sh > /dev/null <<'SERVER_EOF'
#!/bin/bash
PORT=80
cd /opt/hello-world-server
socat TCP-LISTEN:$PORT,fork,reuseaddr EXEC:./respond.sh
SERVER_EOF

# Make the script executable
sudo chmod +x /opt/hello-world-server/hello-world-server.sh

# Create a systemd service to run the server
sudo tee /etc/systemd/system/hello-world.service > /dev/null <<'SERVICE_EOF'
[Unit]
Description=Hello World HTTP Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/hello-world-server
ExecStart=/bin/bash /opt/hello-world-server/hello-world-server.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable hello-world.service
sudo systemctl start hello-world.service

echo "Hello World server setup complete!"
echo "Server is running on port 80"
