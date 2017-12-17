const gulp = require('gulp');
const browserSync = require('browser-sync');
const reload = browserSync.reload;
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const concat = require('gulp-concat');
const autoprefixer = require('gulp-autoprefixer');
const babel = require('gulp-babel');

gulp.task('markup', () => {
    return gulp.src('dev/*.html')
        .pipe(gulp.dest('public'));
});

gulp.task('styles', () => {
	return gulp.src('./dev/styles/**/*.scss')
		.pipe(sass().on('error', sass.logError))
		.pipe(autoprefixer())
		.pipe(concat('style.css'))
		.pipe(gulp.dest('public/styles'))
});

gulp.task('js', () => {
	return gulp.src('dev/js/scripts.js')
		.pipe(babel())
		.pipe(gulp.dest('public/js'));
});

gulp.task('js-plugins', () => {
	return gulp.src('dev/js/plugins/*.js')
		.pipe(gulp.dest('public/js/plugins'));
});

gulp.task('bs', () => {
	return browserSync.init({
		server: {
			baseDir: 'public'
		},
		notify: false
        // browser: 'firefox'
	});
});

gulp.task('default', ['js','js-plugins','markup','styles','bs'], () => {
	gulp.watch('dev/js/scripts.js', ['js']);
	gulp.watch('public/js/**/*.js', reload);
    gulp.watch('dev/*.html', ['markup', reload]);
    gulp.watch('dev/**/*.scss',['styles']);
	gulp.watch('public/styles/style.css', reload);
});