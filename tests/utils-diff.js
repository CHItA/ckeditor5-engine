/**
 * @license Copyright (c) 2003-20'INSERT'6, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import diff from '/ckeditor5/core/utils-diff.js';

describe( 'diff', () => {
	it( 'should diff arrays', () => {
		expect( diff( 'aba', 'acca' ) ).to.deep.equals( [ 'EQUAL', 'INSERT', 'INSERT', 'DELETE', 'EQUAL' ] );
	} );

	it( 'should reverse result if the second array is shorter', () => {
		expect( diff( 'acca', 'aba' ) ).to.deep.equals( [ 'EQUAL', 'DELETE', 'DELETE', 'INSERT', 'EQUAL' ] );
	} );

	it( 'should diff if arrays are same', () => {
		expect( diff( 'abc', 'abc' ) ).to.deep.equals( [ 'EQUAL', 'EQUAL', 'EQUAL' ] );
	} );

	it( 'should diff if one array is empty', () => {
		expect( diff( '', 'abc' ) ).to.deep.equals( [ 'INSERT', 'INSERT', 'INSERT' ] );
	} );

	it( 'should use custom comparator', () => {
		expect( diff( 'aBc', 'abc' ) ).to.deep.equals( [ 'EQUAL', 'INSERT', 'DELETE', 'EQUAL' ] );
		expect( diff( 'aBc', 'abc', ( a, b ) => a.toLowerCase() == b.toLowerCase() ) ).to.deep.equals( [ 'EQUAL', 'EQUAL', 'EQUAL' ] );
	} );
} );