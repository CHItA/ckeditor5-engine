/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import Editor from '/ckeditor5/core/editor.js';
import EditorUI from '/ckeditor5/core/editorui/editorui.js';
import ComponentFactory from '/ckeditor5/core/ui/componentfactory.js';
import ControllerCollection from '/ckeditor5/core/ui/controllercollection.js';

describe( 'EditorUI', () => {
	let editor, editorUI;

	beforeEach( () => {
		editor = new Editor();
		editorUI = new EditorUI( editor );
	} );

	describe( 'constructor', () => {
		it( 'sets all the properties', () => {
			expect( editorUI ).to.have.property( 'editor', editor );

			expect( editorUI.featureComponents ).to.be.instanceof( ComponentFactory );

			expect( editorUI.collections.get( 'body' ) ).to.be.instanceof( ControllerCollection );
		} );
	} );
} );
