var gulp  = require('gulp'),
    path     = require('path'),

    pkg   = require('./package.json'),
    _     = require('lodash'),
    
    files = require('./client/src/files').development,

    settings = require('./settings'),
    $     = require('gulp-load-plugins')({
              rename: {
                'gulp-angular-templatecache': 'templatecache'
              }
            });
// console.log(files)
console.log('writing dist folder:', settings.paths.dist);
// Files
var banner = '/* histograph.js - Version: ' + pkg.version + ' - Author: danieleguido (Daniele Guido) */\n';

// Lint Javascript
gulp.task('jshint', function() {
  return gulp.src('./client/src/js/templates.js')
    .pipe($.jshint())
    .pipe($.jshint.reporter('jshint-stylish'))
});


gulp.task('templates', function () {
  return gulp.src('./client/src/templates/**/*.html')
    .pipe($.templatecache({
      module: 'histograph',
      transformUrl: function(url) {
        return 'templates/' + url;
      }
    }))
    .pipe(gulp.dest('./client/src/js'))
    .pipe($.size({templates: 'js'}))
});


gulp.task('scripts', function() {
  return gulp.src(files.scripts.map(function (d) {
    return './client/src' + d 
  }))
    .pipe($.concat('scripts.min.js'))
    // .pipe($.uglify())
    // Output files
    .pipe(gulp.dest(path.join(settings.paths.dist, 'js')))
    .pipe($.size({title: 'js'}))
});


// copy and optimize stylesheet
gulp.task('styles', function() {
  return gulp.src('./client/src/css/*')
    .pipe($.if('*.css', $.minifyCss()))
      // Output files
    .pipe(gulp.dest(path.join(settings.paths.dist, 'css')))
    .pipe($.size({title: 'styles'}));
});

// Optimize images
gulp.task('images', function() {
  return gulp.src('./client/src/images/*')
    .pipe(gulp.dest(path.join(settings.paths.dist, 'images')))
    .pipe($.size({title: 'images'}));
});

// Copy web fonts to dist
gulp.task('fonts', function() {
  return gulp.src(['./client/src/fonts/**'])
    .pipe(gulp.dest(path.join(settings.paths.dist, 'fonts')))
    .pipe($.size({title: 'fonts'}));
});

// copy (compress) locale to dist
gulp.task('locale', function() {
  return gulp.src(['./client/src/locale/*.json'])
    .pipe($.jsonminify())
    .pipe(gulp.dest(path.join(settings.paths.dist, 'locale')))
    .pipe($.size({title: 'locale'}));
});
// Build
gulp.task('build', function() {
  
});

// Default
gulp.task('default', ['templates', 'scripts', 'styles', 'images', 'fonts', 'locale']);