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
		},
		yuidoc: {
			options: {
				quiet: true
			},
			compile: {
				name: 'SAGE2',
				description: 'A New Approach for Data Intensive Collaboration Using Scalable Resolution Shared Displays',
				version: '0.3.0',
				url: 'http://sage2.sagecommons.org',
				options: {
					linkNatives: "true",
					outdir: "./doc/api",
					themedir: "./doc/theme",
					paths: [ "." ],
					exclude: "public/lib,public/uploads,doc,build"
				}
			}
		},
		uglify: {
			options: {
				compress: true,
				report: 'gzip',
				preserveComments: false
			},
			build: {
				files: {
					'public/min/display.min.js':
						[ "public/src/websocket.io.js", "public/src/DynamicImage.js",
						"public/src/Class.js", "public/src/SAGE2_App.js",
						"public/src/SAGE2_BlockStreamingApp.js", "public/src/SAGE2_runtime.js",
						"public/src/image_viewer.js", "public/src/movie_player.js",
						"public/src/pdf_viewer.js", "public/src/media_stream.js",
						"public/src/media_block_stream.js", "public/src/ui_builder.js",
						"public/src/pointer.js", "public/src/SAGE2_WidgetButtonTypes.js",
						"public/src/SAGE2_WidgetControl.js", "public/src/SAGE2_WidgetControlInstance.js",
						"public/src/widgetHelperFunctions.js", "public/src/radialMenu.js",
						"public/src/SAGE2_Display.js" ],
					'public/min/audio.min.js':
						["public/src/websocket.io.js",
						"public/src/SAGE2_runtime.js",
						"public/src/SAGE2_AudioManager.js" ],
					'public/min/ui.min.js':
						[ "public/src/websocket.io.js",
						"public/src/SAGE2_runtime.js",
						"public/src/SAGE2_interaction.js",
						"public/src/SAGE2_DisplayUI.js",
						"public/src/SAGE2_UI.js" ]
				}
			}
		}
	});

	// Load the dependencies
	grunt.loadNpmTasks('eslint-grunt');
	grunt.loadNpmTasks('grunt-contrib-yuidoc');
	grunt.loadNpmTasks('grunt-contrib-uglify');

	// this would be run by typing "grunt test" on the command line
	grunt.registerTask('all', ['eslint', 'yuidoc']);

	// the default task can be run just by typing "grunt" on the command line
	grunt.registerTask('default', ['eslint']);
};

