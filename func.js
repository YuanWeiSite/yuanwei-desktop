const { exec } = require('child_process');
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');
const path = require('path');

module.exports.execute = function (data, callback) {
  return new Promise((resolve, reject) => {
    const type = data.type;
    if (type == 'shell') {
      executeShell(data, resolve, reject);
    } else if (type == 'download') {
      executeDownload(data, resolve, reject, callback);
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

function executeDownload(data, resolve, reject, callback) {
  resolve(null);
  const fileName = data.fileName;
  const fileUrl = data.fileUrl;
  if (fileName && fileUrl) {
    const file = fs.createWriteStream(fileName);
    https
      .get(fileUrl, (response) => {
        let downloaded = 0;
        const total = response.headers['content-length'];

        response.on('data', (chunk) => {
          downloaded += chunk.length;
          const progress = (downloaded / total) * 100;
          callback({
            status: 'progress',
            progress: progress.toFixed(2),
          });
        });

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          callback({
            status: 'success',
          });
        });
      })
      .on('error', (err) => {
        fs.unlink(fileName, () => {});
        callback({
          status: 'error',
          message: err.message,
        });
      });
    file.on('error', (err) => {
      fs.unlink(fileName, () => {});
      callback({
        status: 'error',
        message: err.message,
      });
    });
  } else {
    callback({
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
    fs.stat(filePath, (err, stats) => {
      if (err) {
        resolve(false);
      } else if (stats.isFile()) {
        fs.unlink(filePath, (err) => {
          if (err) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      } else if (stats.isDirectory()) {
        fs.readdir(filePath, (err, files) => {
          if (err) {
            resolve(false);
          } else {
            if (files.length === 0) {
              fs.rmdir(filePath, (err) => {
                if (err) {
                  resolve(false);
                } else {
                  resolve(true);
                }
              });
            } else {
              let count = files.length;
              files.forEach((file) => {
                const fullPath = path.join(filePath, file);
                executeRemove(
                  { filePath: fullPath },
                  () => {
                    count--;
                    if (count === 0) {
                      fs.rmdir(filePath, (err) => {
                        if (err) {
                          resolve(false);
                        } else {
                          resolve(true);
                        }
                      });
                    }
                  },
                  reject,
                );
              });
            }
          }
        });
      } else {
        resolve(false);
      }
    });
  } else {
    resolve(false);
  }
}
