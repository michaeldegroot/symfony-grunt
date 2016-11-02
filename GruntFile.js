const path = require('path')
const _    = require('lodash')

module.exports = function (grunt) {
    grunt.log.ok('SYMFONY-GRUNT executing...')
    const projectRoot  = path.join(__dirname, '../', '../')
    const gruntRoot    = process.env.PWD
    const files        = {}

    let projectBundles = []
    let isDev          = true
    let settings       = []
    let parameters     = []
    let symfonyVersion = false

    grunt.file.setBase(gruntRoot)

    grunt.task.registerTask('settings', 'Gets the grunt settings file', () => {
        const settingsPath = path.join(gruntRoot, 'settings.json')
        try {
            settings = grunt.file.readJSON(settingsPath)
        } catch (e) {
            grunt.log.error(e.message)
            grunt.fail.warn('Could not process settings.json')
        }

        grunt.log.ok('Found and processed settings.json file')
    })

    grunt.task.registerTask('projectBundles', 'Gets the project bundles path along with namespace', () => {
        grunt.file.recurse(path.join(projectRoot, 'src'), (abspath, rootdir, subdir, filename) => {
            if (subdir) {
                subdir.split(path.sep).forEach(dirpath => {
                    if (dirpath.indexOf('Bundle') >= 1) {
                        projectBundles.push(subdir.split('Bundle')[0] + 'Bundle')
                    }
                })
            }
        })
        projectBundles = _.uniq(projectBundles)

        projectBundles.forEach((bundle, i) => {
            projectBundles[i] = {
                path:      bundle,
                namespace: bundle.split('/').join(''),
                title:     bundle.split('/')[bundle.split('/').length - 1].split('Bundle')[0],
                files:     {},
            }
            grunt.log.ok('Bundle found: ' + bundle)
        })
    })

    grunt.task.registerTask('parameters', 'Gets the parameters.yml file from project root', () => {
        const parametersPath = path.join(projectRoot, 'app', 'config' , 'parameters.yml')
        try {
            parameters = grunt.file.readYAML(parametersPath)
        } catch (e) {
            grunt.log.error(e.message)
            grunt.fail.warn('Could not process parameters.yml')
        }
        grunt.log.ok('Found and processed parameters.yml file')

        if (parameters.parameters.http_host) {
            isDev = parameters['parameters']['http_host'].indexOf('.nl') >= 1
        }

        grunt.log.ok('Developer mode: ' + isDev)
    })

    grunt.task.registerTask('symfonyVersion', 'Gets the current symfony version', () => {
        const composerPath = path.join(projectRoot, 'composer.json')
        try {
            composer = grunt.file.readJSON(composerPath)
        } catch (e) {
            grunt.log.error(e.message)
            grunt.fail.warn('Could not process composer.json')
        }

        symfonyVersion = composer['require']['symfony/symfony'].slice(0,1)
        grunt.log.ok('Found symfony version: ' + composer['require']['symfony/symfony'])
    })

    grunt.task.registerTask('getAssets', 'get all assets from current bundles', function() {
        // Makes sure projectBundles was run!
        this.requires('projectBundles')

        projectBundles.forEach((bundle, i) => {
            grunt.log.ok(bundle.path)

            const options = {
                cwd:    path.join(projectRoot, 'src', bundle.path),
                filter: 'isFile',
            }
            const found = {
                js:    0,
                css:   0,
                php:   0,
                image: 0,
            }
            const jsPatterns = [
                'Resources/public/js/libs/**/*.js',
                'Resources/public/js/custom/**/*.js',
                'Resources/public/js/**/*.js',
            ]
            const cssPatterns = [
                'Resources/public/css/libs/**/*.css',
                'Resources/public/css/custom/**/*.css',
                'Resources/public/css/**/*.css',
            ]
            const phpPatterns = [
                '**/*.php',
            ]
            const imagePatterns = [
                '**/*.png',
                '**/*.gif',
                '**/*.jpg',
                '**/*.jpeg',
                '**/*.tiff',
                '**/*.bmp',
                '**/*.webp',
            ]

            // Find js files
            if (settings.glob.js) {
                projectBundles[i].files.js = []
                grunt.file.expand(options, jsPatterns).forEach(file => {
                    projectBundles[i].files.js.push(file)
                    found.js++
                })
                grunt.log.ok(`${found.js} js files`)
            }

            // Find css files
            if (settings.glob.css) {
                projectBundles[i].files.css = []
                grunt.file.expand(options, cssPatterns).forEach(file => {
                    projectBundles[i].files.css.push(file)
                    found.css++
                })
                grunt.log.ok(`${found.css} css files`)
            }

            // Find php files
            if (settings.glob.php) {
                projectBundles[i].files.php = []
                grunt.file.expand(options, phpPatterns).forEach(file => {
                    projectBundles[i].files.php.push(file)
                    found.php++
                })
                grunt.log.ok(`${found.php} php files`)
            }

            // Find image files
            if (settings.glob.images) {
                projectBundles[i].files.image = []
                grunt.file.expand(options, imagePatterns).forEach(file => {
                    projectBundles[i].files.image.push(file)
                    found.image++
                })
                grunt.log.ok(`${found.image} image files`)
            }
        })
    })

    grunt.task.registerTask('createConcat', 'creates the concat object for grunt config', () => {
        const assetsFolder = path.join('../', '../', 'web', 'assets')

        // JS creation
        projectBundles.forEach(bundle => {
            const toConcat = []

            bundle.files.js.forEach(file => {
                toConcat.push(path.join('../', '../', 'src', bundle.path, file))
            })

            gruntConfig.concat[`${bundle.title.toLowerCase()}_js`] = {
                nonull: true,
                src:    toConcat,
                dest:   path.join(assetsFolder, 'js', `${bundle.title.toLowerCase()}.js`)
            }
        })

        // CSS creation
        projectBundles.forEach(bundle => {
            const toConcat = []

            // Normalize paths
            bundle.files.css.forEach(file => {
                toConcat.push(path.join('../', '../', 'src', bundle.path, file))
            })

            // Create object
            gruntConfig.concat[`${bundle.title.toLowerCase()}_css`] = {
                nonull: true,
                src:    toConcat,
                dest:   path.join(assetsFolder, 'css', `${bundle.title.toLowerCase()}.css`)
            }
        })
    })

    grunt.task.registerTask('createCssmin', 'creates the cssmin object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name = `${bundle.title.toLowerCase()}`
            gruntConfig.cssmin[name] = {
                src:  `<%=concat.${name}_css.dest%>`,
                dest: path.join('../', '../','web','assets','css', `${bundle.title.toLowerCase()}.min.css`)
            }
        })
    })

    grunt.task.registerTask('createUglify', 'creates the uglify object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name       = `${bundle.title.toLowerCase()}`
            const output     = path.join('../', '../', 'web', 'assets', 'js', `/${name}.min.js`)
            gruntConfig.uglify[name] = {
                files: {},
                options: settings.uglify
            }
            gruntConfig.uglify[name]['files'][output] = [`<%=concat.${name}_js.dest%>`]
        })
    })

    grunt.task.registerTask('createExec', 'creates the exec object for grunt config from the settings.json file', () => {
        for (let exec in settings.exec) {
            gruntConfig.exec[exec]            = {}
            gruntConfig.exec[exec]['command'] = settings.exec[exec]
            gruntConfig.exec[exec]['cwd']     = projectRoot
        }
    })

    grunt.task.registerTask('createCssReplace', 'creates the css replace object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name       = `${bundle.title.toLowerCase()}`
            const output     = path.join('../', '../', 'web', 'assets', 'js', `/${name}.rewrite.min.js`)
            gruntConfig.css_url_replace[name] = {
                files: {}
            }
            gruntConfig.css_url_replace[name]['files'][output] = [`<%=concat.${name}_js.dest%>`]
        })
    })

    grunt.task.registerTask('createEntities', 'creates the exec entities command for grunt config', () => {
        projectBundles.forEach(bundle => {
            let cmdPrefix
            if(symfonyVersion >= 3) {
                cmdPrefix = 'php bin/console '
            } else {
                cmdPrefix = 'php app/console '
            }
            const taskName = 'generate_' + bundle.title.toLowerCase()
            gruntConfig.exec[taskName] = {
                command: `${cmdPrefix}doctrine:generate:entities ${bundle.namespace}`,
                cwd:     projectRoot
            }
        })
    })

    grunt.task.registerTask('finish', 'when done with default tasks', () => {
        grunt.log.ok('Everything went ok :)')
        console.log(projectBundles[0].files)
    })

    grunt.task.registerTask('test', 'The test task', function() {
        grunt.task.run('process', 'finish')
    })

    grunt.task.registerTask('default', 'Shows all tasks', function() {
        grunt.task.run('availabletasks')
    })

    gruntConfig = {}

    gruntConfig.concat =  {
        options: {
            stripBanners: true,
        },
    }

    gruntConfig.cssmin = {
        options: {
            keepSpecialComments: 0
        },
    }

    gruntConfig.exec = {}

    gruntConfig.uglify = {}

    gruntConfig.css_url_replace = {
        options: {
            staticRoot: 'web'
        },
    }

    // ?
    gruntConfig.watch = {
        js: {
            files: ['<%=concat.js.src%>', 'web/html/**/*.js'],
            tasks: ['js_frontend'],
            options: {
                spawn: false,
            },
        },
        css: {
            files: ['<%=concat.css.src%>', 'web/html/**/*.css'],
            tasks: ['css_frontend'],
            options: {
                spawn: false,
            },
        },
    }

    gruntConfig.availabletasks =  {
        tasks: {
            options: {
                hideUngrouped: false,
                groups: {
                    'Compose assets': [
                        'process',
                        'js',
                        'css',
                        'uglify',
                        'concat',
                        'cssmin',
                        'css_url_replace',
                    ],
                    'For production': [
                        'prod',
                     ],
                    'For developement': [
                        'dev',
                        'watch',
                        'exec',
                     ],
                    'Internal SYMFONY-GRUNT tasks': [
                        'projectBundles',
                        'settings',
                        'parameters',
                        'symfonyVersion',
                        'getAssets',
                        'finish',
                        'initProcess',
                        'createConcat',
                        'test',
                        'removelogging',
                        'availabletasks',
                        'default',
                        'createUglify',
                        'createCssmin',
                        'createCssReplace',
                        'createEntities',
                        'restoreLog',
                     ]
                }
            }
        }
    }

    grunt.initConfig(gruntConfig)

    grunt.loadNpmTasks('grunt-contrib-concat')
    grunt.loadNpmTasks('grunt-contrib-cssmin')
    grunt.loadNpmTasks('grunt-contrib-uglify')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-exec')
    grunt.loadNpmTasks('grunt-css-url-replace')
    grunt.loadNpmTasks('grunt-available-tasks')
    grunt.loadNpmTasks('grunt-remove-logging')

    grunt.registerTask('process', ['concat', 'cssmin', 'uglify', 'css_url_replace'])
    grunt.registerTask('css', ['concat', 'cssmin'])
    grunt.registerTask('js', ['concat', 'uglify'])
    grunt.registerTask('dev', ['process', 'watch'])
    grunt.registerTask('prod', ['process'])
    grunt.registerTask('initProcess', [
        'settings',
        'parameters',
        'projectBundles',
        'symfonyVersion',
        'getAssets',
        'createConcat',
        'createCssmin',
        'createUglify',
        'createCssReplace',
        'createEntities',
        'createExec',
    ])


    grunt.log.headerCopy = grunt.log.header
    grunt.log.okCopy = grunt.log.ok
    grunt.log.header = function() {}
    grunt.log.ok = function() {}

    grunt.task.registerTask('restoreLog', 'Restores the grunt log object that was destroyed on init', () => {
        grunt.log.header = grunt.log.headerCopy
        grunt.log.ok = grunt.log.okCopy
    })

    // initProcess should be always run before anything else.
    grunt.task.run('initProcess', 'restoreLog')
}
