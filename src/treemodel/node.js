/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

CKEDITOR.define( [ 'treemodel/attribute', 'utils', 'ckeditorerror' ], ( Attribute, utils, CKEditorError ) => {
	/**
	 * Abstract document tree node class.
	 *
	 * @abstract
	 * @class treeModel.Node
	 */
	class Node {
		/**
		 * Creates a tree node.
		 *
		 * This is an abstract class, so this constructor should not be used directly.
		 *
		 * @param {Iterable} attrs Iterable collection of {@link treeModel.Attribute attributes}.
		 * @constructor
		 */
		constructor( attrs ) {
			/**
			 * Parent element. Null by default. Set by {@link treeModel.Element#insertChildren}.
			 *
			 * @readonly
			 * @property {treeModel.Element|null} parent
			 */
			this.parent = null;

			/**
			 * Attributes set.
			 *
			 * Attributes of nodes attached to the document can be changed only be the {@link treeModel.operation.AttributeOperation}.
			 *
			 * @private
			 * @property {Set} _attrs
			 */
			this._attrs = new Set( attrs );
		}

		/**
		 * Depth of the node, which equals to total number of its parents.
		 *
		 * @readonly
		 * @property {Number} depth
		 */
		get depth() {
			let depth = 0;
			let parent = this.parent;

			while ( parent ) {
				depth++;

				parent = parent.parent;
			}

			return depth;
		}

		/**
		 * Nodes next sibling or `null` if it is the last child.
		 *
		 * @readonly
		 * @property {treeModel.Node|null} nextSibling
		 */
		get nextSibling() {
			const index = this.getIndex();

			return ( index !== null && this.parent.getChild( index + 1 ) ) || null;
		}

		/**
		 * Nodes previous sibling or null if it is the last child.
		 *
		 * @readonly
		 * @property {treeModel.Node|null} previousSibling
		 */
		get previousSibling() {
			const index = this.getIndex();

			return ( index !== null && this.parent.getChild( index - 1 ) ) || null;
		}

		/**
		 * The top parent for the node. If node has no parent it is the root itself.
		 *
		 * @readonly
		 * @property {Number} depth
		 */
		get root() {
			let root = this; // jscs:ignore safeContextKeyword

			while ( root.parent ) {
				root = root.parent;
			}

			return root;
		}

		/**
		 * Finds an attribute by a key.
		 *
		 * @param {String} attr The attribute key.
		 * @returns {treeModel.Attribute} The found attribute.
		 */
		getAttr( key ) {
			for ( let attr of this._attrs ) {
				if ( attr.key == key ) {
					return attr.value;
				}
			}

			return null;
		}

		/**
		 * Returns attribute iterator. It can be use to create a new element with the same attributes:
		 *
		 *		const copy = new Element( element.name, element.getAttrs() );
		 *
		 * @returns {Iterable.<treeModel.Attribute>} Attribute iterator.
		 */
		getAttrs() {
			return this._attrs[ Symbol.iterator ]();
		}

		/**
		 * Index of the node in the parent element or null if the node has no parent.
		 *
		 * Throws error if the parent element does not contain this node.
		 *
		 * @returns {Number|Null} Index of the node in the parent element or null if the node has not parent.
		 */
		getIndex() {
			let pos;

			if ( !this.parent ) {
				return null;
			}

			// No parent or child doesn't exist in parent's children.
			if ( ( pos = this.parent.getChildIndex( this ) ) == -1 ) {
				/**
				 * The node's parent does not contain this node. It means that the document tree is corrupted.
				 *
				 * @error node-not-found-in-parent
				 */
				throw new CKEditorError( 'node-not-found-in-parent: The node\'s parent does not contain this node.' );
			}

			return pos;
		}

		/**
		 * Gets path to the node. For example if the node is the second child of the first child of the root then the path
		 * will be `[ 1, 2 ]`. This path can be used as a parameter of {@link treeModel.Position}.
		 *
		 * @returns {Number[]} The path.
		 */
		getPath() {
			const path = [];
			let node = this; // jscs:ignore safeContextKeyword

			while ( node.parent ) {
				path.unshift( node.getIndex() );
				node = node.parent;
			}

			return path;
		}

		/**
		 * Returns `true` if the node contains an attribute with the same key and value as given or the same key if the
		 * given parameter is a string.
		 *
		 * @param {treeModel.Attribute|String} key An attribute or a key to compare.
		 * @returns {Boolean} True if node contains given attribute or an attribute with the given key.
		 */
		hasAttr( key ) {
			let attr;

			// Attribute.
			if ( key instanceof Attribute ) {
				for ( attr of this._attrs ) {
					if ( attr.isEqual( key ) ) {
						return true;
					}
				}
			}
			// Key.
			else {
				for ( attr of this._attrs ) {
					if ( attr.key == key ) {
						return true;
					}
				}
			}

			return false;
		}

		/**
		 * Removes attribute from the list of attributes.
		 *
		 * @param {String} key The attribute key.
		 */
		removeAttr( key ) {
			for ( let attr of this._attrs ) {
				if ( attr.key == key ) {
					this._attrs.delete( attr );

					return;
				}
			}
		}

		/**
		 * Sets a given attribute. If the attribute with the same key already exists it will be removed.
		 *
		 * @param {treeModel.Attribute} attr Attribute to set.
		 */
		setAttr( attr ) {
			this.removeAttr( attr.key );

			this._attrs.add( attr );
		}

		/**
		 * Custom toJSON method to solve child-parent circular dependencies.
		 *
		 * @returns {Object} Clone of this object with the parent property replaced with its name.
		 */
		toJSON() {
			const json = utils.clone( this );

			// Due to circular references we need to remove parent reference.
			json.parent = this.parent ? this.parent.name : null;

			return json;
		}
	}

	return Node;
} );
