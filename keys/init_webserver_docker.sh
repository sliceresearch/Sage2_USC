#!/bin/sh

# phony password
password=foobar
server=$1

echo "Start: CA"
openssl genrsa -des3 -out /sage2/keys/ca.key  -passout pass:$password 1024
openssl req -new -key /sage2/keys/ca.key -out /sage2/keys/ca.csr -passin pass:$password -subj "/CN=$server"
openssl x509 -req -days 365 -in /sage2/keys/ca.csr -out /sage2/keys/$server-ca.crt -signkey /sage2/keys/ca.key  -passin pass:$password
echo ""
echo ""

#FQDN - hostname (webserver)
echo "Start Server Certificate"
openssl genrsa -des3 -out /sage2/keys/$server-server.key -passout pass:$password 1024
openssl req -new -key /sage2/keys/$server-server.key -out /sage2/keys/server.csr -passin pass:$password -subj "/CN=$server"
echo ""
echo ""

echo "Copy Server Certificate"
cp /sage2/keys/$server-server.key /sage2/keys/server.key.org
openssl rsa -in /sage2/keys/server.key.org -out /sage2/keys/$server-server.key -passin pass:$password
echo ""
echo ""

echo "Sign Server Certificate"
openssl x509 -req -days 365 -in /sage2/keys/server.csr -signkey /sage2/keys/$server-server.key -out /sage2/keys/$server-server.crt
echo ""
echo ""

echo "Trust Server Certificate - Add to DB"
# list the DB
certutil -d sql:/sage2/.pki/nssdb -L
# delete the previous server key
certutil -d sql:/sage2/.pki/nssdb -D -n $server
# add the new key
certutil -d sql:/sage2/.pki/nssdb -A -t "P,," -n $server -i /sage2/keys/$server-server.crt
# print the DB again
certutil -d sql:/sage2/.pki/nssdb -L
echo ""
echo "Finished"

/bin/rm -f /sage2/keys/server.key.org /sage2/keys/server.csr /sage2/keys/ca.csr /sage2/keys/ca.key


