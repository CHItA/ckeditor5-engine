/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import moduleUtils from '/tests/_utils/module.js';

const utils = {
	/**
	 * Defines CKEditor plugin which is a mock of an editor creator.
	 *
	 * The mocked creator is available under:
	 *
	 *		editor.plugins.get( 'creator-thename' );
	 *
	 * @param {String} creatorName Name of the creator.
	 * @param {Object} [proto] Prototype of the creator. Properties from the proto param will
	 * be copied to the prototype of the creator.
	 */
	defineEditorCreatorMock( creatorName, proto ) {
		moduleUtils.define( 'creator-' + creatorName, [ 'core/creator' ], ( Creator ) => {
			class TestCreator extends Creator {}

			if ( proto ) {
				for ( let propName in proto ) {
					TestCreator.prototype[ propName ] = proto[ propName ];
				}
			}

			return TestCreator;
		} );
	}
};

export default utils;
