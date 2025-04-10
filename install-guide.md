# NeoLearn Platform Installation Guide

This document provides comprehensive instructions for setting up the NeoLearn online learning platform on your server. Follow these steps to get your instance up and running.

## System Requirements

### Minimum Hardware Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB (8GB+ recommended)
- **Storage**: 20GB (SSD recommended)
- **Bandwidth**: Depends on expected traffic and content size

### Software Requirements
- **Operating System**: Ubuntu 20.04 LTS or newer
- **Web Server**: Nginx 1.18+ or Apache 2.4+
- **Database**: MySQL 8.0+ or MariaDB 10.5+
- **PHP**: Version 7.4+ with required extensions
- **Node.js**: Version 14+ for backend services
- **npm**: Version 6+ for package management

## Installation Steps

### 1. Set Up Server Environment

#### Install Dependencies on Ubuntu
```bash
# Update package lists
sudo apt update
sudo apt upgrade -y

# Install MySQL/MariaDB
sudo apt install mariadb-server -y

# Install Node.js and npm
curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install nodejs -y

# Install Nginx
sudo apt install nginx -y

# Install PHP and required extensions
sudo apt install php-fpm php-mysql php-mbstring php-xml php-curl php-zip php-gd -y

# Install Git
sudo apt install git -y
```

### 2. Secure MySQL Installation
```bash
sudo mysql_secure_installation
```
Follow the prompts to set up a root password and secure your MySQL installation.

### 3. Create Database and User
```bash
sudo mysql -u root -p
```

Once logged in to MySQL, create a database and user:
```sql
CREATE DATABASE neolearn;
CREATE USER 'neolearn_user'@'localhost' IDENTIFIED BY 'your_strong_password';
GRANT ALL PRIVILEGES ON neolearn.* TO 'neolearn_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### 4. Clone the Repository
```bash
cd /var/www
sudo git clone https://github.com/your-org/neolearn.git
cd neolearn
```

### 5. Set Up Backend
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit the `.env` file with your configuration:
```
DB_HOST=localhost
DB_USER=neolearn_user
DB_PASSWORD=your_strong_password
DB_NAME=neolearn
JWT_SECRET=your_random_secret_key
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_email@example.com
MAIL_PASS=your_mail_password
```

### 6. Import Database Schema
```bash
mysql -u neolearn_user -p neolearn < database/schema.sql
```

### 7. Set Up Web Server

#### For Nginx:
Create a new configuration file:
```bash
sudo nano /etc/nginx/sites-available/neolearn
```

Add the following configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/neolearn/public;
    index index.html index.php;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/var/run/php/php7.4-fpm.sock;
    }

    location ~ /\.ht {
        deny all;
    }

    location /uploads {
        # Increase body size limit for file uploads
        client_max_body_size 100M;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/neolearn /etc/nginx/sites-enabled/
sudo nginx -t  # Test the configuration
sudo systemctl restart nginx
```

### 8. Set Directory Permissions
```bash
sudo chown -R www-data:www-data /var/www/neolearn
sudo chmod -R 755 /var/www/neolearn/public
sudo chmod -R 755 /var/www/neolearn/uploads
```

### 9. Start the Backend Server
```bash
cd /var/www/neolearn
npm run build
npm run start
```

For production, it's recommended to use PM2:
```bash
sudo npm install -g pm2
pm2 start server.js --name neolearn
pm2 startup
pm2 save
```

### 10. Set Up SSL (Recommended)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain and install certificate
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

## Post-Installation Configuration

### 1. Create Admin Account
```bash
node scripts/create-admin.js
```

Follow the prompts to create your administrator account.

### 2. Configure Email Settings
Update the email settings in the `.env` file to enable notifications and password resets.

### 3. Customize Platform Settings
1. Log in with your admin account
2. Navigate to **Admin Dashboard > Platform Settings**
3. Configure:
   - Platform name
   - Site description
   - Theme settings
   - Default language
   - File upload limits
   - Registration options

### 4. Configure Storage
By default, files are stored locally. For better scalability, configure cloud storage:

Edit `.env` file:
```
STORAGE_DRIVER=s3  # Options: local, s3, azure
S3_KEY=your_key
S3_SECRET=your_secret
S3_BUCKET=your_bucket
S3_REGION=your_region
```

### 5. Set Up Backup System
Create a daily backup script:
```bash
nano /etc/cron.daily/neolearn-backup
```

Add the following:
```bash
#!/bin/bash
DATE=$(date +"%Y-%m-%d")
BACKUP_DIR="/var/backups/neolearn"

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u neolearn_user -p'your_strong_password' neolearn > $BACKUP_DIR/neolearn-db-$DATE.sql

# Files backup
tar -czf $BACKUP_DIR/neolearn-files-$DATE.tar.gz /var/www/neolearn/uploads

# Clean up old backups (keep last 7 days)
find $BACKUP_DIR -name "neolearn-*" -type f -mtime +7 -delete
```

Make the script executable:
```bash
sudo chmod +x /etc/cron.daily/neolearn-backup
```

## Updating the Platform

To update to a newer version:

```bash
cd /var/www/neolearn
sudo git pull origin main
npm install
npm run build
sudo systemctl restart nginx
pm2 restart neolearn
```

## Troubleshooting

### Database Connection Issues
- Check database credentials in `.env` file
- Ensure MySQL is running: `sudo systemctl status mysql`
- Test connection: `mysql -u neolearn_user -p neolearn`

### Web Server Issues
- Check Nginx status: `sudo systemctl status nginx`
- Check error logs: `sudo tail -f /var/log/nginx/error.log`
- Verify permissions on files and directories

### Backend Server Issues
- Check PM2 status: `pm2 status`
- Check logs: `pm2 logs neolearn`
- Verify Node.js version: `node -v`

### File Upload Problems
- Check directory permissions for `/var/www/neolearn/uploads`
- Verify file size limits in Nginx configuration
- Check PHP configuration for upload limits in `php.ini`

## Performance Optimization

### 1. Enable Caching
```bash
# Install Redis
sudo apt install redis-server -y

# Configure NeoLearn to use Redis
echo "CACHE_DRIVER=redis" >> .env
echo "REDIS_HOST=127.0.0.1" >> .env
echo "REDIS_PORT=6379" >> .env
```

### 2. Optimize MySQL
Edit `/etc/mysql/mariadb.conf.d/50-server.cnf` with optimized settings:
```
innodb_buffer_pool_size = 1G  # Adjust based on available RAM
innodb_log_file_size = 256M
innodb_flush_method = O_DIRECT
```

### 3. Set Up a CDN (Optional)
For better content delivery, consider setting up a CDN for static assets:
1. Create an account with a CDN provider (Cloudflare, AWS CloudFront, etc.)
2. Configure your domain with the CDN
3. Update the `.env` file:
```
ASSET_URL=https://cdn.your-domain.com
```

## Security Recommendations

### 1. Enable Firewall
```bash
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Regular Updates
Set up automatic security updates:
```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure unattended-upgrades
```

### 3. Regular Backups
Ensure your backup script is running correctly and consider sending backups to an offsite location.

### 4. Security Headers
Add security headers to your Nginx configuration:
```nginx
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header X-XSS-Protection "1; mode=block";
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;";
```

## Conclusion

Your NeoLearn platform should now be up and running. For additional support, please refer to the full documentation at [https://docs.neolearn.com](https://docs.neolearn.com) or contact our support team.

Remember to regularly update your platform to benefit from the latest features and security patches.
