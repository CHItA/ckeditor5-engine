/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module engine/view/observer/focusobserver
 */

import DomEventObserver from './domeventobserver.js';

/**
 * {@link module:engine/view/document~Document#event:focus Focus}
 * and {@link module:engine/view/document~Document#event:blur blur} events observer.
 * Focus observer handle also {@link module:engine/view/rooteditableelement~RootEditableElement#isFocused isFocused} property of the
 * {@link module:engine/view/rooteditableelement~RootEditableElement root elements}.
 *
 * Note that this observer is attached by the {@link module:engine/view/document~Document} and is available by default.
 *
 * @extends module:engine/view/observer/observer~Observer.DomEventObserver
 */
export default class FocusObserver extends DomEventObserver {
	constructor( document ) {
		super( document );

		this.domEventType = [ 'focus', 'blur' ];

		document.on( 'focus', () => {
			document.isFocused = true;
		} );

		document.on( 'blur', ( evt, data ) => {
			const selectedEditable = document.selection.editableElement;

			if ( selectedEditable === null || selectedEditable === data.target ) {
				document.isFocused = false;
			}
		} );
	}

	onDomEvent( domEvent ) {
		this.fire( domEvent.type, domEvent );
	}
}

/**
 * Fired when one of the editables gets focus.
 *
 * Introduced by {@link module:engine/view/observer/focusobserver~FocusObserver}.
 *
 * Note that because {@link module:engine/view/observer/focusobserver~FocusObserver} is attached by the {@link
 * module:engine/view/document~Document}
 * this event is available by default.
 *
 * @see module:engine/view/observer/focusobserver~FocusObserver
 * @event module:engine/view/document~Document#event:focus
 * @param {module:engine/view/observer/domeventdata~DomEventData} data Event data.
 */

/**
 * Fired when one of the editables loses focus.
 *
 * Introduced by {@link module:engine/view/observer/focusobserver~FocusObserver}.
 *
 * Note that because {@link module:engine/view/observer/focusobserver~FocusObserver} is attached by the {@link
 * module:engine/view/document~Document}
 * this event is available by default.
 *
 * @see module:engine/view/observer/focusobserver~FocusObserver
 * @event module:engine/view/document~Document#event:blur
 * @param {module:engine/view/observer/domeventdata~DomEventData} data Event data.
 */
