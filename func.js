const { exec } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

module.exports.execute = function (data, callback) {
  return new Promise((resolve, reject) => {
    const type = data.type;
    if (type == 'shell') {
      executeShell(data, resolve, reject);
    } else if (type == 'download') {
      executeDownload(data, resolve, reject);
    } else if (type == 'sha256') {
      executeSha256(data, resolve, reject);
    } else if (type == 'remove') {
      executeRemove(data, resolve, reject);
    } else {
      resolve(null);
    }
  });
};

function executeShell(data, resolve, reject) {
  const command = data.command;
  const shell = data.shell || undefined;
  if (command) {
    exec(command, { shell: shell }, (error, stdout, stderr) => {
      if (error) {
        resolve({
          error: 'execute error',
          message: error.message,
        });
      } else if (stderr) {
        resolve({
          error: 'stderr',
          message: stderr,
        });
      } else {
        resolve(stdout);
      }
    });
  } else {
    resolve({
      error: 'no command',
    });
  }
}

function executeDownload(data, resolve, reject) {
  const fileName = data.fileName;
  const fileUrl = data.fileUrl;
  if (fileName && fileUrl) {
    const file = fs.createWriteStream(fileName);
    https
      .get(fileUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve({
            status: 'success',
          });
        });
      })
      .on('error', (err) => {
        fs.unlink(fileName, () => {});
        resolve({
          status: 'error',
          message: err.message,
        });
      });
    file.on('error', (err) => {
      fs.unlink(fileName, () => {});
      resolve({
        status: 'error',
        message: err.message,
      });
    });
  } else {
    resolve({
      status: 'error',
      message: 'Invalid file name or url',
    });
  }
}

function executeSha256(data, resolve, reject) {
  const filePath = data.filePath;
  if (filePath) {
    const sha256 = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (data) => {
      sha256.update(data);
    });
    stream.on('end', () => {
      const hash = sha256.digest('hex');
      resolve(hash);
    });
    stream.on('error', (err) => {
      resolve(null);
    });
  } else {
    resolve(null);
  }
}

function executeRemove(data, resolve, reject) {
  const filePath = data.filePath;
  if (filePath) {
    fs.unlink(filePath, (err) => {
      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  } else {
    resolve(false);
  }
}
