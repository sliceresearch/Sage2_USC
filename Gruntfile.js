module.exports = function(grunt) {
	// Init
	grunt.initConfig({
		// ESLINT
		eslint: {
			options: {
			},
			nodeFiles: {
				files: {
					src: ['server.js', 'src/*.js']
				},
				options: { config: "build/.eslintrc" }
			},
			browserFiles: {
				files: {
					src: ['public/src/*.js', 'public/admin/*.js']
				},
				options: { config: "build/.eslint_client_rc" }
			}
		}
	});

	// Load the dependencies
	grunt.loadNpmTasks('eslint-grunt');
	
	// this would be run by typing "grunt test" on the command line
	grunt.registerTask('lint', ['eslint']);

	// the default task can be run just by typing "grunt" on the command line
	grunt.registerTask('default', ['eslint']);
};

