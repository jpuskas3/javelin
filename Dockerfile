# Use Python 3.9 slim as base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Copy the application code
COPY . /app/

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Nginx
RUN apt update && apt install -y nginx && rm -rf /var/lib/apt/lists/*

# Fix permissions for Nginx
RUN mkdir -p /run/nginx && chown -R www-data:www-data /run/nginx

# Copy Nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose both ports (80 for Nginx, 5000 for Flask)
EXPOSE 80 5000

# Start both Nginx and Gunicorn services
CMD ["bash", "-c", "service nginx start && gunicorn -w 4 -b 0.0.0.0:5000 app:app"]
