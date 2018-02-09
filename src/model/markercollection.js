/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/model/markercollection
 */

import LiveRange from './liverange';
import Position from './position';
import Range from './range';
import EmitterMixin from '@ckeditor/ckeditor5-utils/src/emittermixin';
import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';
import mix from '@ckeditor/ckeditor5-utils/src/mix';

/**
 * The collection of all {@link module:engine/model/markercollection~Marker markers} attached to the document.
 * It lets you {@link module:engine/model/markercollection~MarkerCollection#get get} markers or track them using
 * {@link module:engine/model/markercollection~MarkerCollection#event:set} and
 * {@link module:engine/model/markercollection~MarkerCollection#event:remove} events.
 *
 * To create, change or remove makers use {@link module:engine/model/writer~Writer model writers'} methods:
 * {@link module:engine/model/writer~Writer#setMarker} or {@link module:engine/model/writer~Writer#removeMarker}. Since
 * the writer is the only proper way to change the data model it is not possible to change markers directly using this
 * collection. All markers created by the writer will be automatically added to this collection.
 *
 * By default there is one marker collection available as {@link module:engine/model/model~Model#markers model property}.
 *
 * @see module:engine/model/markercollection~Marker
 */
export default class MarkerCollection {
	/**
	 * Creates a markers collection.
	 */
	constructor() {
		/**
		 * Stores {@link ~Marker markers} added to the collection.
		 *
		 * @private
		 * @member {Map} #_markers
		 */
		this._markers = new Map();
	}

	/**
	 * Iterable interface.
	 *
	 * Iterates over all {@link ~Marker markers} added to the collection.
	 *
	 * @returns {Iterable}
	 */
	[ Symbol.iterator ]() {
		return this._markers.values();
	}

	/**
	 * Checks if marker with given `markerName` is in the collection.
	 *
	 * @param {String} markerName Marker name.
	 * @returns {Boolean} `true` if marker with given `markerName` is in the collection, `false` otherwise.
	 */
	has( markerName ) {
		return this._markers.has( markerName );
	}

	/**
	 * Returns {@link ~Marker marker} with given `markerName`.
	 *
	 * @param {String} markerName Name of marker to get.
	 * @returns {module:engine/model/markercollection~Marker|null} Marker with given name or `null` if such marker was
	 * not added to the collection.
	 */
	get( markerName ) {
		return this._markers.get( markerName ) || null;
	}

	/**
	 * Creates and adds a {@link ~Marker marker} to the `MarkerCollection` with given name on given
	 * {@link module:engine/model/range~Range range}.
	 *
	 * If `MarkerCollection` already had a marker with given name (or {@link ~Marker marker} was passed) and the range to
	 * set is different, the marker in collection is removed and then new marker is added. If the range was same, nothing
	 * happens and `false` is returned.
	 *
	 * @protected
	 * @fires module:engine/model/markercollection~MarkerCollection#event:set
	 * @fires module:engine/model/markercollection~MarkerCollection#event:remove
	 * @param {String|module:engine/model/markercollection~Marker} markerOrName Name of marker to set or marker instance to update.
	 * @param {module:engine/model/range~Range} range Marker range.
	 * @param {Boolean} managedUsingOperations Specifies whether the marker is managed using operations.
	 * @returns {module:engine/model/markercollection~Marker} `Marker` instance added to the collection.
	 */
	_set( markerOrName, range, managedUsingOperations ) {
		const markerName = markerOrName instanceof Marker ? markerOrName.name : markerOrName;
		const oldMarker = this._markers.get( markerName );

		if ( oldMarker ) {
			const oldRange = oldMarker.getRange();

			if ( oldRange.isEqual( range ) && managedUsingOperations === oldMarker.managedUsingOperations ) {
				return oldMarker;
			}

			this._remove( markerName );
		}

		const liveRange = LiveRange.createFromRange( range );
		const marker = new Marker( markerName, liveRange, managedUsingOperations );

		this._markers.set( markerName, marker );
		this.fire( 'set:' + markerName, marker );

		return marker;
	}

	/**
	 * Removes given {@link ~Marker marker} or a marker with given name from the `MarkerCollection`.
	 *
	 * @protected
	 * @param {String} markerOrName Marker or name of a marker to remove.
	 * @returns {Boolean} `true` if marker was found and removed, `false` otherwise.
	 */
	_remove( markerOrName ) {
		const markerName = markerOrName instanceof Marker ? markerOrName.name : markerOrName;
		const oldMarker = this._markers.get( markerName );

		if ( oldMarker ) {
			this._markers.delete( markerName );
			this.fire( 'remove:' + markerName, oldMarker );

			this._destroyMarker( oldMarker );

			return true;
		}

		return false;
	}

	/**
	 * Returns iterator that iterates over all markers, which ranges contain given {@link module:engine/model/position~Position position}.
	 *
	 * @param {module:engine/model/position~Position} position
	 * @returns {Iterable.<module:engine/model/markercollection~Marker>}
	 */
	* getMarkersAtPosition( position ) {
		for ( const marker of this ) {
			if ( marker.getRange().containsPosition( position ) ) {
				yield marker;
			}
		}
	}

	/**
	 * Destroys marker collection and all markers inside it.
	 */
	destroy() {
		for ( const marker of this._markers.values() ) {
			this._destroyMarker( marker );
		}

		this._markers = null;

		this.stopListening();
	}

	/**
	 * Iterates over all markers that starts with given `prefix`.
	 *
	 *		const markerFooA = markersCollection.set( 'foo:a', rangeFooA );
	 *		const markerFooB = markersCollection.set( 'foo:b', rangeFooB );
	 *		const markerBarA = markersCollection.set( 'bar:a', rangeBarA );
	 *		const markerFooBarA = markersCollection.set( 'foobar:a', rangeFooBarA );
	 *		Array.from( markersCollection.getMarkersGroup( 'foo' ) ); // [ markerFooA, markerFooB ]
	 *		Array.from( markersCollection.getMarkersGroup( 'a' ) ); // []
	 *
	 * @param prefix
	 * @returns {Iterable.<module:engine/model/markercollection~Marker>}
	 */
	* getMarkersGroup( prefix ) {
		for ( const marker of this._markers.values() ) {
			if ( marker.name.startsWith( prefix + ':' ) ) {
				yield marker;
			}
		}
	}

	/**
	 * Destroys the marker.
	 *
	 * @private
	 * @param {module:engine/model/markercollection~Marker} marker Marker to destroy.
	 */
	_destroyMarker( marker ) {
		marker.stopListening();
		marker._liveRange.detach();
		marker._liveRange = null;
	}

	/**
	 * Fired whenever marker is added or updated in `MarkerCollection`.
	 *
	 * @event set
	 * @param {module:engine/model/markercollection~Marker} The set marker.
	 */

	/**
	 * Fired whenever marker is removed from `MarkerCollection`.
	 *
	 * @event remove
	 * @param {module:engine/model/markercollection~Marker} marker The removed marker.
	 */
}

mix( MarkerCollection, EmitterMixin );

/**
 * `Marker` is a continuous parts of model (like a range), is named and represent some kind of information about marked
 * part of model document. In contrary to {@link module:engine/model/node~Node nodes}, which are building blocks of
 * model document tree, markers are not stored directly in document tree but in
 * {@link module:engine/model/model~Model#markers model markers' collection}. Still, they are document data, by giving
 * additional meaning to the part of a model document between marker start and marker end.
 *
 * In this sense, markers are similar to adding and converting attributes on nodes. The difference is that attribute is
 * connected with a given node (e.g. a character is bold no matter if it gets moved or content around it changes).
 * Markers on the other hand are continuous ranges and are characterized by their start and end position. This means that
 * any character in the marker is marked by the marker. For example, if a character is moved outside of marker it stops being
 * "special" and the marker is shrunk. Similarly, when a character is moved into the marker from other place in document
 * model, it starts being "special" and the marker is enlarged.
 *
 * Another upside of markers is that finding marked part of document is fast and easy. Using attributes to mark some nodes
 * and then trying to find that part of document would require traversing whole document tree. Marker gives instant access
 * to the range which it is marking at the moment.
 *
 * Markers are built from a name and a range.
 *
 * Range of the marker is updated automatically when document changes, using
 * {@link module:engine/model/liverange~LiveRange live range} mechanism.
 *
 * Name is used to group and identify markers. Names have to be unique, but markers can be grouped by
 * using common prefixes, separated with `:`, for example: `user:john` or `search:3`. That's useful in term of creating
 * namespaces for custom elements (e.g. comments, highlights). You can use this prefixes in
 * {@link module:engine/model/markercollection~MarkerCollection#event:set} listeners to listen on changes in a group of markers.
 * For instance: `model.markers.on( 'set:user', callback );` will be called whenever any `user:*` markers changes.
 *
 * There are two types of markers.
 *
 * 1. Markers managed directly, without using operations. They are added directly by {@link module:engine/model/writer~Writer}
 * to the {@link module:engine/model/markercollection~MarkerCollection} without any additional mechanism. They can be used
 * as bookmarks or visual markers. They are great for showing results of the find, or select link when the focus is in the input.
 *
 * 1. Markers managed using operations. These markers are also stored in {@link module:engine/model/markercollection~MarkerCollection}
 * but changes in these markers is managed the same way all other changes in the model structure - using operations.
 * Therefore, they are handled in the undo stack and synchronized between clients if the collaboration plugin is enabled.
 * This type of markers is useful for solutions like spell checking or comments.
 *
 * Both type of them should be added / updated by {@link module:engine/model/writer~Writer#setMarker}
 * and removed by {@link module:engine/model/writer~Writer#removeMarker} methods.
 *
 *		model.change( ( writer ) => {
 * 			const marker = writer.setMarker( name, range, { usingOperation: true } );
 *
 * 			// ...
 *
 * 			writer.removeMarker( marker );
 *		} );
 *
 * See {@link module:engine/model/writer~Writer} to find more examples.
 *
 * Since markers need to track change in the document, for efficiency reasons, it is best to create and keep as little
 * markers as possible and remove them as soon as they are not needed anymore.
 *
 * Markers can be downcasted and upcasted.
 *
 * Markers downcast happens on {@link module:engine/conversion/downcastdispatcher~DowncastDispatcher#event:addMarker} and
 * {@link module:engine/conversion/downcastdispatcher~DowncastDispatcher#event:removeMarker} events.
 * Use {@link module:engine/conversion/downcast-converters downcast converters} or attach a custom converter to mentioned events.
 * For {@link module:engine/controller/datacontroller~DataController data pipeline}, marker should be downcasted to an element.
 * Then, it can be upcasted back to a marker. Again, use {@link module:engine/conversion/upcast-converters upcast converters} or
 * attach a custom converter to {@link module:engine/conversion/upcastdispatcher~UpcastDispatcher#event:element}.
 *
 * Another upside of markers is that finding marked part of document is fast and easy. Using attributes to mark some nodes
 * and then trying to find that part of document would require traversing whole document tree. Marker gives instant access
 * to the range which it is marking at the moment.
 *
 * `Marker` instances are created and destroyed only by {@link ~MarkerCollection MarkerCollection}.
 */
class Marker {
	/**
	 * Creates a marker instance.
	 *
	 * @param {String} name Marker name.
	 * @param {module:engine/model/liverange~LiveRange} liveRange Range marked by the marker.
	 */
	constructor( name, liveRange, managedUsingOperations ) {
		/**
		 * Marker's name.
		 *
		 * @readonly
		 * @type {String}
		 */
		this.name = name;

		/**
		 * Flag indicates if the marker is managed using operations or not. See {@link ~Marker marker class description}
		 * to learn more about marker types. See {@link module:engine/model/writer~Writer#setMarker}.
		 *
		 * @readonly
		 * @type {Boolean}
		 */
		this.managedUsingOperations = managedUsingOperations;

		/**
		 * Range marked by the marker.
		 *
		 * @protected
		 * @type {module:engine/model/liverange~LiveRange}
		 */
		this._liveRange = liveRange;

		// Delegating does not work with namespaces. Alternatively, we could delegate all events (using `*`).
		this._liveRange.delegate( 'change:range' ).to( this );
		this._liveRange.delegate( 'change:content' ).to( this );
	}

	/**
	 * Returns current marker start position.
	 *
	 * @returns {module:engine/model/position~Position}
	 */
	getStart() {
		if ( !this._liveRange ) {
			throw new CKEditorError( 'marker-destroyed: Cannot use a destroyed marker instance.' );
		}

		return Position.createFromPosition( this._liveRange.start );
	}

	/**
	 * Returns current marker end position.
	 *
	 * @returns {module:engine/model/position~Position}
	 */
	getEnd() {
		if ( !this._liveRange ) {
			throw new CKEditorError( 'marker-destroyed: Cannot use a destroyed marker instance.' );
		}

		return Position.createFromPosition( this._liveRange.end );
	}

	/**
	 * Returns a range that represents current state of marker.
	 *
	 * Keep in mind that returned value is a {@link module:engine/model/range~Range Range}, not a
	 * {@link module:engine/model/liverange~LiveRange LiveRange}. This means that it is up-to-date and relevant only
	 * until next model document change. Do not store values returned by this method. Instead, store {@link ~Marker#name}
	 * and get `Marker` instance from {@link module:engine/model/markercollection~MarkerCollection MarkerCollection} every
	 * time there is a need to read marker properties. This will guarantee that the marker has not been removed and
	 * that it's data is up-to-date.
	 *
	 * @returns {module:engine/model/range~Range}
	 */
	getRange() {
		if ( !this._liveRange ) {
			throw new CKEditorError( 'marker-destroyed: Cannot use a destroyed marker instance.' );
		}

		return Range.createFromRange( this._liveRange );
	}

	/**
	 * Fired whenever {@link ~Marker#_liveRange marker range} is changed due to changes on {@link module:engine/model/document~Document}.
	 * This is a delegated {@link module:engine/model/liverange~LiveRange#event:change:range LiveRange change:range event}.
	 *
	 * When marker is removed from {@link module:engine/model/markercollection~MarkerCollection MarkerCollection},
	 * all event listeners listening to it should be removed. It is best to do it on
	 * {@link module:engine/model/markercollection~MarkerCollection#event:remove MarkerCollection remove event}.
	 *
	 * @see module:engine/model/liverange~LiveRange#event:change:range
	 * @event change:range
	 * @param {module:engine/model/range~Range} oldRange
	 * @param {Object} data
	 */

	/**
	 * Fired whenever change on {@link module:engine/model/document~Document} is done inside {@link ~Marker#_liveRange marker range}.
	 * This is a delegated {@link module:engine/model/liverange~LiveRange#event:change:content LiveRange change:content event}.
	 *
	 * When marker is removed from {@link module:engine/model/markercollection~MarkerCollection MarkerCollection},
	 * all event listeners listening to it should be removed. It is best to do it on
	 * {@link module:engine/model/markercollection~MarkerCollection#event:remove MarkerCollection remove event}.
	 *
	 * @see module:engine/model/liverange~LiveRange#event:change:content
	 * @event change:content
	 * @param {module:engine/model/range~Range} oldRange
	 * @param {Object} data
	 */
}

mix( Marker, EmitterMixin );

/**
 * Cannot use a {@link module:engine/model/markercollection~MarkerCollection#destroy destroyed marker} instance.
 *
 * @error marker-destroyed
 */
