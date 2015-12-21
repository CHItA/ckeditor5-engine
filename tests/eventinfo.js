/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

'use strict';

const modules = bender.amd.require( 'core/eventinfo' );

describe( 'EventInfo', () => {
	let EventInfo;

	before( () => {
		EventInfo = modules[ 'core/eventinfo' ];
	} );

	it( 'should be created properly', () => {
		let event = new EventInfo( this, 'test' );

		expect( event.source ).to.equal( this );
		expect( event.name ).to.equal( 'test' );
		expect( event.stop.called ).to.not.be.true();
		expect( event.off.called ).to.not.be.true();
	} );

	it( 'should have stop() and off() marked', () => {
		let event = new EventInfo( this, 'test' );

		event.stop();
		event.off();

		expect( event.stop.called ).to.be.true();
		expect( event.off.called ).to.be.true();
	} );

	it( 'should not mark "called" in future instances', () => {
		let event = new EventInfo( this, 'test' );

		event.stop();
		event.off();

		event = new EventInfo( 'test' );

		expect( event.stop.called ).to.not.be.true();
		expect( event.off.called ).to.not.be.true();
	} );
} );
