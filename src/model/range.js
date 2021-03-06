/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/model/range
 */

import Position from './position';
import TreeWalker from './treewalker';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import compareArrays from '@ckeditor/ckeditor5-utils/src/comparearrays';

/**
 * Range class. Range is iterable.
 */
export default class Range {
	/**
	 * Creates a range spanning from `start` position to `end` position.
	 *
	 * **Note:** Constructor creates it's own {@link module:engine/model/position~Position Position} instances basing on passed values.
	 *
	 * @param {module:engine/model/position~Position} start Start position.
	 * @param {module:engine/model/position~Position} [end] End position. If not set, range will be collapsed at `start` position.
	 */
	constructor( start, end = null ) {
		/**
		 * Start position.
		 *
		 * @readonly
		 * @member {module:engine/model/position~Position}
		 */
		this.start = Position.createFromPosition( start );

		/**
		 * End position.
		 *
		 * @readonly
		 * @member {module:engine/model/position~Position}
		 */
		this.end = end ? Position.createFromPosition( end ) : Position.createFromPosition( start );

		this.start.stickiness = this.isCollapsed ? 'toNone' : 'toNext';
		this.end.stickiness = this.isCollapsed ? 'toNone' : 'toPrevious';
	}

	/**
	 * Iterable interface.
	 *
	 * Iterates over all {@link module:engine/model/item~Item items} that are in this range and returns
	 * them together with additional information like length or {@link module:engine/model/position~Position positions},
	 * grouped as {@link module:engine/model/treewalker~TreeWalkerValue}.
	 * It iterates over all {@link module:engine/model/textproxy~TextProxy text contents} that are inside the range
	 * and all the {@link module:engine/model/element~Element}s that are entered into when iterating over this range.
	 *
	 * This iterator uses {@link module:engine/model/treewalker~TreeWalker} with `boundaries` set to this range
	 * and `ignoreElementEnd` option set to `true`.
	 *
	 * @returns {Iterable.<module:engine/model/treewalker~TreeWalkerValue>}
	 */
	* [ Symbol.iterator ]() {
		yield* new TreeWalker( { boundaries: this, ignoreElementEnd: true } );
	}

	/**
	 * Returns whether the range is collapsed, that is if {@link #start} and
	 * {@link #end} positions are equal.
	 *
	 * @type {Boolean}
	 */
	get isCollapsed() {
		return this.start.isEqual( this.end );
	}

	/**
	 * Returns whether this range is flat, that is if {@link #start} position and
	 * {@link #end} position are in the same {@link module:engine/model/position~Position#parent}.
	 *
	 * @type {Boolean}
	 */
	get isFlat() {
		const startParentPath = this.start.getParentPath();
		const endParentPath = this.end.getParentPath();

		return compareArrays( startParentPath, endParentPath ) == 'same';
	}

	/**
	 * Range root element.
	 *
	 * @type {module:engine/model/element~Element|module:engine/model/documentfragment~DocumentFragment}
	 */
	get root() {
		return this.start.root;
	}

	/**
	 * Checks whether this range contains given {@link module:engine/model/position~Position position}.
	 *
	 * @param {module:engine/model/position~Position} position Position to check.
	 * @returns {Boolean} `true` if given {@link module:engine/model/position~Position position} is contained
	 * in this range,`false` otherwise.
	 */
	containsPosition( position ) {
		return position.isAfter( this.start ) && position.isBefore( this.end );
	}

	/**
	 * Checks whether this range contains given {@link ~Range range}.
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to check.
	 * @param {Boolean} [loose=false] Whether the check is loose or strict. If the check is strict (`false`), compared range cannot
	 * start or end at the same position as this range boundaries. If the check is loose (`true`), compared range can start, end or
	 * even be equal to this range. Note that collapsed ranges are always compared in strict mode.
	 * @returns {Boolean} `true` if given {@link ~Range range} boundaries are contained by this range, `false` otherwise.
	 */
	containsRange( otherRange, loose = false ) {
		if ( otherRange.isCollapsed ) {
			loose = false;
		}

		const containsStart = this.containsPosition( otherRange.start ) || ( loose && this.start.isEqual( otherRange.start ) );
		const containsEnd = this.containsPosition( otherRange.end ) || ( loose && this.end.isEqual( otherRange.end ) );

		return containsStart && containsEnd;
	}

	/**
	 * Checks whether given {@link module:engine/model/item~Item} is inside this range.
	 *
	 * @param {module:engine/model/item~Item} item Model item to check.
	 */
	containsItem( item ) {
		const pos = Position.createBefore( item );

		return this.containsPosition( pos ) || this.start.isEqual( pos );
	}

	/**
	 * Two ranges are equal if their {@link #start} and {@link #end} positions are equal.
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to compare with.
	 * @returns {Boolean} `true` if ranges are equal, `false` otherwise.
	 */
	isEqual( otherRange ) {
		return this.start.isEqual( otherRange.start ) && this.end.isEqual( otherRange.end );
	}

	/**
	 * Checks and returns whether this range intersects with given range.
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to compare with.
	 * @returns {Boolean} `true` if ranges intersect, `false` otherwise.
	 */
	isIntersecting( otherRange ) {
		return this.start.isBefore( otherRange.end ) && this.end.isAfter( otherRange.start );
	}

	/**
	 * Computes which part(s) of this {@link ~Range range} is not a part of given {@link ~Range range}.
	 * Returned array contains zero, one or two {@link ~Range ranges}.
	 *
	 * Examples:
	 *
	 *		let range = new Range( new Position( root, [ 2, 7 ] ), new Position( root, [ 4, 0, 1 ] ) );
	 *		let otherRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 5 ] ) );
	 *		let transformed = range.getDifference( otherRange );
	 *		// transformed array has no ranges because `otherRange` contains `range`
	 *
	 *		otherRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 3 ] ) );
	 *		transformed = range.getDifference( otherRange );
	 *		// transformed array has one range: from [ 3 ] to [ 4, 0, 1 ]
	 *
	 *		otherRange = new Range( new Position( root, [ 3 ] ), new Position( root, [ 4 ] ) );
	 *		transformed = range.getDifference( otherRange );
	 *		// transformed array has two ranges: from [ 2, 7 ] to [ 3 ] and from [ 4 ] to [ 4, 0, 1 ]
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to differentiate against.
	 * @returns {Array.<module:engine/model/range~Range>} The difference between ranges.
	 */
	getDifference( otherRange ) {
		const ranges = [];

		if ( this.isIntersecting( otherRange ) ) {
			// Ranges intersect.

			if ( this.containsPosition( otherRange.start ) ) {
				// Given range start is inside this range. This means that we have to
				// add shrunken range - from the start to the middle of this range.
				ranges.push( new Range( this.start, otherRange.start ) );
			}

			if ( this.containsPosition( otherRange.end ) ) {
				// Given range end is inside this range. This means that we have to
				// add shrunken range - from the middle of this range to the end.
				ranges.push( new Range( otherRange.end, this.end ) );
			}
		} else {
			// Ranges do not intersect, return the original range.
			ranges.push( Range.createFromRange( this ) );
		}

		return ranges;
	}

	/**
	 * Returns an intersection of this {@link ~Range range} and given {@link ~Range range}.
	 * Intersection is a common part of both of those ranges. If ranges has no common part, returns `null`.
	 *
	 * Examples:
	 *
	 *		let range = new Range( new Position( root, [ 2, 7 ] ), new Position( root, [ 4, 0, 1 ] ) );
	 *		let otherRange = new Range( new Position( root, [ 1 ] ), new Position( root, [ 2 ] ) );
	 *		let transformed = range.getIntersection( otherRange ); // null - ranges have no common part
	 *
	 *		otherRange = new Range( new Position( root, [ 3 ] ), new Position( root, [ 5 ] ) );
	 *		transformed = range.getIntersection( otherRange ); // range from [ 3 ] to [ 4, 0, 1 ]
	 *
	 * @param {module:engine/model/range~Range} otherRange Range to check for intersection.
	 * @returns {module:engine/model/range~Range|null} A common part of given ranges or `null` if ranges have no common part.
	 */
	getIntersection( otherRange ) {
		if ( this.isIntersecting( otherRange ) ) {
			// Ranges intersect, so a common range will be returned.
			// At most, it will be same as this range.
			let commonRangeStart = this.start;
			let commonRangeEnd = this.end;

			if ( this.containsPosition( otherRange.start ) ) {
				// Given range start is inside this range. This means thaNt we have to
				// shrink common range to the given range start.
				commonRangeStart = otherRange.start;
			}

			if ( this.containsPosition( otherRange.end ) ) {
				// Given range end is inside this range. This means that we have to
				// shrink common range to the given range end.
				commonRangeEnd = otherRange.end;
			}

			return new Range( commonRangeStart, commonRangeEnd );
		}

		// Ranges do not intersect, so they do not have common part.
		return null;
	}

	/**
	 * Computes and returns the smallest set of {@link #isFlat flat} ranges, that covers this range in whole.
	 *
	 * See an example of a model structure (`[` and `]` are range boundaries):
	 *
	 *		root                                                            root
	 *		 |- element DIV                         DIV             P2              P3             DIV
	 *		 |   |- element H                   H        P1        f o o           b a r       H         P4
	 *		 |   |   |- "fir[st"             fir[st     lorem                               se]cond     ipsum
	 *		 |   |- element P1
	 *		 |   |   |- "lorem"                                              ||
	 *		 |- element P2                                                   ||
	 *		 |   |- "foo"                                                    VV
	 *		 |- element P3
	 *		 |   |- "bar"                                                   root
	 *		 |- element DIV                         DIV             [P2             P3]             DIV
	 *		 |   |- element H                   H       [P1]       f o o           b a r        H         P4
	 *		 |   |   |- "se]cond"            fir[st]    lorem                               [se]cond     ipsum
	 *		 |   |- element P4
	 *		 |   |   |- "ipsum"
	 *
	 * As it can be seen, letters contained in the range are: `stloremfoobarse`, spread across different parents.
	 * We are looking for minimal set of flat ranges that contains the same nodes.
	 *
	 * Minimal flat ranges for above range `( [ 0, 0, 3 ], [ 3, 0, 2 ] )` will be:
	 *
	 *		( [ 0, 0, 3 ], [ 0, 0, 5 ] ) = "st"
	 *		( [ 0, 1 ], [ 0, 2 ] ) = element P1 ("lorem")
	 *		( [ 1 ], [ 3 ] ) = element P2, element P3 ("foobar")
	 *		( [ 3, 0, 0 ], [ 3, 0, 2 ] ) = "se"
	 *
	 * **Note:** if an {@link module:engine/model/element~Element element} is not wholly contained in this range, it won't be returned
	 * in any of the returned flat ranges. See in the example how `H` elements at the beginning and at the end of the range
	 * were omitted. Only their parts that were wholly in the range were returned.
	 *
	 * **Note:** this method is not returning flat ranges that contain no nodes.
	 *
	 * @returns {Array.<module:engine/model/range~Range>} Array of flat ranges covering this range.
	 */
	getMinimalFlatRanges() {
		const ranges = [];
		const diffAt = this.start.getCommonPath( this.end ).length;

		const pos = Position.createFromPosition( this.start );
		let posParent = pos.parent;

		// Go up.
		while ( pos.path.length > diffAt + 1 ) {
			const howMany = posParent.maxOffset - pos.offset;

			if ( howMany !== 0 ) {
				ranges.push( new Range( pos, pos.getShiftedBy( howMany ) ) );
			}

			pos.path = pos.path.slice( 0, -1 );
			pos.offset++;
			posParent = posParent.parent;
		}

		// Go down.
		while ( pos.path.length <= this.end.path.length ) {
			const offset = this.end.path[ pos.path.length - 1 ];
			const howMany = offset - pos.offset;

			if ( howMany !== 0 ) {
				ranges.push( new Range( pos, pos.getShiftedBy( howMany ) ) );
			}

			pos.offset = offset;
			pos.path.push( 0 );
		}

		return ranges;
	}

	/**
	 * Creates a {@link module:engine/model/treewalker~TreeWalker TreeWalker} instance with this range as a boundary.
	 *
	 * @param {Object} options Object with configuration options. See {@link module:engine/model/treewalker~TreeWalker}.
	 * @param {module:engine/model/position~Position} [options.startPosition]
	 * @param {Boolean} [options.singleCharacters=false]
	 * @param {Boolean} [options.shallow=false]
	 * @param {Boolean} [options.ignoreElementEnd=false]
	 */
	getWalker( options = {} ) {
		options.boundaries = this;

		return new TreeWalker( options );
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/item~Item items} that are in this range and returns
	 * them.
	 *
	 * This method uses {@link module:engine/model/treewalker~TreeWalker} with `boundaries` set to this range and `ignoreElementEnd` option
	 * set to `true`. However it returns only {@link module:engine/model/item~Item model items},
	 * not {@link module:engine/model/treewalker~TreeWalkerValue}.
	 *
	 * You may specify additional options for the tree walker. See {@link module:engine/model/treewalker~TreeWalker} for
	 * a full list of available options.
	 *
	 * @method getItems
	 * @param {Object} options Object with configuration options. See {@link module:engine/model/treewalker~TreeWalker}.
	 * @returns {Iterable.<module:engine/model/item~Item>}
	 */
	* getItems( options = {} ) {
		options.boundaries = this;
		options.ignoreElementEnd = true;

		const treeWalker = new TreeWalker( options );

		for ( const value of treeWalker ) {
			yield value.item;
		}
	}

	/**
	 * Returns an iterator that iterates over all {@link module:engine/model/position~Position positions} that are boundaries or
	 * contained in this range.
	 *
	 * This method uses {@link module:engine/model/treewalker~TreeWalker} with `boundaries` set to this range. However it returns only
	 * {@link module:engine/model/position~Position positions}, not {@link module:engine/model/treewalker~TreeWalkerValue}.
	 *
	 * You may specify additional options for the tree walker. See {@link module:engine/model/treewalker~TreeWalker} for
	 * a full list of available options.
	 *
	 * @param {Object} options Object with configuration options. See {@link module:engine/model/treewalker~TreeWalker}.
	 * @returns {Iterable.<module:engine/model/position~Position>}
	 */
	* getPositions( options = {} ) {
		options.boundaries = this;

		const treeWalker = new TreeWalker( options );

		yield treeWalker.position;

		for ( const value of treeWalker ) {
			yield value.nextPosition;
		}
	}

	/**
	 * Returns a range that is a result of transforming this range by given `operation`.
	 *
	 * **Note:** transformation may break one range into multiple ranges (for example, when a part of the range is
	 * moved to a different part of document tree). For this reason, an array is returned by this method and it
	 * may contain one or more `Range` instances.
	 *
	 * @param {module:engine/model/operation/operation~Operation} operation Operation to transform range by.
	 * @returns {Array.<module:engine/model/range~Range>} Range which is the result of transformation.
	 */
	getTransformedByOperation( operation ) {
		switch ( operation.type ) {
			case 'insert':
				return this._getTransformedByInsertOperation( operation );
			case 'move':
			case 'remove':
			case 'reinsert':
				return this._getTransformedByMoveOperation( operation );
			case 'split':
				return [ this._getTransformedBySplitOperation( operation ) ];
			case 'merge':
				return [ this._getTransformedByMergeOperation( operation ) ];
			case 'wrap':
				return [ this._getTransformedByWrapOperation( operation ) ];
			case 'unwrap':
				return [ this._getTransformedByUnwrapOperation( operation ) ];
		}

		return [ Range.createFromRange( this ) ];
	}

	/**
	 * Returns a range that is a result of transforming this range by multiple `operations`.
	 *
	 * **Note:** transformation may break one range into multiple ranges (e.g. when a part of the range is
	 * moved to a different part of document tree). For this reason, an array is returned by this method and it
	 * may contain one or more `Range` instances.
	 *
	 * @param {Iterable.<module:engine/model/operation/operation~Operation>} operations Operations to transform the range by.
	 * @returns {Array.<module:engine/model/range~Range>} Range which is the result of transformation.
	 */
	getTransformedByOperations( operations ) {
		const ranges = [ Range.createFromRange( this ) ];

		for ( const operation of operations ) {
			for ( let i = 0; i < ranges.length; i++ ) {
				const result = ranges[ i ].getTransformedByOperation( operation );

				ranges.splice( i, 1, ...result );
				i += result.length - 1;
			}
		}

		// It may happen that a range is split into two, and then the part of second "piece" is moved into first
		// "piece". In this case we will have incorrect third range, which should not be included in the result --
		// because it is already included in the first "piece". In this loop we are looking for all such ranges that
		// are inside other ranges and we simply remove them.
		for ( let i = 0; i < ranges.length; i++ ) {
			const range = ranges[ i ];

			for ( let j = i + 1; j < ranges.length; j++ ) {
				const next = ranges[ j ];

				if ( range.containsRange( next ) || next.containsRange( range ) || range.isEqual( next ) ) {
					ranges.splice( j, 1 );
				}
			}
		}

		return ranges;
	}

	/**
	 * Returns an {@link module:engine/model/element~Element} or {@link module:engine/model/documentfragment~DocumentFragment}
	 * which is a common ancestor of the range's both ends (in which the entire range is contained).
	 *
	 * @returns {module:engine/model/element~Element|module:engine/model/documentfragment~DocumentFragment|null}
	 */
	getCommonAncestor() {
		return this.start.getCommonAncestor( this.end );
	}

	/**
	 * Converts `Range` to plain object and returns it.
	 *
	 * @returns {Object} `Node` converted to plain object.
	 */
	toJSON() {
		return {
			start: this.start.toJSON(),
			end: this.end.toJSON()
		};
	}

	_getTransformedByInsertOperation( operation, spread = false ) {
		return this._getTransformedByInsertion( operation.position, operation.howMany, spread );
	}

	/**
	 * @protected
	 * @returns {Array.<module:engine/model/range~Range>}
	 */
	_getTransformedByMoveOperation( operation, spread = false ) {
		const sourcePosition = operation.sourcePosition;
		const howMany = operation.howMany;
		const targetPosition = operation.targetPosition;

		return this._getTransformedByMove( sourcePosition, targetPosition, howMany, spread );
	}

	_getTransformedBySplitOperation( operation ) {
		const start = this.start._getTransformedBySplitOperation( operation );
		const end = this.end._getTransformedBySplitOperation( operation );

		return new Range( start, end );
	}

	_getTransformedByMergeOperation( operation ) {
		let start = this.start._getTransformedByMergeOperation( operation );
		let end = this.end._getTransformedByMergeOperation( operation );

		if ( start.root != end.root ) {
			// This happens when only start or end was next to the merged (deleted) element. In this case we need to fix
			// the range cause its boundaries would be in different roots.
			if ( start.root != this.root ) {
				// Fix start position root at it was the only one that was moved.
				start = this.start;
			} else {
				// Fix end position root.
				end = this.end.getShiftedBy( -1 );
			}
		}

		if ( start.isAfter( end ) ) {
			// This happens in the following two, similar cases:
			//
			// Case 1: Range start is directly before merged node.
			//         Resulting range should include only nodes from the merged element:
			//
			// Before: <p>aa</p>{<p>b}b</p><p>cc</p>
			// Merge:  <p>aab}b</p>{<p>cc</p>
			// Fix:    <p>aa{b}b</p><p>cc</p>
			//
			// Case 2: Range start is not directly before merged node.
			//         Result should include all nodes that were in the original range.
			//
			// Before: <p>aa</p>{<p>cc</p><p>b}b</p>
			// Merge:  <p>aab}b</p>{<p>cc</p>
			// Fix:    <p>aa{bb</p><p>cc</p>}
			//
			//         The range is expanded by an additional `b` letter but it is better than dropping the whole `cc` paragraph.
			//
			if ( !operation.deletionPosition.isEqual( start ) ) {
				// Case 2.
				end = operation.deletionPosition;
			}

			// In both cases start is at the end of the merge-to element.
			start = operation.targetPosition;

			return new Range( start, end );
		}

		return new Range( start, end );
	}

	_getTransformedByWrapOperation( operation ) {
		const start = this.start._getTransformedByWrapOperation( operation );
		const end = this.end._getTransformedByWrapOperation( operation );

		return new Range( start, end );
	}

	_getTransformedByUnwrapOperation( operation ) {
		const start = this.start._getTransformedByUnwrapOperation( operation );
		const end = this.end._getTransformedByUnwrapOperation( operation );

		return new Range( start, end );
	}

	/**
	 * Returns an array containing one or two {@link ~Range ranges} that are a result of transforming this
	 * {@link ~Range range} by inserting `howMany` nodes at `insertPosition`. Two {@link ~Range ranges} are
	 * returned if the insertion was inside this {@link ~Range range} and `spread` is set to `true`.
	 *
	 * Examples:
	 *
	 *		let range = new Range( new Position( root, [ 2, 7 ] ), new Position( root, [ 4, 0, 1 ] ) );
	 *		let transformed = range._getTransformedByInsertion( new Position( root, [ 1 ] ), 2 );
	 *		// transformed array has one range from [ 4, 7 ] to [ 6, 0, 1 ]
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 4, 0, 0 ] ), 4 );
	 *		// transformed array has one range from [ 2, 7 ] to [ 4, 0, 5 ]
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 3, 2 ] ), 4 );
	 *		// transformed array has one range, which is equal to original range
	 *
	 *		transformed = range._getTransformedByInsertion( new Position( root, [ 3, 2 ] ), 4, true );
	 *		// transformed array has two ranges: from [ 2, 7 ] to [ 3, 2 ] and from [ 3, 6 ] to [ 4, 0, 1 ]
	 *
	 * @protected
	 * @param {module:engine/model/position~Position} insertPosition Position where nodes are inserted.
	 * @param {Number} howMany How many nodes are inserted.
	 * @param {Boolean} [spread] Flag indicating whether this {~Range range} should be spread if insertion
	 * was inside the range. Defaults to `false`.
	 * @returns {Array.<module:engine/model/range~Range>} Result of the transformation.
	 */
	_getTransformedByInsertion( insertPosition, howMany, spread = false ) {
		if ( spread && this.containsPosition( insertPosition ) ) {
			// Range has to be spread. The first part is from original start to the spread point.
			// The other part is from spread point to the original end, but transformed by
			// insertion to reflect insertion changes.

			return [
				new Range( this.start, insertPosition ),
				new Range(
					insertPosition.getShiftedBy( howMany ),
					this.end._getTransformedByInsertion( insertPosition, howMany )
				)
			];
		} else {
			const range = Range.createFromRange( this );

			range.start = range.start._getTransformedByInsertion( insertPosition, howMany );
			range.end = range.end._getTransformedByInsertion( insertPosition, howMany );

			return [ range ];
		}
	}

	/**
	 * Returns an array containing {@link ~Range ranges} that are a result of transforming this
	 * {@link ~Range range} by moving `howMany` nodes from `sourcePosition` to `targetPosition`.
	 *
	 * @protected
	 * @param {module:engine/model/position~Position} sourcePosition Position from which nodes are moved.
	 * @param {module:engine/model/position~Position} targetPosition Position to where nodes are moved.
	 * @param {Number} howMany How many nodes are moved.
	 * @param {Boolean} [spread=false]
	 * @returns {Array.<module:engine/model/range~Range>} Result of the transformation.
	 */
	_getTransformedByMove( sourcePosition, targetPosition, howMany, spread = false ) {
		// Special case for transforming a collapsed range. Just transform it like a position.
		if ( this.isCollapsed ) {
			const newPos = this.start._getTransformedByMove( sourcePosition, targetPosition, howMany );

			return [ new Range( newPos ) ];
		}

		// Special case for transformation when a part of the range is moved towards the range.
		//
		// Examples:
		//
		// <div><p>ab</p><p>c[d</p></div><p>e]f</p> --> <div><p>ab</p></div><p>c[d</p><p>e]f</p>
		// <p>e[f</p><div><p>a]b</p><p>cd</p></div> --> <p>e[f</p><p>a]b</p><div><p>cd</p></div>
		//
		// Without this special condition, the default algorithm leaves an "artifact" range from one of `differenceSet` parts:
		//
		// <div><p>ab</p><p>c[d</p></div><p>e]f</p> --> <div><p>ab</p>{</div>}<p>c[d</p><p>e]f</p>
		//
		// This special case is applied only if the range is to be kept together (not spread).
		const moveRange = Range.createFromPositionAndShift( sourcePosition, howMany );
		const insertPosition = targetPosition._getTransformedByDeletion( sourcePosition, howMany );

		if ( this.containsPosition( targetPosition ) && !spread ) {
			if ( moveRange.containsPosition( this.start ) || moveRange.containsPosition( this.end ) ) {
				const start = this.start._getTransformedByMove( sourcePosition, targetPosition, howMany );
				const end = this.end._getTransformedByMove( sourcePosition, targetPosition, howMany );

				return [ new Range( start, end ) ];
			}
		}

		// Default algorithm.
		let result;

		const differenceSet = this.getDifference( moveRange );
		let difference = null;

		const common = this.getIntersection( moveRange );

		if ( differenceSet.length == 1 ) {
			// `moveRange` and this range may intersect but may be separate.
			difference = new Range(
				differenceSet[ 0 ].start._getTransformedByDeletion( sourcePosition, howMany ),
				differenceSet[ 0 ].end._getTransformedByDeletion( sourcePosition, howMany )
			);
		} else if ( differenceSet.length == 2 ) {
			// `moveRange` is inside this range.
			difference = new Range(
				this.start,
				this.end._getTransformedByDeletion( sourcePosition, howMany )
			);
		} // else, `moveRange` contains this range.

		if ( difference ) {
			result = difference._getTransformedByInsertion( insertPosition, howMany, common !== null || spread );
		} else {
			result = [];
		}

		if ( common ) {
			const transformedCommon = new Range(
				common.start._getCombined( moveRange.start, insertPosition ),
				common.end._getCombined( moveRange.start, insertPosition )
			);

			if ( result.length == 2 ) {
				result.splice( 1, 0, transformedCommon );
			} else if ( result.length > 0 && common.start.isBefore( result[ 0 ].start ) ) {
				result.unshift( transformedCommon );
			} else {
				result.push( transformedCommon );
			}
		}

		return result;
	}

	_getTransformedByDeletion( deletePosition, howMany ) {
		let newStart = this.start._getTransformedByDeletion( deletePosition, howMany );
		let newEnd = this.end._getTransformedByDeletion( deletePosition, howMany );

		if ( newStart == null && newEnd == null ) {
			return null;
		}

		if ( newStart == null ) {
			newStart = deletePosition;
		}

		if ( newEnd == null ) {
			newEnd = deletePosition;
		}

		return new Range( newStart, newEnd );
	}

	/**
	 * Creates a new range, spreading from specified {@link module:engine/model/position~Position position} to a position moved by
	 * given `shift`. If `shift` is a negative value, shifted position is treated as the beginning of the range.
	 *
	 * @param {module:engine/model/position~Position} position Beginning of the range.
	 * @param {Number} shift How long the range should be.
	 * @returns {module:engine/model/range~Range}
	 */
	static createFromPositionAndShift( position, shift ) {
		const start = position;
		const end = position.getShiftedBy( shift );

		return shift > 0 ? new this( start, end ) : new this( end, start );
	}

	/**
	 * Creates a range from given parents and offsets.
	 *
	 * @param {module:engine/model/element~Element} startElement Start position parent element.
	 * @param {Number} startOffset Start position offset.
	 * @param {module:engine/model/element~Element} endElement End position parent element.
	 * @param {Number} endOffset End position offset.
	 * @returns {module:engine/model/range~Range}
	 */
	static createFromParentsAndOffsets( startElement, startOffset, endElement, endOffset ) {
		return new this(
			Position.createFromParentAndOffset( startElement, startOffset ),
			Position.createFromParentAndOffset( endElement, endOffset )
		);
	}

	/**
	 * Creates a new instance of `Range` which is equal to passed range.
	 *
	 * @param {module:engine/model/range~Range} range Range to clone.
	 * @returns {module:engine/model/range~Range}
	 */
	static createFromRange( range ) {
		return new this( range.start, range.end );
	}

	/**
	 * Creates a range inside an {@link module:engine/model/element~Element element} which starts before the first child of
	 * that element and ends after the last child of that element.
	 *
	 * @param {module:engine/model/element~Element} element Element which is a parent for the range.
	 * @returns {module:engine/model/range~Range}
	 */
	static createIn( element ) {
		return this.createFromParentsAndOffsets( element, 0, element, element.maxOffset );
	}

	/**
	 * Creates a range that starts before given {@link module:engine/model/item~Item model item} and ends after it.
	 *
	 * @param {module:engine/model/item~Item} item
	 * @returns {module:engine/model/range~Range}
	 */
	static createOn( item ) {
		return this.createFromPositionAndShift( Position.createBefore( item ), item.offsetSize );
	}

	/**
	 * Creates a collapsed range at given {@link module:engine/model/position~Position position}
	 * or on the given {@link module:engine/model/item~Item item}.
	 *
	 * @param {module:engine/model/item~Item|module:engine/model/position~Position} itemOrPosition
	 * @param {Number|'end'|'before'|'after'} [offset=0] Offset or one of the flags. Used only when
	 * first parameter is a {@link module:engine/model/item~Item model item}.
	 */
	static createCollapsedAt( itemOrPosition, offset ) {
		const start = Position.createAt( itemOrPosition, offset );
		const end = Position.createFromPosition( start );

		return new Range( start, end );
	}

	/**
	 * Combines all ranges from the passed array into a one range. At least one range has to be passed.
	 * Passed ranges must not have common parts.
	 *
	 * The first range from the array is a reference range. If other ranges start or end on the exactly same position where
	 * the reference range, they get combined into one range.
	 *
	 *		[  ][]  [    ][ ][             ][ ][]  [  ]  // Passed ranges, shown sorted
	 *		[    ]                                       // The result of the function if the first range was a reference range.
	 *	            [                           ]        // The result of the function if the third-to-seventh range was a reference range.
	 *	                                           [  ]  // The result of the function if the last range was a reference range.
	 *
	 * @param {Array.<module:engine/model/range~Range>} ranges Ranges to combine.
	 * @returns {module:engine/model/range~Range} Combined range.
	 */
	static createFromRanges( ranges ) {
		if ( ranges.length === 0 ) {
			/**
			 * At least one range has to be passed to
			 * {@link module:engine/model/range~Range.createFromRanges `Range.createFromRanges()`}.
			 *
			 * @error range-create-from-ranges-empty-array
			 */
			throw new CKEditorError( 'range-create-from-ranges-empty-array: At least one range has to be passed.' );
		} else if ( ranges.length == 1 ) {
			return this.createFromRange( ranges[ 0 ] );
		}

		// 1. Set the first range in `ranges` array as a reference range.
		// If we are going to return just a one range, one of the ranges need to be the reference one.
		// Other ranges will be stuck to that range, if possible.
		const ref = ranges[ 0 ];

		// 2. Sort all the ranges so it's easier to process them.
		ranges.sort( ( a, b ) => {
			return a.start.isAfter( b.start ) ? 1 : -1;
		} );

		// 3. Check at which index the reference range is now.
		const refIndex = ranges.indexOf( ref );

		// 4. At this moment we don't need the original range.
		// We are going to modify the result and we need to return a new instance of Range.
		// We have to create a copy of the reference range.
		const result = new this( ref.start, ref.end );

		// 5. Ranges should be checked and glued starting from the range that is closest to the reference range.
		// Since ranges are sorted, start with the range with index that is closest to reference range index.
		for ( let i = refIndex - 1; i >= 0; i++ ) {
			if ( ranges[ i ].end.isEqual( result.start ) ) {
				result.start = Position.createFromPosition( ranges[ i ].start );
			} else {
				// If ranges are not starting/ending at the same position there is no point in looking further.
				break;
			}
		}

		// 6. Ranges should be checked and glued starting from the range that is closest to the reference range.
		// Since ranges are sorted, start with the range with index that is closest to reference range index.
		for ( let i = refIndex + 1; i < ranges.length; i++ ) {
			if ( ranges[ i ].start.isEqual( result.end ) ) {
				result.end = Position.createFromPosition( ranges[ i ].end );
			} else {
				// If ranges are not starting/ending at the same position there is no point in looking further.
				break;
			}
		}

		return result;
	}

	/**
	 * Creates a `Range` instance from given plain object (i.e. parsed JSON string).
	 *
	 * @param {Object} json Plain object to be converted to `Range`.
	 * @param {module:engine/model/document~Document} doc Document object that will be range owner.
	 * @returns {module:engine/model/element~Element} `Range` instance created using given plain object.
	 */
	static fromJSON( json, doc ) {
		return new this( Position.fromJSON( json.start, doc ), Position.fromJSON( json.end, doc ) );
	}
}
