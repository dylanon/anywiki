const gulp = require('gulp');
const browserSync = require('browser-sync');
const reload = browserSync.reload;
const sass = require('gulp-sass');
const plumber = require('gulp-plumber');
const concat = require('gulp-concat');
const autoprefixer = require('gulp-autoprefixer');

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
    return gulp.src('dev/js/*.js')
        .pipe(gulp.dest('public/js'));
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

gulp.task('default', ['markup','styles','js','bs'], () => {
    gulp.watch('dev/**/*.scss',['styles']);
    gulp.watch('dev/*.html', ['markup', reload]);
	gulp.watch('dev/**/*.js', ['js', reload]);
	gulp.watch('public/styles/style.css', reload);
});