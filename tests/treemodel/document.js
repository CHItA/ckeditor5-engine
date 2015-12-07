/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: document */

'use strict';

const modules = bender.amd.require(
	'treemodel/document',
	'treemodel/rootelement',
	'treemodel/batch',
	'ckeditorerror'
);

describe( 'Document', () => {
	let Document, RootElement, Batch, CKEditorError;

	before( () => {
		Document = modules[ 'treemodel/document' ];
		RootElement = modules[ 'treemodel/rootelement' ];
		Batch = modules[ 'treemodel/batch' ];
		CKEditorError = modules.ckeditorerror;
	} );

	let document;

	beforeEach( () => {
		document = new Document();
	} );

	describe( 'constructor', () => {
		it( 'should create Document with no data and empty graveyard', () => {
			expect( document ).to.have.property( 'roots' ).that.is.instanceof( Map );
			expect( document.roots.size ).to.equal( 1 );
			expect( document.graveyard ).to.be.instanceof( RootElement );
			expect( document.graveyard.getChildCount() ).to.equal( 0 );
		} );
	} );

	describe( 'createRoot', () => {
		it( 'should create a new RootElement, add it to roots map and return it', () => {
			let root = document.createRoot( 'root' );

			expect( document.roots.size ).to.equal( 2 );
			expect( root ).to.be.instanceof( RootElement );
			expect( root.getChildCount() ).to.equal( 0 );
		} );

		it( 'should throw an error when trying to create a second root with the same name', () => {
			document.createRoot( 'root' );

			expect(
				() => {
					document.createRoot( 'root' );
				}
			).to.throw( CKEditorError, /document-createRoot-name-exists/ );
		} );
	} );

	describe( 'getRoot', () => {
		it( 'should return a RootElement previously created with given name', () => {
			let newRoot = document.createRoot( 'root' );
			let getRoot = document.getRoot( 'root' );

			expect( getRoot ).to.equal( newRoot );
		} );

		it( 'should throw an error when trying to get non-existent root', () => {
			expect(
				() => {
					document.getRoot( 'root' );
				}
			).to.throw( CKEditorError, /document-createRoot-root-not-exist/ );
		} );
	} );

	describe( 'applyOperation', () => {
		it( 'should increase document version, execute operation and fire operationApplied', () => {
			let operationApplied = sinon.spy();
			let operation = {
				baseVersion: 0,
				_execute: sinon.spy()
			};

			document.on( 'operationApplied', operationApplied );

			document.applyOperation( operation );

			expect( document.version ).to.equal( 1 );
			sinon.assert.calledOnce( operationApplied );
			sinon.assert.calledOnce( operation._execute );
		} );

		it( 'should throw an error on the operation base version and the document version is different', () => {
			let operationApplied = sinon.spy();
			let operation = {
				baseVersion: 1
			};

			document.on( 'operationApplied', operationApplied );

			expect(
				() => {
					document.applyOperation( operation );
				}
			).to.throw( CKEditorError, /document-applyOperation-wrong-version/ );
		} );
	} );

	describe( 'batch', () => {
		it( 'should create a new batch with the document property', () => {
			const batch = document.batch();

			expect( batch ).to.be.instanceof( Batch );
			expect( batch ).to.have.property( 'doc' ).that.equals( document );
		} );
	} );
} );
