"use strict";

var gulp = require('gulp')
  , merge = require('merge-stream')
  , sourcemaps = require('gulp-sourcemaps')
  , traceur = require('gulp-traceur');

gulp.task('default', function () {
  var traceurOpts = {
    asyncFunctions: true,
    blockBinding: true,
    modules: 'commonjs',
    annotations: true,
    arrayComprehension: true,
    types: true,
    typeAssertions: true,
    typeAssertionModule: 'rtts-assert',
    sourceMaps: true
  };
  var lib = gulp.src('lib/es6/**/*.js')
                .pipe(sourcemaps.init())
                .pipe(traceur(traceurOpts))
                .pipe(sourcemaps.write())
                .pipe(gulp.dest('lib/es5'));
  var test = gulp.src('test/es6/**/*.js')
                 .pipe(sourcemaps.init())
                 .pipe(traceur(traceurOpts))
                 .pipe(sourcemaps.write())
                 .pipe(gulp.dest('test/es5'));
  return merge(lib, test);
});


