var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat');

gulp.task('build', function () {
    return gulp.src([
        'libs/*.js',
        'libs/core/helpers.js',
        'libs/core/sphere.js',
        'libs/core/scope.js',
        'libs/core/parser.js',
        'libs/core/*.js',
        'libs/**/*.js'
    ]).pipe(concat('sphere.js'))
    //.pipe(uglify({compress: true, mangle: true}))
    .pipe(gulp.dest('./dist/'));
});
