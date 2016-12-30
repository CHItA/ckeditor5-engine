/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import ModelConversionDispatcher from 'ckeditor5-engine/src/conversion/modelconversiondispatcher';
import ModelDocument from 'ckeditor5-engine/src/model/document';
import ModelText from 'ckeditor5-engine/src/model/text';
import ModelElement from 'ckeditor5-engine/src/model/element';
import ModelRange from 'ckeditor5-engine/src/model/range';
import ModelPosition from 'ckeditor5-engine/src/model/position';
import RemoveOperation from 'ckeditor5-engine/src/model/operation/removeoperation';
import { wrapInDelta } from 'ckeditor5-engine/tests/model/_utils/utils';

describe( 'ModelConversionDispatcher', () => {
	let dispatcher, doc, root;

	beforeEach( () => {
		dispatcher = new ModelConversionDispatcher();
		doc = new ModelDocument();
		root = doc.createRoot();
	} );

	describe( 'constructor()', () => {
		it( 'should create ModelConversionDispatcher with given api', () => {
			const apiObj = {};
			const dispatcher = new ModelConversionDispatcher( { apiObj } );

			expect( dispatcher.conversionApi.apiObj ).to.equal( apiObj );
		} );
	} );

	describe( 'convertChange', () => {
		// We will do integration tests here. Unit tests will be done for methods that are used
		// by `convertChange` internally. This way we will have two kinds of tests.

		let image, imagePos;

		beforeEach( () => {
			image = new ModelElement( 'image' );
			root.appendChildren( [ image, new ModelText( 'foobar' ) ] );

			imagePos = ModelPosition.createBefore( image );

			dispatcher.listenTo( doc, 'change', ( evt, type, changes ) => {
				dispatcher.convertChange( type, changes );
			} );
		} );

		it( 'should fire insert and addAttribute callbacks for insertion changes', () => {
			const cbInsertText = sinon.spy();
			const cbInsertImage = sinon.spy();
			const cbAddAttribute = sinon.spy();

			dispatcher.on( 'insert:$text', cbInsertText );
			dispatcher.on( 'insert:image', cbInsertImage );
			dispatcher.on( 'addAttribute:key:$text', cbAddAttribute );

			const insertedText = new ModelText( 'foo', { key: 'value' } );
			doc.batch().insert( ModelPosition.createFromParentAndOffset( root, 0 ), insertedText );

			expect( cbInsertText.called ).to.be.true;
			expect( cbAddAttribute.called ).to.be.true;
			expect( cbInsertImage.called ).to.be.false;
		} );

		it( 'should fire insert and addAttribute callbacks for reinsertion changes', () => {
			image.setAttribute( 'key', 'value' );

			// We will just create reinsert operation by reverting remove operation
			// because creating reinsert change is tricky and not available through batch API.
			const removeOperation = new RemoveOperation( imagePos, 1, 0 );

			// Let's apply remove operation so reinsert operation won't break.
			doc.applyOperation( wrapInDelta( removeOperation ) );

			const cbInsertText = sinon.spy();
			const cbInsertImage = sinon.spy();
			const cbAddAttribute = sinon.spy();

			dispatcher.on( 'insert:$text', cbInsertText );
			dispatcher.on( 'insert:image', cbInsertImage );
			dispatcher.on( 'addAttribute:key:image', cbAddAttribute );

			doc.applyOperation( wrapInDelta( removeOperation.getReversed() ) );

			expect( cbInsertImage.called ).to.be.true;
			expect( cbAddAttribute.called ).to.be.true;
			expect( cbInsertText.called ).to.be.false;
		} );

		it( 'should fire move callback for move changes', () => {
			const cbMove = sinon.spy();

			dispatcher.on( 'move', cbMove );

			doc.batch().move( image, imagePos.getShiftedBy( 3 ) );

			expect( cbMove.called );
		} );

		it( 'should fire remove callback for remove changes', () => {
			const cbRemove = sinon.spy();

			dispatcher.on( 'remove', cbRemove );

			doc.batch().remove( image );

			expect( cbRemove.called );
		} );

		it( 'should fire rename callback for rename changes', () => {
			const cbRename = sinon.spy();

			dispatcher.on( 'rename', cbRename );

			doc.batch().rename( image, 'figure' );

			expect( cbRename.called );
		} );

		it( 'should fire addAttribute callbacks for add attribute change', () => {
			const cbAddText = sinon.spy();
			const cbAddImage = sinon.spy();

			dispatcher.on( 'addAttribute:key:$text', cbAddText );
			dispatcher.on( 'addAttribute:key:image', cbAddImage );

			doc.batch().setAttribute( image, 'key', 'value' );

			// Callback for adding attribute on text not called.
			expect( cbAddText.called ).to.be.false;
			expect( cbAddImage.calledOnce ).to.be.true;

			doc.batch().setAttribute( ModelRange.createFromParentsAndOffsets( root, 3, root, 4 ), 'key', 'value' );

			expect( cbAddText.calledOnce ).to.be.true;
			// Callback for adding attribute on image not called this time.
			expect( cbAddImage.calledOnce ).to.be.true;
		} );

		it( 'should fire changeAttribute callbacks for change attribute change', () => {
			const cbChangeText = sinon.spy();
			const cbChangeImage = sinon.spy();

			dispatcher.on( 'changeAttribute:key:$text', cbChangeText );
			dispatcher.on( 'changeAttribute:key:image', cbChangeImage );

			doc.batch().setAttribute( image, 'key', 'value' ).setAttribute( image, 'key', 'newValue' );

			// Callback for adding attribute on text not called.
			expect( cbChangeText.called ).to.be.false;
			expect( cbChangeImage.calledOnce ).to.be.true;

			const range = ModelRange.createFromParentsAndOffsets( root, 3, root, 4 );
			doc.batch().setAttribute( range, 'key', 'value' ).setAttribute( range, 'key', 'newValue' );

			expect( cbChangeText.calledOnce ).to.be.true;
			// Callback for adding attribute on image not called this time.
			expect( cbChangeImage.calledOnce ).to.be.true;
		} );

		it( 'should fire removeAttribute callbacks for remove attribute change', () => {
			const cbRemoveText = sinon.spy();
			const cbRemoveImage = sinon.spy();

			dispatcher.on( 'removeAttribute:key:$text', cbRemoveText );
			dispatcher.on( 'removeAttribute:key:image', cbRemoveImage );

			doc.batch().setAttribute( image, 'key', 'value' ).removeAttribute( image, 'key' );

			// Callback for adding attribute on text not called.
			expect( cbRemoveText.called ).to.be.false;
			expect( cbRemoveImage.calledOnce ).to.be.true;

			const range = ModelRange.createFromParentsAndOffsets( root, 3, root, 4 );
			doc.batch().setAttribute( range, 'key', 'value' ).removeAttribute( range, 'key' );

			expect( cbRemoveText.calledOnce ).to.be.true;
			// Callback for adding attribute on image not called this time.
			expect( cbRemoveImage.calledOnce ).to.be.true;
		} );

		it( 'should not fire any event if not recognized event type was passed', () => {
			sinon.spy( dispatcher, 'fire' );

			dispatcher.convertChange( 'unknown', { foo: 'bar' } );

			expect( dispatcher.fire.called ).to.be.false;
		} );

		it( 'should not fire any event if changed range in graveyard root and change type is different than remove', () => {
			sinon.spy( dispatcher, 'fire' );

			let gyNode = new ModelElement( 'image' );
			doc.graveyard.appendChildren( gyNode );

			doc.batch().setAttribute( gyNode, 'key', 'value' );

			expect( dispatcher.fire.called ).to.be.false;
		} );

		it( 'should not fire any event if remove operation moves nodes between graveyard holders', () => {
			// This may happen during OT.
			sinon.spy( dispatcher, 'fire' );

			let gyNode = new ModelElement( 'image' );
			doc.graveyard.appendChildren( gyNode );

			doc.batch().remove( gyNode );

			expect( dispatcher.fire.called ).to.be.false;
		} );

		it( 'should not fire any event if element in graveyard was removed', () => {
			// This may happen during OT.
			sinon.spy( dispatcher, 'fire' );

			let gyNode = new ModelElement( 'image' );
			doc.graveyard.appendChildren( gyNode );

			doc.batch().rename( gyNode, 'p' );

			expect( dispatcher.fire.called ).to.be.false;
		} );
	} );

	describe( 'convertInsert', () => {
		it( 'should fire event with correct parameters for every item in passed range', () => {
			root.appendChildren( [
				new ModelText( 'foo', { bold: true } ),
				new ModelElement( 'image' ),
				new ModelText( 'bar' ),
				new ModelElement( 'paragraph', { class: 'nice' }, new ModelText( 'xx', { italic: true } ) )
			] );

			const range = ModelRange.createIn( root );
			const loggedEvents = [];

			// We will check everything connected with insert event:
			dispatcher.on( 'insert', ( evt, data, consumable ) => {
				// Check if the item is correct.
				const itemId = data.item.name ? data.item.name : '$text:' + data.item.data;
				// Check if the range is correct.
				const log = 'insert:' + itemId + ':' + data.range.start.path + ':' + data.range.end.path;

				loggedEvents.push( log );

				// Check if the event name is correct.
				expect( evt.name ).to.equal( 'insert:' + ( data.item.name || '$text' ) );
				// Check if model consumable is correct.
				expect( consumable.consume( data.item, 'insert' ) ).to.be.true;
			} );

			// Same here.
			dispatcher.on( 'addAttribute', ( evt, data, consumable ) => {
				const itemId = data.item.name ? data.item.name : '$text:' + data.item.data;
				const key = data.attributeKey;
				const value = data.attributeNewValue;
				const log = 'addAttribute:' + key + ':' + value + ':' + itemId + ':' + data.range.start.path + ':' + data.range.end.path;

				loggedEvents.push( log );

				expect( evt.name ).to.equal( 'addAttribute:' + key + ':' + ( data.item.name || '$text' ) );
				expect( consumable.consume( data.item, 'addAttribute:' + key ) ).to.be.true;
			} );

			dispatcher.convertInsertion( range );

			// Check the data passed to called events and the order of them.
			expect( loggedEvents ).to.deep.equal( [
				'insert:$text:foo:0:3',
				'addAttribute:bold:true:$text:foo:0:3',
				'insert:image:3:4',
				'insert:$text:bar:4:7',
				'insert:paragraph:7:8',
				'addAttribute:class:nice:paragraph:7:8',
				'insert:$text:xx:7,0:7,2',
				'addAttribute:italic:true:$text:xx:7,0:7,2'
			] );
		} );

		it( 'should not fire events for already consumed parts of model', () => {
			root.appendChildren( [
				new ModelElement( 'image', { src: 'foo.jpg', title: 'bar', bold: true }, [
					new ModelElement( 'caption', {}, new ModelText( 'title' ) )
				] )
			] );

			sinon.spy( dispatcher, 'fire' );

			dispatcher.on( 'insert:image', ( evt, data, consumable ) => {
				consumable.consume( data.item.getChild( 0 ), 'insert' );
				consumable.consume( data.item, 'addAttribute:bold' );
			} );

			const range = ModelRange.createIn( root );

			dispatcher.convertInsertion( range );

			expect( dispatcher.fire.calledWith( 'insert:image' ) ).to.be.true;
			expect( dispatcher.fire.calledWith( 'addAttribute:src:image' ) ).to.be.true;
			expect( dispatcher.fire.calledWith( 'addAttribute:title:image' ) ).to.be.true;
			expect( dispatcher.fire.calledWith( 'insert:$text' ) ).to.be.true;

			expect( dispatcher.fire.calledWith( 'addAttribute:bold:image' ) ).to.be.false;
			expect( dispatcher.fire.calledWith( 'insert:caption' ) ).to.be.false;
		} );
	} );

	describe( 'convertMove', () => {
		it( 'should fire event for moved range - move before source position', () => {
			root.appendChildren( new ModelText( 'barfoo' ) );

			const range = ModelRange.createFromParentsAndOffsets( root, 0, root, 3 );
			const loggedEvents = [];

			dispatcher.on( 'move', ( evt, data ) => {
				const log = 'move:' + data.sourcePosition.path + ':' + data.targetPosition.path + ':' + data.item.offsetSize;
				loggedEvents.push( log );
			} );

			dispatcher.convertMove( ModelPosition.createFromParentAndOffset( root , 3 ), range );

			expect( loggedEvents ).to.deep.equal( [ 'move:3:0:3' ] );
		} );

		it( 'should fire event for moved range - move after source position', () => {
			root.appendChildren( new ModelText( 'barfoo' ) );

			const range = ModelRange.createFromParentsAndOffsets( root, 3, root, 6 );
			const loggedEvents = [];

			dispatcher.on( 'move', ( evt, data ) => {
				const log = 'move:' + data.sourcePosition.path + ':' + data.targetPosition.path + ':' + data.item.offsetSize;
				loggedEvents.push( log );
			} );

			dispatcher.convertMove( ModelPosition.createFromParentAndOffset( root , 0 ), range );

			expect( loggedEvents ).to.deep.equal( [ 'move:0:6:3' ] );
		} );
	} );

	describe( 'convertRemove', () => {
		it( 'should fire event for removed range', () => {
			root.appendChildren( new ModelText( 'foo' ) );
			doc.graveyard.appendChildren( new ModelText( 'bar' ) );

			const range = ModelRange.createFromParentsAndOffsets( doc.graveyard, 0, doc.graveyard, 3 );
			const loggedEvents = [];

			dispatcher.on( 'remove', ( evt, data ) => {
				const log = 'remove:' + data.sourcePosition.path + ':' + data.item.offsetSize;
				loggedEvents.push( log );
			} );

			dispatcher.convertRemove( ModelPosition.createFromParentAndOffset( root , 3 ), range );

			expect( loggedEvents ).to.deep.equal( [ 'remove:3:3' ] );
		} );
	} );

	describe( 'convertRename', () => {
		it( 'should fire rename event with correct name, consumable, and renamed element and it\'s old name in data', ( done ) => {
			const oldName = 'oldName';
			const element = new ModelElement( oldName );
			element.name = 'newName';

			dispatcher.on( 'rename', ( evt, data, consumable ) => {
				expect( evt.name ).to.equal( 'rename:newName:oldName' );
				expect( data.element ).to.equal( element );
				expect( data.oldName ).to.equal( oldName );
				expect( consumable.test( data.element, 'rename' ) ).to.be.true;

				done();
			} );

			dispatcher.convertRename( element, oldName );
		} );
	} );

	describe( 'convertAttribute', () => {
		it( 'should fire event for every item in passed range', () => {
			root.appendChildren( [
				new ModelText( 'foo', { bold: true } ),
				new ModelElement( 'image', { bold: true } ),
				new ModelElement( 'paragraph', { bold: true, class: 'nice' }, new ModelText( 'xx', { bold: true, italic: true } ) )
			] );

			const range = ModelRange.createIn( root );
			const loggedEvents = [];

			dispatcher.on( 'addAttribute', ( evt, data, consumable ) => {
				const itemId = data.item.name ? data.item.name : '$text:' + data.item.data;
				const key = data.attributeKey;
				const value = data.attributeNewValue;
				const log = 'addAttribute:' + key + ':' + value + ':' + itemId + ':' + data.range.start.path + ':' + data.range.end.path;

				loggedEvents.push( log );

				expect( evt.name ).to.equal( 'addAttribute:' + key + ':' + ( data.item.name || '$text' ) );
				expect( consumable.consume( data.item, 'addAttribute:' + key ) ).to.be.true;
			} );

			dispatcher.convertAttribute( 'addAttribute', range, 'bold', null, true );

			expect( loggedEvents ).to.deep.equal( [
				'addAttribute:bold:true:$text:foo:0:3',
				'addAttribute:bold:true:image:3:4',
				'addAttribute:bold:true:paragraph:4:5',
				'addAttribute:bold:true:$text:xx:4,0:4,2'
			] );
		} );

		it( 'should not fire events for already consumed parts of model', () => {
			root.appendChildren( [
				new ModelElement( 'element', null, new ModelElement( 'inside' ) )
			] );

			sinon.spy( dispatcher, 'fire' );

			dispatcher.on( 'removeAttribute:attr:element', ( evt, data, consumable ) => {
				consumable.consume( data.item.getChild( 0 ), 'removeAttribute:attr' );
			} );

			const range = ModelRange.createIn( root );

			dispatcher.convertAttribute( 'removeAttribute', range, 'attr', 'value', null );

			expect( dispatcher.fire.calledWith( 'removeAttribute:attr:element' ) ).to.be.true;
			expect( dispatcher.fire.calledWith( 'removeAttribute:attr:inside' ) ).to.be.false;
		} );
	} );

	describe( 'convertSelection', () => {
		beforeEach( () => {
			dispatcher.off( 'selection' );

			root.appendChildren( new ModelText( 'foobar' ) );
			doc.selection.setRanges( [
				new ModelRange( new ModelPosition( root, [ 1 ] ), new ModelPosition( root, [ 3 ] ) ),
				new ModelRange( new ModelPosition( root, [ 4 ] ), new ModelPosition( root, [ 5 ] ) )
			] );
		} );

		it( 'should fire selection event', () => {
			sinon.spy( dispatcher, 'fire' );

			dispatcher.convertSelection( doc.selection );

			expect( dispatcher.fire.calledWith(
				'selection',
				{ selection: sinon.match.instanceOf( doc.selection.constructor ) }
			) ).to.be.true;
		} );

		it( 'should prepare correct list of consumable values', () => {
			doc.enqueueChanges( () => {
				doc.batch()
					.setAttribute( ModelRange.createIn( root ), 'bold', true )
					.setAttribute( ModelRange.createFromParentsAndOffsets( root, 4, root, 5 ), 'italic', true );
			} );

			dispatcher.on( 'selection', ( evt, data, consumable ) => {
				expect( consumable.test( data.selection, 'selection' ) ).to.be.true;
				expect( consumable.test( data.selection, 'selectionAttribute:bold' ) ).to.be.true;
				expect( consumable.test( data.selection, 'selectionAttribute:italic' ) ).to.be.null;
			} );

			dispatcher.convertSelection( doc.selection );
		} );

		it( 'should fire attributes events for selection', () => {
			sinon.spy( dispatcher, 'fire' );

			doc.enqueueChanges( () => {
				doc.batch()
					.setAttribute( ModelRange.createIn( root ), 'bold', true )
					.setAttribute( ModelRange.createFromParentsAndOffsets( root, 4, root, 5 ), 'italic', true );
			} );

			dispatcher.convertSelection( doc.selection );

			expect( dispatcher.fire.calledWith( 'selectionAttribute:bold' ) ).to.be.true;
			expect( dispatcher.fire.calledWith( 'selectionAttribute:italic' ) ).to.be.false;
		} );

		it( 'should not fire attributes events if attribute has been consumed', () => {
			sinon.spy( dispatcher, 'fire' );

			dispatcher.on( 'selection', ( evt, data, consumable ) => {
				consumable.consume( data.selection, 'selectionAttribute:bold' );
			} );

			doc.enqueueChanges( () => {
				doc.batch()
					.setAttribute( ModelRange.createIn( root ), 'bold', true )
					.setAttribute( ModelRange.createFromParentsAndOffsets( root, 4, root, 5 ), 'italic', true );
			} );

			dispatcher.convertSelection( doc.selection );

			expect( dispatcher.fire.calledWith( 'selectionAttribute:bold' ) ).to.be.false;
		} );
	} );

	describe( 'convertMarker', () => {
		let range;

		beforeEach( () => {
			range = ModelRange.createFromParentsAndOffsets( root, 0, root, 4 );
		} );

		it( 'should fire event based on passed parameters', () => {
			sinon.spy( dispatcher, 'fire' );

			const data = {
				name: 'name',
				range: range
			};

			dispatcher.convertMarker( 'addMarker', data );

			expect( dispatcher.fire.calledWith( 'addMarker:name', data ) );

			dispatcher.convertMarker( 'removeMarker', data );

			expect( dispatcher.fire.calledWith( 'removeMarker:name', data ) );
		} );

		it( 'should prepare consumable values', () => {
			const data = {
				name: 'name',
				range: range
			};

			dispatcher.on( 'addMarker:name', ( evt, data, consumable ) => {
				expect( consumable.test( data.range, 'range' ) ).to.be.true;
			} );

			dispatcher.on( 'removeMarker:name', ( evt, data, consumable ) => {
				expect( consumable.test( data.range, 'range' ) ).to.be.true;
			} );

			dispatcher.convertMarker( 'addMarker', data );
			dispatcher.convertMarker( 'removeMarker', data );
		} );
	} );
} );
