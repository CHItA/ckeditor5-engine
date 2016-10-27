/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* bender-tags: view */

import ModelDocument from '/ckeditor5/engine/model/document.js';
import DataController from '/ckeditor5/engine/controller/datacontroller.js';
import HtmlDataProcessor from '/ckeditor5/engine/dataprocessor/htmldataprocessor.js';

import buildViewConverter  from '/ckeditor5/engine/conversion/buildviewconverter.js';
import buildModelConverter  from '/ckeditor5/engine/conversion/buildmodelconverter.js';

import ViewDocumentFragment from '/ckeditor5/engine/view/documentfragment.js';
import ViewText from '/ckeditor5/engine/view/text.js';

import { getData, setData, stringify, parse } from '/ckeditor5/engine/dev-utils/model.js';

import count from '/ckeditor5/utils/count.js';

describe( 'DataController', () => {
	let modelDocument, htmlDataProcessor, data, schema;

	beforeEach( () => {
		modelDocument = new ModelDocument();
		modelDocument.createRoot();
		modelDocument.createRoot( '$root', 'title' );

		htmlDataProcessor = new HtmlDataProcessor();

		data = new DataController( modelDocument, htmlDataProcessor );

		schema = modelDocument.schema;
	} );

	describe( 'constructor', () => {
		it( 'works without data processor', () => {
			const data = new DataController( modelDocument );

			expect( data.processor ).to.be.undefined;
		} );

		it( 'should add insertContent listener', () => {
			const batch = modelDocument.batch();
			const content = new ViewDocumentFragment( [ new ViewText( 'x' ) ] );

			schema.registerItem( 'paragraph', '$block' );

			setData( modelDocument, '<paragraph>a[]b</paragraph>' );

			data.fire( 'insertContent', { batch, content, selection: modelDocument.selection } );

			expect( getData( modelDocument ) ).to.equal( '<paragraph>ax[]b</paragraph>' );
		} );
	} );

	describe( 'parse', () => {
		it( 'should set text', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			const model = data.parse( '<p>foo<b>bar</b></p>' );

			expect( stringify( model ) ).to.equal( 'foobar' );
		} );

		it( 'should set paragraph', () => {
			schema.registerItem( 'paragraph', '$block' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );

			const model = data.parse( '<p>foo<b>bar</b></p>' );

			expect( stringify( model ) ).to.equal( '<paragraph>foobar</paragraph>' );
		} );

		it( 'should set two paragraphs', () => {
			schema.registerItem( 'paragraph', '$block' );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );

			const model = data.parse( '<p>foo</p><p>bar</p>' );

			expect( stringify( model ) ).to.equal(
				'<paragraph>foo</paragraph><paragraph>bar</paragraph>' );
		} );

		it( 'should set paragraphs with bold', () => {
			schema.registerItem( 'paragraph', '$block' );
			schema.allow( { name: '$text', attributes: [ 'bold' ], inside: '$block' } );

			buildViewConverter().for( data.viewToModel ).fromElement( 'p' ).toElement( 'paragraph' );
			buildViewConverter().for( data.viewToModel ).fromElement( 'b' ).toAttribute( 'bold', true );

			const model = data.parse( '<p>foo<b>bar</b></p>' );

			expect( stringify( model ) ).to.equal(
				'<paragraph>foo<$text bold="true">bar</$text></paragraph>' );
		} );

		it( 'should parse in the root context by default', () => {
			const model = data.parse( 'foo' );

			expect( stringify( model ) ).to.equal( '' );
		} );

		it( 'should accept parsing context', () => {
			const model = data.parse( 'foo', '$block' );

			expect( stringify( model ) ).to.equal( 'foo' );
		} );
	} );

	describe( 'set', () => {
		it( 'should set data to root', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			data.set( 'foo' );

			expect( getData( modelDocument, { withoutSelection: true } ) ).to.equal( 'foo' );
		} );

		it( 'should create a batch', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			data.set( 'foo' );

			expect( count( modelDocument.history.getDeltas() ) ).to.equal( 1 );
		} );

		it( 'should fire #changesDone', () => {
			const spy = sinon.spy();

			schema.allow( { name: '$text', inside: '$root' } );
			modelDocument.on( 'changesDone', spy );

			data.set( 'foo' );

			expect( spy.calledOnce ).to.be.true;
		} );

		it( 'should get root name as a parameter', () => {
			schema.allow( { name: '$text', inside: '$root' } );
			data.set( 'foo', 'main' );
			data.set( 'Bar', 'title' );

			expect( getData( modelDocument, { withoutSelection: true, rootName: 'main' } ) ).to.equal( 'foo' );
			expect( getData( modelDocument, { withoutSelection: true, rootName: 'title' } ) ).to.equal( 'Bar' );

			expect( count( modelDocument.history.getDeltas() ) ).to.equal( 2 );
		} );

		// This case was added when order of params was different and it really didn't work. Let's keep it
		// if anyone will ever try to change this.
		it( 'should allow setting empty data', () => {
			schema.allow( { name: '$text', inside: '$root' } );

			data.set( 'foo', 'title' );

			expect( getData( modelDocument, { withoutSelection: true, rootName: 'title' } ) ).to.equal( 'foo' );

			data.set( '', 'title' );

			expect( getData( modelDocument, { withoutSelection: true, rootName: 'title' } ) ).to.equal( '' );
		} );
	} );

	describe( 'get', () => {
		it( 'should get paragraph with text', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo</paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>foo</p>' );
		} );

		it( 'should get empty paragraph', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph></paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>&nbsp;</p>' );
		} );

		it( 'should get two paragraphs', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo</paragraph><paragraph>bar</paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>foo</p><p>bar</p>' );
		} );

		it( 'should get text directly in root', () => {
			modelDocument.schema.allow( { name: '$text', inside: '$root' } );
			setData( modelDocument, 'foo' );

			expect( data.get() ).to.equal( 'foo' );
		} );

		it( 'should get paragraphs without bold', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo<$text bold="true">bar</$text></paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.get() ).to.equal( '<p>foobar</p>' );
		} );

		it( 'should get paragraphs with bold', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			setData( modelDocument, '<paragraph>foo<$text bold="true">bar</$text></paragraph>' );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );
			buildModelConverter().for( data.modelToView ).fromAttribute( 'bold' ).toElement( 'b' );

			expect( data.get() ).to.equal( '<p>foo<b>bar</b></p>' );
		} );

		it( 'should get root name as a parameter', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			modelDocument.schema.allow( { name: '$text', inside: '$root' } );

			setData( modelDocument, '<paragraph>foo</paragraph>', { rootName: 'main' } );
			setData( modelDocument, 'Bar', { rootName: 'title' } );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );
			buildModelConverter().for( data.modelToView ).fromAttribute( 'bold' ).toElement( 'b' );

			expect( data.get() ).to.equal( '<p>foo</p>' );
			expect( data.get( 'main' ) ).to.equal( '<p>foo</p>' );
			expect( data.get( 'title' ) ).to.equal( 'Bar' );
		} );
	} );

	describe( 'stringify', () => {
		it( 'should get paragraph with text', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			modelDocument.schema.registerItem( 'div', '$block' );
			const modelElement = parse( '<div><paragraph>foo</paragraph></div>', modelDocument.schema );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			expect( data.stringify( modelElement ) ).to.equal( '<p>foo</p>' );
		} );
	} );

	describe( 'toView', () => {
		it( 'should get view element P with text', () => {
			modelDocument.schema.registerItem( 'paragraph', '$block' );
			modelDocument.schema.registerItem( 'div', '$block' );
			const modelElement = parse( '<div><paragraph>foo</paragraph></div>', modelDocument.schema );

			buildModelConverter().for( data.modelToView ).fromElement( 'paragraph' ).toElement( 'p' );

			const viewElement = data.toView( modelElement ).getChild( 0 );

			expect( viewElement.name ).to.equal( 'p' );
			expect( viewElement.childCount ).to.equal( 1 );
			expect( viewElement.getChild( 0 ).data ).to.equal( 'foo' );
		} );
	} );

	describe( 'destroy', () => {
		it( 'should be there for you', () => {
			// Should not throw.
			data.destroy();

			expect( data ).to.respondTo( 'destroy' );
		} );
	} );

	describe( 'insertContent', () => {
		it( 'should fire the insertContent event', () => {
			const spy = sinon.spy();
			const batch = modelDocument.batch();
			const content = new ViewDocumentFragment( [ new ViewText( 'x' ) ] );

			data.on( 'insertContent', spy );

			data.insertContent( batch, modelDocument.selection, content );

			expect( spy.args[ 0 ][ 1 ] ).to.deep.equal( {
				batch: batch,
				selection: modelDocument.selection,
				content: content
			} );
		} );
	} );
} );
