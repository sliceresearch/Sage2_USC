

REM git archive --format=tar --remote=ssh://git@bitbucket.org:renambot/sage2/sage2.git --prefix=sage2/ --output="sage2.tar" master

tar xvf sage2.tar

cd sage2
jx install

cd ..
cp scripts/win/* sage2/
REM unzip -u -d sage2 mac-bin.zip 

cd sage2
jx package server.js sage2 -native -slim GO-scripts,extras,public_HTTP,public_HTTPS,keys,config,build,local
cd ..
rm -fr sage2/doc sage2/extras sage2/GO-scripts sage2/node_modules sage2/package.json sage2/server.js sage2/src sage2/build
REM mv sage2 SAGE2

REM zip -r -9 SAGE2-win.zip SAGE2
