/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/conversion/buildmodelconverter
 */

import {
	insertElement,
	setAttribute,
	removeAttribute,
	wrapItem,
	unwrapItem,
	wrapRange,
	unwrapRange
} from './model-to-view-converters';

import { convertSelectionAttribute, convertSelectionMarker } from './model-selection-to-view-converters';

import ViewAttributeElement from '../view/attributeelement';
import ViewContainerElement from '../view/containerelement';

import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';

/**
 * Provides chainable, high-level API to easily build basic model-to-view converters that are appended to given
 * dispatchers. In many cases, this is the API that should be used to specify how abstract model elements and
 * attributes should be represented in the view (and then later in DOM). Instances of this class are created by
 * {@link module:engine/conversion/buildmodelconverter~buildModelConverter}.
 *
 * If you need more complex converters, see {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher},
 * {@link module:engine/conversion/model-to-view-converters}, {@link module:engine/conversion/modelconsumable~ModelConsumable},
 * {@link module:engine/conversion/mapper~Mapper}.
 *
 * Using this API it is possible to create four kinds of converters:
 *
 * 1. Model element to view element converter. This is a converter that takes the model element and represents it
 * in the view.
 *
 *		buildModelConverter().for( dispatcher ).fromElement( 'paragraph' ).toElement( 'p' );
 *		buildModelConverter().for( dispatcher ).fromElement( 'image' ).toElement( 'img' );
 *
 * 2. Model attribute to view attribute converter. This is a converter that operates on model element attributes
 * and converts them to view element attributes. It is suitable for elements like `image` (`src`, `title` attributes).
 *
 *		buildModelConverter().for( dispatcher ).fromElement( 'image' ).toElement( 'img' );
 *		buildModelConverter().for( dispatcher ).fromAttribute( 'src' ).toAttribute();
 *
 * 3. Model attribute to view element converter. This is a converter that takes model attributes and represents them
 * as view elements. Elements created by this kind of converter are wrapping other view elements. Wrapped view nodes
 * correspond to model nodes had converter attribute. It is suitable for attributes like `bold`, where `bold` attribute
 * set on model text nodes is converter to `strong` view element.
 *
 *		buildModelConverter().for( dispatcher ).fromAttribute( 'bold' ).toElement( 'strong' );
 *
 * 4. Model marker to view element converter. This is a converter that converts markers from given group to view attribute element.
 * Markers, basically, are {@link module:engine/model/liverange~LiveRange} instances, that are named. In this conversion, model range is
 * converted to view range, then that view range is wrapped (or unwrapped, if range is removed) in a view attribute element.
 * To learn more about markers, see {@link module:engine/model/markercollection~MarkerCollection}.
 *
 *		const viewSpanSearchResult = new ViewAttributeElement( 'span', { class: 'search-result' } );
 *		buildModelConverter().for( dispatcher ).fromMarker( 'searchResult' ).toElement( viewSpanSearchResult );
 *
 * It is possible to provide various different parameters for
 * {@link module:engine/conversion/buildmodelconverter~ModelConverterBuilder#toElement}
 * and {@link module:engine/conversion/buildmodelconverter~ModelConverterBuilder#toAttribute} methods.
 * See their descriptions to learn more.
 *
 * It is also possible to {@link module:engine/conversion/buildmodelconverter~ModelConverterBuilder#withPriority change default priority}
 * of created converters to decide which converter should be fired earlier and which later. This is useful if you have
 * a general converter but also want to provide different special-case converters (i.e. given model element is converted
 * always to given view element, but if it has given attribute it is converter to other view element). For this,
 * use {@link module:engine/conversion/buildmodelconverter~ModelConverterBuilder#withPriority withPriority} right after `from...` method.
 *
 * Note that `to...` methods are "terminators", which means that should be the last one used in building converter.
 *
 * You can use {@link module:engine/conversion/buildviewconverter~ViewConverterBuilder}
 * to create "opposite" converters - from view to model.
 */
class ModelConverterBuilder {
	/**
	 * Creates `ModelConverterBuilder` with given `dispatchers` registered to it.
	 */
	constructor() {
		/**
		 * Dispatchers to which converters will be attached.
		 *
		 * @type {Array.<module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher>}
		 * @private
		 */
		this._dispatchers = [];

		/**
		 * Contains data about registered "from" query.
		 *
		 * @type {Object}
		 * @private
		 */
		this._from = null;
	}

	/**
	 * Set one or more dispatchers which the built converter will be attached to.
	 *
	 * @chainable
	 * @param {...module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher} dispatchers One or more dispatchers.
	 * @returns {module:engine/conversion/buildmodelconverter~ModelConverterBuilder}
	 */
	for( ...dispatchers ) {
		this._dispatchers = dispatchers;

		return this;
	}

	/**
	 * Registers what model element should be converted.
	 *
	 * @chainable
	 * @param {String} elementName Name of element to convert.
	 * @returns {module:engine/conversion/buildmodelconverter~ModelConverterBuilder}
	 */
	fromElement( elementName ) {
		this._from = {
			type: 'element',
			name: elementName,
			priority: null
		};

		return this;
	}

	/**
	 * Registers what model attribute should be converted.
	 *
	 * @chainable
	 * @param {String} key Key of attribute to convert.
	 * @returns {module:engine/conversion/buildmodelconverter~ModelConverterBuilder}
	 */
	fromAttribute( key ) {
		this._from = {
			type: 'attribute',
			key: key,
			priority: null
		};

		return this;
	}

	/**
	 * Registers what type of marker should be converted.
	 *
	 * @chainable
	 * @param {String} markerName Name of marker to convert.
	 * @returns {module:engine/conversion/modelconverterbuilder~ModelConverterBuilder}
	 */
	fromMarker( markerName ) {
		this._from = {
			type: 'marker',
			name: markerName,
			priority: null
		};

		return this;
	}

	/**
	 * Changes default priority for built converter. The lower the number, the earlier converter will be fired.
	 * Default priority is `10`.
	 *
	 * **Note:** Keep in mind that event priority, that is set by this modifier, is used for attribute priority
	 * when {@link module:engine/view/writer~writer} is used. This changes how view elements are ordered,
	 * i.e.: `<strong><em>foo</em></strong>` vs `<em><strong>foo</strong></em>`. Using priority you can also
	 * prevent node merging, i.e.: `<span class="bold"><span class="theme">foo</span><span>` vs `<span class="bold theme">foo</span>`.
	 * If you want to prevent merging, just set different priority for both converters.
	 *
	 *		buildModelConverter().for( dispatcher ).fromAttribute( 'bold' ).withPriority( 2 ).toElement( 'strong' );
	 *		buildModelConverter().for( dispatcher ).fromAttribute( 'italic' ).withPriority( 3 ).toElement( 'em' );
	 *
	 * @chainable
	 * @param {Number} priority Converter priority.
	 * @returns {module:engine/conversion/buildmodelconverter~ModelConverterBuilder}
	 */
	withPriority( priority ) {
		this._from.priority = priority;

		return this;
	}

	/**
	 * Registers what view element will be created by converter.
	 *
	 * Method accepts various ways of providing how the view element will be created. You can pass view element name as
	 * `string`, view element instance which will be cloned and used, or creator function which returns view element that
	 * will be used. Keep in mind that when you view element instance or creator function, it has to be/return a
	 * proper type of view element: {@link module:engine/view/containerelement~ContainerElement ViewContainerElement} if you convert
	 * from element or {@link module:engine/view/attributeelement~AttributeElement ViewAttributeElement} if you convert from attribute.
	 *
	 *		buildModelConverter().for( dispatcher ).fromElement( 'paragraph' ).toElement( 'p' );
	 *
	 *		buildModelConverter().for( dispatcher ).fromElement( 'image' ).toElement( new ViewContainerElement( 'img' ) );
	 *
	 *		buildModelConverter().for( dispatcher )
	 *			.fromElement( 'header' )
	 *			.toElement( ( data ) => new ViewContainerElement( 'h' + data.item.getAttribute( 'level' ) ) );
	 *
	 *		buildModelConverter().for( dispatcher ).fromAttribute( 'bold' ).toElement( new ViewAttributeElement( 'strong' ) );
	 *
	 * Creator function will be passed different values depending whether conversion is from element or from attribute:
	 *
	 * * from element: dispatcher's
	 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:insert insert event} parameters
	 * will be passed,
	 * * from attribute: there is one parameter and it is attribute value.
	 *
	 * This method also registers model selection to view selection converter, if conversion is from attribute.
	 *
	 * This method creates the converter and adds it as a callback to a proper
	 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher conversion dispatcher} event.
	 *
	 * @param {String|module:engine/view/element~ViewElement|Function} element Element created by converter or
	 * a function that returns view element.
	 */
	toElement( element ) {
		const priority = this._from.priority === null ? 'normal' : this._from.priority;

		for ( let dispatcher of this._dispatchers ) {
			if ( this._from.type == 'element' ) {
				// From model element to view element -> insert element.
				element = typeof element == 'string' ? new ViewContainerElement( element ) : element;

				dispatcher.on( 'insert:' + this._from.name, insertElement( element ), { priority } );
			} else if ( this._from.type == 'attribute' ) {
				// From model attribute to view element -> wrap and unwrap.
				element = typeof element == 'string' ? new ViewAttributeElement( element ) : element;

				dispatcher.on( 'addAttribute:' + this._from.key, wrapItem( element ), { priority } );
				dispatcher.on( 'changeAttribute:' + this._from.key, wrapItem( element ), { priority } );
				dispatcher.on( 'removeAttribute:' + this._from.key, unwrapItem( element ), { priority } );

				dispatcher.on( 'selectionAttribute:' + this._from.key, convertSelectionAttribute( element ), { priority } );
			} else {
				// From marker to view element -> wrapRange and unwrapRange.
				element = typeof element == 'string' ? new ViewAttributeElement( element ) : element;

				dispatcher.on( 'addMarker:' + this._from.name, wrapRange( element ), { priority } );
				dispatcher.on( 'removeMarker:' + this._from.name, unwrapRange( element ), { priority } );

				dispatcher.on( 'selectionMarker:' + this._from.name, convertSelectionMarker( element ), { priority } );
			}
		}
	}

	/**
	 * Registers what view attribute will be created by converter. Keep in mind, that only model attribute to
	 * view attribute conversion is supported.
	 *
	 * Method accepts various ways of providing how the view attribute will be created:
	 *
	 * * for no passed parameter, attribute key and value will be converted 1-to-1 to view attribute,
	 * * if you pass one `string`, it will be used as new attribute key while attribute value will be copied,
	 * * if you pass two `string`s, first one will be used as new attribute key and second one as new attribute value,
	 * * if you pass a function, it is expected to return an object with `key` and `value` properties representing attribute key and value.
	 * This function will be passed model attribute value and model attribute key as first two parameters and then
	 * all dispatcher's
	 * {module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher#event:changeAttribute changeAttribute event}
	 * parameters.
	 *
	 *		buildModelConverter().for( dispatcher ).fromAttribute( 'class' ).toAttribute( '' );
	 *
	 *		buildModelConverter().for( dispatcher ).fromAttribute( 'linkTitle' ).toAttribute( 'title' );
	 *
	 *		buildModelConverter().for( dispatcher ).fromAttribute( 'highlighted' ).toAttribute( 'style', 'background:yellow' );
	 *
	 *		buildModelConverter().for( dispatcher )
	 *			.fromAttribute( 'theme' )
	 *			.toAttribute( ( value ) => ( { key: 'class', value: value + '-theme' } ) );
	 *
	 * This method creates the converter and adds it as a callback to a proper
	 * {@link module:engine/conversion/modelconversiondispatcher~ModelConversionDispatcher conversion dispatcher} event.
	 *
	 * @param {String|Function} [keyOrCreator] Attribute key or a creator function.
	 * @param {*} [value] Attribute value.
	 */
	toAttribute( keyOrCreator, value ) {
		if ( this._from.type != 'attribute' ) {
			/**
			 * To-attribute conversion is supported only for model attributes.
			 *
			 * @error build-model-converter-element-to-attribute
			 * @param {module:engine/model/range~Range} range
			 */
			throw new CKEditorError( 'build-model-converter-non-attribute-to-attribute: ' +
				'To-attribute conversion is supported only from model attributes.' );
		}

		let attributeCreator;

		if ( !keyOrCreator ) {
			// If `keyOrCreator` is not set, we assume default behavior which is 1:1 attribute re-write.
			// This is also a default behavior for `setAttribute` converter when no attribute creator is passed.
			attributeCreator = undefined;
		} else if ( typeof keyOrCreator == 'string' ) {
			// `keyOrCreator` is an attribute key.

			if ( value ) {
				// If value is set, create "dumb" creator that always returns the same object.
				attributeCreator = function() {
					return { key: keyOrCreator, value: value };
				};
			} else {
				// If value is not set, take it from the passed parameter.
				attributeCreator = function( value ) {
					return { key: keyOrCreator, value: value };
				};
			}
		} else {
			// `keyOrCreator` is an attribute creator function.
			attributeCreator = keyOrCreator;
		}

		for ( let dispatcher of this._dispatchers ) {
			const options = { priority: this._from.priority || 'normal' };

			dispatcher.on( 'addAttribute:' + this._from.key, setAttribute( attributeCreator ), options );
			dispatcher.on( 'changeAttribute:' + this._from.key, setAttribute( attributeCreator ), options );
			dispatcher.on( 'removeAttribute:' + this._from.key, removeAttribute( attributeCreator ), options );
		}
	}
}

/**
 * Entry point for model-to-view converters builder. This chainable API makes it easy to create basic, most common
 * model-to-view converters and attach them to provided dispatchers. The method returns an instance of
 * {@link module:engine/conversion/buildmodelconverter~ModelConverterBuilder}.
 */
export default function buildModelConverter() {
	return new ModelConverterBuilder();
}
