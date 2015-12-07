/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: document */

'use strict';

const modules = bender.amd.require(
	'treemodel/document',
	'treemodel/operation/reinsertoperation',
	'treemodel/operation/removeoperation',
	'treemodel/operation/moveoperation',
	'treemodel/position'
);

describe( 'ReinsertOperation', () => {
	let Document, ReinsertOperation, RemoveOperation, MoveOperation, Position;

	before( () => {
		Document = modules[ 'treemodel/document' ];
		ReinsertOperation = modules[ 'treemodel/operation/reinsertoperation' ];
		RemoveOperation = modules[ 'treemodel/operation/removeoperation' ];
		MoveOperation = modules[ 'treemodel/operation/moveoperation' ];
		Position = modules[ 'treemodel/position' ];
	} );

	let doc, root, graveyard, operation, graveyardPosition, rootPosition;

	beforeEach( () => {
		doc = new Document();
		root = doc.createRoot( 'root' );
		graveyard = doc.graveyard;

		graveyardPosition = new Position( graveyard, [ 0 ] );
		rootPosition = new Position( root, [ 0 ] );

		operation = new ReinsertOperation(
			graveyardPosition,
			2,
			rootPosition,
			doc.version
		);
	} );

	it( 'should have proper type', () => {
		expect( operation.type ).to.equal( 'reinsert' );
	} );

	it( 'should extend MoveOperation class', () => {
		expect( operation ).to.be.instanceof( MoveOperation );
	} );

	it( 'should create a remove operation as a reverse', () => {
		let reverse = operation.getReversed();

		expect( reverse ).to.be.an.instanceof( RemoveOperation );
		expect( reverse.baseVersion ).to.equal( 1 );
		expect( reverse.howMany ).to.equal( 2 );
		expect( reverse.sourcePosition.isEqual( rootPosition ) ).to.be.true;
		expect( reverse.targetPosition.isEqual( graveyardPosition ) ).to.be.true;
	} );

	it( 'should undo reinsert set of nodes by applying reverse operation', () => {
		let reverse = operation.getReversed();

		graveyard.insertChildren( 0, 'bar' );

		doc.applyOperation( operation );

		expect( doc.version ).to.equal( 1 );
		expect( root.getChildCount() ).to.equal( 2 );

		doc.applyOperation( reverse );

		expect( doc.version ).to.equal( 2 );
		expect( root.getChildCount() ).to.equal( 0 );
		expect( graveyard.getChildCount() ).to.equal( 3 );

		expect( graveyard.getChild( 0 ).character ).to.equal( 'b' );
		expect( graveyard.getChild( 1 ).character ).to.equal( 'a' );
		expect( graveyard.getChild( 2 ).character ).to.equal( 'r' );
	} );
} );
