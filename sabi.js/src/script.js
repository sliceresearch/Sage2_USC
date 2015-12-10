// Copyright 2012 Luc Renambot, University of Illinois at Chicago.
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

/*jslint node: true */

// To launch command
var path = require('path');
var exec = require('child_process').exec;

// Blocking exec function
//var exec  = require('exec-sync');

// To lauch the scripts
var spawn = require('child_process').spawn;


exports.Command = function (cmd, socket) {
	var child;
	child = exec(cmd, function (error, stdout, stderr) {
		console.log('stdout: ' + stdout);
		console.log('stderr: ' + stderr);
		if (error !== null) {
			console.log('Command> exec error: ' + error);
		}
	});
};

exports.Script = function (file, socket) {

    output = "";
    file = path.normalize(file); // convert Unix notation to windows
    console.log('Launching script ', file);

    proc = spawn(file, []);

	//try {
		//exec(file);
	//} catch (err) {
		//console.log("Error:", err)
	//}

    proc.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
            output = output + data;
    });
    proc.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
    });
    proc.on('exit', function (code) {
        console.log('child process exited with code ' + code);
        if (socket) socket.emit('return', {status: true, stdout: output});
    });

};

exports.Script2 = function (file) {

    output = "";
    console.log('Launching script ' + file);
    proc = spawn(file, []);

    proc.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
        output = output + data;
    });
    proc.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    proc.on('exit', function (code) {
        console.log('child process exited with code ' + code);
    });

};

