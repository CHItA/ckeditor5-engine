/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */
/* bender-tags: view */

import Document from 'ckeditor5-engine/src/view/document';
import AttributeElement from 'ckeditor5-engine/src/view/attributeelement';
import ContainerElement from 'ckeditor5-engine/src/view/containerelement';
import Text from 'ckeditor5-engine/src/view/text';
import TreeWalker from 'ckeditor5-engine/src/view/treewalker';
import Position from 'ckeditor5-engine/src/view/position';
import Range from 'ckeditor5-engine/src/view/range';
import CKEditorError from 'ckeditor5-utils/src/ckeditorerror';

describe( 'TreeWalker', () => {
	let doc, root, img1, paragraph, bold, textAbcd, charY, img2, charX;
	let rootBeginning, rootEnding;

	before( () => {
		doc = new Document();
		root = doc.createRoot( document.createElement( 'div' ) );

		// root
		//  |- img1
		//  |- p
		//     |- b
		//     |  |- A
		//     |  |- B
		//     |  |- C
		//     |  |- D
		//     |
		//     |- Y
		//     |
		//     |- img2
		//     |
		//     |- X

		textAbcd = new Text( 'abcd' );
		bold = new AttributeElement( 'b', null, [ textAbcd ] );
		charY = new Text( 'y' );
		img2 = new ContainerElement( 'img2' );
		charX = new Text( 'x' );

		paragraph = new ContainerElement( 'p', null, [ bold, charY, img2, charX ] );
		img1 = new ContainerElement( 'img1' );

		root.insertChildren( 0, [ img1, paragraph ] );

		rootBeginning = new Position( root, 0 );
		rootEnding = new Position( root, 2 );
	} );

	afterEach( () => {
		doc.destroy();
	} );

	describe( 'constructor()', () => {
		it( 'should throw if neither boundaries nor starting position is set', () => {
			expect( () => {
				new TreeWalker();
			} ).to.throw( CKEditorError, /^view-tree-walker-no-start-position/ );

			expect( () => {
				new TreeWalker( {} );
			} ).to.throw( CKEditorError, /^view-tree-walker-no-start-position/ );

			expect( () => {
				new TreeWalker( { singleCharacters: true } );
			} ).to.throw( CKEditorError, /^view-tree-walker-no-start-position/ );
		} );

		it( 'should throw if walking direction is unknown', () => {
			expect( () => {
				new TreeWalker( { startPosition: rootBeginning, direction: 'unknown' } );
			} ).to.throw( CKEditorError, /^view-tree-walker-unknown-direction/ );
		} );
	} );

	describe( 'iterate from start position `startPosition`', () => {
		let expected;

		beforeEach( () => {
			expected = [
				{
					type: 'elementStart',
					item: img1,
					previousPosition: new Position( root, 0 ),
					nextPosition: new Position( img1, 0 )
				},
				{
					type: 'elementEnd',
					item: img1,
					previousPosition: new Position( img1, 0 ),
					nextPosition: new Position( root, 1 )
				},
				{
					type: 'elementStart',
					item: paragraph,
					previousPosition: new Position( root, 1 ),
					nextPosition: new Position( paragraph, 0 )
				},
				{
					type: 'elementStart',
					item: bold,
					previousPosition: new Position( paragraph, 0 ),
					nextPosition: new Position( bold, 0 )
				},
				{
					type: 'text',
					text: 'abcd',
					previousPosition: new Position( bold, 0 ),
					nextPosition: new Position( bold, 1 )
				},
				{
					type: 'elementEnd',
					item: bold,
					previousPosition: new Position( bold, 1 ),
					nextPosition: new Position( paragraph, 1 )
				},
				{
					type: 'text',
					text: 'y',
					previousPosition: new Position( paragraph, 1 ),
					nextPosition: new Position( paragraph, 2 )
				},
				{
					type: 'elementStart',
					item: img2,
					previousPosition: new Position( paragraph, 2 ),
					nextPosition: new Position( img2, 0 )
				},
				{
					type: 'elementEnd',
					item: img2,
					previousPosition: new Position( img2, 0 ),
					nextPosition: new Position( paragraph, 3 )
				},
				{
					type: 'text',
					text: 'x',
					previousPosition: new Position( paragraph, 3 ),
					nextPosition: new Position( paragraph, 4 )
				},
				{
					type: 'elementEnd',
					item: paragraph,
					previousPosition: new Position( paragraph, 4 ),
					nextPosition: new Position( root, 2 )
				}
			];
		} );

		it( 'should provide iterator interface with default forward direction', () => {
			let iterator = new TreeWalker( { startPosition: rootBeginning } );
			let i = 0;

			for ( let value of iterator ) {
				expectValue( value, expected[ i++ ] );
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should provide iterator interface with forward direction', () => {
			let iterator = new TreeWalker( { startPosition: rootBeginning, direction: 'forward' } );
			let i = 0;

			for ( let value of iterator ) {
				expectValue( value, expected[ i++ ] );
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should provide iterator interface which backward direction', () => {
			let iterator = new TreeWalker( { startPosition: rootEnding, direction: 'backward' } );
			let i = expected.length;

			for ( let value of iterator ) {
				expectValue( value, expected[ --i ], { direction: 'backward' } );
			}

			expect( i ).to.equal( 0 );
		} );

		it( 'should start iterating at the startPosition witch is not a root bound', () => {
			let iterator = new TreeWalker( { startPosition: new Position( root, 1 ) } );
			let i = 2;

			for ( let value of iterator ) {
				expectValue( value, expected[ i++ ] );
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should start iterating at the startPosition witch is not a root bound, going backward', () => {
			let expected = [
				{
					type: 'elementStart',
					item: img1,
					previousPosition: new Position( root, 0 ),
					nextPosition: new Position( img1, 0 )
				},
				{
					type: 'elementEnd',
					item: img1,
					previousPosition: new Position( img1, 0 ),
					nextPosition: new Position( root, 1 )
				}
			];

			let iterator = new TreeWalker( { startPosition: new Position( root, 1 ), direction: 'backward' } );
			let i = expected.length;

			for ( let value of iterator ) {
				expectValue( value, expected[ --i ], { direction: 'backward' } );
			}

			expect( i ).to.equal( 0 );
		} );
	} );

	describe( 'iterate trough the range `boundary`', () => {
		describe( 'range starts between elements', () => {
			let expected, range;

			before( () => {
				expected = [
					{
						type: 'elementStart',
						item: paragraph,
						previousPosition: new Position( root, 1 ),
						nextPosition: new Position( paragraph, 0 )
					},
					{
						type: 'elementStart',
						item: bold,
						previousPosition: new Position( paragraph, 0 ),
						nextPosition: new Position( bold, 0 )
					},
					{
						type: 'text',
						text: 'abcd',
						previousPosition: new Position( bold, 0 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'elementEnd',
						item: bold,
						previousPosition: new Position( bold, 1 ),
						nextPosition: new Position( paragraph, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					},
					{
						type: 'elementEnd',
						item: img2,
						previousPosition: new Position( img2, 0 ),
						nextPosition: new Position( paragraph, 3 )
					}
				];

				range = Range.createFromParentsAndOffsets( root, 1, paragraph, 3 );
			} );

			it( 'should iterating over the range', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should iterating over the range going backward', () => {
				let iterator = new TreeWalker( { boundaries: range, direction: 'backward' } );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range starts inside the text', () => {
			let expected, range;

			before( () => {
				expected = [
					{
						type: 'text',
						text: 'bcd',
						previousPosition: new Position( textAbcd, 1 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'elementEnd',
						item: bold,
						previousPosition: new Position( bold, 1 ),
						nextPosition: new Position( paragraph, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					},
					{
						type: 'elementEnd',
						item: img2,
						previousPosition: new Position( img2, 0 ),
						nextPosition: new Position( paragraph, 3 )
					}
				];

				range = Range.createFromParentsAndOffsets( textAbcd, 1, paragraph, 3 );
			} );

			it( 'should return part of the text', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return part of the text going backward', () => {
				let iterator = new TreeWalker( {
						boundaries: range,
						direction: 'backward'
					}
				);
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range ends inside the text', () => {
			let expected, range;

			before( () => {
				expected = [
					{
						type: 'elementStart',
						item: img1,
						previousPosition: new Position( root, 0 ),
						nextPosition: new Position( img1, 0 )
					},
					{
						type: 'elementEnd',
						item: img1,
						previousPosition: new Position( img1, 0 ),
						nextPosition: new Position( root, 1 )
					},
					{
						type: 'elementStart',
						item: paragraph,
						previousPosition: new Position( root, 1 ),
						nextPosition: new Position( paragraph, 0 )
					},
					{
						type: 'elementStart',
						item: bold,
						previousPosition: new Position( paragraph, 0 ),
						nextPosition: new Position( bold, 0 )
					},
					{
						type: 'text',
						text: 'ab',
						previousPosition: new Position( bold, 0 ),
						nextPosition: new Position( textAbcd, 2 )
					}
				];

				range = new Range( rootBeginning, new Position( textAbcd, 2 ) );
			} );

			it( 'should return part of the text', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return part of the text going backward', () => {
				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: range.end,
					direction: 'backward'
				} );

				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range starts and ends inside the same text', () => {
			let expected, range;

			before( () => {
				expected = [
					{
						type: 'text',
						text: 'bc',
						previousPosition: new Position( textAbcd, 1 ),
						nextPosition: new Position( textAbcd, 3 )
					}
				];

				range = new Range( new Position( textAbcd, 1 ), new Position( textAbcd, 3 ) );
			} );

			it( 'should return part of the text', () => {
				let iterator = new TreeWalker( { boundaries: range } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return part of the text going backward', () => {
				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: range.end,
					direction: 'backward'
				} );

				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'custom start position', () => {
			it( 'should iterating from the start position', () => {
				let expected = [
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					},
					{
						type: 'elementEnd',
						item: img2,
						previousPosition: new Position( img2, 0 ),
						nextPosition: new Position( paragraph, 3 )
					}
				];

				let range = Range.createFromParentsAndOffsets( bold, 1, paragraph, 3 );

				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: new Position( paragraph, 1 )
				} );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should iterating from the start position going backward', () => {
				let expected = [
					{
						type: 'text',
						text: 'bcd',
						previousPosition: new Position( textAbcd, 1 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'elementEnd',
						item: bold,
						previousPosition: new Position( bold, 1 ),
						nextPosition: new Position( paragraph, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					}
				];

				let range = new Range( new Position( textAbcd, 1 ), new Position( paragraph, 3 ) );

				let iterator = new TreeWalker( {
					boundaries: range,
					startPosition: new Position( paragraph, 2 ),
					direction: 'backward'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );
	} );

	describe( 'iterate by every single characters `singleCharacter`', () => {
		describe( 'whole root', () => {
			let expected;

			before( () => {
				expected = [
					{
						type: 'elementStart',
						item: img1,
						previousPosition: new Position( root, 0 ),
						nextPosition: new Position( img1, 0 )
					},
					{
						type: 'elementEnd',
						item: img1,
						previousPosition: new Position( img1, 0 ),
						nextPosition: new Position( root, 1 )
					},
					{
						type: 'elementStart',
						item: paragraph,
						previousPosition: new Position( root, 1 ),
						nextPosition: new Position( paragraph, 0 )
					},
					{
						type: 'elementStart',
						item: bold,
						previousPosition: new Position( paragraph, 0 ),
						nextPosition: new Position( bold, 0 )
					},
					{
						type: 'text',
						text: 'a',
						previousPosition: new Position( bold, 0 ),
						nextPosition: new Position( textAbcd, 1 )
					},
					{
						type: 'text',
						text: 'b',
						previousPosition: new Position( textAbcd, 1 ),
						nextPosition: new Position( textAbcd, 2 )
					},
					{
						type: 'text',
						text: 'c',
						previousPosition: new Position( textAbcd, 2 ),
						nextPosition: new Position( textAbcd, 3 )
					},
					{
						type: 'text',
						text: 'd',
						previousPosition: new Position( textAbcd, 3 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'elementEnd',
						item: bold,
						previousPosition: new Position( bold, 1 ),
						nextPosition: new Position( paragraph, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					},
					{
						type: 'elementEnd',
						item: img2,
						previousPosition: new Position( img2, 0 ),
						nextPosition: new Position( paragraph, 3 )
					},
					{
						type: 'text',
						text: 'x',
						previousPosition: new Position( paragraph, 3 ),
						nextPosition: new Position( paragraph, 4 )
					},
					{
						type: 'elementEnd',
						item: paragraph,
						previousPosition: new Position( paragraph, 4 ),
						nextPosition: new Position( root, 2 )
					}
				];
			} );

			it( 'should return single characters', () => {
				let iterator = new TreeWalker( { startPosition: rootBeginning, singleCharacters: true } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return single characters going backward', () => {
				let iterator = new TreeWalker( {
					startPosition: rootEnding,
					singleCharacters: true,
					direction: 'backward'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'range', () => {
			let range, expected;

			before( () => {
				expected = [
					{
						type: 'text',
						text: 'a',
						previousPosition: new Position( bold, 0 ),
						nextPosition: new Position( textAbcd, 1 )
					},
					{
						type: 'text',
						text: 'b',
						previousPosition: new Position( textAbcd, 1 ),
						nextPosition: new Position( textAbcd, 2 )
					},
					{
						type: 'text',
						text: 'c',
						previousPosition: new Position( textAbcd, 2 ),
						nextPosition: new Position( textAbcd, 3 )
					},
					{
						type: 'text',
						text: 'd',
						previousPosition: new Position( textAbcd, 3 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'elementEnd',
						item: bold,
						previousPosition: new Position( bold, 1 ),
						nextPosition: new Position( paragraph, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					}
				];

				range = new Range( new Position( bold, 0 ), new Position( img2, 0 ) );
			} );

			it( 'should respect boundaries', () => {
				let iterator = new TreeWalker( { boundaries: range, singleCharacters: true } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should respect boundaries going backward', () => {
				let iterator = new TreeWalker( {
					boundaries: range,
					singleCharacters: true,
					direction: 'backward'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );
	} );

	describe( 'iterate omitting child nodes and elementEnd `shallow`', () => {
		let expected;

		before( () => {
			expected = [
				{
					type: 'elementStart',
					item: img1,
					previousPosition: new Position( root, 0 ),
					nextPosition: new Position( root, 1 )
				},
				{
					type: 'elementStart',
					item: paragraph,
					previousPosition: new Position( root, 1 ),
					nextPosition: new Position( root, 2 )
				}
			];
		} );

		it( 'should not enter elements', () => {
			let iterator = new TreeWalker( { startPosition: rootBeginning, shallow: true } );
			let i = 0;

			for ( let value of iterator ) {
				expectValue( value, expected[ i++ ] );
			}

			expect( i ).to.equal( expected.length );
		} );

		it( 'should not enter elements going backward', () => {
			let iterator = new TreeWalker( { startPosition: rootEnding, shallow: true, direction: 'backward' } );
			let i = expected.length;

			for ( let value of iterator ) {
				expectValue( value, expected[ --i ], { direction: 'backward' } );
			}

			expect( i ).to.equal( 0 );
		} );
	} );

	describe( 'iterate omitting elementEnd `ignoreElementEnd`', () => {
		describe( 'merged text', () => {
			let expected;

			before( () => {
				expected = [
					{
						type: 'elementStart',
						item: img1,
						previousPosition: new Position( root, 0 ),
						nextPosition: new Position( img1, 0 )
					},
					{
						type: 'elementStart',
						item: paragraph,
						previousPosition: new Position( root, 1 ),
						nextPosition: new Position( paragraph, 0 )
					},
					{
						type: 'elementStart',
						item: bold,
						previousPosition: new Position( paragraph, 0 ),
						nextPosition: new Position( bold, 0 )
					},
					{
						type: 'text',
						text: 'abcd',
						previousPosition: new Position( bold, 0 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					},
					{
						type: 'text',
						text: 'x',
						previousPosition: new Position( paragraph, 3 ),
						nextPosition: new Position( paragraph, 4 )
					}
				];
			} );

			it( 'should iterate ignoring elementEnd', () => {
				let iterator = new TreeWalker( { startPosition: rootBeginning, ignoreElementEnd: true } );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should iterate ignoring elementEnd going backward', () => {
				let iterator = new TreeWalker( {
					startPosition: rootEnding,
					ignoreElementEnd: true,
					direction: 'backward'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );

		describe( 'single character', () => {
			let expected;

			before( () => {
				expected = [
					{
						type: 'elementStart',
						item: img1,
						previousPosition: new Position( root, 0 ),
						nextPosition: new Position( img1, 0 )
					},
					{
						type: 'elementStart',
						item: paragraph,
						previousPosition: new Position( root, 1 ),
						nextPosition: new Position( paragraph, 0 )
					},
					{
						type: 'elementStart',
						item: bold,
						previousPosition: new Position( paragraph, 0 ),
						nextPosition: new Position( bold, 0 )
					},
					{
						type: 'text',
						text: 'a',
						previousPosition: new Position( bold, 0 ),
						nextPosition: new Position( textAbcd, 1 )
					},
					{
						type: 'text',
						text: 'b',
						previousPosition: new Position( textAbcd, 1 ),
						nextPosition: new Position( textAbcd, 2 )
					},
					{
						type: 'text',
						text: 'c',
						previousPosition: new Position( textAbcd, 2 ),
						nextPosition: new Position( textAbcd, 3 )
					},
					{
						type: 'text',
						text: 'd',
						previousPosition: new Position( textAbcd, 3 ),
						nextPosition: new Position( bold, 1 )
					},
					{
						type: 'text',
						text: 'y',
						previousPosition: new Position( paragraph, 1 ),
						nextPosition: new Position( paragraph, 2 )
					},
					{
						type: 'elementStart',
						item: img2,
						previousPosition: new Position( paragraph, 2 ),
						nextPosition: new Position( img2, 0 )
					},
					{
						type: 'text',
						text: 'x',
						previousPosition: new Position( paragraph, 3 ),
						nextPosition: new Position( paragraph, 4 )
					}
				];
			} );

			it( 'should return single characters ignoring elementEnd', () => {
				let iterator = new TreeWalker( {
					startPosition: rootBeginning,
					singleCharacters: true,
					ignoreElementEnd: true
				} );
				let i = 0;

				for ( let value of iterator ) {
					expectValue( value, expected[ i++ ] );
				}

				expect( i ).to.equal( expected.length );
			} );

			it( 'should return single characters ignoring elementEnd going backward', () => {
				let iterator = new TreeWalker( {
					startPosition: rootEnding,
					singleCharacters: true,
					ignoreElementEnd: true,
					direction: 'backward'
				} );
				let i = expected.length;

				for ( let value of iterator ) {
					expectValue( value, expected[ --i ], { direction: 'backward' } );
				}

				expect( i ).to.equal( 0 );
			} );
		} );
	} );
} );

function expectValue( value, expected, options = {} ) {
	let expectedPreviousPosition, expectedNextPosition;

	if ( options.direction == 'backward' ) {
		expectedNextPosition = expected.previousPosition;
		expectedPreviousPosition = expected.nextPosition;
	} else {
		expectedNextPosition = expected.nextPosition;
		expectedPreviousPosition = expected.previousPosition;
	}

	expect( value.type ).to.equal( expected.type );
	expect( value.previousPosition ).to.deep.equal( expectedPreviousPosition );
	expect( value.nextPosition ).to.deep.equal( expectedNextPosition );

	if ( value.type == 'text' ) {
		expectText( value, expected );
	} else if ( value.type == 'elementStart' ) {
		expectStart( value, expected );
	} else if ( value.type == 'elementEnd' ) {
		expectEnd( value, expected );
	}
}

function expectText( value, expected ) {
	expect( value.item.data ).to.equal( expected.text );
	expect( value.length ).to.equal( value.item.data.length );
}

function expectStart( value, expected ) {
	expect( value.item ).to.equal( expected.item );
	expect( value.length ).to.equal( 1 );
}

function expectEnd( value, expected ) {
	expect( value.item ).to.equal( expected.item );
	expect( value.length ).to.be.undefined;
}
