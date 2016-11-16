/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Operation from './operation.js';
import Position from '../position.js';
import Range from '../range.js';
import CKEditorError from '../../../utils/ckeditorerror.js';
import compareArrays from '../../../utils/comparearrays.js';
import writer from './../writer.js';

/**
 * Operation to move a range of {@link engine.model.Item model items} to given {@link engine.model.Position target position}.
 *
 * @memberOf engine.model.operation
 */
export default class MoveOperation extends Operation {
	/**
	 * Creates a move operation.
	 *
	 * @param {engine.model.Position} sourcePosition Position before the first {@link engine.model.Item model item} to move.
	 * @param {Number} howMany Offset size of moved range. Moved range will start from `sourcePosition` and end at
	 * `sourcePosition` with offset shifted by `howMany`.
	 * @param {engine.model.Position} targetPosition Position at which moved nodes will be inserted.
	 * @param {Number} baseVersion {@link engine.model.Document#version} on which operation can be applied.
	 */
	constructor( sourcePosition, howMany, targetPosition, baseVersion ) {
		super( baseVersion );

		/**
		 * Position before the first {@link engine.model.Item model item} to move.
		 *
		 * @member {engine.model.Position} engine.model.operation.MoveOperation#sourcePosition
		 */
		this.sourcePosition = Position.createFromPosition( sourcePosition );

		/**
		 * Offset size of moved range.
		 *
		 * @member {Number} engine.model.operation.MoveOperation#howMany
		 */
		this.howMany = howMany;

		/**
		 * Position at which moved nodes will be inserted.
		 *
		 * @member {engine.model.Position} engine.model.operation.MoveOperation#targetPosition
		 */
		this.targetPosition = Position.createFromPosition( targetPosition );

		/**
		 * Defines whether `MoveOperation` is sticky. If `MoveOperation` is sticky, during
		 * {@link engine.model.operation.transform operational transformation} if there will be an operation that
		 * inserts some nodes at the position equal to the boundary of this `MoveOperation`, that operation will
		 * get their insertion path updated to the position where this `MoveOperation` moves the range.
		 *
		 * @member {Boolean} engine.model.operation.MoveOperation#isSticky
		 */
		this.isSticky = false;
	}

	/**
	 * @inheritDoc
	 */
	get type() {
		return 'move';
	}

	/**
	 * @inheritDoc
	 * @returns {engine.model.operation.MoveOperation}
	 */
	clone() {
		const op = new this.constructor( this.sourcePosition, this.howMany, this.targetPosition, this.baseVersion );
		op.isSticky = this.isSticky;

		return op;
	}

	/**
	 * Returns the start position of the moved range after it got moved. This may be different than
	 * {@link engine.model.operation.MoveOperation#targetPosition} in some cases, i.e. when a range is moved
	 * inside the same parent but {@link engine.model.operation.MoveOperation#targetPosition targetPosition}
	 * is after {@link engine.model.operation.MoveOperation#sourcePosition sourcePosition}.
	 *
	 *		 vv              vv
	 *		abcdefg ===> adefbcg
	 *		     ^          ^
	 *		     targetPos	movedRangeStart
	 *		     offset 6	offset 4
	 *
	 * @returns {engine.model.Position}
	 */
	getMovedRangeStart() {
		return this.targetPosition._getTransformedByDeletion( this.sourcePosition, this.howMany );
	}

	/**
	 * @inheritDoc
	 * @returns {engine.model.operation.MoveOperation}
	 */
	getReversed() {
		let newTargetPosition = this.sourcePosition._getTransformedByInsertion( this.targetPosition, this.howMany );

		const op = new this.constructor( this.getMovedRangeStart(), this.howMany, newTargetPosition, this.baseVersion + 1 );
		op.isSticky = this.isSticky;

		return op;
	}

	/**
	 * @inheritDoc
	 */
	_execute() {
		let sourceElement = this.sourcePosition.parent;
		let targetElement = this.targetPosition.parent;
		let sourceOffset = this.sourcePosition.offset;
		let targetOffset = this.targetPosition.offset;

		// Validate whether move operation has correct parameters.
		// Validation is pretty complex but move operation is one of the core ways to manipulate the document state.
		// We expect that many errors might be connected with one of scenarios described below.
		if ( !sourceElement || !targetElement ) {
			/**
			 * Source position or target position is invalid.
			 *
			 * @error move-operation-position-invalid
			 */
			throw new CKEditorError(
				'move-operation-position-invalid: Source position or target position is invalid.'
			);
		} else if ( sourceOffset + this.howMany > sourceElement.maxOffset ) {
			/**
			 * The nodes which should be moved do not exist.
			 *
			 * @error move-operation-nodes-do-not-exist
			 */
			throw new CKEditorError(
				'move-operation-nodes-do-not-exist: The nodes which should be moved do not exist.'
			);
		} else if ( sourceElement === targetElement && sourceOffset < targetOffset && targetOffset < sourceOffset + this.howMany ) {
			/**
			 * Trying to move a range of nodes into the middle of that range.
			 *
			 * @error move-operation-range-into-itself
			 */
			throw new CKEditorError(
				'move-operation-range-into-itself: Trying to move a range of nodes to the inside of that range.'
			);
		} else if ( this.sourcePosition.root == this.targetPosition.root ) {
			if ( compareArrays( this.sourcePosition.getParentPath(), this.targetPosition.getParentPath() ) == 'prefix' ) {
				let i = this.sourcePosition.path.length - 1;

				if ( this.targetPosition.path[ i ] >= sourceOffset && this.targetPosition.path[ i ] < sourceOffset + this.howMany ) {
					/**
					 * Trying to move a range of nodes into one of nodes from that range.
					 *
					 * @error move-operation-node-into-itself
					 */
					throw new CKEditorError(
						'move-operation-node-into-itself: Trying to move a range of nodes into one of nodes from that range.'
					);
				}
			}
		}

		const range = writer.move( Range.createFromPositionAndShift( this.sourcePosition, this.howMany ), this.targetPosition );

		return {
			sourcePosition: this.sourcePosition,
			range: range
		};
	}

	/**
	 * @inheritDoc
	 */
	static get className() {
		return 'engine.model.operation.MoveOperation';
	}

	/**
	 * Creates `MoveOperation` object from deserilized object, i.e. from parsed JSON string.
	 *
	 * @param {Object} json Deserialized JSON object.
	 * @param {engine.model.Document} document Document on which this operation will be applied.
	 * @returns {engine.model.operation.MoveOperation}
	 */
	static fromJSON( json, document ) {
		let sourcePosition = Position.fromJSON( json.sourcePosition, document );
		let targetPosition = Position.fromJSON( json.targetPosition, document );

		const move = new this( sourcePosition, json.howMany, targetPosition, json.baseVersion );

		if ( json.isSticky ) {
			move.isSticky = true;
		}

		return move;
	}
}
