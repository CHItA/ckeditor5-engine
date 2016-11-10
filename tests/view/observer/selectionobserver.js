/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals setTimeout, Range, document */
/* bender-tags: view, browser-only */

import ViewRange from 'ckeditor5/engine/view/range.js';
import testUtils from 'tests/core/_utils/utils.js';
import ViewSelection from 'ckeditor5/engine/view/selection.js';
import ViewDocument from 'ckeditor5/engine/view/document.js';
import SelectionObserver from 'ckeditor5/engine/view/observer/selectionobserver.js';
import MutationObserver from 'ckeditor5/engine/view/observer/mutationobserver.js';

import EmitterMixin from 'ckeditor5/utils/emittermixin.js';
import log from 'ckeditor5/utils/log.js';

import { parse } from 'ckeditor5/engine/dev-utils/view.js';

testUtils.createSinonSandbox();

describe( 'SelectionObserver', () => {
	let viewDocument, viewRoot, mutationObserver, selectionObserver, listener, domRoot;

	beforeEach( ( done ) => {
		domRoot = document.createElement( 'div' );
		domRoot.innerHTML = `<div contenteditable="true" id="main"></div><div contenteditable="true" id="additional"></div>`;
		document.body.appendChild( domRoot );

		listener = Object.create( EmitterMixin );

		viewDocument = new ViewDocument();
		viewDocument.createRoot( document.getElementById( 'main' ) );

		mutationObserver = viewDocument.getObserver( MutationObserver );
		selectionObserver = viewDocument.getObserver( SelectionObserver );

		viewRoot = viewDocument.getRoot();

		viewRoot.appendChildren( parse(
			'<container:p>xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx</container:p>' +
			'<container:p>yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy</container:p>' ) );

		viewDocument.render();

		viewDocument.selection.removeAllRanges();
		document.getSelection().removeAllRanges();

		viewDocument.isFocused = true;

		selectionObserver.enable();

		// Ensure selectionchange will not be fired.
		setTimeout( () => done(), 100 );
	} );

	afterEach( () => {
		domRoot.parentElement.removeChild( domRoot );

		listener.stopListening();
		selectionObserver.disable();
	} );

	it( 'should fire selectionChange when it is the only change', ( done ) => {
		listener.listenTo( viewDocument, 'selectionChange', ( evt, data ) => {
			expect( data ).to.have.property( 'domSelection' ).that.equals( document.getSelection() );

			expect( data ).to.have.property( 'oldSelection' ).that.is.instanceof( ViewSelection );
			expect( data.oldSelection.rangeCount ).to.equal( 0 );

			expect( data ).to.have.property( 'newSelection' ).that.is.instanceof( ViewSelection );
			expect( data.newSelection.rangeCount ).to.equal( 1 );

			const newViewRange = data.newSelection.getFirstRange();
			const viewFoo = viewDocument.getRoot().getChild( 0 ).getChild( 0 );

			expect( newViewRange.start.parent ).to.equal( viewFoo );
			expect( newViewRange.start.offset ).to.equal( 1 );
			expect( newViewRange.end.parent ).to.equal( viewFoo );
			expect( newViewRange.end.offset ).to.equal( 2 );

			done();
		} );

		changeDomSelection();
	} );

	it( 'should add only one listener to one document', ( done ) => {
		// Add second roots to ensure that listener is added once.
		viewDocument.createRoot( document.getElementById( 'additional' ), 'additional' );

		listener.listenTo( viewDocument, 'selectionChange', () => {
			done();
		} );

		changeDomSelection();
	} );

	it( 'should not fire selectionChange on render', ( done ) => {
		listener.listenTo( viewDocument, 'selectionChange', () => {
			throw 'selectionChange on render';
		} );

		setTimeout( done, 70 );

		const viewBar = viewDocument.getRoot().getChild( 1 ).getChild( 0 );
		viewDocument.selection.addRange( ViewRange.createFromParentsAndOffsets( viewBar, 1, viewBar, 2 ) );
		viewDocument.render();
	} );

	it( 'should not fired if observer is disabled', ( done ) => {
		viewDocument.getObserver( SelectionObserver ).disable();

		listener.listenTo( viewDocument, 'selectionChange', () => {
			throw 'selectionChange on render';
		} );

		setTimeout( done, 70 );

		changeDomSelection();
	} );

	it( 'should not fired if there is no focus', ( done ) => {
		viewDocument.isFocused = false;

		listener.listenTo( viewDocument, 'selectionChange', () => {
			throw 'selectionChange on render';
		} );

		setTimeout( done, 70 );

		changeDomSelection();
	} );

	it( 'should warn and not enter infinite loop', ( done ) => {
		// Reset infinite loop counters so other tests won't mess up with this test.
		selectionObserver._clearInfiniteLoop();

		let counter = 100;

		const viewFoo = viewDocument.getRoot().getChild( 0 ).getChild( 0 );
		viewDocument.selection.addRange( ViewRange.createFromParentsAndOffsets( viewFoo, 0, viewFoo, 0 ) );

		listener.listenTo( viewDocument, 'selectionChange', () => {
			counter--;

			if ( counter > 0 ) {
				setTimeout( changeDomSelection );
			} else {
				throw 'Infinite loop!';
			}
		} );

		let warnedOnce = false;

		testUtils.sinon.stub( log, 'warn', ( msg ) => {
			if ( !warnedOnce ) {
				warnedOnce = true;

				setTimeout( () => {
					expect( msg ).to.match( /^selectionchange-infinite-loop/ );
					done();
				}, 200 );
			}
		} );

		changeDomSelection();
	} );

	it( 'should not be treated as an infinite loop if selection is changed only few times', ( done ) => {
		const viewFoo = viewDocument.getRoot().getChild( 0 ).getChild( 0 );

		// Reset infinite loop counters so other tests won't mess up with this test.
		selectionObserver._clearInfiniteLoop();

		viewDocument.selection.addRange( ViewRange.createFromParentsAndOffsets( viewFoo, 0, viewFoo, 0 ) );

		const spy = testUtils.sinon.spy( log, 'warn' );

		for ( let i = 0; i < 10; i++ ) {
			changeDomSelection();
		}

		setTimeout( () => {
			expect( spy.called ).to.be.false;
			done();
		}, 400 );
	} );
} );

function changeDomSelection() {
	const domSelection = document.getSelection();
	domSelection.removeAllRanges();
	const domFoo = document.getElementById( 'main' ).childNodes[ 0 ].childNodes[ 0 ];
	const domRange = new Range();
	domRange.setStart( domFoo, 1 );
	domRange.setEnd( domFoo, 2 );
	domSelection.addRange( domRange );
}
