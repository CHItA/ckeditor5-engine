/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

/**
 * Transforms given {treeModel.operation.Operation} by another {treeModel.operation.Operation} and returns the result of
 * that transformation as an array containing one or more {treeModel.operation.Operation} elements.
 *
 * Operations work on specified positions, passed to them when they are created. Whenever {@link treeModel.Document document}
 * changes, we have to reflect those modifications by updating or "transforming" operations which are not yet applied.
 * When an operation is transformed, its parameters may change based on the operation by which it is transformed.
 * If the transform-by operation applied any modifications to the Tree Data Model which affect positions or nodes
 * connected with transformed operation, those changes will be reflected in the parameters of the returned operation(s).
 *
 * Whenever the {@link treeModel.Document document} has different {@link treeModel.Document#baseVersion}
 * than the operation you want to {@link treeModel.Document#applyOperation apply}, you need to transform that
 * operation by all operations which were already applied to the {@link treeModel.Document document} and have greater
 * {@link treeModel.Document#baseVersion} than the operation being applied. Transform them in the same order as those
 * operations which were applied. This way all modifications done to the Tree Data Model will be reflected
 * in the operation parameters and the operation will "operate" on "up-to-date" version of the Tree Data Model.
 * This is mostly the case with Operational Transformations but it might be needed in particular features as well.
 *
 * In some cases, when given operation apply changes to the same nodes as this operation, two or more operations need
 * to be created as one would not be able to reflect the combination of these operations.
 * This is why an array is returned instead of a single object. All returned operations have to be applied
 * (or further transformed) to get an effect which was intended in pre-transformed operation.
 *
 * Sometimes two operations are in conflict. This happens when they modify the same node in a different way, i.e.
 * set different value for the same attribute or move the node into different positions. When this happens,
 * we need to decide which operation is more important. We can't assume that operation `a` or operation `b` is always
 * more important. In Operational Transformations algorithms we often need to get a result of transforming
 * `a` by `b` and also `b` by `a`. In both transformations the same operation has to be the important one. If we assume
 * that first or the second passed operation is always more important we won't be able to solve this case.
 *
 * @function treeModel.operation.transform
 * @param {treeModel.operation.Operation} a Operation that will be transformed.
 * @param {treeModel.operation.Operation} b Operation to transform by.
 * @param {Boolean} isAMoreImportantThanB Flag indicating whether the operation which will be transformed (`a`) should be treated
 * as more important when resolving conflicts.
 * @returns {Array.<treeModel.operation.Operation>} Result of the transformation.
 */

CKEDITOR.define( [
	'treemodel/operation/insertoperation',
	'treemodel/operation/attributeoperation',
	'treemodel/operation/moveoperation',
	'treemodel/operation/nooperation',
	'treemodel/range',
	'utils'
], ( InsertOperation, AttributeOperation, MoveOperation, NoOperation, Range, utils ) => {
	const ot = {
		InsertOperation: {
			// Transforms InsertOperation `a` by InsertOperation `b`. Accepts a flag stating whether `a` is more important
			// than `b` when it comes to resolving conflicts. Returns results as an array of operations.
			InsertOperation( a, b, isStrong ) {
				// Transformed operations are always new instances, not references to the original operations.
				const transformed = a.clone();

				// Transform insert position by the other operation position.
				transformed.position = transformed.position.getTransformedByInsertion( b.position, b.nodeList.length, !isStrong );

				return [ transformed ];
			},

			AttributeOperation: doNotUpdate,

			// Transforms InsertOperation `a` by MoveOperation `b`. Accepts a flag stating whether `a` is more important
			// than `b` when it comes to resolving conflicts. Returns results as an array of operations.
			MoveOperation( a, b, isStrong ) {
				const transformed = a.clone();

				// Transform insert position by the other operation parameters.
				transformed.position = a.position.getTransformedByMove( b.sourcePosition, b.targetPosition, b.howMany, !isStrong );

				return [ transformed ];
			}
		},

		AttributeOperation: {
			// Transforms AttributeOperation `a` by InsertOperation `b`. Returns results as an array of operations.
			InsertOperation( a, b ) {
				// Transform this operation's range.
				const ranges = a.range.getTransformedByInsertion( b.position, b.nodeList.length );

				// Map transformed range(s) to operations and return them.
				return ranges.reverse().map( ( range ) => {
					return new AttributeOperation(
						range,
						a.oldAttr,
						a.newAttr,
						a.baseVersion
					);
				} );
			},

			// Transforms AttributeOperation `a` by AttributeOperation `b`. Accepts a flag stating whether `a` is more important
			// than `b` when it comes to resolving conflicts. Returns results as an array of operations.
			AttributeOperation( a, b, isStrong ) {
				if ( haveConflictingAttributes( a, b ) ) {
					// If operations attributes are in conflict, check if their ranges intersect and manage them properly.
					let operations = [];

					// First, we want to apply change to the part of a range that has not been changed by the other operation.
					operations = operations.concat(
						a.range.getDifference( b.range ).map( ( range ) => {
							return new AttributeOperation( range, a.oldAttr, a.newAttr, a.baseVersion );
						} )
					);

					if ( isStrong ) {
						// If this operation is more important, we want also want to apply change to the part of the
						// original range that has already been changed by the other operation. Since that range
						// got changed we have to update oldAttr.
						const common = a.range.getIntersection( b.range );

						if ( common !== null ) {
							operations.push( new AttributeOperation( common, b.oldAttr, a.newAttr, a.baseVersion ) );
						}
					}

					// If no operations has been added nothing should get updated, but since we need to return
					// an instance of Operation we add NoOperation to the array.
					if ( operations.length === 0 ) {
						operations.push( new NoOperation( a.baseVersion ) );
					}

					return operations;
				} else {
					// If operations don't conflict simply, return an array containing just a clone of this operation.
					return [ a.clone() ];
				}
			},

			// Transforms AttributeOperation `a` by MoveOperation `b`. Returns results as an array of operations.
			MoveOperation( a, b ) {
				// Convert MoveOperation properties into a range.
				const rangeB = Range.createFromPositionAndShift( b.sourcePosition, b.howMany );

				// Get target position from the state "after" nodes specified by MoveOperation are "detached".
				const newTargetPosition = b.targetPosition.getTransformedByDeletion( b.sourcePosition, b.howMany );

				// This will aggregate transformed ranges.
				let ranges = [];

				// Difference is a part of changed range that is modified by AttributeOperation but are not affected
				// by MoveOperation. This can be zero, one or two ranges (if moved range is inside changed range).
				// If two ranges were returned it means that rangeB was inside rangeA. We will cover rangeB later.
				// Right now we will make a simplification and join difference ranges and transform them as one.
				const difference = joinRanges( a.range.getDifference( rangeB ) );

				// Common is a range of nodes that is affected by MoveOperation. So it got moved to other place.
				const common = a.range.getIntersection( rangeB );

				if ( difference !== null ) {
					// MoveOperation removes nodes from their original position. We acknowledge this by proper transformation.
					// Take the start and the end of the range and transform them by deletion of moved nodes.
					// Note that if rangeB was inside AttributeOperation range, only difference.end will be transformed.
					// This nicely covers the joining simplification we did in the previous step.
					difference.start = difference.start.getTransformedByDeletion( b.sourcePosition, b.howMany );
					difference.end = difference.end.getTransformedByDeletion( b.sourcePosition, b.howMany );

					// MoveOperation pastes nodes into target position. We acknowledge this by proper transformation.
					// Note that since we operate on transformed difference range, we should transform by
					// previously transformed target position.
					// Note that we do not use Position.getTransformedByMove on range boundaries because we need to
					// transform by insertion a range as a whole, since newTargetPosition might be inside that range.
					ranges = difference.getTransformedByInsertion( newTargetPosition, b.howMany, false ).reverse();
				}

				if ( common !== null ) {
					// Here we do not need to worry that newTargetPosition is inside moved range, because that
					// would mean that the MoveOperation targets into itself, and that is incorrect operation.
					// Instead, we calculate the new position of that part of original range.
					common.start = common.start._getCombined( b.sourcePosition, newTargetPosition );
					common.end = common.end._getCombined( b.sourcePosition, newTargetPosition );

					ranges.push( common );
				}

				// Map transformed range(s) to operations and return them.
				return ranges.map( ( range ) => {
					return new AttributeOperation(
						range,
						a.oldAttr,
						a.newAttr,
						a.baseVersion
					);
				} );
			}
		},

		MoveOperation: {
			// Transforms MoveOperation `a` by InsertOperation `b`. Accepts a flag stating whether `a` is more important
			// than `b` when it comes to resolving conflicts. Returns results as an array of operations.
			InsertOperation( a, b, isStrong ) {
				// Get target position from the state "after" nodes are inserted by InsertOperation.
				const newTargetPosition = a.targetPosition.getTransformedByInsertion( b.position, b.nodeList.length, !isStrong );

				// Create range from MoveOperation properties and transform it by insertion as well.
				const rangeB = Range.createFromPositionAndShift( a.sourcePosition, a.howMany );
				const ranges = rangeB.getTransformedByInsertion( b.position, b.nodeList.length, true );

				// Map transformed range(s) to operations and return them.
				return ranges.reverse().map( ( range ) => {
					return new MoveOperation(
						range.start,
						range.end.offset - range.start.offset,
						newTargetPosition.clone(),
						a.baseVersion
					);
				} );
			},

			AttributeOperation: doNotUpdate,

			// Transforms MoveOperation `a` by MoveOperation `b`. Accepts a flag stating whether `a` is more important
			// than `b` when it comes to resolving conflicts. Returns results as an array of operations.
			MoveOperation( a, b, isStrong ) {
				// Special case when both move operations' target positions are inside nodes that are
				// being moved by the other move operation. So in other words, we move ranges into inside of each other.
				// This case can't be solved reasonably (on the other hand, it should not happen often).
				if ( moveTargetIntoMovedRange( a, b ) && moveTargetIntoMovedRange( b, a ) ) {
					// Instead of transforming operation, we return a reverse of the operation that we transform by.
					// So when the results of this "transformation" will be applied, `b` MoveOperation will get reversed.
					return [ b.getReversed() ];
				}

				// Create ranges from MoveOperations properties.
				const rangeA = Range.createFromPositionAndShift( a.sourcePosition, a.howMany );
				const rangeB = Range.createFromPositionAndShift( b.sourcePosition, b.howMany );

				// Special case when transformed range contains both the other operation's whole range and target.
				// In such case, operations are not really conflicting and we should leave transformed operation as it is.
				// Without this we would have 3 or 4 operations and the transformation result would probably be not intuitive.
				if ( rangeA.containsRange( rangeB ) && rangeA.containsPosition( b.targetPosition ) ) {
					return [ a.clone() ];
				}
				// Mirror situation for the case above - now transformed range is wholly contained in the other
				// operation's range and also targets to that range. Without this special treatment we would
				// transform this operation into NoOperation, but this would not be compatible with the result
				// generated by the special case above.
				else if ( rangeB.containsRange( rangeA ) && rangeB.containsPosition( a.targetPosition ) ) {
					return [
						new MoveOperation(
							a.sourcePosition._getCombined( b.sourcePosition, b.targetPosition ),
							a.howMany,
							a.targetPosition._getCombined( b.sourcePosition, b.targetPosition ),
							a.baseVersion
						)
					];
				}

				// All the other non-special cases are treated by generic algorithm below.

				const differenceSet = rangeA.getDifference( rangeB );
				const common = rangeA.getIntersection( rangeB );

				// This will aggregate transformed ranges.
				let ranges = [];

				// Get target position from the state "after" nodes specified by other MoveOperation are "detached".
				const moveTargetPosition = b.targetPosition.getTransformedByDeletion( b.sourcePosition, b.howMany );

				// First, we take care of that part of the range that is only modified by transformed operation.
				for ( let i = 0; i < differenceSet.length; i++ ) {
					// MoveOperation removes nodes from their original position. We acknowledge this by proper transformation.
					// Take the start and the end of the range and transform them by deletion of moved nodes.
					differenceSet[ i ].start = differenceSet[ i ].start.getTransformedByDeletion( b.sourcePosition, b.howMany );
					differenceSet[ i ].end = differenceSet[ i ].end.getTransformedByDeletion( b.sourcePosition, b.howMany );

					// MoveOperation pastes nodes into target position. We acknowledge this by proper transformation.
					// Note that since we operate on transformed difference range, we should transform by
					// previously transformed target position.
					// Note that we do not use Position.getTransformedByMove on range boundaries because we need to
					// transform by insertion a range as a whole, since newTargetPosition might be inside that range.
					ranges = ranges.concat( differenceSet[ i ].getTransformedByInsertion( moveTargetPosition, b.howMany, true ) );
				}

				// Then, we have to manage the common part of both move ranges.
				// If MoveOperations has common range it can be one of two:
				// * on the same tree level - it means that we move the same nodes into different places
				// * on deeper tree level - it means that we move nodes that are inside moved nodes
				// The operations are conflicting only if they try to move exactly same nodes, so only in the first case.
				// So, we will handle common range if it is "deeper" or if transformed operation is more important.
				let isDeeper = utils.compareArrays( b.sourcePosition.getParentPath(), a.sourcePosition.getParentPath() ) == utils.compareArrays.PREFIX;

				if ( common !== null && ( isDeeper || isStrong ) ) {
					// Here we do not need to worry that newTargetPosition is inside moved range, because that
					// would mean that the MoveOperation targets into itself, and that is incorrect operation.
					// Instead, we calculate the new position of that part of original range.
					common.start = common.start._getCombined( b.sourcePosition, moveTargetPosition );
					common.end = common.end._getCombined( b.sourcePosition, moveTargetPosition );

					// We have to take care of proper range order.
					// Note that both push, splice and unshift do the same if there are no ranges in the array.
					if ( rangeB.end.isAfter( rangeA.end ) ) {
						ranges.push( common );
					} else if ( rangeB.start.isBefore( rangeA.start ) ) {
						ranges.unshift( common );
					} else {
						ranges.splice( 1, 0, common );
					}
				}

				// At this point we transformed this operation's source ranges it means that nothing should be changed.
				// But since we need to return an instance of Operation we return an array with NoOperation.
				if ( ranges.length === 0 ) {
					return [ new NoOperation( a.baseVersion ) ];
				}

				// Target position also could be affected by the other MoveOperation. We will transform it.
				let newTargetPosition = a.targetPosition.getTransformedByMove( b.sourcePosition, moveTargetPosition, b.howMany, !isStrong );

				// Map transformed range(s) to operations and return them.
				return ranges.reverse().map( ( range ) => {
					return new MoveOperation(
						range.start,
						range.end.offset - range.start.offset,
						newTargetPosition,
						a.baseVersion
					);
				} );
			}
		}
	};

	return ( a, b, isStrong ) => {
		let group;
		let algorithm;

		if ( a instanceof InsertOperation ) {
			group = ot.InsertOperation;
		} else if ( a instanceof AttributeOperation ) {
			group = ot.AttributeOperation;
		} else if ( a instanceof MoveOperation ) {
			group = ot.MoveOperation;
		} else {
			algorithm = doNotUpdate;
		}

		if ( group ) {
			if ( b instanceof InsertOperation ) {
				algorithm = group.InsertOperation;
			} else if ( b instanceof AttributeOperation ) {
				algorithm = group.AttributeOperation;
			} else if ( b instanceof MoveOperation ) {
				algorithm = group.MoveOperation;
			} else {
				algorithm = doNotUpdate;
			}
		}

		let transformed = algorithm( a, b, isStrong );

		return updateBaseVersions( a.baseVersion, transformed );
	};

	// When we don't want to update an operation, we create and return a clone of it.
	// Returns the operation in "unified format" - wrapped in an Array.
	function doNotUpdate( operation ) {
		return [ operation.clone() ];
	}

	// Takes an Array of operations and sets consecutive base versions for them, starting from given base version.
	// Returns the passed array.
	function updateBaseVersions( baseVersion, operations ) {
		for ( let i = 0; i < operations.length; i++ ) {
			operations[ i ].baseVersion = baseVersion + i + 1;
		}

		return operations;
	}

	// Checks whether MoveOperation targetPosition is inside a node from the moved range of the other MoveOperation.
	function moveTargetIntoMovedRange( a, b ) {
		return a.targetPosition.getTransformedByDeletion( b.sourcePosition, b.howMany ) === null;
	}

	// Takes two AttributeOperations and checks whether their attributes are in conflict.
	// This happens when both operations changes an attribute with the same key and they either set different
	// values for this attribute or one of them removes it while the other one sets it.
	// Returns true if attributes are in conflict.
	function haveConflictingAttributes( a, b ) {
		// Keeping in mind that newAttr or oldAttr might be null.
		// We will retrieve the key from whichever parameter is set.
		const keyA = ( a.newAttr || a.oldAttr ).key;
		const keyB = ( b.newAttr || b.oldAttr ).key;

		if ( keyA != keyB ) {
			// Different keys - not conflicting.
			return false;
		}

		if ( a.newAttr === null && b.newAttr === null ) {
			// Both remove the attribute - not conflicting.
			return false;
		}

		// Check if they set different value or one of them removes the attribute.
		return ( a.newAttr === null && b.newAttr !== null ) ||
			( a.newAttr !== null && b.newAttr === null ) ||
			( !a.newAttr.isEqual( b.newAttr ) );
	}

	// Gets an array of Ranges and produces one Range out of it. The root of a new range will be same as
	// the root of the first range in the array. If any of given ranges has different root than the first range,
	// it will be discarded.
	function joinRanges( ranges ) {
		if ( ranges.length === 0 ) {
			return null;
		} else if ( ranges.length == 1 ) {
			return ranges[ 0 ];
		} else {
			ranges[ 0 ].end = ranges[ ranges.length - 1 ].end;

			return ranges[ 0 ];
		}
	}
} );
