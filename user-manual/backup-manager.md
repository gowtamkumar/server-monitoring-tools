# 🛡️ System Backup Manager: User Guide

This guide explains how to use the **System Backup Manager** (Boss UI) to secure your VPS data, including application files and databases.

---

## 🌐 0. Local vs. Remote (VPS) Mode

The system is designed to work in two ways depending on your `.env` configuration:

### **Local Mode (`MODE=local`)**
Use this if you have installed this tool **directly on your VPS**. 
- Backups will run on the same machine the server is running on.
- Files are saved to the local `/tmp`.

### **Remote Mode (`MODE=remote`)**
Use this if you are running this tool **on your PC** but want to backup a **remote VPS**.
- You must provide `VPS_HOST`, `VPS_USERNAME`, and `VPS_PASSWORD` in your `.env`.
- The system will connect via SSH and execute the backup commands on the remote server.
- Backups will be saved to the remote server's `/tmp`.

---

## 🚀 Getting Started

1.  Open your **VPS Monitor Dashboard**.
2.  Click on the **Backups** tab (indicated by the Gold Shield icon 🛡️).
3.  You will see two main control center modules: **Inner Client System** and **Database Vault**.

---

## 📂 1. Inner Client System (Files & Folders)

This module allows you to archive your source code, configuration files, or any directory on the server.

### How to use:
- **Source Path**: Enter the absolute or relative path to the folder you want to backup. 
    - *Default:* `.` (represents the project root).
- **Exclude Patterns**: List folders/files you want to skip, separated by commas.
    - *Example:* `node_modules, .git, tmp`
- **Action**: Click **"Initiate Backup"**.

### Outcome:
The system creates a compressed `.tar.gz` file in the server's `/tmp` directory.
- **Naming Pattern:** `backup-client-YYYY-MM-DD-HH-MM-SS.tar.gz`

---

## 🗄️ 2. Database Vault

This module handles secure data dumps for your relational databases.

### Supported Databases:
- **MySQL / MariaDB**
- **Postgres (PostgreSQL)**

### How to use:
1.  **Type**: Select your database engine.
2.  **Host**: Enter the database host (usually `localhost` or `127.0.0.1`).
3.  **Database Name**: Enter the specific database you want to export.
4.  **Credentials**: Enter the database `Username` and `Password`.
5.  **Action**: Click **"Dump Database"**.

### Outcome:
The system executes a `mysqldump` or `pg_dump` and compresses the output.
- **Naming Pattern:** `backup-db-DBNAME-YYYY-MM-DD.sql.gz`

---

## 📺 3. Live Security Console

Located at the bottom of the backup screen, this console provides real-time transparency into the backup process.

- **White Text**: Informational messages.
- **Green Text**: Success confirmation + the path to the backup file.
- **Red Text**: Error alerts (e.g., incorrect path or wrong database password).

---

## 📜 4. Historical Archive Inventory

This table lists all existing backup files found in the server's storage area.
- Use the **Refresh (🔄)** icon to update the list if a new backup was just completed.
- You can see the **Type**, **Path**, and **Name** of every record.

---

## 📧 5. Email Delivery Integration

You can now receive your backup files directly in your inbox.

### How to use:
1.  Check the **"Email Result"** box in either the Client or Database section.
2.  Enter the recipient's email address.
3.  Initiate the backup. Once completed, the system will attach the archive to an email and send it.

### Required Configuration (`.env`):
To enable this, you must configure your SMTP settings:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

> [!NOTE]
> **Remote Mode & Email**: If you are in `remote` mode, the system will automatically download the file from your VPS to the local server temporarily, send the email, and then delete the local copy.

---

## 💡 Best Practices & Tips

> [!IMPORTANT]
> **Storage Location**: By default, backups are stored in `/tmp`. Files in `/tmp` are often deleted on server reboot. Move important backups to a permanent storage directory.

> [!TIP]
> **Exclude node_modules**: Always include `node_modules` in your exclude patterns for Javascript projects to keep backup files small and fast.

> [!WARNING]
> **Security**: Keep your Backup Manager dashboard behind a firewall or use an `API_KEY` in your `.env` file to prevent unauthorized access.
