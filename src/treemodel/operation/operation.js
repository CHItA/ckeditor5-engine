/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

CKEDITOR.define( [], () => {
	/**
	 * Abstract base operation class.
	 *
	 * @abstract
	 * @class treeModel.operation.Operation
	 */
	class Operation {
		/**
		 * Base operation constructor.
		 *
		 * @param {Number} baseVersion {@link treeModel.Document#version} on which the operation can be applied.
		 * @constructor
		 */
		constructor( baseVersion ) {
			/**
			 * {@link treeModel.Document#version} on which operation can be applied. If you try to
			 * {@link treeModel.Document#applyOperation apply} operation with different base version than the
			 * {@link treeModel.Document#version document version} the {@link document-applyOperation-wrong-version}
			 * error is thrown.
			 *
			 * @property {Number}
			 */
			this.baseVersion = baseVersion;

			/**
			 * Operation type.
			 *
			 * @property {String} type
			 */

			/**
			 * {@link treeModel.Delta Delta} which the operation is a part of. This property is set by the
			 * {@link treeModel.Delta delta} when the operations is added to it by the
			 * {@link treeModel.Delta#addOperation} method.
			 *
			 * @property {treeModel.Delta} delta
			 */

			/**
			 * Creates and returns an operation that has the same parameters as this operation.
			 *
			 * @method clone
			 * @returns {treeModel.operation.Operation} Clone of this operation.
			 */

			/**
			 * Creates and returns a reverse operation. Reverse operation when executed right after
			 * the original operation will bring back tree model state to the point before the original
			 * operation execution. In other words, it reverses changes done by the original operation.
			 *
			 * Keep in mind that tree model state may change since executing the original operation,
			 * so reverse operation will be "outdated". In that case you will need to
			 * {@link treeModel.operation.transform} it by all operations that were executed after the original operation.
			 *
			 * @method getReversed
			 * @returns {treeModel.operation.Operation} Reversed operation.
			 */

			/**
			 * Executes the operation - modifications described by the operation attributes
			 * will be applied to the tree model.
			 *
			 * @protected
			 * @method _execute
			 * @returns {Object} Object with additional information about the applied changes. Always has `range`
			 * property containing changed nodes. May have additional properties depending on the operation type.
			 */
		}
	}

	return Operation;
} );
