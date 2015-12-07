/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

CKEDITOR.define( [
	'treemodel/node',
	'treemodel/nodelist'
], ( Node, NodeList ) => {
	/**
	 * Tree data model element.
	 *
	 * @class treeModel.Element
	 */
	class Element extends Node {
		/**
		 * Creates a tree data model element.
		 *
		 * This constructor should be used only internally by the document.
		 *
		 * @param {String} name Node name.
		 * @param {Iterable} attrs Iterable collection of {@link treeModel.Attribute attributes}.
		 * @param {treeModel.Node|treeModel.Text|treeModel.NodeList|String|Iterable} children List of nodes to be inserted
		 * into created element. List of nodes can be of any type accepted by the {@link treeModel.NodeList} constructor.
		 * @constructor
		 */
		constructor( name, attrs, children ) {
			super( attrs );

			/**
			 * Element name.
			 *
			 * @readonly
			 * @property {String} name
			 */
			this.name = name;

			/**
			 * List of children nodes.
			 *
			 * @protected
			 * @property {treeModel.NodeList} _children
			 */
			this._children = new NodeList();

			if ( children ) {
				this.insertChildren( 0, children );
			}
		}

		/**
		 * Gets child at the given index.
		 *
		 * @param {Number} index Index of child.
		 * @returns {treeModel.Node} Child node.
		 */
		getChild( index ) {
			return this._children.get( index );
		}

		/**
		 * Gets the number of element's children.
		 *
		 * @returns {Number} The number of element's children.
		 */
		getChildCount() {
			return this._children.length;
		}

		/**
		 * Gets index of the given child node.
		 *
		 * @param {treeModel.Node} node Child node.
		 * @returns {Number} Index of the child node.
		 */
		getChildIndex( node ) {
			return this._children.indexOf( node );
		}

		/**
		 * Inserts a list of child nodes on the given index and sets the parent of these nodes to this element.
		 *
		 * Note that the list of children can be modified only in elements not yet attached to the document.
		 * All attached nodes should be modified using the {@link treeModel.operation.InsertOperation}.
		 *
		 * @param {Number} index Position where nodes should be inserted.
		 * @param {treeModel.Node|treeModel.Text|treeModel.NodeList|String|Iterable} nodes The list of nodes to be inserted.
		 * The list of nodes can be of any type accepted by the {@link treeModel.NodeList} constructor.
		 */
		insertChildren( index, nodes ) {
			this._children.insert( index, new NodeList( nodes ) );

			for ( let node of this._children ) {
				node.parent = this;
			}
		}

		/**
		 * Removes number of child nodes starting at the given index and set the parent of these nodes to `null`.
		 *
		 * Note that the list of children can be modified only in elements not yet attached to the document.
		 * All attached nodes should be modified using the {@link treeModel.operation.RemoveOperation}.
		 *
		 * @param {Number} index Position of the first node to remove.
		 * @param {Number} number Number of nodes to remove.
		 * @returns {treeModel.NodeList} The list of removed nodes.
		 */

		removeChildren( index, number ) {
			for ( let i = index; i < index + number; i++ ) {
				this._children.get( i ).parent = null;
			}

			return this._children.remove( index, number );
		}
	}

	return Element;
} );
