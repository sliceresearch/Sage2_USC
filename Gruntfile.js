var fs   = require('fs');
var path = require('path');

module.exports = function(grunt) {
	// Init
	grunt.initConfig({
		// ESLINT
		eslint: {
			options: {
			},
			nodeFiles: {
				files: {
					src: [
						"server.js",
						"webconStartServer.js",
						"src/*.js",
						"public/uploads/apps/welcome/plugin.js",
						"public/uploads/apps/tweetcloud2/plugin.js",
						]
				},
				options: { config: "build/.eslintrc" }
			},
			browserFiles: {
				files: {
					src: ['public/src/*.js', 'public/admin/*.js']
				},
				options: { config: "build/.eslint_client_rc" }
			},
			appsFiles: {
				files: {
					src: [
						"public/uploads/apps/UIC_crime_with_leaflet/leaflet.js",
						"public/uploads/apps/US_weather/USweather.js",
						"public/uploads/apps/car_threejs/car_threejs.js",
						"public/uploads/apps/chronicles_of_spaceman_spiff/chronicles_of_spaceman_spiff.js",
						"public/uploads/apps/clock_svg/clock_svg.js",
						"public/uploads/apps/flow/flow.js",
						"public/uploads/apps/flow/shared.js",
						"public/uploads/apps/googlemaps/googlemaps.js",
						"public/uploads/apps/notepad/notepad.js",
						"public/uploads/apps/photos/photos.js",
						"public/uploads/apps/photos/photo_scrapbooks.js",
						"public/uploads/apps/radar/radar.js",
						"public/uploads/apps/stereo_image/stereo_image.js",
						"public/uploads/apps/sticky_note/sticky_note.js",
						"public/uploads/apps/web_earth/web_earth.js",
						"public/uploads/apps/welcome/welcome.js",
						"public/uploads/apps/zoom/zoom.js"
					]
				},
				options: { config: "build/.eslint_client_rc" }
			}
		},
		jscs: {
			serverFiles: {
				src: [
					"server.js",
					"webconStartServer.js",
					"src/*.js",
					"public/uploads/apps/welcome/plugin.js",
					"public/uploads/apps/tweetcloud2/plugin.js",
					],
				options: { config: "build/jscs_server.json" }
			},
			browserFiles: {
				src: ['public/src/*.js', 'public/admin/*.js'],
				options: { config: "build/jscs_sage2.json" }
			},
			appsFiles: {
				src: [ 
					"public/uploads/apps/UIC_crime_with_leaflet/leaflet.js",
					"public/uploads/apps/US_weather/USweather.js",
					"public/uploads/apps/car_threejs/car_threejs.js",
					"public/uploads/apps/chronicles_of_spaceman_spiff/chronicles_of_spaceman_spiff.js",
					"public/uploads/apps/clock_svg/clock_svg.js",
					"public/uploads/apps/flow/flow.js",
					"public/uploads/apps/flow/shared.js",
					"public/uploads/apps/googlemaps/googlemaps.js",
					"public/uploads/apps/notepad/notepad.js",
					"public/uploads/apps/photos/photos.js",
					"public/uploads/apps/photos/photo_scrapbooks.js",
					"public/uploads/apps/radar/radar.js",
					"public/uploads/apps/stereo_image/stereo_image.js",
					"public/uploads/apps/sticky_note/sticky_note.js",
					"public/uploads/apps/web_earth/web_earth.js",
					"public/uploads/apps/welcome/welcome.js",
					"public/uploads/apps/zoom/zoom.js"
				],
				options: { config: "build/jscs_sage2.json" }
			}
		},
		yuidoc: {
			options: {
				quiet: true
			},
			compile: {
				name: 'SAGE2',
				description: 'A New Approach for Data Intensive Collaboration Using Scalable Resolution Shared Displays',
				version: '1.0.0',
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
				report: 'min',
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
				}	}
		},
		// prompt questions when generating a new application: 'genapp' task
		prompt: {
			genapp: {
				options: {
					questions: [
					{ config: 'appname',   type: 'input', message: 'Application name' },
					{ config: 'firstname', type: 'input', message: 'Author first name' },
					{ config: 'lastname',  type: 'input', message: 'Author last name' },
					{ config: 'email',     type: 'input', message: 'Author email' }
					]
				}
			}
		},
		mochacli: {
			options: {
				bail: true
			},
			all: ['test/*.js']
		}
	});

	// Load the dependencies
	grunt.loadNpmTasks('grunt-eslint');
	grunt.loadNpmTasks('grunt-contrib-yuidoc');
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-mocha-cli');
	grunt.loadNpmTasks('grunt-prompt');
	grunt.loadNpmTasks('grunt-jscs');

	// this would be run by typing "grunt test" on the command line
	grunt.registerTask('all', ['eslint', 'jscs', 'yuidoc', 'uglify', 'mochacli']);

	// the default task can be run just by typing "grunt" on the command line
	grunt.registerTask('default', ['eslint']);

	// Build a SAGE2 app folder and such (do not call directly, see 'newapp' task)
	grunt.registerTask('genapp', 'Generate a SAGE2 app skeleton', function() {
		// it's async task
		var done     = this.async();
		// get the name from the prompt
		var appname  = grunt.config("appname");
		// use ir or get the name from command line
		var newapp   = appname || grunt.option('name');
		// calculate new paths
		var appdir   = path.join(__dirname, "public", "uploads", "apps", newapp);
		var templdir = path.join(__dirname, "doc", "templates");
		// create the application folder
		fs.mkdirSync(appdir);
		// read the instructions, and put the name in
		fs.readFile(path.join(templdir, "instructions.json"), 'utf8', function (err,data) {
			// substitute APPNAME for the new app name
			var result = data.replace(/APPNAME/g, newapp);
			result = result.replace(/FIRSTNAME/g, grunt.config("firstname"));
			result = result.replace(/LASTNAME/g,  grunt.config("lastname"));
			result = result.replace(/EMAIL/g,     grunt.config("email"));
			// write the resulting content
			fs.writeFileSync(path.join(appdir, "instructions.json"), result, 'utf8');
			// Read the template code
			fs.readFile(path.join(templdir, "sage2.js"), 'utf8', function (err2,data2) {
				// substitute APPNAME for the new app name
				var result2 = data2.replace(/APPNAME/g, newapp);
				result2 = result2.replace(/FIRSTNAME/g, grunt.config("firstname"));
				result2 = result2.replace(/LASTNAME/g,  grunt.config("lastname"));
				result2 = result2.replace(/EMAIL/g,     grunt.config("email"));
				// write the resulting content
				fs.writeFileSync(path.join(appdir, newapp+".js"), result2, 'utf8');
				// Copy the icon
				fs.writeFileSync(path.join(appdir, newapp+".png"), fs.readFileSync(path.join(templdir, "sage2.png")));
				// We are done
				grunt.log.write('New application done: ', newapp, 'in', appdir);
				done();
			});
		});
	});
	// build a new app with questions
	grunt.registerTask('newapp', ['prompt:genapp', 'genapp']);
};

