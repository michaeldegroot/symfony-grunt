# symfony-grunt
_Solving the link between replacing Symfony assets with grunt tasks._

![](https://img.shields.io/badge/Project%20status-In%20Development-red.svg)
![](https://img.shields.io/badge/Stability-Kinda%20Works%20Bro-yellow.svg)
![](https://img.shields.io/badge/Production%20Ready-Hell%20No-red.svg)

## Zero configuration
You can choose to not configure anything, symfony-grunt will create all your assets from your current Symfony bundles.

## Fast
Executing many tasks in parallel.

## Watcher & Livereload
Watches your Symfony bundle files (CSS, PHP, YML, JS, Twig) for file changes and if livereload was enabled then your browser would automatically refresh on those file changes.

## Automatic linting
Every time you want to execute a task with symfony-grunt all of your project files will be linted. This includes: CSS, PHP, YML, JS, Twig

## Handling assets like a boss
##### before every mode:
 - Lint PHP, CSS, JS, YML, Twig
 - Generate a new version control number

##### In developer mode:
 - Concat's JS and CSS
 - Rewrites in CSS files the paths to absolute path
 - Copies all generated files to the web/bundles/ folder
 - Replace all <symfony-grunt-css> and <symfony-grunt-js> tags with the JS and CSS file respectively
 - Use the generated version control number in the query of the filename (cache buster)
 - Watches for changes and if a change is detected repeat the process

##### In production mode:
_Does the same thing as in developer mode except enabling the watcher_
 - Minifies JS and CSS
 - Removes console.log's etc

# Installation
So you want to replace your current Symfony asset work-flow without too much hassle?

##### 1. Go to your symfony project
`cd my/epic/symfonyproject`

##### 2. Create or go to the resources folder
`mkdir resources`

__AND/OR__

`cd resources`

##### 3. Clone the fun!
`git clone git@github.com:michaeldegroot/symfony-grunt.git`

##### 4. Check out the sweet commands
`cd symfony-grunt && grunt`

_The grunt command will launch the GruntFile.js and show you all the available commands_


# Configuration
__Configuration is not needed, but can be specified if need be__

A settings.json is location in this projects root. You can edit is as you wish

```js
{
	"website": {
		// Your website root
		"root": "http://symfony-grunt.dev"
	},
	// Uglify settings: https://github.com/gruntjs/grunt-contrib-uglify
	"uglify": {
        "compress": {
            "drop_console": true,
            "pure_funcs":   ["console.log"],
            "dead_code":    true,
            "unused":       true
        }
    },
    // Put in commands here you would like to execute with 'grunt exec:commandhere'
	"exec": {
	    "gruntcommandhere": "shell execute command here",
	},
	// What files to process
	"glob": {
		"images":     true, // Minify and process images
		"js":         true,
		"css":        true,
		"php":        true, // Lint php files
		"yaml":       true, // Lint yml files
		"twig":       true, // Recommended to stay to true for the replace functions
		"browserify": true  // If you want to webpack your js files and use that sexy ES6
	}
}
```
