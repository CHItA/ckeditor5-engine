/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */
/* bender-tags: view, browser-only */

import FocusObserver from 'ckeditor5/engine/view/observer/focusobserver.js';
import ViewDocument from 'ckeditor5/engine/view/document.js';
import ViewRange from 'ckeditor5/engine/view/range.js';

describe( 'FocusObserver', () => {
	let viewDocument, observer;

	beforeEach( () => {
		viewDocument = new ViewDocument();
		observer = viewDocument.getObserver( FocusObserver );
	} );

	it( 'should define domEventType', () => {
		expect( observer.domEventType ).to.deep.equal( [ 'focus', 'blur' ] );
	} );

	describe( 'onDomEvent', () => {
		it( 'should fire focus with the right event data', () => {
			const spy = sinon.spy();

			viewDocument.on( 'focus', spy );

			observer.onDomEvent( { type: 'focus', target: document.body } );

			expect( spy.calledOnce ).to.be.true;

			const data = spy.args[ 0 ][ 1 ];
			expect( data.domTarget ).to.equal( document.body );
		} );

		it( 'should fire blur with the right event data', () => {
			const spy = sinon.spy();

			viewDocument.on( 'blur', spy );

			observer.onDomEvent( { type: 'blur', target: document.body } );

			expect( spy.calledOnce ).to.be.true;

			const data = spy.args[ 0 ][ 1 ];
			expect( data.domTarget ).to.equal( document.body );
		} );
	} );

	describe( 'handle isFocused property of the document', () => {
		let domMain, domHeader, viewMain, viewHeader;

		beforeEach( () => {
			domMain = document.createElement( 'div' );
			domHeader = document.createElement( 'h1' );

			viewMain = viewDocument.createRoot( domMain );
			viewHeader = viewDocument.createRoot( domHeader, 'header' );
		} );

		it( 'should set isFocused to true on focus', () => {
			observer.onDomEvent( { type: 'focus', target: domMain } );

			expect( viewDocument.isFocused ).to.equal( true );
		} );

		it( 'should set isFocused to false on blur', () => {
			observer.onDomEvent( { type: 'focus', target: domMain } );

			expect( viewDocument.isFocused ).to.equal( true );

			observer.onDomEvent( { type: 'blur', target: domMain } );

			expect( viewDocument.isFocused ).to.be.false;
		} );

		it( 'should set isFocused to false on blur when selection in same editable', () => {
			viewDocument.selection.addRange( ViewRange.createFromParentsAndOffsets( viewMain, 0, viewMain, 0 ) );

			observer.onDomEvent( { type: 'focus', target: domMain } );

			expect( viewDocument.isFocused ).to.equal( true );

			observer.onDomEvent( { type: 'blur', target: domMain } );

			expect( viewDocument.isFocused ).to.be.false;
		} );

		it( 'should not set isFocused to false on blur when it is fired on other editable', () => {
			viewDocument.selection.addRange( ViewRange.createFromParentsAndOffsets( viewMain, 0, viewMain, 0 ) );

			observer.onDomEvent( { type: 'focus', target: domMain } );

			expect( viewDocument.isFocused ).to.equal( true );

			observer.onDomEvent( { type: 'blur', target: domHeader } );

			expect( viewDocument.isFocused ).to.be.true;
		} );
	} );
} );
