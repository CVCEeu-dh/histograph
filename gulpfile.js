var gulp  = require('gulp'),
    pkg   = require('./package.json'),
    _     = require('lodash'),
    $     = require('gulp-load-plugins')({
              rename: {
                'gulp-angular-templatecache': 'templatecache'
              }
            });

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
      module: 'histograph'
    }))
    .pipe(gulp.dest('./client/src/js'));
});


gulp.task('scripts', function() {
  return gulp.src([
    './client/src/js/lib/jquery-2.1.3.min.js', 
    './client/src/js/lib/d3.min.js',
    './client/src/js/lib/lodash.min.js', 
      
    './client/src/js/lib/codemirror.js',
    './client/src/js/lib/codemirror-addon-simple.js',
    './client/src/js/lib/codemirror-addon-show-hint.js',
      
    './client/src/js/lib/annotator.min.js',
    './client/src/js/lib/annotorious.min.js',
    './client/src/js/lib/annotorious-merge.js',   
    './client/src/js/lib/marked.min.js',
    './client/src/js/lib/moment.min.js',
    './client/src/js/lib/sigma.min.js',
    './client/src/js/lib/sigma.layout.forceAtlas2.min.js',

    './client/src/js/lib/perfect-scrollbar.min.js',
    './client/src/js/lib/perfect-scrollbar.with-mousewheel.min.js',
    './client/src/js/lib/angular.min.js',
    './client/src/js/lib/angular-ui-router.min.js',  
    './client/src/js/lib/angular-route.min.js',
    './client/src/js/lib/angular-resource.min.js',
    './client/src/js/lib/angular-cookies.min.js',
    './client/src/js/lib/angular-local-storage.min.js',
    
    './client/src/js/lib/ui-codemirror.min.js',
    
    './client/src/js/lib/ui-bootstrap-tpls.min.js',
    './client/src/js/lib/angular-perfect-scrollbar.js',
    
    // app
    './client/src/js/*.js',
    './client/src/js/controllers/*.js',
    './client/src/js/directives/*.js'
  ])
    .pipe($.concat('scripts.min.js'))
    //.pipe($.uglify())
    // Output files
    .pipe(gulp.dest('./client/dist/js'))
    .pipe($.size({title: 'js'}))
});


// copy and optimize stylesheet
gulp.task('styles', function() {
  return gulp.src('./client/src/css/*')
    .pipe($.if('*.css', $.minifyCss()))
      // Output files
    .pipe(gulp.dest('./client/dist/css'))
    .pipe($.size({title: 'styles'}));
});

// Optimize images
gulp.task('images', function() {
  return gulp.src('./client/src/images/*')
    .pipe(gulp.dest('./client/dist/images'))
    .pipe($.size({title: 'images'}));
});

// Copy web fonts to dist
gulp.task('fonts', function() {
  return gulp.src(['./client/src/fonts/**'])
    .pipe(gulp.dest('./client/dist/fonts'))
    .pipe($.size({title: 'fonts'}));
});

// Build
gulp.task('build', function() {
  
});

// Default
gulp.task('default', ['templates', 'scripts', 'styles', 'images']);