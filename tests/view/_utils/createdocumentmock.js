/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: view */

import ObservableMixin from 'ckeditor5/utils/observablemixin.js';
import Selection from 'ckeditor5/engine/view/selection.js';

/**
 * Creates {@link module:engine/view/document~Document view Document} mock.
 *
 * @returns {utils.ObservableMixin} Document mock
 */
export default function createDocumentMock() {
	const doc = Object.create( ObservableMixin );
	doc.set( 'isFocused', false );
	doc.selection = new Selection();

	return doc;
}
