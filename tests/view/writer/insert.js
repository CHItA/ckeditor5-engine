/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: view, browser-only */

import { insert } from 'ckeditor5/engine/view/writer.js';
import ContainerElement from 'ckeditor5/engine/view/containerelement.js';
import Element from 'ckeditor5/engine/view/element.js';
import Position from 'ckeditor5/engine/view/position.js';
import CKEditorError from 'ckeditor5/utils/ckeditorerror.js';
import { stringify, parse } from 'ckeditor5/engine/dev-utils/view.js';
import AttributeElement from 'ckeditor5/engine/view/attributeelement.js';

describe( 'writer', () => {
	/**
	 * Executes test using `parse` and `stringify` utils functions.
	 *
	 * @param {String} input
	 * @param {Array.<String>} nodesToInsert
	 * @param {String} expected
	 */
	function test( input, nodesToInsert, expected ) {
		nodesToInsert = nodesToInsert.map( node => parse( node ) );
		let { view, selection } = parse( input );

		const newRange = insert( selection.getFirstPosition(), nodesToInsert );
		expect( stringify( view.root, newRange, { showType: true, showPriority: true } ) ).to.equal( expected );
	}

	describe( 'insert', () => {
		it( 'should return collapsed range in insertion position when using empty array', () => {
			test(
				'<container:p>foo{}bar</container:p>',
				[],
				'<container:p>foo{}bar</container:p>'
			);
		} );

		it( 'should insert text into another text node #1', () => {
			test(
				'<container:p>foo{}bar</container:p>',
				[ 'baz' ],
				'<container:p>foo{baz}bar</container:p>'
			);
		} );

		it( 'should insert text into another text node #2', () => {
			test(
				'<container:p>foobar{}</container:p>',
				[ 'baz' ],
				'<container:p>foobar{baz]</container:p>'
			);
		} );

		it( 'should insert text into another text node #3', () => {
			test(
				'<container:p>{}foobar</container:p>',
				[ 'baz' ],
				'<container:p>[baz}foobar</container:p>'
			);
		} );

		it( 'should break attributes when inserting into text node', () => {
			test(
				'<container:p>foo{}bar</container:p>',
				[ '<attribute:b view-priority="1">baz</attribute:b>' ],
				'<container:p>foo[<attribute:b view-priority="1">baz</attribute:b>]bar</container:p>'
			);
		} );

		it( 'should merge text nodes', () => {
			test(
				'<container:p>[]foobar</container:p>',
				[ 'baz' ],
				'<container:p>[baz}foobar</container:p>'
			);
		} );

		it( 'should merge same attribute nodes', () => {
			test(
				'<container:p><attribute:b view-priority="1">foo{}bar</attribute:b></container:p>',
				[ '<attribute:b view-priority="1">baz</attribute:b>' ],
				'<container:p><attribute:b view-priority="1">foo{baz}bar</attribute:b></container:p>'
			);
		} );

		it( 'should not merge different attributes', () => {
			test(
				'<container:p><attribute:b view-priority="1">foo{}bar</attribute:b></container:p>',
				[ '<attribute:b view-priority="2">baz</attribute:b>' ],
				'<container:p>' +
					'<attribute:b view-priority="1">' +
						'foo' +
					'</attribute:b>' +
					'[' +
					'<attribute:b view-priority="2">' +
						'baz' +
					'</attribute:b>' +
					']' +
					'<attribute:b view-priority="1">' +
						'bar' +
					'</attribute:b>' +
				'</container:p>'
			);
		} );

		it( 'should allow to insert multiple nodes', () => {
			test(
				'<container:p>[]</container:p>',
				[ '<attribute:b view-priority="1">foo</attribute:b>', 'bar' ],
				'<container:p>[<attribute:b view-priority="1">foo</attribute:b>bar]</container:p>'
			);
		} );

		it( 'should merge after inserting multiple nodes', () => {
			test(
				'<container:p><attribute:b view-priority="1">qux</attribute:b>[]baz</container:p>',
				[ '<attribute:b view-priority="1">foo</attribute:b>', 'bar' ],
				'<container:p><attribute:b view-priority="1">qux{foo</attribute:b>bar}baz</container:p>'
			);
		} );

		it( 'should insert text into in document fragment', () => {
			test(
				'foo{}bar',
				[ 'baz' ],
				'foo{baz}bar'
			);
		} );

		it( 'should merge same attribute nodes in document fragment', () => {
			test(
				'<attribute:b view-priority="2">foo</attribute:b>[]',
				[ '<attribute:b view-priority="1">bar</attribute:b>' ],
				'<attribute:b view-priority="2">foo</attribute:b>[<attribute:b view-priority="1">bar</attribute:b>]'
			);
		} );

		it( 'should insert unicode text into unicode text', () => {
			test(
				'நி{}க்கு',
				[ 'லை' ],
				'நி{லை}க்கு'
			);
		} );

		it( 'should throw when inserting Element', () => {
			const element = new Element( 'b' );
			const container = new ContainerElement( 'p' );
			const position = new Position( container, 0 );
			expect( () => {
				insert( position, element );
			} ).to.throw( CKEditorError, 'view-writer-insert-invalid-node' );
		} );

		it( 'should throw when Element is inserted as child node', () => {
			const element = new Element( 'b' );
			const root = new ContainerElement( 'p', null, element );
			const container = new ContainerElement( 'p' );
			const position = new Position( container, 0 );

			expect( () => {
				insert( position, root );
			} ).to.throw( CKEditorError, 'view-writer-insert-invalid-node' );
		} );

		it( 'should throw when position is not placed inside container', () => {
			const element = new Element( 'b' );
			const position = new Position( element, 0 );
			const attributeElement = new AttributeElement( 'i' );

			expect( () => {
				insert( position, attributeElement );
			} ).to.throw( CKEditorError, 'view-writer-invalid-position-container' );
		} );

		it( 'should allow to insert EmptyElement into container', () => {
			test(
				'<container:p>[]</container:p>',
				[ '<empty:img></empty:img>' ],
				'<container:p>[<empty:img></empty:img>]</container:p>'
			);
		} );
	} );
} );
