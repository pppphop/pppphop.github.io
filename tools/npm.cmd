@echo off
set "BLOG_ROOT=%~dp0.."
node "%BLOG_ROOT%\node_modules\npm\bin\npm-cli.js" %*
