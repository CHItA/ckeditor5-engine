/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

import EmitterMixin from '../emittermixin.js';
import utils from '../utils.js';

/**
 * The base class for CKEditor commands.
 *
 * Commands are main way to manipulate editor contents and state. They are mostly used by UI elements (or by other
 * commands) to make changes in Tree Model. Commands are available in every part of code that has access to
 * {@link core.Editor} instance, since they are registered in it and executed through {@link core.Editor#execute}.
 * Commands instances are available through {@link core.Editor#commands}.
 *
 * This is an abstract base class for all commands.
 *
 * @memberOf core.command
 */
export default class Command {
	/**
	 * Creates a new Command instance.
	 *
	 * @param {core.Editor} editor Editor on which this command will be used.
	 */
	constructor( editor ) {
		/**
		 * Editor on which this command will be used.
		 *
		 * @member {core.Editor} core.command.Command#editor
		 */
		this.editor = editor;

		/**
		 * Flag indicating whether a command is enabled or disabled.
		 * A disabled command should do nothing upon it's execution.
		 *
		 * @member {Boolean} core.command.Command#isEnabled
		 */
		this.isEnabled = true;

		// If schema checking function is specified, add it to the `refreshState` listeners.
		// Feature will be disabled if it does not apply to schema requirements.
		if ( this.checkEnabled ) {
			this.on( 'refreshState', ( evt ) => {
				if ( !this.checkEnabled() ) {
					return disableCallback( evt );
				}
			} );
		}
	}

	/**
	 * Checks if a command should be enabled according to its own rules. Mostly it will check schema to see if the command
	 * is allowed to be executed in given position. This method can be defined in child class (but is not obligatory).
	 * If it is defined, it will be added as a callback to `refreshState` event.
	 *
	 * @method core.command.Command#checkEnabled
	 * @returns {Boolean} `true` if command should be enabled according to {@link core.treeModel.Document#schema}. `false` otherwise.
	 */

	/**
	 * Fires `refreshState` event and checks it's resolve value to decide whether command should be enabled or not.
	 * Other parts of code might listen to `refreshState` event on this command and add their callbacks. This
	 * way the responsibility of deciding whether a command should be enabled is shared.
	 *
	 * @fires {@link core.command.Command.refreshState refreshState}
	 */
	refreshState() {
		this.isEnabled = this.fire( 'refreshState' ) !== false;
	}

	/**
	 * Executes the command if it is enabled.
	 *
	 * @protected
	 * @param {*} param Parameter passed to {@link core.command.Command#execute execute} method of this command.
	 */
	doExecute( param ) {
		if ( this.isEnabled ) {
			this._execute( param );
		}
	}

	/**
	 * Disables the command. This should be used only by the command itself. Other parts of code should add
	 * listeners to `refreshState` event.
	 *
	 * @private
	 */
	_disable() {
		this.on( 'refreshState', disableCallback );
		this.refreshState();
	}

	/**
	 * Enables the command (internally). This should be used only by the command itself. Command will be enabled if
	 * other listeners does not return false on `refreshState` event callbacks. Firing {@link core.command.Command#_enable}
	 * does not guarantee that {@link core.command.Command#isEnabled} will be set to true, as it depends on other listeners.
	 *
	 * @private
	 */
	_enable() {
		this.off( 'refreshState', disableCallback );
		this.refreshState();
	}

	/**
	 * Executes command.
	 * This is an abstract method that should be overwritten in child classes.
	 *
	 * @private
	 */
	_execute() {
	}
}

function disableCallback( evt ) {
	evt.stop();

	return false;
}

utils.mix( Command, EmitterMixin );

/**
 * Fired whenever command has to have it's {@link core.command.Command#isEnabled} property refreshed. Every feature,
 * command or other class which should be able to disable command (set `isEnabled` to `false`) should listen to this
 * event.
 *
 * @event core.command.Command.refreshState
 */
