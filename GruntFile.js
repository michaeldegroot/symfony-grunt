const path   = require('path')
const _      = require('lodash')
const fs     = require('fs')
const rmdirp = require('rmdirp')

// The tasks that need to be run before the start of any other task.
const initProcesses = [
    'settings',
    'parameters',
    'projectBundles',
    'symfonyVersion',
    'getAssets',
    'createConcat',         // Should be before css, js!
    'createCssmin',
    'createCssReplace',
    'createEntities',
    'createImage',
    'createBrowserify',
    'createUglify',         // Should be after browserify!
    'createEsLint',
    'createPhpLint',
    'createYamlLint',
    'createWatch',
    'createReplace',        // Should be after css, js!
    'createExec',
    'createCopy'            // Should be last!
]

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

    // Re-generate folder
    rmdirp('generated', () => {})

    // Generate versioncontrol file if not exists
    if (grunt.file.exists('.versioncontrol') === false) {
        fs.writeFileSync('.versioncontrol', -1)
    }

    // +1 for version control
    let versionControl = fs.readFileSync('.versioncontrol', 'utf8')
    versionControl++
    fs.writeFileSync('.versioncontrol', versionControl)

    // Set grunt base
    grunt.file.setBase(gruntRoot)

    // Makes sure we are dealing with a symfony project
    if (grunt.file.exists(path.join(projectRoot, 'app', 'AppKernel.php')) === false) {
        grunt.fail.warn('Could not locate a symfony project. Make sure your directory structure from your project root folder is: PROJECTROOTDIR/resources/symfony-grunt/GruntFile.js')
    }

    // Get the settings.json file for configuration of the module
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

    // Gets all symfony bundles from current project
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

    // Gets the parameters.yml file from the current project and determines if the ENV is dev
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

    // Check the symfony version
    grunt.task.registerTask('symfonyVersion', 'Gets the current symfony version', () => {
        const composerPath = path.join(projectRoot, 'composer.json')
        try {
            composer = grunt.file.readJSON(composerPath)
        } catch (e) {
            grunt.log.error(e.message)
            grunt.fail.warn('Could not process composer.json')
        }

        symfonyVersion = composer['require']['symfony/symfony'].slice(0, 1)
        grunt.log.ok('Found symfony version: ' + composer['require']['symfony/symfony'])
    })

    // Get all the assets from the found bundles
    grunt.task.registerTask('getAssets', 'get all assets from current bundles', () => {
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
                yaml:  0,
                twig:  0,
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
            const yamlPatterns = [
                '**/*.yml',
            ]
            const twigPatterns = [
                '**/*.html.twig',
            ]

            // Find twig files
            if (settings.glob.twig) {
                projectBundles[i].files.twig = []
                grunt.file.expand(options, twigPatterns).forEach(file => {
                    projectBundles[i].files.twig.push(file)
                    found.twig++
                })
                grunt.log.ok(`${found.twig} twig files`)
            }


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

            // Find yaml files
            if (settings.glob.yaml) {
                projectBundles[i].files.yaml = []
                grunt.file.expand(options, yamlPatterns).forEach(file => {
                    projectBundles[i].files.yaml.push(file)
                    found.yaml++
                })
                grunt.log.ok(`${found.yaml} yaml files`)
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
        // JS creation
        projectBundles.forEach(bundle => {
            const name = `${bundle.title.toLowerCase()}`
            const toConcat = []

            bundle.files.js.forEach(file => {
                toConcat.push(path.join('../', '../', 'src', bundle.path, file))
            })

            gruntConfig.concat[`${name}_js`] = {
                nonull: true,
                src:    toConcat,
                dest:   path.join('generated', `${name}`, 'js', `${name}.js`)
            }
        })

        // CSS creation
        projectBundles.forEach(bundle => {
            const name = `${bundle.title.toLowerCase()}`
            const toConcat = []

            // Normalize paths
            bundle.files.css.forEach(file => {
                toConcat.push(path.join('../', '../', 'src', bundle.path, file))
            })

            // Create object
            gruntConfig.concat[`${name}_css`] = {
                nonull: true,
                src:    toConcat,
                dest:   path.join('generated', `${name}`, 'css', `${name}.css`)
            }
        })
    })

    grunt.task.registerTask('createCssmin', 'creates the cssmin object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name = `${bundle.title.toLowerCase()}`
            gruntConfig.cssmin[name] = {
                src:  `<%=concat.${name}_css.dest%>`,
                dest: path.join('generated', `${name}`, 'css', `${bundle.title.toLowerCase()}.min.css`)
            }
        })
    })

    grunt.task.registerTask('createUglify', 'creates the uglify object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name       = `${bundle.title.toLowerCase()}`
            const output     = path.join('generated', 'js', `/${name}.min.js`)
            gruntConfig.uglify[name] = {
                files: {},
                options: settings.uglify
            }
            if (settings.glob.browserify) {
                const output   = path.join('generated', `${name}`, 'js', `/${name}.browserify.min.js`)
                const toUglify = path.join('generated', `${name}`, 'js', `/${name}.browserify.js`)
                gruntConfig.uglify[name]['files'][output] = toUglify
            } else {
                gruntConfig.uglify[name]['files'][output] = [`<%=concat.${name}_js.dest%>`]
            }
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
            const name   = `${bundle.title.toLowerCase()}`
            const output = path.join('generated', `${name}`, 'css', `/${name}.rewrite.min.css`)
            gruntConfig.css_url_replace[name] = {
                files: {}
            }
            gruntConfig.css_url_replace[name]['files'][output] = [`<%=concat.${name}_js.dest%>`]
        })
    })

    grunt.task.registerTask('createImage', 'creates the image object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name       = `${bundle.title.toLowerCase()}`
            gruntConfig.image[name] = {
                files: {}
            }
            gruntConfig.image[name]['options'] = {
                pngquant:       true,
                optipng:        false,
                zopflipng:      true,
                jpegRecompress: false,
                jpegoptim:      true,
                mozjpeg:        true,
                gifsicle:       true,
                svgo:           true
            }
            gruntConfig.image[name]['files'] = [{
                expand: true,
                cwd: path.join('../', '../', 'src', bundle.path),
                src: bundle.files.image,
                dest: path.join('generated', `${name}`, 'images', `/${name}/`)
            }]
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

    grunt.task.registerTask('createBrowserify', 'creates the browserify object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const toBrowserify = []
            const name         = `${bundle.title.toLowerCase()}`

            bundle.files.js.forEach(jsFile => {
                toBrowserify.push(path.join('../', '../', 'src', bundle.path, jsFile))
            })

            gruntConfig.browserify.dist.files[path.join('generated', `${name}`, 'js', `/${name}.browserify.js`)] = toBrowserify
        })
    })

    grunt.task.registerTask('createEsLint', 'creates the esLint object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const toLint = []
            const name   = `${bundle.title.toLowerCase()}`

            bundle.files.js.forEach(jsFile => {
                toLint.push(path.join(projectRoot, 'src', bundle.path, jsFile))
            })
            gruntConfig.eslint[name] = {
                files: {}
            }
            gruntConfig.eslint[name].files.src = toLint
        })
    })

    grunt.task.registerTask('createPhpLint', 'creates the phpLint object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const toLint = []
            const name   = `${bundle.title.toLowerCase()}`

            bundle.files.php.forEach(phpFile => {
                toLint.push(path.join(projectRoot, 'src', bundle.path, phpFile))
            })

            gruntConfig.phplint[name] = toLint
        })
    })

    grunt.task.registerTask('createYamlLint', 'creates the yamlLint object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const toLint = []
            const name   = `${bundle.title.toLowerCase()}`

            bundle.files.yaml.forEach(yamlFile => {
                toLint.push(path.join(projectRoot, 'src', bundle.path, yamlFile))
            })
            if (toLint.length >= 1) {
                gruntConfig.yaml_validator[name] = {}
                gruntConfig.yaml_validator[name].src = toLint
            }
        })
    })

    grunt.task.registerTask('createWatch', 'creates the watch object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const toWatchJs  = []
            const toWatchCss = []
            const name       = `${bundle.title.toLowerCase()}`

            const watchOptions = {
                livereload: true,
                spawn:      false,
            }

            gruntConfig.watch[`${name}_js`]         = {}
            gruntConfig.watch[`${name}_js`].files   = [`< %= concat.${name}_js.src%>`]
            gruntConfig.watch[`${name}_js`].tasks   = ['process']
            gruntConfig.watch[`${name}_js`].options = watchOptions

            gruntConfig.watch[`${name}_css`]         = {}
            gruntConfig.watch[`${name}_css`].files   = [`< %= concat.${name}_css.src%>`]
            gruntConfig.watch[`${name}_css`].tasks   = ['process']
            gruntConfig.watch[`${name}_css`].options = watchOptions
        })
    })

    grunt.task.registerTask('createReplace', 'creates the replace object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const name = `${bundle.title.toLowerCase()}`
            const toReplace = []

            bundle.files.twig.forEach(twigFile => {
                toReplace.push(path.join(projectRoot, 'src', bundle.path, twigFile))
            })

            const buildCss   = `<link rel="stylesheet" type="text/css" href="/assets/css/${name}.css?version=${versionControl}">`

            const jsFile     = `<script src="/assets/js/${name}.js?version=${versionControl}"></script>`
            const liveReload = '<script src="//localhost:35729/livereload.js"></script>'
            const buildJs    = `${jsFile}${liveReload}`

            gruntConfig.replace[name] = {}
            gruntConfig.replace[name].options = {
                prefix: '',
                variables: {
                    '<symfony-grunt-css>': buildCss,
                    '<symfony-grunt-js>':  buildJs,
                }
            }

            gruntConfig.replace[name].files = [
                {
                    expand: true,
                    flatten: true,
                    src: toReplace,
                    dest: path.join(gruntRoot, 'generated', `${name}`, 'twig')
                }
            ]
        })
    })

    grunt.task.registerTask('createCopy', 'creates the copy object for grunt config', () => {
        projectBundles.forEach(bundle => {
            const toWatchJs  = []
            const toWatchCss = []
            const name       = `${bundle.title.toLowerCase()}`
            gruntConfig.copy[name] = {
                files: [
                    {
                        expand: true,
                        cwd: path.join(gruntRoot, 'generated'),
                        src: `${name}/**/*`,
                        dest: path.join(projectRoot, 'web', 'assets', `${name}`),
                        filter: 'isFile'
                    },
                ]
            }
        })
        console.log(gruntConfig.copy.app.files)
    })

    grunt.task.registerTask('initProcess', 'Starts the init process that is needed for information gathering about the project', () => {
        grunt.task.run(initProcesses)
    })

    grunt.task.registerTask('process', 'Makes sure every process was started and finished', () => {
        if (settings.glob.php) {
            grunt.task.run('phplint')
        }

        if (settings.glob.yaml) {
            grunt.task.run('yamllint')
        }

        grunt.task.run(
            'eslint',
            'concat',
            'cssmin',
            'css_url_replace'
        )

        grunt.task.run('replace')

        if (settings.glob.images) {
            grunt.task.run('image')
        }

        if (settings.glob.browserify) {
            grunt.task.run('browserify')
            grunt.task.run('uglify')
        } else {
            grunt.task.run('uglify')
        }

        // Seems to be a little buggy still
        // grunt.task.run('copy')
    })

    grunt.task.registerTask('finish', 'when done with default tasks', () => {
        grunt.log.ok('Everything went ok :)')
    })

    grunt.task.registerTask('default', 'Shows all tasks', function() {
        grunt.task.run('availabletasks')
    })

    gruntConfig         = {}
    gruntConfig.exec    = {}
    gruntConfig.uglify  = {}
    gruntConfig.image   = {}
    gruntConfig.watch   = {}
    gruntConfig.replace = {}
    gruntConfig.copy    = {}

    gruntConfig.md5 = {
        compile: {
            files: {
                'generated/md5': 'src/file',
            },
        },
    }

    gruntConfig.concat = {
        options: {
            stripBanners: true,
        },
    }

    gruntConfig.yamllint = {
        options: {
            schema: 'DEFAULT_SAFE_SCHEMA'
        },
        symfony: {
            src: [path.join(projectRoot, 'app', '**/*.yml')]
        }
    },
    gruntConfig.phplint = {
        'symfony': [path.join(projectRoot, 'app', '**/*.php')]
    }

    gruntConfig.eslint = {
        options:{
            configFile: 'eslint.json',
            quiet: true,
        },
    },

    gruntConfig.cssmin = {
        options: {
            keepSpecialComments: 0
        },
    }

    gruntConfig.browserify = {
      dist: {
        options: {
           transform: [
                ['babelify', {
                    presets: [
                        path.join(gruntRoot, 'node_modules', 'babel-preset-es2015'),
                    ]
                }],
           ],
           compact: true,
        },
        files: {},
      }
    }

    gruntConfig.css_url_replace = {
        options: {
            staticRoot: 'web'
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
                        'image',
                        'browserify',
                    ],
                    'For production': [
                        'prod',
                     ],
                    'For developement': [
                        'dev',
                        'watch',
                        'exec',
                        'phplint',
                        'yamllint',
                        'eslint',
                     ],
                    'Internal SYMFONY-GRUNT tasks': initProcesses
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
    grunt.loadNpmTasks('grunt-image')
    grunt.loadNpmTasks('grunt-browserify')
    grunt.loadNpmTasks('grunt-eslint')
    grunt.loadNpmTasks("grunt-phplint")
    grunt.loadNpmTasks('grunt-replace')
    grunt.loadNpmTasks('grunt-yamllint')
    grunt.loadNpmTasks('grunt-contrib-copy')

    grunt.registerTask('dev', ['process', 'watch'])
    grunt.registerTask('prod', ['process'])


    grunt.log.ok('Starting initProcess...')

    // Uncomment the below lines to disable the first console logs for initProcess
    // grunt.log.headerCopy = grunt.log.header
    // grunt.log.okCopy     = grunt.log.ok
    // grunt.log.header     = function() {}
    // grunt.log.ok         = function() {}

    grunt.task.registerTask('restoreLog', 'Restores the grunt log object that was destroyed on init', () => {
        // grunt.log.header = grunt.log.headerCopy
        // grunt.log.ok     = grunt.log.okCopy
        // grunt.log.ok('initProcess done!')
    })

    // initProcess should be always run before anything else.
    grunt.task.run('initProcess', 'restoreLog')
}
