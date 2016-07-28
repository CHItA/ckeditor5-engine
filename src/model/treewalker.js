/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Text from './text.js';
import TextProxy from './textproxy.js';
import Element from './element.js';
import Position from './position.js';
import CKEditorError from '../../utils/ckeditorerror.js';

/**
 * Position iterator class. It allows to iterate forward and backward over the document.
 *
 * `TreeWalker` supports unicode. See {@link engine.model.Text} for more information. {@link engine.model.TextProxy} instances
 * returned by `TreeWalker` never splits unicode string in incorrect place (i.e. between surrogate pair), even with
 * `singleCharacters` flag set to `true`.
 *
 * @memberOf engine.model
 */
export default class TreeWalker {
	/**
	 * Creates a range iterator. All parameters are optional, but you have to specify either `boundaries` or `startPosition`.
	 *
	 * @constructor
	 * @param {Object} [options={}] Object with configuration.
	 * @param {'forward'|'backward'} [options.direction='forward'] Walking direction.
	 * @param {engine.model.Range} [options.boundaries=null] Range to define boundaries of the iterator.
	 * @param {engine.model.Position} [options.startPosition] Starting position.
	 * @param {Boolean} [options.singleCharacters=false] Flag indicating whether all consecutive characters with the same attributes
	 * should be returned one by one as multiple {@link engine.model.CharacterProxy} (`true`) objects or as one
	 * {@link engine.model.TextProxy} (`false`).
	 * @param {Boolean} [options.shallow=false] Flag indicating whether iterator should enter elements or not. If the
	 * iterator is shallow child nodes of any iterated node will not be returned along with `elementEnd` tag.
	 * @param {Boolean} [options.ignoreElementEnd=false] Flag indicating whether iterator should ignore `elementEnd`
	 * tags. If the option is true walker will not return a parent node of start position. If this option is `true`
	 * each {@link engine.model.Element} will be returned once, while if the option is `false` they might be returned
	 * twice: for `'elementStart'` and `'elementEnd'`.
	 */
	constructor( options = {} ) {
		if ( !options.boundaries && !options.startPosition ) {
			/**
			 * Neither boundaries nor starting position have been defined.
			 *
			 * @error tree-walker-no-start-position
			 */
			throw new CKEditorError( 'tree-walker-no-start-position: Neither boundaries nor starting position have been defined.' );
		}

		const direction = options.direction || 'forward';

		if ( direction != 'forward' && direction != 'backward' ) {
			throw new CKEditorError(
				'tree-walker-unknown-direction: Only `backward` and `forward` direction allowed.',
				{ direction }
			);
		}

		/**
		 * Walking direction. Defaults `'forward'`.
		 *
		 * @readonly
		 * @member {'backward'|'forward'} engine.model.TreeWalker#direction
		 */
		this.direction = direction;

		/**
		 * Iterator boundaries.
		 *
		 * When the iterator is walking `'forward'` on the end of boundary or is walking `'backward'`
		 * on the start of boundary, then `{ done: true }` is returned.
		 *
		 * If boundaries are not defined they are set before first and after last child of the root node.
		 *
		 * @readonly
		 * @member {engine.model.Range} engine.model.TreeWalker#boundaries
		 */
		this.boundaries = options.boundaries || null;

		/**
		 * Iterator position. This is always static position, even if the initial position was a
		 * {@link engine.model.LivePosition live position}. If start position is not defined then position depends
		 * on {@link #direction}. If direction is `'forward'` position starts form the beginning, when direction
		 * is `'backward'` position starts from the end.
		 *
		 * @readonly
		 * @member {engine.model.Position} engine.model.TreeWalker#position
		 */
		if ( options.startPosition ) {
			this.position = Position.createFromPosition( options.startPosition );
		} else {
			this.position = Position.createFromPosition( this.boundaries[ this.direction == 'backward' ? 'end' : 'start' ] );
		}

		/**
		 * Flag indicating whether all consecutive characters with the same attributes should be
		 * returned as one {@link engine.model.CharacterProxy} (`true`) or one by one (`false`).
		 *
		 * @readonly
		 * @member {Boolean} engine.model.TreeWalker#singleCharacters
		 */
		this.singleCharacters = !!options.singleCharacters;

		/**
		 * Flag indicating whether iterator should enter elements or not. If the iterator is shallow child nodes of any
		 * iterated node will not be returned along with `elementEnd` tag.
		 *
		 * @readonly
		 * @member {Boolean} engine.model.TreeWalker#shallow
		 */
		this.shallow = !!options.shallow;

		/**
		 * Flag indicating whether iterator should ignore `elementEnd` tags. If the option is true walker will not
		 * return a parent node of the start position. If this option is `true` each {@link engine.model.Element} will
		 * be returned once, while if the option is `false` they might be returned twice:
		 * for `'elementStart'` and `'elementEnd'`.
		 *
		 * @readonly
		 * @member {Boolean} engine.model.TreeWalker#ignoreElementEnd
		 */
		this.ignoreElementEnd = !!options.ignoreElementEnd;

		/**
		 * Start boundary cached for optimization purposes.
		 *
		 * @private
		 * @member {engine.model.Element} engine.model.TreeWalker#_boundaryStartParent
		 */
		this._boundaryStartParent = this.boundaries ? this.boundaries.start.parent : null;

		/**
		 * End boundary cached for optimization purposes.
		 *
		 * @private
		 * @member {engine.model.Element} engine.model.TreeWalker#_boundaryEndParent
		 */
		this._boundaryEndParent = this.boundaries ? this.boundaries.end.parent : null;

		/**
		 * Parent of the most recently visited node. Cached for optimization purposes.
		 *
		 * @private
		 * @member {engine.model.Element|engine.model.DocumentFragment} engine.model.TreeWalker#_visitedParent
		 */
		this._visitedParent = this.position.parent;
	}

	/**
	 * Iterator interface.
	 */
	[ Symbol.iterator ]() {
		return this;
	}

	/**
	 * Iterator interface method.
	 * Detects walking direction and makes step forward or backward.
	 *
	 * @returns {Object} Object implementing iterator interface, returning information about taken step.
	 */
	next() {
		if ( this.direction == 'forward' ) {
			return this._next();
		} else {
			return this._previous();
		}
	}

	/**
	 * Makes a step forward in model. Moves the {@link #position} to the next position and returns the encountered value.
	 *
	 * @private
	 * @returns {Object}
	 * @returns {Boolean} return.done True if iterator is done.
	 * @returns {engine.model.TreeWalkerValue} return.value Information about taken step.
	 */
	_next() {
		const previousPosition = this.position;
		const position = Position.createFromPosition( this.position );
		const parent = this._visitedParent;

		// We are at the end of the root.
		if ( parent.parent === null && position.offset === parent.maxOffset ) {
			return { done: true };
		}

		// We reached the walker boundary.
		if ( parent === this._boundaryEndParent && position.offset == this.boundaries.end.offset ) {
			return { done: true };
		}

		const node = position.textNode ? position.textNode : position.nodeAfter;

		if ( node instanceof Element ) {
			if ( !this.shallow ) {
				// Manual operations on path internals for optimization purposes. Here and in the rest of the method.
				position.path.push( 0 );
				this._visitedParent = node;
			} else {
				position.offset++;
			}

			this.position = position;

			return formatReturnValue( 'elementStart', node, previousPosition, position, 1 );
		} else if ( node instanceof Text ) {
			let charactersCount, offsetInTextNode;

			if ( this.singleCharacters ) {
				charactersCount = 1;
			} else {
				let offset = node.endOffset;

				if ( this._boundaryEndParent == parent && this.boundaries.end.offset < offset ) {
					offset = this.boundaries.end.offset;
				}

				charactersCount = offset - position.offset;
			}

			offsetInTextNode = position.offset - node.startOffset;

			const item = new TextProxy( node, offsetInTextNode, charactersCount );

			position.offset += charactersCount;
			this.position = position;

			return formatReturnValue( 'text', item, previousPosition, position, charactersCount );
		} else {
			// `node` is not set, we reached the end of current `parent`.
			position.path.pop();
			position.offset++;
			this.position = position;
			this._visitedParent = parent.parent;

			if ( this.ignoreElementEnd ) {
				return this._next();
			} else {
				return formatReturnValue( 'elementEnd', parent, previousPosition, position );
			}
		}
	}

	/**
	 * Makes a step backward in model. Moves the {@link #position} to the previous position and returns the encountered value.
	 *
	 * @private
	 * @returns {Object}
	 * @returns {Boolean} return.done True if iterator is done.
	 * @returns {engine.model.TreeWalkerValue} return.value Information about taken step.
	 */
	_previous() {
		const previousPosition = this.position;
		const position = Position.createFromPosition( this.position );
		const parent = this._visitedParent;

		// We are at the beginning of the root.
		if ( parent.parent === null && position.offset === 0 ) {
			return { done: true };
		}

		// We reached the walker boundary.
		if ( parent == this._boundaryStartParent && position.offset == this.boundaries.start.offset ) {
			return { done: true };
		}

		// Get node just before current position
		const node = position.textNode ? position.textNode : position.nodeBefore;

		if ( node instanceof Element ) {
			position.offset--;

			if ( !this.shallow ) {
				position.path.push( node.maxOffset );
				this.position = position;
				this._visitedParent = node;

				if ( this.ignoreElementEnd ) {
					return this._previous();
				} else {
					return formatReturnValue( 'elementEnd', node, previousPosition, position );
				}
			} else {
				this.position = position;

				return formatReturnValue( 'elementStart', node, previousPosition, position, 1 );
			}
		} else if ( node instanceof Text ) {
			let charactersCount, offsetInTextNode;

			if ( this.singleCharacters ) {
				charactersCount = 1;
			} else {
				let offset = node.startOffset;

				if ( this._boundaryStartParent == parent && this.boundaries.start.offset > offset ) {
					offset = this.boundaries.start.offset;
				}

				charactersCount = position.offset - offset;
			}

			offsetInTextNode = position.offset - node.startOffset;

			const item = new TextProxy( node, offsetInTextNode - charactersCount, charactersCount );

			position.offset -= charactersCount;
			this.position = position;

			return formatReturnValue( 'text', item, previousPosition, position, charactersCount );
		} else {
			// `node` is not set, we reached the beginning of current `parent`.
			position.path.pop();
			this.position = position;
			this._visitedParent = parent.parent;

			return formatReturnValue( 'elementStart', parent, previousPosition, position, 1 );
		}
	}
}

function formatReturnValue( type, item, previousPosition, nextPosition, length ) {
	return {
		done: false,
		value: {
			type: type,
			item: item,
			previousPosition: previousPosition,
			nextPosition: nextPosition,
			length: length
		}
	};
}

/**
 * Type of the step made by {@link engine.model.TreeWalker}.
 * Possible values: `'elementStart'` if walker is at the beginning of a node, `'elementEnd'` if walker is at the end of node,
 * `'character'` if walker traversed over a character, or `'text'` if walker traversed over multiple characters (available in
 * character merging mode, see {@link engine.model.TreeWalker#constructor}).
 *
 * @typedef {String} engine.model.TreeWalkerValueType
 */

/**
 * Object returned by {@link engine.model.TreeWalker} when traversing tree model.
 *
 * @typedef {Object} engine.model.TreeWalkerValue
 * @property {engine.model.TreeWalkerValueType} type
 * @property {engine.model.Item} item Item between old and new positions of {@link engine.model.TreeWalker}.
 * @property {engine.model.Position} previousPosition Previous position of the iterator.
 * * Forward iteration: For `'elementEnd'` it is the last position inside the element. For all other types it is the
 * position before the item. Note that it is more efficient to use this position then calculate the position before
 * the node using {@link engine.model.Position.createBefore}. It is also more efficient to get the
 * position after node by shifting `previousPosition` by `length`, using {@link engine.model.Position#getShiftedBy},
 * then calculate the position using {@link engine.model.Position.createAfter}.
 * * Backward iteration: For `'elementStart'` it is the first position inside the element. For all other types it is
 * the position after item.
 * @property {engine.model.Position} nextPosition Next position of the iterator.
 * * Forward iteration: For `'elementStart'` it is the first position inside the element. For all other types it is
 * the position after the item.
 * * Backward iteration: For `'elementEnd'` it is last position inside element. For all other types it is the position
 * before the item.
 * @property {Number} [length] Length of the item. For `'elementStart'` and `'character'` it is 1. For `'text'` it is
 * the length of the text. For `'elementEnd'` it is undefined.
 */

/**
 * Tree walking directions.
 *
 * @typedef {'forward'|'backward'} engine.view.TreeWalkerDirection
 */
