/* jshint node: true, esnext: true */

'use strict';

const gulp = require( 'gulp' );

const config = {
	ROOT_DIR: '.',
	WORKSPACE_DIR: '..',

	// Files ignored by jshit and jscs tasks. Files from .gitignore will be added automatically during tasks execution.
	IGNORED_FILES: [ 'src/lib/**' ]
};

require( './dev/tasks/lint/tasks' )( config );
require( './dev/tasks/lodash/tasks' )();

gulp.task( 'pre-commit', [ 'lint-staged' ] );
