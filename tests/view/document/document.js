/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */
/* bender-tags: view, browser-only */

import createElement from 'ckeditor5/utils/dom/createelement.js';
import Document from 'ckeditor5/engine/view/document.js';
import Observer from 'ckeditor5/engine/view/observer/observer.js';
import MutationObserver from 'ckeditor5/engine/view/observer/mutationobserver.js';
import SelectionObserver from 'ckeditor5/engine/view/observer/selectionobserver.js';
import FocusObserver from 'ckeditor5/engine/view/observer/focusobserver.js';
import KeyObserver from 'ckeditor5/engine/view/observer/keyobserver.js';
import FakeSelectionObserver from 'ckeditor5/engine/view/observer/fakeselectionobserver.js';
import Renderer from 'ckeditor5/engine/view/renderer.js';
import ViewRange from 'ckeditor5/engine/view/range.js';
import DomConverter from 'ckeditor5/engine/view/domconverter.js';
import testUtils from 'tests/core/_utils/utils.js';
import count from 'ckeditor5/utils/count.js';
import log from 'ckeditor5/utils/log.js';

testUtils.createSinonSandbox();

describe( 'Document', () => {
	const DEFAULT_OBSERVERS_COUNT = 5;
	let ObserverMock, ObserverMockGlobalCount, instantiated, enabled, domRoot;

	before( () => {
		domRoot = createElement( document, 'div', {
			id: 'editor',
			contenteditable: 'true'
		} );
		document.body.appendChild( domRoot );
	} );

	after( () => {
		domRoot.parentElement.removeChild( domRoot );
	} );

	beforeEach( () => {
		instantiated = 0;
		enabled = 0;

		ObserverMock = class extends Observer {
			constructor( viewDocument ) {
				super( viewDocument );

				this.enable = sinon.spy();
				this.disable = sinon.spy();
				this.observe = sinon.spy();
			}
		};

		ObserverMockGlobalCount = class extends Observer {
			constructor( viewDocument ) {
				super( viewDocument );
				instantiated++;

				this.observe = sinon.spy();
			}

			enable() {
				enabled++;
			}
		};
	} );

	describe( 'constructor', () => {
		it( 'should create Document with all properties', () => {
			const viewDocument = new Document();

			expect( count( viewDocument.domRoots ) ).to.equal( 0 );
			expect( count( viewDocument.roots ) ).to.equal( 0 );
			expect( viewDocument ).to.have.property( 'renderer' ).that.is.instanceOf( Renderer );
			expect( viewDocument ).to.have.property( 'domConverter' ).that.is.instanceOf( DomConverter );
			expect( viewDocument ).to.have.property( 'isFocused' ).that.is.false;
		} );

		it( 'should add default observers', () => {
			const viewDocument = new Document();

			expect( count( viewDocument._observers ) ).to.equal( DEFAULT_OBSERVERS_COUNT );
			expect( viewDocument.getObserver( MutationObserver ) ).to.be.instanceof( MutationObserver );
			expect( viewDocument.getObserver( SelectionObserver ) ).to.be.instanceof( SelectionObserver );
			expect( viewDocument.getObserver( FocusObserver ) ).to.be.instanceof( FocusObserver );
			expect( viewDocument.getObserver( KeyObserver ) ).to.be.instanceof( KeyObserver );
			expect( viewDocument.getObserver( FakeSelectionObserver ) ).to.be.instanceof( FakeSelectionObserver );
		} );
	} );

	describe( 'createRoot', () => {
		it( 'should create root', () => {
			const domP = document.createElement( 'p' );
			const domDiv = document.createElement( 'div' );
			domDiv.appendChild( domP );

			const viewDocument = new Document();
			const ret = viewDocument.createRoot( domDiv );

			expect( count( viewDocument.domRoots ) ).to.equal( 1 );
			expect( count( viewDocument.roots ) ).to.equal( 1 );

			const domRoot = viewDocument.getDomRoot();
			const viewRoot = viewDocument.getRoot();

			expect( ret ).to.equal( viewRoot );

			expect( domRoot ).to.equal( domDiv );
			expect( viewDocument.domConverter.getCorrespondingDom( viewRoot ) ).to.equal( domDiv );

			expect( viewRoot.name ).to.equal( 'div' );
			expect( viewDocument.renderer.markedChildren.has( viewRoot ) ).to.be.true;
		} );

		it( 'should call observe on each observer', () => {
			const viewDocument = new Document( document.createElement( 'div' ) );
			viewDocument.renderer.render = sinon.spy();

			const domDiv1 = document.createElement( 'div' );
			domDiv1.setAttribute( 'id', 'editor' );

			const domDiv2 = document.createElement( 'div' );
			domDiv2.setAttribute( 'id', 'editor' );

			const observerMock = viewDocument.addObserver( ObserverMock );
			const observerMockGlobalCount = viewDocument.addObserver( ObserverMockGlobalCount );

			viewDocument.createRoot( document.createElement( 'div' ), 'root1' );

			sinon.assert.calledOnce( observerMock.observe );
			sinon.assert.calledOnce( observerMockGlobalCount.observe );
		} );

		it( 'should create "main" root by default', () => {
			const domDiv = document.createElement( 'div' );

			const viewDocument = new Document();
			const ret = viewDocument.createRoot( domDiv );

			expect( count( viewDocument.domRoots ) ).to.equal( 1 );
			expect( count( viewDocument.roots ) ).to.equal( 1 );

			const domRoot = viewDocument.domRoots.get( 'main' );
			const viewRoot = viewDocument.roots.get( 'main' );

			expect( ret ).to.equal( viewRoot );

			expect( domRoot ).to.equal( domDiv );
		} );

		it( 'should create root with given name', () => {
			const domDiv = document.createElement( 'div' );

			const viewDocument = new Document();
			const ret = viewDocument.createRoot( domDiv, 'header' );

			expect( count( viewDocument.domRoots ) ).to.equal( 1 );
			expect( count( viewDocument.roots ) ).to.equal( 1 );

			const domRoot = viewDocument.domRoots.get( 'header' );
			const viewRoot = viewDocument.roots.get( 'header' );

			expect( ret ).to.equal( viewRoot );

			expect( domRoot ).to.equal( domDiv );
		} );

		it( 'should create root without attaching DOM element', () => {
			const viewDocument = new Document();
			const ret = viewDocument.createRoot( 'div' );

			expect( count( viewDocument.domRoots ) ).to.equal( 0 );
			expect( count( viewDocument.roots ) ).to.equal( 1 );
			expect( ret ).to.equal( viewDocument.getRoot() );
		} );
	} );

	describe( 'attachDomRoot', () => {
		it( 'should create root without attach DOM element to the view element', () => {
			const domDiv = document.createElement( 'div' );

			const viewDocument = new Document();
			const viewRoot = viewDocument.createRoot( 'div' );

			expect( count( viewDocument.domRoots ) ).to.equal( 0 );
			expect( count( viewDocument.roots ) ).to.equal( 1 );
			expect( viewRoot ).to.equal( viewDocument.getRoot() );

			viewDocument.attachDomRoot( domDiv );

			expect( count( viewDocument.domRoots ) ).to.equal( 1 );
			expect( count( viewDocument.roots ) ).to.equal( 1 );

			expect( viewDocument.getDomRoot() ).to.equal( domDiv );
			expect( viewDocument.domConverter.getCorrespondingDom( viewRoot ) ).to.equal( domDiv );

			expect( viewDocument.renderer.markedChildren.has( viewRoot ) ).to.be.true;
		} );

		it( 'should create root without attach DOM element to the view element with given name', () => {
			const domH1 = document.createElement( 'h1' );

			const viewDocument = new Document();
			viewDocument.createRoot( 'DIV' );
			const viewH1 = viewDocument.createRoot( 'h1', 'header' );

			expect( count( viewDocument.domRoots ) ).to.equal( 0 );
			expect( count( viewDocument.roots ) ).to.equal( 2 );
			expect( viewH1 ).to.equal( viewDocument.getRoot( 'header' ) );

			viewDocument.attachDomRoot( domH1, 'header' );

			expect( count( viewDocument.domRoots ) ).to.equal( 1 );
			expect( count( viewDocument.roots ) ).to.equal( 2 );

			expect( viewDocument.getDomRoot( 'header' ) ).to.equal( domH1 );
			expect( viewDocument.domConverter.getCorrespondingDom( viewH1 ) ).to.equal( domH1 );

			expect( viewDocument.getRoot().name ).to.equal( 'div' );
			expect( viewDocument.renderer.markedChildren.has( viewH1 ) ).to.be.true;
		} );
	} );

	describe( 'getRoot', () => {
		it( 'should return "main" root', () => {
			const viewDocument = new Document();
			viewDocument.createRoot( document.createElement( 'div' ) );

			expect( count( viewDocument.roots ) ).to.equal( 1 );

			expect( viewDocument.getRoot() ).to.equal( viewDocument.roots.get( 'main' ) );
		} );

		it( 'should return named root', () => {
			const viewDocument = new Document();
			viewDocument.createRoot( document.createElement( 'h1' ), 'header' );

			expect( count( viewDocument.roots ) ).to.equal( 1 );

			expect( viewDocument.getRoot( 'header' ) ).to.equal( viewDocument.roots.get( 'header' ) );
		} );
	} );

	describe( 'addObserver', () => {
		let viewDocument;

		beforeEach( () => {
			viewDocument = new Document( document.createElement( 'div' ) );
			viewDocument.renderer.render = sinon.spy();
		} );

		it( 'should be instantiated and enabled on adding', () => {
			const observerMock = viewDocument.addObserver( ObserverMock );

			expect( viewDocument._observers.size ).to.equal( DEFAULT_OBSERVERS_COUNT + 1 );

			expect( observerMock ).to.have.property( 'document', viewDocument );
			sinon.assert.calledOnce( observerMock.enable );
		} );

		it( 'should return observer instance each time addObserver is called', () => {
			const observerMock1 = viewDocument.addObserver( ObserverMock );
			const observerMock2 = viewDocument.addObserver( ObserverMock );

			expect( observerMock1 ).to.be.instanceof( ObserverMock );
			expect( observerMock2 ).to.be.instanceof( ObserverMock );
			expect( observerMock1 ).to.equals( observerMock2 );
		} );

		it( 'should instantiate one observer only once', () => {
			viewDocument.addObserver( ObserverMockGlobalCount );
			viewDocument.addObserver( ObserverMockGlobalCount );

			expect( viewDocument._observers.size ).to.equal( DEFAULT_OBSERVERS_COUNT + 1 );
			expect( instantiated ).to.equal( 1 );
			expect( enabled ).to.equal( 1 );

			viewDocument.addObserver( ObserverMock );
			expect( viewDocument._observers.size ).to.equal( DEFAULT_OBSERVERS_COUNT + 2 );
		} );

		it( 'should instantiate child class of already registered observer', () => {
			class ObserverMock extends Observer {
				enable() {}
			}
			class ChildObserverMock extends ObserverMock {
				enable() {}
			}

			viewDocument.addObserver( ObserverMock );
			viewDocument.addObserver( ChildObserverMock );

			expect( viewDocument._observers.size ).to.equal( DEFAULT_OBSERVERS_COUNT + 2 );
		} );

		it( 'should be disabled and re-enabled on render', () => {
			const observerMock = viewDocument.addObserver( ObserverMock );
			viewDocument.render();

			sinon.assert.calledOnce( observerMock.disable );
			sinon.assert.calledOnce( viewDocument.renderer.render );
			sinon.assert.calledTwice( observerMock.enable );
		} );

		it( 'should call observe on each root', () => {
			viewDocument.createRoot( document.createElement( 'div' ), 'root1' );
			viewDocument.createRoot( document.createElement( 'div' ), 'root2' );

			const observerMock = viewDocument.addObserver( ObserverMock );

			sinon.assert.calledTwice( observerMock.observe );
		} );
	} );

	describe( 'getObserver', () => {
		it( 'should return observer it it is added', () => {
			const viewDocument = new Document();

			const addedObserverMock = viewDocument.addObserver( ObserverMock );
			const getObserverMock = viewDocument.getObserver( ObserverMock );

			expect( getObserverMock ).to.be.instanceof( ObserverMock );
			expect( getObserverMock ).to.equal( addedObserverMock );
		} );

		it( 'should return undefined if observer is not added', () => {
			const viewDocument = new Document();
			const getObserverMock = viewDocument.getObserver( ObserverMock );

			expect( getObserverMock ).to.be.undefined;
		} );
	} );

	describe( 'disableObservers', () => {
		it( 'should disable observers', () => {
			const viewDocument = new Document();

			const addedObserverMock = viewDocument.addObserver( ObserverMock );

			expect( addedObserverMock.enable.calledOnce ).to.be.true;
			expect( addedObserverMock.disable.called ).to.be.false;

			viewDocument.disableObservers();

			expect( addedObserverMock.enable.calledOnce ).to.be.true;
			expect( addedObserverMock.disable.calledOnce ).to.be.true;
		} );
	} );

	describe( 'enableObservers', () => {
		it( 'should enable observers', () => {
			const viewDocument = new Document();

			const addedObserverMock = viewDocument.addObserver( ObserverMock );

			viewDocument.disableObservers();

			expect( addedObserverMock.enable.calledOnce ).to.be.true;
			expect( addedObserverMock.disable.calledOnce ).to.be.true;

			viewDocument.enableObservers();

			expect( addedObserverMock.enable.calledTwice ).to.be.true;
			expect( addedObserverMock.disable.calledOnce ).to.be.true;
		} );
	} );

	describe( 'isFocused', () => {
		it( 'should change renderer.isFocused too', () => {
			const viewDocument = new Document();

			expect( viewDocument.isFocused ).to.equal( false );
			expect( viewDocument.renderer.isFocused ).to.equal( false );

			viewDocument.isFocused = true;

			expect( viewDocument.isFocused ).to.equal( true );
			expect( viewDocument.renderer.isFocused ).to.equal( true );
		} );
	} );

	describe( 'focus', () => {
		let viewDocument, domEditable, viewEditable;

		beforeEach( () => {
			viewDocument = new Document();
			domEditable = document.createElement( 'div' );
			domEditable.setAttribute( 'contenteditable', 'true' );
			document.body.appendChild( domEditable );
			viewEditable = viewDocument.createRoot( domEditable );
			viewDocument.selection.addRange( ViewRange.createFromParentsAndOffsets( viewEditable, 0, viewEditable, 0 ) );
		} );

		afterEach( () => {
			document.body.removeChild( domEditable );
		} );

		it( 'should focus editable with selection', () => {
			const converterFocusSpy = testUtils.sinon.spy( viewDocument.domConverter, 'focus' );
			const renderSpy = testUtils.sinon.spy( viewDocument, 'render' );

			viewDocument.focus();

			expect( converterFocusSpy.called ).to.be.true;
			expect( renderSpy.calledOnce ).to.be.true;
			expect( document.activeElement ).to.equal( domEditable );
			const domSelection = document.getSelection();
			expect( domSelection.rangeCount ).to.equal( 1 );
			const domRange = domSelection.getRangeAt( 0 );
			expect( domRange.startContainer ).to.equal( domEditable );
			expect( domRange.startOffset ).to.equal( 0 );
			expect( domRange.collapsed ).to.be.true;
		} );

		it( 'should not focus if document is already focused', () => {
			const converterFocusSpy = testUtils.sinon.spy( viewDocument.domConverter, 'focus' );
			const renderSpy = testUtils.sinon.spy( viewDocument, 'render' );
			viewDocument.isFocused = true;

			viewDocument.focus();

			expect( converterFocusSpy.called ).to.be.false;
			expect( renderSpy.called ).to.be.false;
		} );

		it( 'should log warning when no selection', () => {
			const logSpy = testUtils.sinon.stub( log, 'warn' );
			viewDocument.selection.removeAllRanges();

			viewDocument.focus();
			expect( logSpy.calledOnce ).to.be.true;
			expect( logSpy.args[ 0 ][ 0 ] ).to.match( /^view-focus-no-selection/ );
		} );
	} );
} );
