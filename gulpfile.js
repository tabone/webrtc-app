'use strict'

const fs = require('fs')
const path = require('path')
const gulp = require('gulp')
const browserify = require('browserify')

gulp.task('build', () => {
  browserify(path.join(__dirname, 'public/js/src/app.js'))
    .transform('babelify', { presets: [ "es2015" ] })
    .bundle()
    .pipe(fs.createWriteStream(path.join(__dirname, 'public/js/dist/app.js')))
})

gulp.task('default', ['build'])
