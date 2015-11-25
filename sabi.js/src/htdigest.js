// Copyright 2012-2015 Luc Renambot, University of Illinois at Chicago.
//    All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are
// met:
//
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above
//       copyright notice, this list of conditions and the following
//       disclaimer in the documentation and/or other materials provided
//       with the distribution.
//     * Neither the name of Google Inc. nor the names of its
//       contributors may be used to endorse or promote products derived
//       from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
// A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
// OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
// SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
// LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
// DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
// THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Contact: Luc Renambot - renambot@gmail.com

var crypto = require('crypto');
var fs     = require('fs');

function md5(str) {
	var hash;
	hash = crypto.createHash('MD5');
	hash.update(str);
	return hash.digest('hex');
}

function encode(passwordFile, realm, username, password) {
	return ("" + username + ":" + realm + ":") +
		md5("" + username + ":" + realm + ":" + password);
}

function encode_pwd(passwordFile, realm, username, password) {
	return ("" + username + ":" + realm + ":" + password);
}

function htdigest(passwordFile, realm, username, pwd) {
	var line, newLines, writeData;
	writeData = encode(passwordFile, realm, username, pwd);
	newLines = [];
	newLines.push(writeData);
	return fs.writeFileSync(passwordFile, (newLines.join("\n")) + "\n", 'UTF-8');
}

function htdigest_save(passwordFile, realm, username, pwd) {
	var line, newLines, writeData;
	writeData = encode_pwd(passwordFile, realm, username, pwd);
	newLines = [];
	newLines.push(writeData);
	return fs.writeFileSync(passwordFile, (newLines.join("\n")) + "\n", 'UTF-8');
}

exports.htdigest      = htdigest;
exports.htdigest_save = htdigest_save;

// 
// API: htdigest(passwordFile, realm, username, pwd
//      htdigest("toto", "sabi", "sage2", "sage2")
//


