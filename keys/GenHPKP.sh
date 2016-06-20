#!/bin/sh

#
# Generate Public Key Pinning hashes
#
# ./GenHPKP-unix _.evl.uic.edu-ca.crt 127.0.0.1-ca.crt
#

file1=$1
file2=$2

openssl x509 -in "$file1" -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64 -out pin1.sha256

openssl x509 -in "$file2" -pubkey -noout | openssl rsa -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64 -out pin2.sha256

