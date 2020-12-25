#!/bin/sh

if [ $# -ne 1 ]; then
  echo "指定された引数は$#個です。" 1>&2
  echo "実行するには1個の引数が必要です。" 1>&2
  exit 1
fi

appName=$1
echo "appname=$1" 
cd /usr/src/
npx degit sveltejs/template ${appName}
cd ${appName}
node scripts/setupTypeScript.js
cd ..
cp -f -r ${appName}/* /usr/src/app
cp -f -r ${appName}/node_modules/*  /usr/src/app/node_modules