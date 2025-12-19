cd /d C:\sc\schart\Angular\mat
rmdir /s /q node_modules 2>nul
del /f /q package-lock.json 2>nul
del /f /q npm-shrinkwrap.json 2>nul
npm cache verify
npm install
