/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import transformations from 'ckeditor5-engine/src/model/delta/basic-transformations';
/*jshint unused: false*/

import transform from 'ckeditor5-engine/src/model/delta/transform';

import Position from 'ckeditor5-engine/src/model/position';
import MoveOperation from 'ckeditor5-engine/src/model/operation/moveoperation';
import Delta from 'ckeditor5-engine/src/model/delta/delta';

import {
	expectDelta,
	getFilledDocument,
} from 'ckeditor5-engine/tests/model/delta/transform/_utils/utils';

describe( 'Delta', () => {
	let doc, root, baseVersion;

	beforeEach( () => {
		doc = getFilledDocument();
		root = doc.getRoot();
		baseVersion = doc.version;
	} );

	it( 'should have baseVersion property, equal to the baseVersion of first operation in Delta or null', () => {
		let deltaA = new Delta();

		expect( deltaA.baseVersion ).to.be.null;

		let version = 5;

		deltaA.addOperation( new MoveOperation( new Position( root, [ 1, 2, 3 ] ), 4, new Position( root, [ 4, 0 ] ), version ) );

		expect( deltaA.baseVersion ).to.equal( 5 );
	} );

	it( 'should be transformable by another Delta', () => {
		let deltaA = new Delta();
		let deltaB = new Delta();

		deltaA.addOperation( new MoveOperation( new Position( root, [ 1, 2, 3 ] ), 4, new Position( root, [ 4, 0 ] ), baseVersion ) );
		deltaB.addOperation( new MoveOperation( new Position( root, [ 1, 2, 0 ] ), 2, new Position( root, [ 4, 1 ] ), baseVersion ) );

		let deltaAbyB = transform( deltaA, deltaB );
		let deltaBbyA = transform( deltaB, deltaA );

		expect( deltaAbyB.length ).to.equal( 1 );

		expectDelta( deltaAbyB[ 0 ], {
			type: Delta,
			operations: [
				{
					type: MoveOperation,
					sourcePosition: new Position( root, [ 1, 2, 1 ] ),
					howMany: 4,
					targetPosition: new Position( root, [ 4, 0 ] ),
					baseVersion: 1
				}
			]
		} );

		expect( deltaBbyA.length ).to.equal( 1 );

		expectDelta( deltaBbyA[ 0 ], {
			type: Delta,
			operations: [
				{
					type: MoveOperation,
					sourcePosition: new Position( root, [ 1, 2, 0 ] ),
					howMany: 2,
					targetPosition: new Position( root, [ 4, 5 ] ),
					baseVersion: 1
				}
			]
		} );
	} );
} );
