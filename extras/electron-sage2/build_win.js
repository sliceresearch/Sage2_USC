// SAGE2 is available for use under the SAGE2 Software License
//
// University of Illinois at Chicago's Electronic Visualization Laboratory (EVL)
// and University of Hawai'i at Manoa's Laboratory for Advanced Visualization
// and Applications (LAVA)
//
// See full text, terms and conditions in the LICENSE.txt included file
//
// Copyright (c) 2017

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
