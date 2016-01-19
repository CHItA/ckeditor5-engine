/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import Operation from './operation.js';
import Position from '../position.js';
import Range from '../range.js';
import CKEditorError from '../../ckeditorerror.js';
import utils from '../../utils.js';

/**
 * Operation to move list of subsequent nodes from one position in the document to another.
 *
 * @class treeModel.operation.MoveOperation
 */
export default class MoveOperation extends Operation {
	/**
	 * Creates a move operation.
	 *
	 * @param {treeModel.Position} sourcePosition Position before the first node to move.
	 * @param {Number} howMany How many consecutive nodes to move, starting from `sourcePosition`.
	 * @param {treeModel.Position} targetPosition Position where moved nodes will be inserted.
	 * @param {Number} baseVersion {@link treeModel.Document#version} on which operation can be applied.
	 * @constructor
	 */
	constructor( sourcePosition, howMany, targetPosition, baseVersion ) {
		super( baseVersion );

		/**
		 * Source move position.
		 *
		 * @type {treeModel.Position}
		 */
		this.sourcePosition = Position.createFromPosition( sourcePosition );

		/**
		 * How many nodes to move.
		 *
		 * @type {Number}
		 */
		this.howMany = howMany;

		/**
		 * Target move position.
		 *
		 * @type {treeModel.Position}
		 */
		this.targetPosition = Position.createFromPosition( targetPosition );
	}

	get type() {
		return 'move';
	}

	clone() {
		return new this.constructor( this.sourcePosition, this.howMany, this.targetPosition, this.baseVersion );
	}

	getReversed() {
		return new this.constructor( this.targetPosition, this.howMany, this.sourcePosition, this.baseVersion + 1 );
	}

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
			 * @error operation-move-position-invalid
			 */
			throw new CKEditorError(
				'operation-move-position-invalid: Source position or target position is invalid.'
			);
		} else if ( sourceOffset + this.howMany > sourceElement.getChildCount() ) {
			/**
			 * The nodes which should be moved do not exist.
			 *
			 * @error operation-move-nodes-do-not-exist
			 */
			throw new CKEditorError(
				'operation-move-nodes-do-not-exist: The nodes which should be moved do not exist.'
			);
		} else if ( sourceElement === targetElement && sourceOffset <= targetOffset && targetOffset < sourceOffset + this.howMany ) {
			/**
			 * Trying to move a range of nodes into the middle of that range.
			 *
			 * @error operation-move-range-into-itself
			 */
			throw new CKEditorError(
				'operation-move-range-into-itself: Trying to move a range of nodes to the inside of that range.'
			);
		} else {
			if ( utils.compareArrays( this.sourcePosition.getParentPath(), this.targetPosition.getParentPath() ) == 'PREFIX' ) {
				let i = this.sourcePosition.path.length - 1;

				if ( this.targetPosition.path[ i ] >= sourceOffset && this.targetPosition.path[ i ] < sourceOffset + this.howMany ) {
					/**
					 * Trying to move a range of nodes into one of nodes from that range.
					 *
					 * @error operation-move-node-into-itself
					 */
					throw new CKEditorError(
						'operation-move-node-into-itself: Trying to move a range of nodes into one of nodes from that range.'
					);
				}
			}
		}
		// End of validation.

		// If we move children in the same element and we remove elements on the position before the target we
		// need to update a target offset.
		if ( sourceElement === targetElement && sourceOffset < targetOffset ) {
			targetOffset -= this.howMany;
		}

		const removedNodes = sourceElement.removeChildren( sourceOffset, this.howMany );

		targetElement.insertChildren( targetOffset, removedNodes );

		return {
			sourcePosition: this.sourcePosition,
			range: Range.createFromPositionAndShift( this.targetPosition, this.howMany )
		};
	}
}
