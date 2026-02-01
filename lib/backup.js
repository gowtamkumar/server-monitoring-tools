const { execCommand } = require('./monitoring');
const fs = require('fs');
const path = require('path');

/**
 * Backup the Client (File System)
 * @param {Object} ssh - SSH connection object
 * @param {string} sourcePath - Path to backup
 * @param {string} destPath - Destination path for the backup file
 */
async function backupClient(ssh, sourcePath, options = {}) {
  try {
    const { destPath = '/tmp', excludes = [] } = options;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-client-${timestamp}.tar.gz`;
    const fullDest = path.join(destPath, filename);

    // Build exclude flags for tar
    let excludeFlags = '';
    if (Array.isArray(excludes) && excludes.length > 0) {
      excludeFlags = excludes.map(pattern => `--exclude='${pattern.trim()}'`).join(' ');
    } else if (typeof excludes === 'string' && excludes.trim()) {
      excludeFlags = excludes.split(',')
        .map(pattern => `--exclude='${pattern.trim()}'`)
        .join(' ');
    }

    // Create tar archive
    const command = `tar ${excludeFlags} -czf ${fullDest} ${sourcePath}`;

    // Execute
    const result = await execCommand(ssh, command);

    if (result.stderr && !result.stderr.includes('dangling symlink')) {
      console.warn('Backup warning:', result.stderr);
    }

    return {
      success: true,
      message: 'Backup created successfully',
      file: fullDest,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Backup Database
 * @param {Object} ssh - SSH connection
 * @param {Object} dbConfig - Database configuration (type, host, user, pass, name)
 */
async function backupDatabase(ssh, dbConfig) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const { type, host, user, password, name } = dbConfig;
    let command = '';
    let filename = '';

    if (type === 'mysql') {
      filename = `backup-db-${name}-${timestamp}.sql.gz`;
      // Use mysqldump
      // Warning: Putting password in command line is insecure in multi-user systems, 
      // but standard for simple scripts. Using config file is better.
      command = `mysqldump -h ${host} -u ${user} -p'${password}' ${name} | gzip > /tmp/${filename}`;
    } else if (type === 'postgres') {
      filename = `backup-db-${name}-${timestamp}.sql.gz`;
      command = `PGPASSWORD='${password}' pg_dump -h ${host} -U ${user} ${name} | gzip > /tmp/${filename}`;
    } else {
      return { success: false, error: 'Unsupported database type' };
    }

    const result = await execCommand(ssh, command);

    if (result.stderr) {
      console.warn('DB Backup warning:', result.stderr);
    }

    return {
      success: true,
      message: 'Database backup created',
      file: `/tmp/${filename}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  backupClient,
  backupDatabase
};
