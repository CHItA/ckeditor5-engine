/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: model */

import Document from 'ckeditor5/engine/model/document.js';
import Element from 'ckeditor5/engine/model/element.js';
import RootElement from 'ckeditor5/engine/model/rootelement.js';
import count from 'ckeditor5/utils/count.js';

describe( 'Element', () => {
	describe( 'constructor()', () => {
		it( 'should create root element without attributes', () => {
			let doc = new Document();
			let root = new RootElement( doc );

			expect( root ).to.be.an.instanceof( Element );
			expect( root ).to.have.property( 'document' ).that.equals( doc );
			expect( count( root.getAttributes() ) ).to.equal( 0 );
			expect( root.childCount ).to.equal( 0 );
		} );
	} );
} );
