const createWindowsInstaller = require('electron-winstaller').createWindowsInstaller
const path = require('path')

getInstallerConfig()
  .then(createWindowsInstaller)
  .catch((error) => {
    console.error(error.message || error);
    process.exit(1);
});

function getInstallerConfig () {
  console.log('creating windows installer')
  const rootPath = path.join('./')
  const outPath = path.join(rootPath, './')

  return Promise.resolve({
    appDirectory: path.join(outPath, './sage2-ui-win32-x64'),
    authors: 'Luc Renambot',
    noMsi: true,
    outputDirectory: path.join(outPath, 'windows-installer'),
    exe: 'sage2-ui.exe',
    setupExe: 'sage2-ui-Installer.exe',
    setupIcon: path.join(rootPath, 'sage2.ico')
  })
}
