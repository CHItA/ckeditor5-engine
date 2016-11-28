/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ModelRange from '../model/range.js';
import ModelPosition from '../model/position.js';
import ModelElement from '../model/element.js';

import ViewRange from '../view/range.js';
import ViewElement from '../view/element.js';
import ViewText from '../view/text.js';
import ViewTextProxy from '../view/textproxy.js';
import ViewTreeWalker from '../view/treewalker.js';
import viewWriter from '../view/writer.js';

/**
 * Contains {@link module:engine/model/model model} to {@link module:engine/view/view view} converters for
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}.
 *
 * @module engine/conversion/model-to-view-converters
 */

/**
 * Function factory, creates a converter that converts node insertion changes from the model to the view.
 * The view element that will be added to the view depends on passed parameter. If {@link module:engine/view/element~Element} was passed,
 * it will be cloned and the copy will be inserted. If `Function` is provided, it is passed all the parameters of the
 * dispatcher's {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:insert insert event}.
 * It's expected that the function returns a {@link module:engine/view/element~Element}.
 * The result of the function will be inserted to the view.
 *
 * The converter automatically consumes corresponding value from consumables list, stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}) and bind model and view elements.
 *
 *		modelDispatcher.on( 'insert:paragraph', insertElement( new ViewElement( 'p' ) ) );
 *
 *		modelDispatcher.on(
 *			'insert:myElem',
 *			insertElement( ( data, consumable, conversionApi ) => {
 *				let myElem = new ViewElement( 'myElem', { myAttr: true }, new ViewText( 'myText' ) );
 *
 *				// Do something fancy with myElem using data/consumable/conversionApi ...
 *
 *				return myElem;
 *			}
 *		) );
 *
 * @param {module:engine/view/element~Element|Function} elementCreator View element, or function returning a view element, which
 * will be inserted.
 * @returns {Function} Insert element event converter.
 */
export function insertElement( elementCreator ) {
	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );
		const viewElement = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data, consumable, conversionApi );

		conversionApi.mapper.bindElements( data.item, viewElement );
		viewWriter.insert( viewPosition, viewElement );
	};
}

/**
 * Function factory, creates a default model-to-view converter for text insertion changes.
 *
 * The converter automatically consumes corresponding value from consumables list and stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}).
 *
 *		modelDispatcher.on( 'insert:$text', insertText() );
 *
 * @returns {Function} Insert text event converter.
 */
export function insertText() {
	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );
		const viewText = new ViewText( data.item.data );

		viewWriter.insert( viewPosition, viewText );
	};
}

/**
 * Function factory, creates a converter that converts set/change attribute changes from the model to the view. Attributes
 * from model are converted to the view element attributes in the view. You may provide a custom function to generate a
 * key-value attribute pair to add/change. If not provided, model attributes will be converted to view elements attributes
 * on 1-to-1 basis.
 *
 * **Note:** Provided attribute creator should always return the same `key` for given attribute from the model.
 *
 * The converter automatically consumes corresponding value from consumables list and stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}).
 *
 *		modelDispatcher.on( 'addAttribute:customAttr:myElem', setAttribute( ( data ) => {
 *			// Change attribute key from `customAttr` to `class` in view.
 *			const key = 'class';
 *			let value = data.attributeNewValue;
 *
 *			// Force attribute value to 'empty' if the model element is empty.
 *			if ( data.item.childCount === 0 ) {
 *				value = 'empty';
 *			}
 *
 *			// Return key-value pair.
 *			return { key, value };
 *		} ) );
 *
 * @param {Function} [attributeCreator] Function returning an object with two properties: `key` and `value`, which
 * represents attribute key and attribute value to be set on a {@link module:engine/view/element~Element view element}.
 * The function is passed all the parameters of the
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:addAttribute}
 * or {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:changeAttribute} event.
 * @returns {Function} Set/change attribute converter.
 */
export function setAttribute( attributeCreator ) {
	attributeCreator = attributeCreator || ( ( value, key ) => ( { value, key } ) );

	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, eventNameToConsumableType( evt.name ) ) ) {
			return;
		}

		const { key, value } = attributeCreator( data.attributeNewValue, data.attributeKey, data, consumable, conversionApi );

		conversionApi.mapper.toViewElement( data.item ).setAttribute( key, value );
	};
}

/**
 * Function factory, creates a converter that converts remove attribute changes from the model to the view. Removes attributes
 * that were converted to the view element attributes in the view. You may provide a custom function to generate a
 * key-value attribute pair to remove. If not provided, model attributes will be removed from view elements on 1-to-1 basis.
 *
 * **Note:** Provided attribute creator should always return the same `key` for given attribute from the model.
 *
 * **Note:** You can use the same attribute creator as in {@link module:engine/conversion/model-to-view-converters~setAttribute}.
 *
 * The converter automatically consumes corresponding value from consumables list and stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}).
 *
 *		modelDispatcher.on( 'removeAttribute:customAttr:myElem', removeAttribute( ( data ) => {
 *			// Change attribute key from `customAttr` to `class` in view.
 *			const key = 'class';
 *			let value = data.attributeNewValue;
 *
 *			// Force attribute value to 'empty' if the model element is empty.
 *			if ( data.item.childCount === 0 ) {
 *				value = 'empty';
 *			}
 *
 *			// Return key-value pair.
 *			return { key, value };
 *		} ) );
 *
 * @param {Function} [attributeCreator] Function returning an object with two properties: `key` and `value`, which
 * represents attribute key and attribute value to be removed from {@link module:engine/view/element~Element view element}.
 * The function is passed all the parameters of the
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:addAttribute addAttribute event}
 * or {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:changeAttribute changeAttribute event}.
 * @returns {Function} Remove attribute converter.
 */
export function removeAttribute( attributeCreator ) {
	attributeCreator = attributeCreator || ( ( value, key ) => ( { key } ) );

	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, eventNameToConsumableType( evt.name ) ) ) {
			return;
		}

		const { key } = attributeCreator( data.attributeOldValue, data.attributeKey, data, consumable, conversionApi );

		conversionApi.mapper.toViewElement( data.item ).removeAttribute( key );
	};
}

/**
 * Function factory, creates a converter that converts set/change attribute changes from the model to the view. In this case,
 * model attributes are converted to a view element that will be wrapping view nodes which corresponding model nodes had
 * the attribute set. This is useful for attributes like `bold`, which may be set on text nodes in model but are
 * represented as an element in the view:
 *
 *		[paragraph]              MODEL ====> VIEW        <p>
 *			|- a {bold: true}                             |- <b>
 *			|- b {bold: true}                             |   |- ab
 *			|- c                                          |- c
 *
 * The wrapping node depends on passed parameter. If {@link module:engine/view/element~Element} was passed, it will be cloned and
 * the copy will become the wrapping element. If `Function` is provided, it is passed all the parameters of the
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:addAttribute addAttribute event}.
 * It's expected that the function returns a {@link module:engine/view/element~Element}.
 * The result of the function will be the wrapping element.
 * When provided `Function` does not return element, then will be no conversion.
 *
 * The converter automatically consumes corresponding value from consumables list, stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}).
 *
 *		modelDispatcher.on( 'addAttribute:bold', wrap( new ViewElement( 'strong' ) ) );
 *
 * @param {module:engine/view/element~Element|Function} elementCreator View element, or function returning a view element, which will
 * be used for wrapping.
 * @returns {Function} Set/change attribute converter.
 */
export function wrap( elementCreator ) {
	return ( evt, data, consumable, conversionApi ) => {
		let viewRange = conversionApi.mapper.toViewRange( data.range );

		const viewElement = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data.attributeNewValue, data, consumable, conversionApi );

		if ( viewElement ) {
			if ( !consumable.consume( data.item, eventNameToConsumableType( evt.name ) ) ) {
				return;
			}

			// If this is a change event (because old value is not empty) and the creator is a function (so
			// it may create different view elements basing on attribute value) we have to create
			// view element basing on old value and unwrap it before wrapping with a newly created view element.
			if ( data.attributeOldValue !== null && !( elementCreator instanceof ViewElement ) ) {
				const oldViewElement = elementCreator( data.attributeOldValue, data, consumable, conversionApi );
				viewRange = viewWriter.unwrap( viewRange, oldViewElement, evt.priority );
			}

			viewWriter.wrap( viewRange, viewElement );
		}
	};
}

/**
 * Function factory, creates a converter that converts remove attribute changes from the model to the view. It assumes, that
 * attributes from model were converted to elements in the view. This converter will unwrap view nodes from corresponding
 * view element if given attribute was removed.
 *
 * The view element type that will be unwrapped depends on passed parameter.
 * If {@link module:engine/view/element~Element} was passed, it will be used to look for similar element in the view for unwrapping.
 * If `Function` is provided, it is passed all the parameters of the
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:addAttribute addAttribute event}.
 * It's expected that the function returns a {@link module:engine/view/element~Element}.
 * The result of the function will be used to look for similar element in the view for unwrapping.
 *
 * The converter automatically consumes corresponding value from consumables list, stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}) and bind model and view elements.
 *
 *		modelDispatcher.on( 'removeAttribute:bold', unwrap( new ViewElement( 'strong' ) ) );
 *
 * @see module:engine/conversion/model-to-view-converters~wrap
 * @param {module:engine/view/element~Element|Function} elementCreator View element, or function returning a view element, which will
 * be used for unwrapping.
 * @returns {Function} Remove attribute converter.
 */
export function unwrap( elementCreator ) {
	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, eventNameToConsumableType( evt.name ) ) ) {
			return;
		}

		const viewRange = conversionApi.mapper.toViewRange( data.range );
		const viewNode = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data.attributeOldValue, data, consumable, conversionApi );

		viewWriter.unwrap( viewRange, viewNode );
	};
}

/**
 * Function factory, creates a default model-to-view converter for nodes move changes.
 *
 *		modelDispatcher.on( 'move', move() );
 *
 * @returns {Function} Move event converter.
 */
export function move() {
	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, 'move' ) ) {
			return;
		}

		let sourceViewRange;

		if ( data.item instanceof ModelElement ) {
			const viewElement = conversionApi.mapper.toViewElement( data.item );
			sourceViewRange = ViewRange.createOn( viewElement );
		} else {
			const viewPosition = conversionApi.mapper.toViewPosition( data.sourcePosition );

			sourceViewRange = findViewTextRange( viewPosition, data.item.offsetSize );
		}

		const targetViewPosition = conversionApi.mapper.toViewPosition( data.targetPosition );

		viewWriter.move( sourceViewRange, targetViewPosition );
	};
}

/**
 * Function factory, creates a default model-to-view converter for node remove changes.
 *
 *		modelDispatcher.on( 'remove', remove() );
 *
 * @returns {Function} Remove event converter.
 */
export function remove() {
	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.item, 'remove' ) ) {
			return;
		}

		let viewRange = null;

		if ( data.item instanceof ModelElement ) {
			const viewElement = conversionApi.mapper.toViewElement( data.item );
			viewRange = ViewRange.createOn( viewElement );
		} else {
			const viewPosition = conversionApi.mapper.toViewPosition( data.sourcePosition );

			viewRange = findViewTextRange( viewPosition, data.item.offsetSize );
		}

		viewWriter.remove( viewRange );
		conversionApi.mapper.unbindModelElement( data.item );
	};
}

// Helper function for `remove` and `move` converters. It returns a ViewRange that starts at ViewPosition `start` and
// includes `size` characters.
// This method is used to find a ViewRange basing on ModelPosition and ModelTextProxy item size in `move` and `remove`
// converters where it is impossible to just map positions because those positions already are invalid in model
// (because they got moved or removed).
function findViewTextRange( start, size ) {
	const walker = new ViewTreeWalker( { startPosition: start, singleCharacters: true, ignoreElementEnd: true } );
	let offset = 0;

	for ( let value of walker ) {
		if ( value.item instanceof ViewTextProxy ) {
			offset++;

			if ( offset == size ) {
				return new ViewRange( start, walker.position );
			}
		}
	}
}

/**
 * Function factory, creates default model-to-view converter for elements which name has changed.
 *
 *		modelDispatcher.on( 'rename', rename() );
 *
 * This converter re-uses converters added for `insert`, `move` and `remove` change types.
 *
 * @fires module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:insert
 * @fires module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:move
 * @fires module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:remove
 * @returns {Function}
 */
export function rename() {
	return ( evt, data, consumable, conversionApi ) => {
		if ( !consumable.consume( data.element, 'rename' ) ) {
			return;
		}

		// Create fake model element that will represent "old version" of renamed element.
		const fakeElement = new ModelElement( data.oldName, data.element.getAttributes() );
		// Append the fake element to model document to enable making range on it.
		data.element.parent.insertChildren( data.element.index, fakeElement );

		// Check what was bound to renamed element.
		const oldViewElement = conversionApi.mapper.toViewElement( data.element );
		// Unbind renamed element.
		conversionApi.mapper.unbindModelElement( data.element );
		// Bind view element to the fake element.
		conversionApi.mapper.bindElements( fakeElement, oldViewElement );

		// The range that includes only the renamed element. Will be used to insert an empty element in the view.
		const insertRange = ModelRange.createFromParentsAndOffsets( data.element.parent, data.element.startOffset, data.element, 0 );

		// Move source position and range of moved nodes. Will be used to move nodes from original view element to renamed one.
		const moveSourcePosition = ModelPosition.createAt( fakeElement, 0 );
		const moveRange = ModelRange.createIn( data.element );

		// Remove range containing the fake element. Will be used to remove original view element from the view.
		const removeRange = ModelRange.createOn( fakeElement );

		// Start the conversion. Use already defined converters by firing insertion, move and remove conversion
		// on correct ranges / positions.
		conversionApi.dispatcher.convertInsertion( insertRange );
		conversionApi.dispatcher.convertMove( moveSourcePosition, moveRange );
		conversionApi.dispatcher.convertRemove( removeRange.start, removeRange );

		// Cleanup.
		fakeElement.remove();
	};
}

/**
 * Returns the consumable type that is to be consumed in an event, basing on that event name.
 *
 * @param {String} evtName Event name.
 * @returns {String} Consumable type.
 */
export function eventNameToConsumableType( evtName ) {
	const parts = evtName.split( ':' );

	return parts[ 0 ] + ':' + parts[ 1 ];
}
