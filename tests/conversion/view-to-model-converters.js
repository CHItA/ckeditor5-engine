/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ViewConversionDispatcher from 'ckeditor5-engine/src/conversion/viewconversiondispatcher';
import ViewContainerElement from 'ckeditor5-engine/src/view/containerelement';
import ViewDocumentFragment from 'ckeditor5-engine/src/view/documentfragment';
import ViewText from 'ckeditor5-engine/src/view/text';

import ModelSchema from 'ckeditor5-engine/src/model/schema';
import ModelDocumentFragment from 'ckeditor5-engine/src/model/documentfragment';
import ModelElement from 'ckeditor5-engine/src/model/element';
import ModelText from 'ckeditor5-engine/src/model/text';

import { convertToModelFragment, convertText } from 'ckeditor5-engine/src/conversion/view-to-model-converters';

describe( 'view-to-model-converters', () => {
	let dispatcher, schema, objWithContext;

	beforeEach( () => {
		schema = new ModelSchema();
		schema.registerItem( 'paragraph', '$block' );
		schema.allow( { name: '$text', inside: '$root' } );
		objWithContext = { context: [ '$root' ] };
		dispatcher = new ViewConversionDispatcher( { schema } );
	} );

	describe( 'convertText', () => {
		it( 'should return converter converting ViewText to ModelText', () => {
			const viewText = new ViewText( 'foobar' );

			dispatcher.on( 'text', convertText() );

			const result = dispatcher.convert( viewText, objWithContext );

			expect( result ).to.be.instanceof( ModelText );
			expect( result.data ).to.equal( 'foobar' );
		} );

		it( 'should not convert already consumed texts', () => {
			const viewText = new ViewText( 'foofuckbafuckr' );

			// Default converter for elements. Returns just converted children. Added with lowest priority.
			dispatcher.on( 'text', convertText(), { priority: 'lowest' } );
			// Added with normal priority. Should make the above converter not fire.
			dispatcher.on( 'text', ( evt, data, consumable ) => {
				if ( consumable.consume( data.input ) ) {
					data.output = new ModelText( data.input.data.replace( /fuck/gi, '****' ) );
				}
			} );

			const result = dispatcher.convert( viewText, objWithContext );

			expect( result ).to.be.instanceof( ModelText );
			expect( result.data ).to.equal( 'foo****ba****r' );
		} );

		it( 'should not convert text if it is wrong with schema', () => {
			schema.disallow( { name: '$text', inside: '$root' } );

			const viewText = new ViewText( 'foobar' );
			dispatcher.on( 'text', convertText() );

			let result = dispatcher.convert( viewText, objWithContext );

			expect( result ).to.be.null;

			result = dispatcher.convert( viewText, { context: [ '$block' ] } );
			expect( result ).to.be.instanceof( ModelText );
			expect( result.data ).to.equal( 'foobar' );
		} );

		it( 'should support unicode', () => {
			const viewText = new ViewText( 'நிலைக்கு' );

			dispatcher.on( 'text', convertText() );

			const result = dispatcher.convert( viewText, objWithContext );

			expect( result ).to.be.instanceof( ModelText );
			expect( result.data ).to.equal( 'நிலைக்கு' );
		} );
	} );

	describe( 'convertToModelFragment', () => {
		it( 'should return converter converting whole ViewDocumentFragment to ModelDocumentFragment', () => {
			const viewFragment = new ViewDocumentFragment( [
				new ViewContainerElement( 'p', null, new ViewText( 'foo' ) ),
				new ViewText( 'bar' )
			] );

			// To get any meaningful results we have to actually convert something.
			dispatcher.on( 'text', convertText() );
			// This way P element won't be converted per-se but will fire converting it's children.
			dispatcher.on( 'element', convertToModelFragment() );
			dispatcher.on( 'documentFragment', convertToModelFragment() );

			const result = dispatcher.convert( viewFragment, objWithContext );

			expect( result ).to.be.instanceof( ModelDocumentFragment );
			expect( result.maxOffset ).to.equal( 6 );
			expect( result.getChild( 0 ).data ).to.equal( 'foobar' );
		} );

		it( 'should not convert already consumed (converted) changes', () => {
			const viewP = new ViewContainerElement( 'p', null, new ViewText( 'foo' ) );

			// To get any meaningful results we have to actually convert something.
			dispatcher.on( 'text', convertText() );
			// Default converter for elements. Returns just converted children. Added with lowest priority.
			dispatcher.on( 'element', convertToModelFragment(), { priority: 'lowest' } );
			// Added with normal priority. Should make the above converter not fire.
			dispatcher.on( 'element:p', ( evt, data, consumable, conversionApi ) => {
				if ( consumable.consume( data.input, { name: true } ) ) {
					data.output = new ModelElement( 'paragraph' );

					data.context.push( data.output );
					data.output.appendChildren( conversionApi.convertChildren( data.input, consumable, data ) );
					data.context.pop();
				}
			} );

			const result = dispatcher.convert( viewP, objWithContext );

			expect( result ).to.be.instanceof( ModelElement );
			expect( result.name ).to.equal( 'paragraph' );
			expect( result.maxOffset ).to.equal( 3 );
			expect( result.getChild( 0 ).data ).to.equal( 'foo' );
		} );
	} );
} );
