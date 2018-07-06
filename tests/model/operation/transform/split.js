import { Client, syncClients, expectClients } from './utils.js';

describe( 'transform', () => {
	let john, kate;

	beforeEach( () => {
		return Promise.all( [
			Client.get( 'john' ).then( client => john = client ),
			Client.get( 'kate' ).then( client => kate = client )
		] );
	} );

	afterEach( () => {
		return Promise.all( [ john.destroy(), kate.destroy() ] );
	} );

	describe( 'split', () => {
		describe( 'by wrap', () => {
			it( 'element in same path', () => {
				john.setData( '<paragraph>F[]oo</paragraph>' );
				kate.setData( '[<paragraph>Foo</paragraph>]' );

				john.split();
				kate.wrap( 'blockQuote' );

				syncClients();

				expectClients(
					'<blockQuote>' +
						'<paragraph>F</paragraph>' +
						'<paragraph>oo</paragraph>' +
					'</blockQuote>'
				);
			} );

			it( 'multiple elements', () => {
				john.setData( '<paragraph>F[]oo</paragraph><paragraph>Bar</paragraph>' );
				kate.setData( '[<paragraph>Foo</paragraph><paragraph>Bar</paragraph>]' );

				john.split();
				kate.wrap( 'blockQuote' );

				syncClients();

				expectClients(
					'<blockQuote>' +
						'<paragraph>F</paragraph>' +
						'<paragraph>oo</paragraph>' +
						'<paragraph>Bar</paragraph>' +
					'</blockQuote>'
				);
			} );
		} );

		describe( 'by unwrap', () => {
			it( 'element in same path', () => {
				john.setData( '<blockQuote><paragraph>F[]oo</paragraph></blockQuote>' );
				kate.setData( '<blockQuote>[<paragraph>Foo</paragraph>]</blockQuote>' );

				john.split();
				kate.unwrap();

				syncClients();

				expectClients(
					'<paragraph>F</paragraph>' +
					'<paragraph>oo</paragraph>'
				);
			} );

			it( 'multiple elements', () => {
				john.setData( '<blockQuote><paragraph>F[]oo</paragraph><paragraph>Bar</paragraph></blockQuote>' );
				kate.setData( '<blockQuote>[<paragraph>Foo</paragraph><paragraph>Bar</paragraph>]</blockQuote>' );

				john.split();
				kate.unwrap();

				syncClients();

				expectClients(
					'<paragraph>F</paragraph>' +
					'<paragraph>oo</paragraph>' +
					'<paragraph>Bar</paragraph>'
				);
			} );
		} );

		describe( 'by split', () => {
			it( 'text in same path #1', () => {
				john.setData( '<paragraph>F[]oo</paragraph>' );
				kate.setData( '<paragraph>Fo[]o</paragraph>' );

				john.split();
				kate.split();

				syncClients();

				expectClients(
					'<paragraph>F</paragraph>' +
					'<paragraph>o</paragraph>' +
					'<paragraph>o</paragraph>'
				);
			} );

			it( 'text in same path #2', () => {
				john.setData( '<paragraph>[]Foo</paragraph>' );
				kate.setData( '<paragraph>Foo[]</paragraph>' );

				john.split();
				kate.split();

				syncClients();

				expectClients(
					'<paragraph></paragraph>' +
					'<paragraph>Foo</paragraph>' +
					'<paragraph></paragraph>'
				);
			} );

			it( 'text in same position', () => {
				john.setData( '<paragraph>F[]oo</paragraph>' );
				kate.setData( '<paragraph>F[]oo</paragraph>' );

				john.split();
				kate.split();

				syncClients();

				expectClients(
					'<paragraph>F</paragraph>' +
					'<paragraph></paragraph>' +
					'<paragraph>oo</paragraph>'
				);
			} );

			it( 'text in different path', () => {
				john.setData( '<paragraph>F[]oo</paragraph><paragraph>Bar</paragraph>' );
				kate.setData( '<paragraph>Foo</paragraph><paragraph>B[]ar</paragraph>' );

				john.split();
				kate.split();

				syncClients();

				expectClients(
					'<paragrpah>F</paragraph>' +
					'<paragraph>oo</paragraph>' +
					'<paragraph>B</paragraph>' +
					'<paragraph>ar</paragraph>'
				);
			} );
		} );

		describe( 'by merge', () => {
			it( 'element into paragraph', () => {
				john.setData( '<paragraph>Fo[]o</paragraph><paragraph>Bar</paragraph>' );
				kate.setData( '<paragraph>Foo</paragraph>[]<paragraph>Bar</paragraph>' );

				john.split();
				kate.merge();

				syncClients();

				expectClients(
					'<paragraph>Fo</paragraph>' +
					'<paragraph>oBar</paragraph>'
				);
			} );
		} );

		describe( 'by delete', () => {
			it.skip( 'text from two elements', () => {
				john.setData( '<paragraph>F[]oo</paragraph><paragraph>Bar</paragraph>' );
				kate.setData( '<paragraph>Fo[o</paragraph><paragraph>B]ar</paragraph>' );

				john.split();
				kate.delete();

				syncClients();

				expectClients(
					'<paragraph>F</paragraph>' +
					'<paragraph>o</paragraph>' +
					'<paragraph>ar</paragraph>'
				);
			} );

			it( 'text from one element', () => {
				john.setData( '<paragraph>F[]oo Bar</paragraph>' );
				kate.setData( '<paragraph>Foo B[ar]</paragraph>' );

				john.split();
				kate.delete();

				syncClients();

				expectClients(
					'<paragraph>F</paragraph>' +
					'<paragraph>oo B</paragraph>'
				);
			} );
		} );
	} );
} );