/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ViewElement from '../view/element';
import ViewAttributeElement from '../view/attributeelement';
import ViewText from '../view/text';
import ViewRange from '../view/range';
import ViewTreeWalker from '../view/treewalker';
import viewWriter from '../view/writer';
import ModelRange from '../model/range';

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
		const viewElement = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data, consumable, conversionApi );

		if ( !viewElement ) {
			return;
		}

		if ( !consumable.consume( data.item, 'insert' ) ) {
			return;
		}

		const viewPosition = conversionApi.mapper.toViewPosition( data.range.start );

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
 * Function factory, creates a converter that converts marker adding change to the view ui element.
 * The view ui element that will be added to the view depends on passed parameter. See {@link ~insertElement}.
 * In a case of collapsed range element will not wrap range but separate elements will be placed at the beginning
 * and at the end of the range.
 *
 * **Note:** unlike {@link ~insertElement}, the converter does not bind view element to model, because this converter
 * uses marker as "model source of data". This means that view ui element does not have corresponding model element.
 *
 * @param {module:engine/view/uielement~UIElement|Function} elementCreator View ui element, or function returning a view element, which
 * will be inserted.
 * @returns {Function} Insert element event converter.
 */
export function insertUIElement( elementCreator ) {
	return ( evt, data, consumable, conversionApi ) => {
		let viewStartElement, viewEndElement;

		if ( elementCreator instanceof ViewElement ) {
			viewStartElement = elementCreator.clone( true );
			viewEndElement = elementCreator.clone( true );
		} else {
			data.isOpening = true;
			viewStartElement = elementCreator( data, consumable, conversionApi );

			data.isOpening = false;
			viewEndElement = elementCreator( data, consumable, conversionApi );
		}

		if ( !viewStartElement || !viewEndElement ) {
			return;
		}

		if ( !consumable.consume( data.range, evt.name ) ) {
			return;
		}

		const mapper = conversionApi.mapper;

		viewWriter.insert( mapper.toViewPosition( data.range.start ), viewStartElement );

		if ( !data.range.isCollapsed ) {
			viewWriter.insert( mapper.toViewPosition( data.range.end ), viewEndElement );
		}
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
 * the copy will become the wrapping element. If `Function` is provided, it is passed attribute value and then all the parameters of the
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:addAttribute addAttribute event}.
 * It's expected that the function returns a {@link module:engine/view/element~Element}.
 * The result of the function will be the wrapping element.
 * When provided `Function` does not return element, then will be no conversion.
 *
 * The converter automatically consumes corresponding value from consumables list, stops the event (see
 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher}).
 *
 *		modelDispatcher.on( 'addAttribute:bold', wrapItem( new ViewAttributeElement( 'strong' ) ) );
 *
 * @param {module:engine/view/element~Element|Function} elementCreator View element, or function returning a view element, which will
 * be used for wrapping.
 * @param {Function} [nameToConsumable] Optional function used to map conversion event name to consumable name. By default it
 * uses {engine/conversion/model-to-view-converters~eventNameToConsumableType} function.
 * @returns {Function} Set/change attribute converter.
 */
export function wrapItem( elementCreator, nameToConsumable = eventNameToConsumableType ) {
	return ( evt, data, consumable, conversionApi ) => {
		const viewElement = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data.attributeNewValue, data, consumable, conversionApi );

		if ( !viewElement ) {
			return;
		}

		if ( !consumable.consume( data.item, nameToConsumable( evt.name ) ) ) {
			return;
		}

		let viewRange = conversionApi.mapper.toViewRange( data.range );

		// If this is a change event (because old value is not empty) and the creator is a function (so
		// it may create different view elements basing on attribute value) we have to create
		// view element basing on old value and unwrap it before wrapping with a newly created view element.
		if ( data.attributeOldValue !== null && !( elementCreator instanceof ViewElement ) ) {
			const oldViewElement = elementCreator( data.attributeOldValue, data, consumable, conversionApi );
			viewRange = viewWriter.unwrap( viewRange, oldViewElement );
		}

		viewWriter.wrap( viewRange, viewElement );
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
 *		modelDispatcher.on( 'removeAttribute:bold', unwrapItem( new ViewAttributeElement( 'strong' ) ) );
 *
 * @see module:engine/conversion/model-to-view-converters~wrapItem
 * @param {module:engine/view/element~Element|Function} elementCreator View element, or function returning a view element, which will
 * be used for unwrapping.
 * @param {Function} [nameToConsumable] Optional function used to map conversion event name to consumable name. By default it
 * uses {engine/conversion/model-to-view-converters~eventNameToConsumableType} function.
 * @returns {Function} Remove attribute converter.
 */
export function unwrapItem( elementCreator, nameToConsumable = eventNameToConsumableType ) {
	return ( evt, data, consumable, conversionApi ) => {
		const viewElement = ( elementCreator instanceof ViewElement ) ?
			elementCreator.clone( true ) :
			elementCreator( data.attributeOldValue, data, consumable, conversionApi );

		if ( !viewElement ) {
			return;
		}

		if ( !consumable.consume( data.item, nameToConsumable( evt.name ) ) ) {
			return;
		}

		const viewRange = conversionApi.mapper.toViewRange( data.range );

		viewWriter.unwrap( viewRange, viewElement );
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

		// We cannot map non-existing positions from model to view. Since a range was removed
		// from the model, we cannot recreate that range and map it to view, because
		// end of that range is incorrect.
		// Instead we will use `data.sourcePosition` as this is the last correct model position and
		// it is a position before the removed item. Then, we will calculate view range to remove "manually".
		const viewPosition = conversionApi.mapper.toViewPosition( data.sourcePosition );
		let viewRange;

		if ( data.item.is( 'element' ) ) {
			// Note: in remove conversion we cannot use model-to-view element mapping because `data.item` may be
			// already mapped to another element (this happens when move change is converted).
			// In this case however, `viewPosition` is the position before view element that corresponds to removed model element.
			viewRange = ViewRange.createOn( viewPosition.nodeAfter );
		} else {
			// If removed item is a text node, we need to traverse view tree to find the view range to remove.
			// Range to remove will start `viewPosition` and should contain amount of characters equal to the amount of removed characters.
			const viewRangeEnd = _shiftViewPositionByCharacters( viewPosition, data.item.offsetSize );
			viewRange = new ViewRange( viewPosition, viewRangeEnd );
		}

		// Trim the range to remove in case some UI elements are on the view range boundaries.
		viewWriter.remove( viewRange.getTrimmed() );

		// Unbind this element only if it was moved to graveyard.
		// The dispatcher#remove event will also be fired if the element was moved to another place (remove+insert are fired).
		// Let's say that <b> is moved before <a>. The view will be changed like this:
		//
		// 1) start:    <a></a><b></b>
		// 2) insert:   <b (new)></b><a></a><b></b>
		// 3) remove:   <b (new)></b><a></a>
		//
		// If we'll unbind the <b> element in step 3 we'll also lose binding of the <b (new)> element in the view,
		// because unbindModelElement() cancels both bindings – (model <b> => view <b (new)>) and (view <b (new)> => model <b>).
		// We can't lose any of these.
		//
		// See #847.
		if ( data.item.root.rootName == '$graveyard' ) {
			conversionApi.mapper.unbindModelElement( data.item );
		}
	};
}

/**
 * Function factory, crates marker to virtual selection converter.
 * For more information see {@link module:engine/conversion/buildmodelconverter~ModelConverterBuilder#toVirtualSelection}.
 *
 * @param {module:engine/conversion/buildmodelconverter~VirtualSelectionDescriptor|Function} selectionDescriptor
 * @return {Function} Marker to virtual selection converter.
 */
export function markerToVirtualSelection( selectionDescriptor ) {
	return ( evt, data, consumable, conversionApi ) =>	{
		const descriptor = typeof selectionDescriptor == 'function' ?
			selectionDescriptor( data, consumable, conversionApi ) :
			selectionDescriptor;

		if ( !descriptor ) {
			return;
		}

		const addMarker = evt.name.split( ':' )[ 0 ] == 'addMarker';
		const modelItem = data.item;

		// Return if model item is not present. This happens when whole marker conversion is fired before converting
		// children of marker's range.
		if ( !modelItem ) {
			return;
		}

		if ( modelItem.is( 'textProxy' ) ) {
			const viewElement = virtualSelectionDescriptorToAttribute( descriptor );
			const converter = addMarker ?
				wrapItem( viewElement, eventName => eventName ) :
				unwrapItem( viewElement, eventName => eventName );

			converter( evt, data, consumable, conversionApi );
		}

		if ( modelItem.is( 'element' ) ) {
			const consumableType = evt.name;
			const viewElement = conversionApi.mapper.toViewElement( modelItem );

			if ( !consumable.consume( modelItem, consumableType ) ) {
				return;
			}

			const selectionHandlingMethod = addMarker ? 'setVirtualSelection' : 'removeVirtualSelection';

			if ( viewElement && viewElement[ selectionHandlingMethod ] ) {
				// Virtual selection will be handled by parent element - consume all children.
				for ( const value of ModelRange.createIn( modelItem ) ) {
					consumable.consume( value.item, consumableType );
				}

				viewElement[ selectionHandlingMethod ]( descriptor );
			}
		}
	};
}

// Helper function that shifts given view `position` in a way that returned position is after `howMany` characters compared
// to the original `position`.
// Because in view there might be view ui elements splitting text nodes, we cannot simply use `ViewPosition#getShiftedBy()`.
function _shiftViewPositionByCharacters( position, howMany ) {
	// Create a walker that will walk the view tree starting from given position and walking characters one-by-one.
	const walker = new ViewTreeWalker( { startPosition: position, singleCharacters: true } );
	// We will count visited characters and return the position after `howMany` characters.
	let charactersFound = 0;

	for ( const value of walker ) {
		if ( value.type == 'text' ) {
			charactersFound++;

			if ( charactersFound == howMany ) {
				return walker.position;
			}
		}
	}
}

/**
 * Function factory, creates a default model-to-view converter for removing {@link module:engine/view/uielement~UIElement ui element}
 * basing on marker remove change.
 *
 * @param {module:engine/view/uielement~UIElement|Function} elementCreator View ui element, or function returning
 * a view ui element, which will be used as a pattern when look for element to remove at the marker start position.
 * @returns {Function} Remove ui element converter.
 */
export function removeUIElement( elementCreator ) {
	return ( evt, data, consumable, conversionApi ) => {
		let viewStartElement, viewEndElement;

		if ( elementCreator instanceof ViewElement ) {
			viewStartElement = elementCreator.clone( true );
			viewEndElement = elementCreator.clone( true );
		} else {
			data.isOpening = true;
			viewStartElement = elementCreator( data, consumable, conversionApi );

			data.isOpening = false;
			viewEndElement = elementCreator( data, consumable, conversionApi );
		}

		if ( !viewStartElement || !viewEndElement ) {
			return;
		}

		if ( !consumable.consume( data.range, evt.name ) ) {
			return;
		}

		const viewRange = conversionApi.mapper.toViewRange( data.range );

		// First remove closing element.
		viewWriter.clear( viewRange.getEnlarged(), viewEndElement );

		// If closing and opening elements are not the same then remove opening element.
		if ( !viewStartElement.isSimilar( viewEndElement ) ) {
			viewWriter.clear( viewRange.getEnlarged(), viewStartElement );
		}
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

/**
 * Creates `span` {@link module:engine/view/attributeelement~AttributeElement view attribute element} from information
 * provided by {@link module:engine/conversion/buildmodelconverter~VirtualSelectionDescriptor} object.
 *
 * @param {module:engine/conversion/buildmodelconverter~VirtualSelectionDescriptor }descriptor
 * @return {module:engine/view/attributeelement~AttributeElement}
 */
export function virtualSelectionDescriptorToAttribute( descriptor ) {
	const attributeElement = new ViewAttributeElement( 'span', descriptor.attributes );

	if ( descriptor.class ) {
		attributeElement.addClass( descriptor.class );
	}

	if ( descriptor.priority ) {
		attributeElement.priority = descriptor.priority;
	}

	return attributeElement;
}
