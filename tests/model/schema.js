/**
 * @license Copyright (c) 2003-2018, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

import Schema, { SchemaContext } from '../../src/model/schema';

import CKEditorError from '@ckeditor/ckeditor5-utils/src/ckeditorerror';

import Model from '../../src/model/model';

import DocumentFragment from '../../src/model/documentfragment';
import Element from '../../src/model/element';
import Text from '../../src/model/text';
import TextProxy from '../../src/model/textproxy';
import Position from '../../src/model/position';
import Range from '../../src/model/range';
import Selection from '../../src/model/selection';

import { setData, getData, stringify } from '../../src/dev-utils/model';

import AttributeDelta from '../../src/model/delta/attributedelta';

describe( 'Schema', () => {
	let schema, root1, r1p1, r1p2, r1bQ, r1bQp, root2;

	beforeEach( () => {
		schema = new Schema();

		root1 = new Element( '$root', null, [
			new Element( 'paragraph', null, 'foo' ),
			new Element( 'paragraph', { align: 'right' }, 'bar' ),
			new Element( 'blockQuote', null, [
				new Element( 'paragraph', null, 'foo' )
			] )
		] );
		r1p1 = root1.getChild( 0 );
		r1p2 = root1.getChild( 1 );
		r1bQ = root1.getChild( 2 );
		r1bQp = r1bQ.getChild( 0 );

		root2 = new Element( '$root2' );
	} );

	describe( 'register()', () => {
		it( 'allows registering an item', () => {
			schema.register( 'foo' );

			expect( schema.getDefinition( 'foo' ) ).to.be.an( 'object' );
		} );

		it( 'copies definitions', () => {
			const definitions = {};

			schema.register( 'foo', definitions );

			definitions.isBlock = true;

			expect( schema.getDefinitions().foo ).to.not.have.property( 'isBlock' );
		} );

		it( 'throws when trying to register for a single item twice', () => {
			schema.register( 'foo' );

			expect( () => {
				schema.register( 'foo' );
			} ).to.throw( CKEditorError, /^schema-cannot-register-item-twice:/ );
		} );
	} );

	describe( 'extend()', () => {
		it( 'allows extending item\'s definitions', () => {
			schema.register( 'foo' );

			schema.extend( 'foo', {
				isBlock: true
			} );

			expect( schema.getDefinition( 'foo' ) ).to.have.property( 'isBlock', true );
		} );

		it( 'copies definitions', () => {
			schema.register( 'foo', {} );

			const definitions = {};
			schema.extend( 'foo', definitions );

			definitions.isBlock = true;

			expect( schema.getDefinitions().foo ).to.not.have.property( 'isBlock' );
		} );

		it( 'throws when trying to extend a not yet registered item', () => {
			expect( () => {
				schema.extend( 'foo' );
			} ).to.throw( CKEditorError, /^schema-cannot-extend-missing-item:/ );
		} );
	} );

	describe( 'getDefinitions()', () => {
		it( 'returns compiled definitions', () => {
			schema.register( '$root' );

			schema.register( 'foo', {
				allowIn: '$root'
			} );

			schema.extend( 'foo', {
				isBlock: true
			} );

			const definitions = schema.getDefinitions();

			expect( definitions.foo ).to.deep.equal( {
				name: 'foo',
				allowIn: [ '$root' ],
				allowAttributes: [],
				isBlock: true
			} );
		} );

		it( 'copies all is* types', () => {
			schema.register( 'foo', {
				isBlock: true,
				isFoo: true
			} );

			schema.extend( 'foo', {
				isBar: true,
				isFoo: false // Just to check that the last one wins.
			} );

			const definitions = schema.getDefinitions();

			expect( definitions.foo ).to.have.property( 'isBlock', true );
			expect( definitions.foo ).to.have.property( 'isFoo', false );
			expect( definitions.foo ).to.have.property( 'isBar', true );
		} );

		it( 'does not recompile definitions if not needed', () => {
			schema.register( 'foo' );

			expect( schema.getDefinitions() ).to.equal( schema.getDefinitions() );
		} );

		it( 'ensures no duplicates in allowIn', () => {
			schema.register( '$root' );
			schema.register( 'foo', {
				allowIn: '$root'
			} );
			schema.extend( 'foo', {
				allowIn: '$root'
			} );

			const definitions = schema.getDefinitions();

			expect( definitions.foo ).to.deep.equal( {
				name: 'foo',
				allowIn: [ '$root' ],
				allowAttributes: []
			} );
		} );

		it( 'ensures no non-registered items in allowIn', () => {
			schema.register( 'foo', {
				allowIn: '$root'
			} );

			const definitions = schema.getDefinitions();

			expect( definitions.foo ).to.deep.equal( {
				name: 'foo',
				allowIn: [],
				allowAttributes: []
			} );
		} );

		it( 'ensures no duplicates in allowAttributes', () => {
			schema.register( 'paragraph', {
				allowAttributes: 'foo'
			} );
			schema.extend( 'paragraph', {
				allowAttributes: 'foo'
			} );

			const definitions = schema.getDefinitions();

			expect( definitions.paragraph ).to.deep.equal( {
				name: 'paragraph',
				allowIn: [],
				allowAttributes: [ 'foo' ]
			} );
		} );

		it( 'ensures no duplicates in allowAttributes duplicated by allowAttributesOf', () => {
			schema.register( 'paragraph', {
				allowAttributes: 'foo',
				allowAttributesOf: '$block'
			} );
			schema.register( '$block', {
				allowAttributes: 'foo'
			} );

			const definitions = schema.getDefinitions();

			expect( definitions.paragraph ).to.deep.equal( {
				name: 'paragraph',
				allowIn: [],
				allowAttributes: [ 'foo' ]
			} );
		} );
	} );

	describe( 'getDefinition()', () => {
		it( 'returns a definition based on an item name', () => {
			schema.register( 'foo', {
				isMe: true
			} );

			expect( schema.getDefinition( 'foo' ).isMe ).to.be.true;
		} );

		it( 'returns a definition based on an element name', () => {
			schema.register( 'foo', {
				isMe: true
			} );

			expect( schema.getDefinition( new Element( 'foo' ) ).isMe ).to.be.true;
		} );

		it( 'returns a definition based on a text node', () => {
			schema.register( '$text', {
				isMe: true
			} );

			expect( schema.getDefinition( new Text( 'foo' ) ).isMe ).to.be.true;
		} );

		it( 'returns a definition based on a text proxy', () => {
			schema.register( '$text', {
				isMe: true
			} );

			const text = new Text( 'foo' );
			const textProxy = new TextProxy( text, 0, 1 );

			expect( schema.getDefinition( textProxy ).isMe ).to.be.true;
		} );

		it( 'returns a definition based on a schema context item', () => {
			schema.register( 'foo', {
				isMe: true
			} );
			const ctx = new SchemaContext( [ '$root', 'foo' ] );

			expect( schema.getDefinition( ctx.last ).isMe ).to.be.true;
		} );

		it( 'returns undefined when trying to get an non-registered item', () => {
			expect( schema.getDefinition( '404' ) ).to.be.undefined;
		} );
	} );

	describe( 'isRegistered()', () => {
		it( 'returns true if an item was registered', () => {
			schema.register( 'foo' );

			expect( schema.isRegistered( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered', () => {
			expect( schema.isRegistered( 'foo' ) ).to.be.false;
		} );

		it( 'uses getDefinition()\'s item to definition normalization', () => {
			const stub = sinon.stub( schema, 'getDefinition' ).returns( {} );

			expect( schema.isRegistered( 'foo' ) ).to.be.true;
			expect( stub.calledOnce ).to.be.true;
		} );
	} );

	describe( 'isBlock()', () => {
		it( 'returns true if an item was registered as a block', () => {
			schema.register( 'foo', {
				isBlock: true
			} );

			expect( schema.isBlock( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered as a block', () => {
			schema.register( 'foo' );

			expect( schema.isBlock( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if an item was not registered at all', () => {
			expect( schema.isBlock( 'foo' ) ).to.be.false;
		} );

		it( 'uses getDefinition()\'s item to definition normalization', () => {
			const stub = sinon.stub( schema, 'getDefinition' ).returns( { isBlock: true } );

			expect( schema.isBlock( 'foo' ) ).to.be.true;
			expect( stub.calledOnce ).to.be.true;
		} );
	} );

	describe( 'isLimit()', () => {
		it( 'returns true if an item was registered as a limit element', () => {
			schema.register( 'foo', {
				isLimit: true
			} );

			expect( schema.isLimit( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered as a limit element', () => {
			schema.register( 'foo' );

			expect( schema.isLimit( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if an item was not registered at all', () => {
			expect( schema.isLimit( 'foo' ) ).to.be.false;
		} );

		it( 'uses getDefinition()\'s item to definition normalization', () => {
			const stub = sinon.stub( schema, 'getDefinition' ).returns( { isLimit: true } );

			expect( schema.isLimit( 'foo' ) ).to.be.true;
			expect( stub.calledOnce ).to.be.true;
		} );
	} );

	describe( 'isObject()', () => {
		it( 'returns true if an item was registered as an object', () => {
			schema.register( 'foo', {
				isObject: true
			} );

			expect( schema.isObject( 'foo' ) ).to.be.true;
		} );

		it( 'returns false if an item was not registered as an object', () => {
			schema.register( 'foo' );

			expect( schema.isObject( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if an item was not registered at all', () => {
			expect( schema.isObject( 'foo' ) ).to.be.false;
		} );

		it( 'uses getDefinition()\'s item to definition normalization', () => {
			const stub = sinon.stub( schema, 'getDefinition' ).returns( { isObject: true } );

			expect( schema.isObject( 'foo' ) ).to.be.true;
			expect( stub.calledOnce ).to.be.true;
		} );
	} );

	describe( 'checkChild()', () => {
		beforeEach( () => {
			schema.register( '$root' );
			schema.register( 'paragraph', {
				allowIn: '$root'
			} );
			schema.register( '$text', {
				allowIn: 'paragraph'
			} );
		} );

		it( 'accepts an element as a context and a node name as a child', () => {
			expect( schema.checkChild( root1, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( root1, '$text' ) ).to.be.false;
		} );

		it( 'accepts a schemaContext instance as a context', () => {
			const rootContext = new SchemaContext( Position.createAt( root1 ) );
			const paragraphContext = new SchemaContext( Position.createAt( r1p1 ) );

			expect( schema.checkChild( rootContext, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( rootContext, '$text' ) ).to.be.false;

			expect( schema.checkChild( paragraphContext, '$text' ) ).to.be.true;
			expect( schema.checkChild( paragraphContext, 'paragraph' ) ).to.be.false;
		} );

		it( 'accepts a position as a context', () => {
			const posInRoot = Position.createAt( root1 );
			const posInParagraph = Position.createAt( r1p1 );

			expect( schema.checkChild( posInRoot, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( posInRoot, '$text' ) ).to.be.false;

			expect( schema.checkChild( posInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( posInParagraph, 'paragraph' ) ).to.be.false;
		} );

		// This is a temporary feature which is needed to make the current V->M conversion works.
		// It should be removed once V->M conversion uses real positions.
		// Of course, real positions have this advantage that we know element attributes at this point.
		it( 'accepts an array of element names as a context', () => {
			const contextInRoot = [ '$root' ];
			const contextInParagraph = [ '$root', 'paragraph' ];

			expect( schema.checkChild( contextInRoot, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( contextInRoot, '$text' ) ).to.be.false;

			expect( schema.checkChild( contextInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( contextInParagraph, 'paragraph' ) ).to.be.false;
		} );

		it( 'accepts an array of elements as a context', () => {
			const contextInRoot = [ root1 ];
			const contextInParagraph = [ root1, r1p1 ];

			expect( schema.checkChild( contextInRoot, 'paragraph' ) ).to.be.true;
			expect( schema.checkChild( contextInRoot, '$text' ) ).to.be.false;

			expect( schema.checkChild( contextInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( contextInParagraph, 'paragraph' ) ).to.be.false;
		} );

		// Again, this is needed temporarily to handle current V->M conversion
		it( 'accepts a mixed array of elements and strings as a context', () => {
			const contextInParagraph = [ '$root', r1p1 ];

			expect( schema.checkChild( contextInParagraph, '$text' ) ).to.be.true;
			expect( schema.checkChild( contextInParagraph, 'paragraph' ) ).to.be.false;
		} );

		it( 'accepts a node as a child', () => {
			expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			expect( schema.checkChild( root1, new Text( 'foo' ) ) ).to.be.false;
		} );

		it( 'fires the checkChild event with already normalized params', done => {
			schema.on( 'checkChild', ( evt, [ ctx, child ] ) => {
				expect( ctx ).to.be.instanceof( SchemaContext );
				expect( child ).to.equal( schema.getDefinition( 'paragraph' ) );

				done();
			}, { priority: 'highest' } );

			schema.checkChild( root1, r1p1 );
		} );
	} );

	describe( 'checkAttribute()', () => {
		beforeEach( () => {
			schema.register( 'paragraph', {
				allowAttributes: 'align'
			} );
			schema.register( '$text', {
				allowAttributes: 'bold'
			} );
		} );

		it( 'accepts an element as a context', () => {
			expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			expect( schema.checkAttribute( r1p1, 'bold' ) ).to.be.false;
		} );

		it( 'accepts a text as a context', () => {
			expect( schema.checkAttribute( new Text( 'foo' ), 'bold' ) ).to.be.true;
			expect( schema.checkAttribute( new Text( 'foo' ), 'align' ) ).to.be.false;
		} );

		it( 'accepts a position as a context', () => {
			const posInRoot = Position.createAt( root1 );
			const posInParagraph = Position.createAt( r1p1 );

			expect( schema.checkAttribute( posInRoot, 'align' ) ).to.be.false;
			expect( schema.checkAttribute( posInParagraph, 'align' ) ).to.be.true;
		} );

		it( 'accepts a schemaContext instance as a context', () => {
			const rootContext = new SchemaContext( Position.createAt( root1 ) );
			const paragraphContext = new SchemaContext( Position.createAt( r1p1 ) );

			expect( schema.checkAttribute( rootContext, 'align' ) ).to.be.false;
			expect( schema.checkAttribute( paragraphContext, 'align' ) ).to.be.true;
		} );

		it( 'accepts an array of node names as a context', () => {
			const contextInRoot = [ '$root' ];
			const contextInParagraph = [ '$root', 'paragraph' ];
			const contextInText = [ '$root', 'paragraph', '$text' ];

			expect( schema.checkAttribute( contextInRoot, 'align' ) ).to.be.false;
			expect( schema.checkAttribute( contextInParagraph, 'align' ) ).to.be.true;
			expect( schema.checkAttribute( contextInText, 'bold' ) ).to.be.true;
		} );

		it( 'accepts an array of nodes as a context', () => {
			const contextInRoot = [ root1 ];
			const contextInParagraph = [ root1, r1p1 ];
			const contextInText = [ root1, r1p1, r1p1.getChild( 0 ) ];

			expect( schema.checkAttribute( contextInRoot, 'align' ) ).to.be.false;
			expect( schema.checkAttribute( contextInParagraph, 'align' ) ).to.be.true;
			expect( schema.checkAttribute( contextInText, 'bold' ) ).to.be.true;
		} );

		it( 'fires the checkAttribute event with already normalized context', done => {
			schema.on( 'checkAttribute', ( evt, [ ctx, attributeName ] ) => {
				expect( ctx ).to.be.instanceof( SchemaContext );
				expect( attributeName ).to.equal( 'bold' );

				done();
			}, { priority: 'highest' } );

			schema.checkAttribute( r1p1, 'bold' );
		} );
	} );

	describe( 'addChildCheck()', () => {
		beforeEach( () => {
			schema.register( '$root' );
			schema.register( 'paragraph', {
				allowIn: '$root'
			} );
		} );

		it( 'adds a high-priority listener', () => {
			const order = [];

			schema.on( 'checkChild', () => {
				order.push( 'checkChild:high-before' );
			}, { priority: 'high' } );

			schema.addChildCheck( () => {
				order.push( 'addChildCheck' );
			} );

			schema.on( 'checkChild', () => {
				order.push( 'checkChild:high-after' );
			}, { priority: 'high' } );

			schema.checkChild( root1, r1p1 );

			expect( order.join() ).to.equal( 'checkChild:high-before,addChildCheck,checkChild:high-after' );
		} );

		it( 'stops the event and overrides the return value when callback returned true', () => {
			schema.register( '$text' );

			expect( schema.checkChild( root1, '$text' ) ).to.be.false;

			schema.addChildCheck( () => {
				return true;
			} );

			schema.on( 'checkChild', () => {
				throw new Error( 'the event should be stopped' );
			}, { priority: 'high' } );

			expect( schema.checkChild( root1, '$text' ) ).to.be.true;
		} );

		it( 'stops the event and overrides the return value when callback returned false', () => {
			expect( schema.checkChild( root1, r1p1 ) ).to.be.true;

			schema.addChildCheck( () => {
				return false;
			} );

			schema.on( 'checkChild', () => {
				throw new Error( 'the event should be stopped' );
			}, { priority: 'high' } );

			expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
		} );

		it( 'receives context and child definition as params', () => {
			schema.addChildCheck( ( ctx, childDef ) => {
				expect( ctx ).to.be.instanceOf( SchemaContext );
				expect( childDef ).to.equal( schema.getDefinition( 'paragraph' ) );
			} );

			expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
		} );

		it( 'is not called when checking a non-registered element', () => {
			expect( schema.getDefinition( 'foo' ) ).to.be.undefined;

			schema.addChildCheck( () => {
				throw new Error( 'callback should not be called' );
			} );

			expect( schema.checkChild( root1, 'foo' ) ).to.be.false;
		} );
	} );

	describe( 'addAttributeCheck()', () => {
		beforeEach( () => {
			schema.register( 'paragraph', {
				allowAttributes: 'foo'
			} );
		} );

		it( 'adds a high-priority listener', () => {
			const order = [];

			schema.on( 'checkAttribute', () => {
				order.push( 'checkAttribute:high-before' );
			}, { priority: 'high' } );

			schema.addAttributeCheck( () => {
				order.push( 'addAttributeCheck' );
			} );

			schema.on( 'checkAttribute', () => {
				order.push( 'checkAttribute:high-after' );
			}, { priority: 'high' } );

			schema.checkAttribute( r1p1, 'foo' );

			expect( order.join() ).to.equal( 'checkAttribute:high-before,addAttributeCheck,checkAttribute:high-after' );
		} );

		it( 'stops the event and overrides the return value when callback returned true', () => {
			expect( schema.checkAttribute( r1p1, 'bar' ) ).to.be.false;

			schema.addAttributeCheck( () => {
				return true;
			} );

			schema.on( 'checkAttribute', () => {
				throw new Error( 'the event should be stopped' );
			}, { priority: 'high' } );

			expect( schema.checkAttribute( r1p1, 'bar' ) ).to.be.true;
		} );

		it( 'stops the event and overrides the return value when callback returned false', () => {
			expect( schema.checkAttribute( r1p1, 'foo' ) ).to.be.true;

			schema.addAttributeCheck( () => {
				return false;
			} );

			schema.on( 'checkAttribute', () => {
				throw new Error( 'the event should be stopped' );
			}, { priority: 'high' } );

			expect( schema.checkAttribute( r1p1, 'foo' ) ).to.be.false;
		} );

		it( 'receives context and attribute name as params', () => {
			schema.addAttributeCheck( ( ctx, attributeName ) => {
				expect( ctx ).to.be.instanceOf( SchemaContext );
				expect( attributeName ).to.equal( 'foo' );
			} );

			expect( schema.checkAttribute( r1p1, 'foo' ) ).to.be.true;
		} );
	} );

	describe( 'checkMerge()', () => {
		beforeEach( () => {
			schema.register( '$root' );
			schema.register( '$block', {
				allowIn: '$root',
				isBlock: true
			} );
			schema.register( '$text', {
				allowIn: '$block'
			} );
			schema.register( 'paragraph', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'listItem', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'blockQuote', {
				allowWhere: '$block',
				allowContentOf: '$root'
			} );
		} );

		it( 'returns false if a block cannot be merged with other block (disallowed element is the first child)', () => {
			const paragraph = new Element( 'paragraph', null, [
				new Text( 'xyz' )
			] );
			const blockQuote = new Element( 'blockQuote', null, [ paragraph ] );
			const listItem = new Element( 'listItem' );

			expect( schema.checkMerge( listItem, blockQuote ) ).to.be.false;
		} );

		it( 'returns false if a block cannot be merged with other block (disallowed element is not the first child)', () => {
			const paragraph = new Element( 'paragraph', null, [
				new Text( 'foo' )
			] );
			const blockQuote = new Element( 'blockQuote', null, [
				new Text( 'bar', { bold: true } ),
				new Text( 'xyz' ),
				paragraph
			] );
			const listItem = new Element( 'listItem' );

			expect( schema.checkMerge( listItem, blockQuote ) ).to.be.false;
		} );

		it( 'returns true if a block can be merged with other block', () => {
			const listItem = new Element( 'listItem' );
			const listItemToMerge = new Element( 'listItem', null, [
				new Text( 'xyz' )
			] );

			expect( schema.checkMerge( listItem, listItemToMerge ) ).to.be.true;
		} );

		it( 'return true if two elements between the position can be merged', () => {
			const listItem = new Element( 'listItem', null, [
				new Text( 'foo' )
			] );
			const listItemToMerge = new Element( 'listItem', null, [
				new Text( 'bar' )
			] );

			// eslint-disable-next-line no-new
			new Element( '$root', null, [
				listItem, listItemToMerge
			] );
			const position = Position.createAfter( listItem );

			expect( schema.checkMerge( position ) ).to.be.true;
		} );

		it( 'throws an error if there is no element before the position', () => {
			const listItem = new Element( 'listItem', null, [
				new Text( 'foo' )
			] );

			// eslint-disable-next-line no-new
			new Element( '$root', null, [
				listItem
			] );

			const position = Position.createBefore( listItem );

			expect( () => {
				expect( schema.checkMerge( position ) );
			} ).to.throw( CKEditorError, /^schema-check-merge-no-element-before:/ );
		} );

		it( 'throws an error if the node before the position is not the element', () => {
			const listItem = new Element( 'listItem', null, [
				new Text( 'foo' )
			] );

			// eslint-disable-next-line no-new
			new Element( '$root', null, [
				new Text( 'bar' ),
				listItem
			] );

			const position = Position.createBefore( listItem );

			expect( () => {
				expect( schema.checkMerge( position ) );
			} ).to.throw( CKEditorError, /^schema-check-merge-no-element-before:/ );
		} );

		it( 'throws an error if there is no element after the position', () => {
			const listItem = new Element( 'listItem', null, [
				new Text( 'foo' )
			] );

			// eslint-disable-next-line no-new
			new Element( '$root', null, [
				listItem
			] );

			const position = Position.createAfter( listItem );

			expect( () => {
				expect( schema.checkMerge( position ) );
			} ).to.throw( CKEditorError, /^schema-check-merge-no-element-after:/ );
		} );

		it( 'throws an error if the node after the position is not the element', () => {
			const listItem = new Element( 'listItem', null, [
				new Text( 'foo' )
			] );

			// eslint-disable-next-line no-new
			new Element( '$root', null, [
				listItem,
				new Text( 'bar' )
			] );

			const position = Position.createBefore( listItem );

			expect( () => {
				expect( schema.checkMerge( position ) );
			} ).to.throw( CKEditorError, /^schema-check-merge-no-element-before:/ );
		} );

		// This is an invalid case by definition – the baseElement should not contain disallowed elements
		// in the first place. However, the check is focused on the elementToMerge's children so let's make sure
		// that only them counts.
		it( 'returns true if element to merge contains a valid content but base element contains disallowed elements', () => {
			const listItem = new Element( 'listItem', null, [
				new Text( 'foo' ),
				new Element( 'paragraph', null, [
					new Text( 'bar' )
				] )
			] );
			const listItemToMerge = new Element( 'listItem', null, [
				new Text( 'xyz' )
			] );

			expect( schema.checkMerge( listItem, listItemToMerge ) ).to.be.true;
		} );

		// The checkMerge() method should also check whether all ancestors of elementToMerge are allowed in their new
		// context (now, we check only immediate children), but for now we ignore these cases.
	} );

	describe( 'getLimitElement()', () => {
		let model, doc, root;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			schema = model.schema;
			root = doc.createRoot();

			schema.register( 'div', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'article', {
				inheritAllFrom: '$block',
				allowIn: 'section'
			} );
			schema.register( 'section', {
				inheritAllFrom: '$block',
				allowIn: 'div'
			} );
			schema.register( 'paragraph', {
				inheritAllFrom: '$block',
				allowIn: 'article'
			} );
			schema.register( 'widget', {
				inheritAllFrom: '$block',
				allowIn: 'div'
			} );
			schema.register( 'image', {
				inheritAllFrom: '$block',
				allowIn: 'widget'
			} );
			schema.register( 'caption', {
				inheritAllFrom: '$block',
				allowIn: 'image'
			} );
		} );

		it( 'always returns $root element if any other limit was not defined', () => {
			schema.extend( '$root', {
				isLimit: false
			} );
			expect( schema.isLimit( '$root' ) ).to.be.false;

			setData( model, '<div><section><article><paragraph>foo[]bar</paragraph></article></section></div>' );
			expect( schema.getLimitElement( doc.selection ) ).to.equal( root );
		} );

		it( 'returns the limit element which is the closest element to common ancestor for collapsed selection', () => {
			schema.extend( 'article', { isLimit: true } );
			schema.extend( 'section', { isLimit: true } );

			setData( model, '<div><section><article><paragraph>foo[]bar</paragraph></article></section></div>' );

			const article = root.getNodeByPath( [ 0, 0, 0 ] );

			expect( schema.getLimitElement( doc.selection ) ).to.equal( article );
		} );

		it( 'returns the limit element which is the closest element to common ancestor for non-collapsed selection', () => {
			schema.extend( 'article', { isLimit: true } );
			schema.extend( 'section', { isLimit: true } );

			setData( model, '<div><section><article>[foo</article><article>bar]</article></section></div>' );

			const section = root.getNodeByPath( [ 0, 0 ] );

			expect( schema.getLimitElement( doc.selection ) ).to.equal( section );
		} );

		it( 'works fine with multi-range selections', () => {
			schema.extend( 'article', { isLimit: true } );
			schema.extend( 'widget', { isLimit: true } );
			schema.extend( 'div', { isLimit: true } );

			setData(
				model,
				'<div>' +
					'<section>' +
						'<article>' +
							'<paragraph>[foo]</paragraph>' +
						'</article>' +
					'</section>' +
					'<widget>' +
						'<image>' +
							'<caption>b[a]r</caption>' +
						'</image>' +
					'</widget>' +
				'</div>'
			);

			const div = root.getNodeByPath( [ 0 ] );
			expect( schema.getLimitElement( doc.selection ) ).to.equal( div );
		} );

		it( 'works fine with multi-range selections even if limit elements are not defined', () => {
			setData(
				model,
				'<div>' +
					'<section>' +
						'<article>' +
							'<paragraph>[foo]</paragraph>' +
						'</article>' +
					'</section>' +
				'</div>' +
				'<section>b[]ar</section>'
			);

			expect( schema.getLimitElement( doc.selection ) ).to.equal( root );
		} );
	} );

	describe( 'checkAttributeInSelection()', () => {
		const attribute = 'bold';
		let model, doc, schema;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			doc.createRoot();

			schema = model.schema;

			schema.register( 'p', { inheritAllFrom: '$block' } );
			schema.register( 'h1', { inheritAllFrom: '$block' } );
			schema.register( 'img', { allowWhere: '$text' } );
			schema.register( 'figure', {
				allowIn: '$root',
				allowAttributes: [ 'name', 'title' ]
			} );

			schema.addAttributeCheck( ( ctx, attributeName ) => {
				// Allow 'bold' on p>$text.
				if ( ctx.endsWith( 'p $text' ) && attributeName == 'bold' ) {
					return true;
				}

				// Allow 'bold' on $root>p.
				if ( ctx.endsWith( '$root p' ) && attributeName == 'bold' ) {
					return true;
				}
			} );
		} );

		describe( 'when selection is collapsed', () => {
			it( 'should return true if characters with the attribute can be placed at caret position', () => {
				setData( model, '<p>f[]oo</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;
			} );

			it( 'should return false if characters with the attribute cannot be placed at caret position', () => {
				setData( model, '<h1>[]</h1>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;

				setData( model, '[]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;
			} );
		} );

		describe( 'when selection is not collapsed', () => {
			it( 'should return true if there is at least one node in selection that can have the attribute', () => {
				// Simple selection on a few characters.
				setData( model, '<p>[foo]</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;

				// Selection spans over characters but also include nodes that can't have attribute.
				setData( model, '<p>fo[o<img />b]ar</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;

				// Selection on whole root content. Characters in P can have an attribute so it's valid.
				setData( model, '[<p>foo<img />bar</p><h1></h1>]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;

				// Selection on empty P. P can have the attribute.
				setData( model, '[<p></p>]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.true;
			} );

			it( 'should return false if there are no nodes in selection that can have the attribute', () => {
				// Selection on DIV which can't have bold text.
				setData( model, '[<h1></h1>]' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;

				// Selection on two images which can't be bold.
				setData( model, '<p>foo[<img /><img />]bar</p>' );
				expect( schema.checkAttributeInSelection( doc.selection, attribute ) ).to.be.false;
			} );

			it( 'should return true when checking element with required attribute', () => {
				setData( model, '[<figure name="figure"></figure>]' );
				expect( schema.checkAttributeInSelection( doc.selection, 'title' ) ).to.be.true;
			} );

			it( 'should return true when checking element when attribute is already present', () => {
				setData( model, '[<figure name="figure" title="title"></figure>]' );
				expect( schema.checkAttributeInSelection( doc.selection, 'title' ) ).to.be.true;
			} );
		} );
	} );

	describe( 'getValidRanges()', () => {
		const attribute = 'bold';
		let model, doc, root, schema, ranges;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			schema = model.schema;
			root = doc.createRoot();

			schema.register( 'p', { inheritAllFrom: '$block' } );
			schema.register( 'h1', { inheritAllFrom: '$block' } );
			schema.register( 'img', {
				allowWhere: '$text'
			} );

			schema.addAttributeCheck( ( ctx, attributeName ) => {
				// Allow 'bold' on p>$text.
				if ( ctx.endsWith( 'p $text' ) && attributeName == 'bold' ) {
					return true;
				}

				// Allow 'bold' on $root>p.
				if ( ctx.endsWith( '$root p' ) && attributeName == 'bold' ) {
					return true;
				}
			} );

			setData( model, '<p>foo<img />bar</p>' );

			ranges = [ Range.createOn( root.getChild( 0 ) ) ];
		} );

		it( 'should return unmodified ranges when attribute is allowed on each item (text is not allowed in img)', () => {
			schema.extend( 'img', { allowAttributes: 'bold' } );

			expect( schema.getValidRanges( ranges, attribute ) ).to.deep.equal( ranges );
		} );

		it( 'should return unmodified ranges when attribute is allowed on each item (text is allowed in img)', () => {
			schema.extend( 'img', { allowAttributes: 'bold' } );
			schema.extend( '$text', { allowIn: 'img' } );

			expect( schema.getValidRanges( ranges, attribute ) ).to.deep.equal( ranges );
		} );

		it( 'should return two ranges when attribute is not allowed on one item', () => {
			schema.extend( 'img', { allowAttributes: 'bold' } );
			schema.extend( '$text', { allowIn: 'img' } );

			setData( model, '[<p>foo<img>xxx</img>bar</p>]' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection( validRanges );

			expect( stringify( root, sel ) ).to.equal( '[<p>foo<img>]xxx[</img>bar</p>]' );
		} );

		it( 'should return three ranges when attribute is not allowed on one element but is allowed on its child', () => {
			schema.extend( '$text', { allowIn: 'img' } );

			schema.addAttributeCheck( ( ctx, attributeName ) => {
				// Allow 'bold' on img>$text.
				if ( ctx.endsWith( 'img $text' ) && attributeName == 'bold' ) {
					return true;
				}
			} );

			setData( model, '[<p>foo<img>xxx</img>bar</p>]' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection( validRanges );

			expect( stringify( root, sel ) ).to.equal( '[<p>foo]<img>[xxx]</img>[bar</p>]' );
		} );

		it( 'should not leak beyond the given ranges', () => {
			setData( model, '<p>[foo<img></img>bar]x[bar<img></img>foo]</p>' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection( validRanges );

			expect( stringify( root, sel ) ).to.equal( '<p>[foo]<img></img>[bar]x[bar]<img></img>[foo]</p>' );
		} );

		it( 'should correctly handle a range which ends in a disallowed position', () => {
			schema.extend( '$text', { allowIn: 'img' } );

			setData( model, '<p>[foo<img>bar]</img>bom</p>' );

			const validRanges = schema.getValidRanges( doc.selection.getRanges(), attribute );
			const sel = new Selection( validRanges );

			expect( stringify( root, sel ) ).to.equal( '<p>[foo]<img>bar</img>bom</p>' );
		} );

		it( 'should split range into two ranges and omit disallowed element', () => {
			schema.addAttributeCheck( ( ctx, attributeName ) => {
				// Disallow 'bold' on p>img.
				if ( ctx.endsWith( 'p img' ) && attributeName == 'bold' ) {
					return false;
				}
			} );

			const result = schema.getValidRanges( ranges, attribute );

			expect( result ).to.length( 2 );
			expect( result[ 0 ].start.path ).to.members( [ 0 ] );
			expect( result[ 0 ].end.path ).to.members( [ 0, 3 ] );
			expect( result[ 1 ].start.path ).to.members( [ 0, 4 ] );
			expect( result[ 1 ].end.path ).to.members( [ 1 ] );
		} );
	} );

	describe( 'findAllowedParent', () => {
		beforeEach( () => {
			schema.register( '$root' );
			schema.register( 'blockQuote', {
				allowIn: '$root'
			} );
			schema.register( 'paragraph', {
				allowIn: 'blockQuote'
			} );
			schema.register( '$text', {
				allowIn: 'paragraph'
			} );
		} );

		it( 'should return position ancestor that allows to insert given note to it', () => {
			const node = new Element( 'paragraph' );

			const allowedParent = schema.findAllowedParent( node, Position.createAt( r1bQp ) );

			expect( allowedParent ).to.equal( r1bQ );
		} );

		it( 'should return position ancestor that allows to insert given note to it when position is already i such an element', () => {
			const node = new Text( 'text' );

			const parent = schema.findAllowedParent( node, Position.createAt( r1bQp ) );

			expect( parent ).to.equal( r1bQp );
		} );

		it( 'should return null when limit element will be reached before allowed parent', () => {
			schema.extend( 'blockQuote', {
				isLimit: true
			} );
			schema.register( 'div', {
				allowIn: '$root'
			} );
			const node = new Element( 'div' );

			const parent = schema.findAllowedParent( node, Position.createAt( r1bQp ) );

			expect( parent ).to.null;
		} );

		it( 'should return null when there is no allowed ancestor for given position', () => {
			const node = new Element( 'section' );

			const parent = schema.findAllowedParent( node, Position.createAt( r1bQp ) );

			expect( parent ).to.null;
		} );

		it( 'should use custom limit element nad return null if is reached', () => {
			// $root is allowed ancestor for blockQuote.
			const node = new Element( 'blockQuote' );

			const parent = schema.findAllowedParent(
				node,
				Position.createAt( r1bQp ),
				// However lest stop searching when blockQuote is reached.
				r1bQ
			);

			expect( parent ).to.null;
		} );
	} );

	describe( 'removeDisallowedAttributes()', () => {
		let model, doc, root;

		beforeEach( () => {
			model = new Model();
			doc = model.document;
			root = doc.createRoot();
			schema = model.schema;

			schema.register( 'paragraph', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'div', {
				inheritAllFrom: '$block'
			} );
			schema.register( 'image', {
				isObject: true
			} );
			schema.extend( '$block', {
				allowIn: 'div'
			} );
		} );

		it( 'should filter out disallowed attributes from given nodes', () => {
			schema.extend( '$text', { allowAttributes: 'a' } );
			schema.extend( 'image', { allowAttributes: 'b' } );

			const text = new Text( 'foo', { a: 1, b: 1 } );
			const image = new Element( 'image', { a: 1, b: 1 } );

			root.appendChildren( [ text, image ] );

			model.change( writer => {
				schema.removeDisallowedAttributes( root.getChildren(), writer );

				expect( Array.from( text.getAttributeKeys() ) ).to.deep.equal( [ 'a' ] );
				expect( Array.from( image.getAttributeKeys() ) ).to.deep.equal( [ 'b' ] );

				expect( writer.batch.deltas ).to.length( 2 );
				expect( writer.batch.deltas[ 0 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 1 ] ).to.instanceof( AttributeDelta );

				expect( getData( model, { withoutSelection: true } ) )
					.to.equal( '<$text a="1">foo</$text><image b="1"></image>' );
			} );
		} );

		it( 'should filter out disallowed attributes from all descendants of given nodes', () => {
			schema.addAttributeCheck( ( ctx, attributeName ) => {
				// Allow 'a' on div>$text.
				if ( ctx.endsWith( 'div $text' ) && attributeName == 'a' ) {
					return true;
				}

				// Allow 'b' on div>paragraph>$text.
				if ( ctx.endsWith( 'div paragraph $text' ) && attributeName == 'b' ) {
					return true;
				}

				// Allow 'a' on div>image.
				if ( ctx.endsWith( 'div image' ) && attributeName == 'a' ) {
					return true;
				}

				// Allow 'b' on div>paragraph>image.
				if ( ctx.endsWith( 'div paragraph image' ) && attributeName == 'b' ) {
					return true;
				}
			} );

			const foo = new Text( 'foo', { a: 1, b: 1 } );
			const bar = new Text( 'bar', { a: 1, b: 1 } );
			const imageInDiv = new Element( 'image', { a: 1, b: 1 } );
			const imageInParagraph = new Element( 'image', { a: 1, b: 1 } );
			const paragraph = new Element( 'paragraph', [], [ foo, imageInParagraph ] );
			const div = new Element( 'div', [], [ paragraph, bar, imageInDiv ] );

			root.appendChildren( [ div ] );

			model.change( writer => {
				schema.removeDisallowedAttributes( root.getChildren(), writer );

				expect( writer.batch.deltas ).to.length( 4 );
				expect( writer.batch.deltas[ 0 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 1 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 2 ] ).to.instanceof( AttributeDelta );
				expect( writer.batch.deltas[ 3 ] ).to.instanceof( AttributeDelta );

				expect( getData( model, { withoutSelection: true } ) )
					.to.equal(
						'<div>' +
							'<paragraph>' +
								'<$text b="1">foo</$text>' +
								'<image b="1"></image>' +
							'</paragraph>' +
							'<$text a="1">bar</$text>' +
							'<image a="1"></image>' +
						'</div>'
					);
			} );
		} );
	} );

	describe( 'definitions compilation', () => {
		describe( 'allowIn cases', () => {
			it( 'passes $root>paragraph', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph and $root2>paragraph – support for array values', () => {
				schema.register( '$root' );
				schema.register( '$root2' );
				schema.register( 'paragraph', {
					allowIn: [ '$root', '$root2' ]
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
				expect( schema.checkChild( root2, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph[align] – attributes does not matter', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p2 ) ).to.be.true;
			} );

			it( 'passes $root>div>div – in case of circular refs', () => {
				schema.register( '$root' );
				schema.register( 'div', {
					allowIn: [ '$root', 'div' ]
				} );

				const div = new Element( 'div' );
				root1.appendChildren( div );

				const div2 = new Element( 'div' );

				expect( schema.checkChild( div, div2 ) ).to.be.true;
			} );

			it( 'passes $root>div>div – in case of circular refs, when div1==div2', () => {
				schema.register( '$root' );
				schema.register( 'div', {
					allowIn: [ '$root', 'div' ]
				} );

				const div = new Element( 'div' );
				root1.appendChildren( div );

				expect( schema.checkChild( div, div ) ).to.be.true;
			} );

			it( 'rejects $root>paragraph – non-registered paragraph', () => {
				schema.register( '$root' );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>paragraph – registered different item', () => {
				schema.register( '$root' );
				schema.register( 'paragraph' );
				schema.register( 'listItem', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>paragraph – paragraph allowed in different context', () => {
				schema.register( '$root' );
				schema.register( '$fancyRoot' );
				schema.register( 'paragraph', {
					allowIn: '$fancyRoot'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph – since paragraph is only allowed in $root', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( r1bQ, r1bQp ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph – since paragraph is only allowed in $root v2', () => {
				schema.register( '$root' );
				schema.register( 'blockQuote', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( r1bQ, r1bQp ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph>$text - since paragraph is not allowed in blockQuote', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				schema.register( '$text', {
					allowIn: 'paragraph'
				} );

				expect( schema.checkChild( root1, r1bQp.getChild( 0 ) ) ).to.be.false;
			} );

			it( 'rejects $root>blockQuote>paragraph>$text - since blockQuote is not allowed in $root', () => {
				schema.register( '$root' );
				schema.register( 'blockQuote' );
				schema.register( 'paragraph', {
					allowIn: [ 'blockQuote', '$root' ]
				} );
				schema.register( '$text', {
					allowIn: 'paragraph'
				} );

				expect( schema.checkChild( root1, r1bQp.getChild( 0 ) ) ).to.be.false;
			} );
		} );

		describe( 'allowWhere cases', () => {
			it( 'passes $root>paragraph – paragraph inherits from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'supports the array syntax', () => {
				schema.register( '$root' );
				schema.register( '$root2' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( '$block2', {
					allowIn: '$root2'
				} );
				schema.register( 'paragraph', {
					allowWhere: [ '$block', '$block2' ]
				} );

				expect( schema.checkChild( root1, r1p1 ), '$root' ).to.be.true;
				expect( schema.checkChild( root2, r1p1 ), '$root2' ).to.be.true;
			} );

			// This checks if some inapropriate caching or preprocessing isn't applied by register().
			it( 'passes $root>paragraph – paragraph inherits from $block, order of definitions does not matter', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );
				schema.register( '$block', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph – paragraph inherits from $specialBlock which inherits from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( '$specialBlock', {
					allowWhere: '$block'
				} );
				schema.register( 'paragraph', {
					allowWhere: '$specialBlock'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'rejects $root>paragraph – paragraph inherits from $block but $block is not allowed in $root', () => {
				schema.register( '$root' );
				schema.register( '$block' );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );

			it( 'rejects $root>paragraph>$text – paragraph inherits from $block but $block is not allowed in $root', () => {
				schema.register( '$root' );
				schema.register( '$block' );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );
				schema.register( '$text', {
					allowIn: 'paragraph'
				} );

				expect( schema.checkChild( root1, r1p1.getChild( 0 ) ) ).to.be.false;
			} );
		} );

		describe( 'allowContentOf cases', () => {
			it( 'passes $root2>paragraph – $root2 inherits from $root', () => {
				schema.register( '$root' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );

				expect( schema.checkChild( root2, r1p1 ) ).to.be.true;
			} );

			it( 'supports the array syntax', () => {
				schema.register( '$root' );
				schema.register( '$root2' );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				schema.register( 'heading1', {
					allowIn: '$root2'
				} );
				schema.register( '$root3', {
					allowContentOf: [ '$root', '$root2' ]
				} );

				const root3 = new Element( '$root3' );
				const heading1 = new Element( 'heading1' );

				expect( schema.checkChild( root3, r1p1 ), 'paragraph' ).to.be.true;
				expect( schema.checkChild( root3, heading1 ), 'heading1' ).to.be.true;
			} );

			it( 'passes $root2>paragraph – $root2 inherits from $root, order of definitions does not matter', () => {
				schema.register( '$root' );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root2, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits content of $block', () => {
				schema.register( '$root' );
				schema.register( '$block' );
				schema.register( 'paragraph', {
					allowIn: '$root',
					allowContentOf: '$block'
				} );
				schema.register( '$text', {
					allowIn: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );

			it( 'passes $root>blockQuote>paragraph – blockQuote inherits content of $root', () => {
				schema.register( '$root' );
				schema.register( 'blockQuote', {
					allowIn: '$root',
					allowContentOf: '$root'
				} );
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( r1bQ, r1bQp ) ).to.be.true;
			} );

			it( 'rejects $root2>paragraph – $root2 inherits from $root, but paragraph is not allowed there anyway', () => {
				schema.register( '$root' );
				schema.register( 'paragraph' );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );

				expect( schema.checkChild( root2, r1p1 ) ).to.be.false;
			} );
		} );

		describe( 'mix of allowContentOf and allowWhere', () => {
			it( 'passes $root>paragraph>$text – paragraph inherits all from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowContentOf: '$block',
					allowWhere: '$block'
				} );
				schema.register( '$text', {
					allowIn: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );

			it( 'passes $root>paragraph and $root2>paragraph – where $root2 inherits content of $root' +
				'and paragraph inherits allowWhere from $block', () => {
				schema.register( '$root' );
				schema.register( '$root2', {
					allowContentOf: '$root'
				} );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					allowWhere: '$block'
				} );

				expect( schema.checkChild( root1, 'paragraph' ), 'root1' ).to.be.true;
				expect( schema.checkChild( root2, 'paragraph' ), 'root2' ).to.be.true;
			} );

			it( 'passes d>a where d inherits content of c which inherits content of b', () => {
				schema.register( 'b' );
				schema.register( 'a', { allowIn: 'b' } );
				schema.register( 'c', { allowContentOf: 'b' } );
				schema.register( 'd', { allowContentOf: 'c' } );

				const d = new Element( 'd' );

				expect( schema.checkChild( d, 'a' ) ).to.be.true;
			} );

			// This case won't pass becuase we compile the definitions in a pretty naive way.
			// To make chains like this work we'd need to repeat compilation of allowContentOf definitions
			// as long as the previous iteration found something to compile.
			// This way, even though we'd not compile d<-c in the first run, we'd still find b<-c
			// and since we've found something, we'd now try d<-c which would work.
			//
			// We ignore those situations for now as they are very unlikely to happen and would
			// significantly raised the complexity of definition compilation.
			//
			// it( 'passes d>a where d inherits content of c which inherits content of b', () => {
			// 	schema.register( 'b' );
			// 	schema.register( 'a', { allowIn: 'b' } );
			// 	schema.register( 'd', { allowContentOf: 'c' } );
			// 	schema.register( 'c', { allowContentOf: 'b' } );
			//
			// 	const d = new Element( 'd' );
			//
			// 	expect( schema.checkChild( d, 'a' ) ).to.be.true;
			// } );
		} );

		describe( 'inheritTypesFrom', () => {
			it( 'inherit properties of another item', () => {
				schema.register( '$block', {
					isBlock: true,
					isLimit: true
				} );
				schema.register( 'paragraph', {
					inheritTypesFrom: '$block'
				} );

				expect( schema.getDefinition( 'paragraph' ).isBlock ).to.be.true;
				expect( schema.getDefinition( 'paragraph' ).isLimit ).to.be.true;
			} );

			it( 'inherit properties of other items – support for arrays', () => {
				schema.register( '$block', {
					isBlock: true
				} );
				schema.register( '$block2', {
					isLimit: true
				} );
				schema.register( 'paragraph', {
					inheritTypesFrom: [ '$block', '$block2' ]
				} );

				expect( schema.getDefinition( 'paragraph' ).isBlock ).to.be.true;
				expect( schema.getDefinition( 'paragraph' ).isLimit ).to.be.true;
			} );

			it( 'does not override existing props', () => {
				schema.register( '$block', {
					isBlock: true,
					isLimit: true
				} );
				schema.register( 'paragraph', {
					inheritTypesFrom: '$block',
					isLimit: false
				} );

				expect( schema.getDefinition( 'paragraph' ).isBlock ).to.be.true;
				expect( schema.getDefinition( 'paragraph' ).isLimit ).to.be.false;
			} );
		} );

		describe( 'inheritAllFrom', () => {
			it( 'passes $root>paragraph – paragraph inherits allowIn from $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'paragraph inherit properties of $block', () => {
				schema.register( '$block', {
					isBlock: true
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.isBlock( r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits allowed content of $block', () => {
				schema.register( '$root' );
				schema.register( '$block', {
					allowIn: '$root'
				} );
				schema.register( '$text', {
					allowIn: '$block'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits allowIn from $block through $block\'s allowWhere', () => {
				schema.register( '$root' );
				schema.register( '$blockProto', {
					allowIn: '$root'
				} );
				schema.register( '$block', {
					allowWhere: '$blockProto'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.true;
			} );

			it( 'passes $root>paragraph>$text – paragraph inherits allowIn from $block through $block\'s allowWhere', () => {
				schema.register( '$root' );
				schema.register( '$blockProto' );
				schema.register( '$block', {
					allowContentOf: '$blockProto',
					allowIn: '$root'
				} );
				schema.register( '$text', {
					allowIn: '$blockProto'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( r1p1, r1p1.getChild( 0 ) ) ).to.be.true;
			} );
		} );

		// We need to handle cases where some independent features registered definitions which might use
		// optional elements (elements which might not have been registered).
		describe( 'missing structure definitions', () => {
			it( 'does not break when trying to check a child which is not registered', () => {
				schema.register( '$root' );

				expect( schema.checkChild( root1, 'foo404' ) ).to.be.false;
			} );

			it( 'does not break when trying to check registered child in a context which contains non-registered elements', () => {
				const foo404 = new Element( 'foo404' );

				root1.appendChildren( foo404 );

				schema.register( '$root' );
				schema.register( '$text', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( foo404, '$text' ) ).to.be.false;
			} );

			it( 'does not break when used allowedIn pointing to an non-registered element', () => {
				schema.register( '$root' );
				schema.register( '$text', {
					allowIn: 'foo404'
				} );

				expect( schema.checkChild( root1, '$text' ) ).to.be.false;
			} );

			it( 'does not break when used allowWhere pointing to an non-registered element', () => {
				schema.register( '$root' );
				schema.register( '$text', {
					allowWhere: 'foo404'
				} );

				expect( schema.checkChild( root1, '$text' ) ).to.be.false;
			} );

			it( 'does not break when used allowContentOf pointing to an non-registered element', () => {
				schema.register( '$root', {
					allowContentOf: 'foo404'
				} );
				schema.register( '$text', {
					allowIn: '$root'
				} );

				expect( schema.checkChild( root1, '$text' ) ).to.be.true;
			} );

			it( 'checks whether allowIn uses a registered element', () => {
				schema.register( 'paragraph', {
					allowIn: '$root'
				} );
				// $root isn't registered!

				expect( schema.checkChild( root1, 'paragraph' ) ).to.be.false;
			} );

			it( 'does not break when inheriting all from an non-registered element', () => {
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkChild( root1, r1p1 ) ).to.be.false;
			} );
		} );

		describe( 'allowAttributes', () => {
			it( 'passes paragraph[align]', () => {
				schema.register( 'paragraph', {
					allowAttributes: 'align'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );

			it( 'passes paragraph[align] and paragraph[dir] – support for array values', () => {
				schema.register( 'paragraph', {
					allowAttributes: [ 'align', 'dir' ]
				} );

				expect( schema.checkAttribute( r1p1, 'align' ), 'align' ).to.be.true;
				expect( schema.checkAttribute( r1p1, 'dir' ), 'dir' ).to.be.true;
			} );

			it( 'passes paragraph>$text[bold]', () => {
				schema.register( 'paragraph' );
				schema.register( '$text', {
					allowIn: 'paragraph',
					allowAttributes: 'bold'
				} );

				expect( schema.checkAttribute( r1p1.getChild( 0 ), 'bold' ) ).to.be.true;
			} );
		} );

		describe( 'allowAttributesOf', () => {
			it( 'passes paragraph[align] – paragraph inherits from $block', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( 'paragraph', {
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );

			it( 'passes paragraph[align] and paragraph[dir] – support for array values', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( '$block2', {
					allowAttributes: 'dir'
				} );
				schema.register( 'paragraph', {
					allowAttributesOf: [ '$block', '$block2' ]
				} );

				expect( schema.checkAttribute( r1p1, 'align' ), 'align' ).to.be.true;
				expect( schema.checkAttribute( r1p1, 'dir' ), 'dir' ).to.be.true;
			} );

			it( 'passes paragraph[align] and paragraph[dir] – support for combined allowAttributes and allowAttributesOf', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( 'paragraph', {
					allowAttributes: 'dir',
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ), 'align' ).to.be.true;
				expect( schema.checkAttribute( r1p1, 'dir' ), 'dir' ).to.be.true;
			} );

			// The support for allowAttributesOf is broken in the similar way as for allowContentOf (see the comment above).
			// However, those situations are rather theoretical, so we're not going to waste time on them now.
		} );

		describe( 'inheritAllFrom', () => {
			it( 'passes paragraph[align] – paragraph inherits attributes of $block', () => {
				schema.register( '$block', {
					allowAttributes: 'align'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );

			it( 'passes paragraph[align] – paragraph inherits attributes of $block through allowAttributesOf', () => {
				schema.register( '$blockProto', {
					allowAttributes: 'align'
				} );
				schema.register( '$block', {
					allowAttributesOf: '$blockProto'
				} );
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.true;
			} );
		} );

		describe( 'missing attribute definitions', () => {
			it( 'does not crash when checking an attribute of a non-registered element', () => {
				expect( schema.checkAttribute( r1p1, 'align' ) ).to.be.false;
			} );

			it( 'does not crash when inheriting attributes of a non-registered element', () => {
				schema.register( 'paragraph', {
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'whatever' ) ).to.be.false;
			} );

			it( 'does not crash when inheriting all from a non-registered element', () => {
				schema.register( 'paragraph', {
					allowAttributesOf: '$block'
				} );

				expect( schema.checkAttribute( r1p1, 'whatever' ) ).to.be.false;
			} );
		} );

		describe( 'missing types definitions', () => {
			it( 'does not crash when inheriting types of an non-registered element', () => {
				schema.register( 'paragraph', {
					inheritTypesFrom: '$block'
				} );

				expect( schema.getDefinition( 'paragraph' ) ).to.be.an( 'object' );
			} );
		} );
	} );

	describe( 'real scenarios', () => {
		let r1bQi, r1i, r1lI, r1h, r1bQlI;

		const definitions = [
			() => {
				schema.register( 'paragraph', {
					inheritAllFrom: '$block'
				} );
			},
			() => {
				schema.register( 'heading1', {
					inheritAllFrom: '$block'
				} );
			},
			() => {
				schema.register( 'listItem', {
					inheritAllFrom: '$block',
					allowAttributes: [ 'indent', 'type' ]
				} );
			},
			() => {
				schema.register( 'blockQuote', {
					allowWhere: '$block',
					allowContentOf: '$root'
				} );

				// Disallow blockQuote in blockQuote.
				schema.addChildCheck( ( ctx, childDef ) => {
					if ( childDef.name == 'blockQuote' && ctx.endsWith( 'blockQuote' ) ) {
						return false;
					}
				} );
			},
			() => {
				schema.register( 'image', {
					allowWhere: '$block',
					allowAttributes: [ 'src', 'alt' ],
					isObject: true,
					isBlock: true
				} );
			},
			() => {
				schema.register( 'caption', {
					allowIn: 'image',
					allowContentOf: '$block',
					isLimit: true
				} );
			},
			() => {
				schema.extend( '$text', {
					allowAttributes: [ 'bold', 'italic' ]
				} );

				// Disallow bold in heading1.
				schema.addAttributeCheck( ( ctx, attributeName ) => {
					if ( ctx.endsWith( 'heading1 $text' ) && attributeName == 'bold' ) {
						return false;
					}
				} );
			},
			() => {
				schema.extend( '$block', {
					allowAttributes: 'alignment'
				} );
			}
		];

		beforeEach( () => {
			schema.register( '$root', {
				isLimit: true
			} );
			schema.register( '$block', {
				allowIn: '$root',
				isBlock: true
			} );
			schema.register( '$text', {
				allowIn: '$block'
			} );

			for ( const definition of definitions ) {
				definition();
			}

			// or...
			//
			// Use the below code to shuffle the definitions.
			// Don't look here, Szymon!
			//
			// const definitionsCopy = definitions.slice();
			//
			// while ( definitionsCopy.length ) {
			// 	const r = Math.floor( Math.random() * definitionsCopy.length );
			// 	definitionsCopy.splice( r, 1 )[ 0 ]();
			// }

			root1 = new Element( '$root', null, [
				new Element( 'paragraph', null, 'foo' ),
				new Element( 'paragraph', { alignment: 'right' }, 'bar' ),
				new Element( 'listItem', { type: 'x', indent: 0 }, 'foo' ),
				new Element( 'heading1', null, 'foo' ),
				new Element( 'blockQuote', null, [
					new Element( 'paragraph', null, 'foo' ),
					new Element( 'listItem', { type: 'x', indent: 0 }, 'foo' ),
					new Element( 'image', null, [
						new Element( 'caption', null, 'foo' )
					] )
				] ),
				new Element( 'image', null, [
					new Element( 'caption', null, 'foo' )
				] )
			] );
			r1p1 = root1.getChild( 0 );
			r1p2 = root1.getChild( 1 );
			r1lI = root1.getChild( 2 );
			r1h = root1.getChild( 3 );
			r1bQ = root1.getChild( 4 );
			r1i = root1.getChild( 5 );
			r1bQp = r1bQ.getChild( 0 );
			r1bQlI = r1bQ.getChild( 1 );
			r1bQi = r1bQ.getChild( 2 );
		} );

		it( 'passes $root>paragraph', () => {
			expect( schema.checkChild( root1, 'paragraph' ) ).to.be.true;
		} );

		it( 'passes $root>paragraph>$text', () => {
			expect( schema.checkChild( r1p1, '$text' ), 'paragraph' ).to.be.true;
			expect( schema.checkChild( r1p2, '$text' ), 'paragraph[alignment]' ).to.be.true;
		} );

		it( 'passes $root>listItem', () => {
			expect( schema.checkChild( root1, 'listItem' ) ).to.be.true;
		} );

		it( 'passes $root>listItem>$text', () => {
			expect( schema.checkChild( r1lI, '$text' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>paragraph', () => {
			expect( schema.checkChild( r1bQ, 'paragraph' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>paragraph>$text', () => {
			expect( schema.checkChild( r1bQp, '$text' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>listItem', () => {
			expect( schema.checkChild( r1bQ, 'listItem' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>listItem>$text', () => {
			expect( schema.checkChild( r1bQlI, '$text' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>image', () => {
			expect( schema.checkChild( r1bQ, 'image' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>image>caption', () => {
			expect( schema.checkChild( r1bQi, 'caption' ) ).to.be.true;
		} );

		it( 'passes $root>blockQuote>image>caption>$text', () => {
			expect( schema.checkChild( r1bQi.getChild( 0 ), '$text' ) ).to.be.true;
		} );

		it( 'passes $root>image', () => {
			expect( schema.checkChild( root1, 'image' ) ).to.be.true;
		} );

		it( 'passes $root>image>caption', () => {
			expect( schema.checkChild( r1i, 'caption' ) ).to.be.true;
		} );

		it( 'passes $root>image>caption>$text', () => {
			expect( schema.checkChild( r1i.getChild( 0 ), '$text' ) ).to.be.true;
		} );

		it( 'rejects $root>$root', () => {
			expect( schema.checkChild( root1, '$root' ) ).to.be.false;
		} );

		it( 'rejects $root>$text', () => {
			expect( schema.checkChild( root1, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>caption', () => {
			expect( schema.checkChild( root1, 'caption' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>paragraph', () => {
			expect( schema.checkChild( r1p1, 'paragraph' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>paragraph>$text', () => {
			// Edge case because p>p should not exist in the first place.
			// But it's good to know that it blocks also this.
			const p = new Element( 'p' );
			r1p1.appendChildren( p );

			expect( schema.checkChild( p, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>$block', () => {
			expect( schema.checkChild( r1p1, '$block' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>blockQuote', () => {
			expect( schema.checkChild( r1p1, 'blockQuote' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>image', () => {
			expect( schema.checkChild( r1p1, 'image' ) ).to.be.false;
		} );

		it( 'rejects $root>paragraph>caption', () => {
			expect( schema.checkChild( r1p1, 'caption' ) ).to.be.false;
		} );

		it( 'rejects $root>blockQuote>blockQuote', () => {
			expect( schema.checkChild( r1bQ, 'blockQuote' ) ).to.be.false;
		} );

		it( 'rejects $root>blockQuote>caption', () => {
			expect( schema.checkChild( r1p1, 'image' ) ).to.be.false;
		} );

		it( 'rejects $root>blockQuote>$text', () => {
			expect( schema.checkChild( r1bQ, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>image>$text', () => {
			expect( schema.checkChild( r1i, '$text' ) ).to.be.false;
		} );

		it( 'rejects $root>image>paragraph', () => {
			expect( schema.checkChild( r1i, 'paragraph' ) ).to.be.false;
		} );

		it( 'rejects $root>image>caption>paragraph', () => {
			expect( schema.checkChild( r1i.getChild( 0 ), 'paragraph' ) ).to.be.false;
		} );

		it( 'rejects $root>image>caption>blockQuote', () => {
			expect( schema.checkChild( r1i.getChild( 0 ), 'blockQuote' ) ).to.be.false;
		} );

		it( 'accepts attribute $root>paragraph[alignment]', () => {
			expect( schema.checkAttribute( r1p1, 'alignment' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>paragraph>$text[bold]', () => {
			expect( schema.checkAttribute( r1p1.getChild( 0 ), 'bold' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>heading1>$text[italic]', () => {
			expect( schema.checkAttribute( r1h.getChild( 0 ), 'italic' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>blockQuote>paragraph>$text[bold]', () => {
			expect( schema.checkAttribute( r1bQp.getChild( 0 ), 'bold' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>listItem[alignment]', () => {
			expect( schema.checkAttribute( r1lI, 'alignment' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>listItem[indent]', () => {
			expect( schema.checkAttribute( r1lI, 'indent' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>listItem[type]', () => {
			expect( schema.checkAttribute( r1lI, 'type' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>image[src]', () => {
			expect( schema.checkAttribute( r1i, 'src' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>image[alt]', () => {
			expect( schema.checkAttribute( r1i, 'alt' ) ).to.be.true;
		} );

		it( 'accepts attribute $root>image>caption>$text[bold]', () => {
			expect( schema.checkAttribute( r1i.getChild( 0 ).getChild( 0 ), 'bold' ) ).to.be.true;
		} );

		it( 'rejects attribute $root[indent]', () => {
			expect( schema.checkAttribute( root1, 'indent' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>paragraph[indent]', () => {
			expect( schema.checkAttribute( r1p1, 'indent' ) ).to.be.false;
		} );

		it( 'accepts attribute $root>heading1>$text[bold]', () => {
			expect( schema.checkAttribute( r1h.getChild( 0 ), 'bold' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>paragraph>$text[alignment]', () => {
			expect( schema.checkAttribute( r1p1.getChild( 0 ), 'alignment' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>blockQuote[indent]', () => {
			expect( schema.checkAttribute( r1bQ, 'indent' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>blockQuote[alignment]', () => {
			expect( schema.checkAttribute( r1bQ, 'alignment' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>image[indent]', () => {
			expect( schema.checkAttribute( r1i, 'indent' ) ).to.be.false;
		} );

		it( 'rejects attribute $root>image[alignment]', () => {
			expect( schema.checkAttribute( r1i, 'alignment' ) ).to.be.false;
		} );

		it( '$root is limit', () => {
			expect( schema.isLimit( '$root' ) ).to.be.true;
			expect( schema.isBlock( '$root' ) ).to.be.false;
			expect( schema.isObject( '$root' ) ).to.be.false;
		} );

		it( 'paragraph is block', () => {
			expect( schema.isLimit( 'paragraph' ) ).to.be.false;
			expect( schema.isBlock( 'paragraph' ) ).to.be.true;
			expect( schema.isObject( 'paragraph' ) ).to.be.false;
		} );

		it( 'heading1 is block', () => {
			expect( schema.isLimit( 'heading1' ) ).to.be.false;
			expect( schema.isBlock( 'heading1' ) ).to.be.true;
			expect( schema.isObject( 'heading1' ) ).to.be.false;
		} );

		it( 'listItem is block', () => {
			expect( schema.isLimit( 'listItem' ) ).to.be.false;
			expect( schema.isBlock( 'listItem' ) ).to.be.true;
			expect( schema.isObject( 'listItem' ) ).to.be.false;
		} );

		it( 'image is block object', () => {
			expect( schema.isLimit( 'image' ) ).to.be.false;
			expect( schema.isBlock( 'image' ) ).to.be.true;
			expect( schema.isObject( 'image' ) ).to.be.true;
		} );

		it( 'caption is limit', () => {
			expect( schema.isLimit( 'caption' ) ).to.be.true;
			expect( schema.isBlock( 'caption' ) ).to.be.false;
			expect( schema.isObject( 'caption' ) ).to.be.false;
		} );
	} );
} );

describe( 'SchemaContext', () => {
	let root;

	beforeEach( () => {
		root = new Element( '$root', null, [
			new Element( 'blockQuote', { foo: 1 }, [
				new Element( 'paragraph', { align: 'left' }, [
					new Text( 'foo', { bold: true, italic: true } )
				] )
			] )
		] );
	} );

	describe( 'constructor()', () => {
		it( 'creates context based on an array of strings', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'a', 'b', 'c' ] );
			expect( ctx.getItem( 0 ).name ).to.equal( 'a' );

			expect( Array.from( ctx.getItem( 0 ).getAttributeKeys() ) ).to.be.empty;
			expect( ctx.getItem( 0 ).getAttribute( 'foo' ) ).to.be.undefined;
		} );

		it( 'creates context based on an array of elements', () => {
			const blockQuote = root.getChild( 0 );
			const text = blockQuote.getChild( 0 ).getChild( 0 );

			const ctx = new SchemaContext( [ blockQuote, text ] );

			expect( ctx.length ).to.equal( 2 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'blockQuote', '$text' ] );
			expect( ctx.getItem( 0 ).name ).to.equal( 'blockQuote' );

			expect( Array.from( ctx.getItem( 1 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'bold', 'italic' ] );
			expect( ctx.getItem( 1 ).getAttribute( 'bold' ) ).to.be.true;
		} );

		it( 'creates context based on a mixed array of strings and elements', () => {
			const blockQuote = root.getChild( 0 );
			const text = blockQuote.getChild( 0 ).getChild( 0 );

			const ctx = new SchemaContext( [ blockQuote, 'paragraph', text ] );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'blockQuote', 'paragraph', '$text' ] );
		} );

		it( 'creates context based on a root element', () => {
			const ctx = new SchemaContext( root );

			expect( ctx.length ).to.equal( 1 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root' ] );

			expect( Array.from( ctx.getItem( 0 ).getAttributeKeys() ) ).to.be.empty;
			expect( ctx.getItem( 0 ).getAttribute( 'foo' ) ).to.be.undefined;
		} );

		it( 'creates context based on a nested element', () => {
			const ctx = new SchemaContext( root.getChild( 0 ).getChild( 0 ) );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph' ] );

			expect( Array.from( ctx.getItem( 1 ).getAttributeKeys() ) ).to.deep.equal( [ 'foo' ] );
			expect( ctx.getItem( 1 ).getAttribute( 'foo' ) ).to.equal( 1 );
			expect( Array.from( ctx.getItem( 2 ).getAttributeKeys() ) ).to.deep.equal( [ 'align' ] );
			expect( ctx.getItem( 2 ).getAttribute( 'align' ) ).to.equal( 'left' );
		} );

		it( 'creates context based on a text node', () => {
			const ctx = new SchemaContext( root.getChild( 0 ).getChild( 0 ).getChild( 0 ) );

			expect( ctx.length ).to.equal( 4 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph', '$text' ] );

			expect( Array.from( ctx.getItem( 3 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'bold', 'italic' ] );
			expect( ctx.getItem( 3 ).getAttribute( 'bold' ) ).to.be.true;
		} );

		it( 'creates context based on a text proxy', () => {
			const text = root.getChild( 0 ).getChild( 0 ).getChild( 0 );
			const textProxy = new TextProxy( text, 0, 1 );
			const ctx = new SchemaContext( textProxy );

			expect( ctx.length ).to.equal( 4 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph', '$text' ] );

			expect( Array.from( ctx.getItem( 3 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'bold', 'italic' ] );
			expect( ctx.getItem( 3 ).getAttribute( 'bold' ) ).to.be.true;
		} );

		it( 'creates context based on a position', () => {
			const pos = Position.createAt( root.getChild( 0 ).getChild( 0 ) );
			const ctx = new SchemaContext( pos );

			expect( ctx.length ).to.equal( 3 );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ '$root', 'blockQuote', 'paragraph' ] );

			expect( Array.from( ctx.getItem( 2 ).getAttributeKeys() ).sort() ).to.deep.equal( [ 'align' ] );
		} );

		it( 'creates context based on a SchemaContext instance', () => {
			const previousCtx = new SchemaContext( [ 'a', 'b', 'c' ] );

			const ctx = new SchemaContext( previousCtx );

			expect( ctx ).to.equal( previousCtx );
		} );

		it( 'filters out DocumentFragment when it is a first item of context - array', () => {
			const ctx = new SchemaContext( [ new DocumentFragment(), 'paragraph' ] );

			expect( ctx.length ).to.equal( 1 );
			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'paragraph' ] );
		} );

		it( 'filters out DocumentFragment when it is a first item of context - element', () => {
			const p = new Element( 'paragraph' );
			const docFrag = new DocumentFragment();
			docFrag.appendChildren( p );

			const ctx = new SchemaContext( p );

			expect( ctx.length ).to.equal( 1 );
			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'paragraph' ] );
		} );

		it( 'filters out DocumentFragment when it is a first item of context - position', () => {
			const p = new Element( 'paragraph' );
			const docFrag = new DocumentFragment();
			docFrag.appendChildren( p );

			const ctx = new SchemaContext( new Position( docFrag, [ 0, 0 ] ) );

			expect( ctx.length ).to.equal( 1 );
			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'paragraph' ] );
		} );
	} );

	describe( 'length', () => {
		it( 'gets the number of items', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.length ).to.equal( 3 );
		} );
	} );

	describe( 'last', () => {
		it( 'gets the last item', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.last ).to.be.an( 'object' );
			expect( ctx.last.name ).to.equal( 'c' );
		} );
	} );

	describe( 'Symbol.iterator', () => {
		it( 'exists', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx[ Symbol.iterator ] ).to.be.a( 'function' );
			expect( Array.from( ctx ).map( item => item.name ) ).to.deep.equal( [ 'a', 'b', 'c' ] );
		} );
	} );

	describe( 'getItem()', () => {
		it( 'returns item by index', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.getItem( 1 ) ).to.be.an( 'object' );
			expect( ctx.getItem( 1 ).name ).to.equal( 'b' );
		} );

		it( 'returns undefined if index exceeds the range', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.getItem( 3 ) ).to.be.undefined;
		} );
	} );

	describe( 'addItem()', () => {
		it( 'adds new item at the top of the context #text', () => {
			const node = new Text( 'd' );

			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			ctx.addItem( node );

			expect( Array.from( ctx ).map( item => item.name ) ).to.deep.equal( [ 'a', 'b', 'c', '$text' ] );
		} );

		it( 'adds new item at the top of the context #string', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			ctx.addItem( 'd' );

			expect( Array.from( ctx ).map( item => item.name ) ).to.deep.equal( [ 'a', 'b', 'c', 'd' ] );
		} );

		it( 'adds new item at the top of the context #node', () => {
			const node = new Element( 'd' );

			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			ctx.addItem( node );

			expect( Array.from( ctx ).map( item => item.name ) ).to.deep.equal( [ 'a', 'b', 'c', 'd' ] );
		} );
	} );

	describe( 'getNames()', () => {
		it( 'returns an iterator', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( ctx.getNames().next ).to.be.a( 'function' );
		} );

		it( 'returns an iterator which returns all item names', () => {
			const ctx = new SchemaContext( [ 'a', 'b', 'c' ] );

			expect( Array.from( ctx.getNames() ) ).to.deep.equal( [ 'a', 'b', 'c' ] );
		} );
	} );

	describe( 'endsWith()', () => {
		it( 'returns true if the end of the context matches the query - 1 item', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.endsWith( 'dom' ) ).to.be.true;
		} );

		it( 'returns true if the end of the context matches the query - 2 items', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.endsWith( 'bom dom' ) ).to.be.true;
		} );

		it( 'returns true if the end of the context matches the query - full match of 3 items', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom' ] );

			expect( ctx.endsWith( 'foo bar bom' ) ).to.be.true;
		} );

		it( 'returns true if the end of the context matches the query - full match of 1 items', () => {
			const ctx = new SchemaContext( [ 'foo' ] );

			expect( ctx.endsWith( 'foo' ) ).to.be.true;
		} );

		it( 'returns true if not only the end of the context matches the query', () => {
			const ctx = new SchemaContext( [ 'foo', 'foo', 'foo', 'foo' ] );

			expect( ctx.endsWith( 'foo foo' ) ).to.be.true;
		} );

		it( 'returns false if query matches the middle of the context', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.endsWith( 'bom' ) ).to.be.false;
		} );

		it( 'returns false if query matches the start of the context', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.endsWith( 'foo' ) ).to.be.false;
		} );

		it( 'returns false if query does not match', () => {
			const ctx = new SchemaContext( [ 'foo', 'bar', 'bom', 'dom' ] );

			expect( ctx.endsWith( 'dom bar' ) ).to.be.false;
		} );

		it( 'returns false if query is longer than context', () => {
			const ctx = new SchemaContext( [ 'foo' ] );

			expect( ctx.endsWith( 'bar', 'foo' ) ).to.be.false;
		} );
	} );
} );
