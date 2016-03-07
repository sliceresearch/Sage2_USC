@echo off

REM GenHPKP.bat _.evl.uic.edu-ca.crt 127.0.0.1-ca.crt

set file1=%1
set file2=%2

win32\openssl x509 -in %file1% -pubkey -noout > step1
win32\openssl rsa -in step1 -pubin -outform der > step2
win32\openssl dgst -sha256 -binary < step2 > step3
win32\openssl enc -in step3 -base64 -out pin1.sha256
del /Q step*

win32\openssl x509 -in %file2% -pubkey -noout > step1
win32\openssl rsa -in step1 -pubin -outform der > step2
win32\openssl dgst -sha256 -binary < step2 > step3
win32\openssl enc -in step3 -base64 -out pin2.sha256
del /Q step*


