/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: document, delta */

/* bender-include: ../../_tools/tools.js */

'use strict';

const getIteratorCount = bender.tools.core.getIteratorCount;

const modules = bender.amd.require(
	'treemodel/document',
	'treemodel/position',
	'treemodel/element',
	'treemodel/attribute',
	'ckeditorerror' );

describe( 'Batch', () => {
	let Document, Position, Element, Attribute, CKEditorError;

	let doc, root, p1, p2;

	before( () => {
		Document = modules[ 'treemodel/document' ];
		Position = modules[ 'treemodel/position' ];
		Element = modules[ 'treemodel/element' ];
		Attribute = modules[ 'treemodel/attribute' ];
		CKEditorError = modules.ckeditorerror;
	} );

	beforeEach( () => {
		doc = new Document();
		root = doc.createRoot( 'root' );

		p1 = new Element( 'p', [ new Attribute( 'key1', 'value1' ) ], 'foo' );
		p2 = new Element( 'p', [ new Attribute( 'key2', 'value2' ) ], 'bar' );

		root.insertChildren( 0, [ p1, p2 ] );
	} );

	describe( 'merge', () => {
		it( 'should merge foo and bar into foobar', () => {
			doc.batch().merge( new Position( root, [ 1 ] ) );

			expect( root.getChildCount() ).to.equal( 1 );
			expect( root.getChild( 0 ).name ).to.equal( 'p' );
			expect( root.getChild( 0 ).getChildCount() ).to.equal( 6 );
			expect( getIteratorCount( root.getChild( 0 ).getAttrs() ) ).to.equal( 1 );
			expect( root.getChild( 0 ).getAttr( 'key1' ) ).to.equal( 'value1' );
			expect( root.getChild( 0 ).getChild( 0 ).character ).to.equal( 'f' );
			expect( root.getChild( 0 ).getChild( 1 ).character ).to.equal( 'o' );
			expect( root.getChild( 0 ).getChild( 2 ).character ).to.equal( 'o' );
			expect( root.getChild( 0 ).getChild( 3 ).character ).to.equal( 'b' );
			expect( root.getChild( 0 ).getChild( 4 ).character ).to.equal( 'a' );
			expect( root.getChild( 0 ).getChild( 5 ).character ).to.equal( 'r' );
		} );

		it( 'should throw if there is no element after', () => {
			expect( () => {
				doc.batch().merge( new Position( root, [ 2 ] ) );
			} ).to.throw( CKEditorError, /^batch-merge-no-element-after/ );
		} );

		it( 'should throw if there is no element before', () => {
			expect( () => {
				doc.batch().merge( new Position( root, [ 0, 2 ] ) );
			} ).to.throw( CKEditorError, /^batch-merge-no-element-before/ );
		} );

		it( 'should be chainable', () => {
			const batch = doc.batch();

			const chain = batch.merge( new Position( root, [ 1 ] ) );
			expect( chain ).to.equal( batch );
		} );
	} );
} );
