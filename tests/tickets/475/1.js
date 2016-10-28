/**
 * @license Copyright (c) 2003-2016, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

import ClassicEditor from '/ckeditor5/editor-classic/classic.js';

import Feature from '/ckeditor5/core/feature.js';

import TreeWalker from '/ckeditor5/engine/model/treewalker.js';
import Position from '/ckeditor5/engine/model/position.js';
import Range from '/ckeditor5/engine/model/range.js';
import LivePosition from '/ckeditor5/engine/model/liveposition.js';

import buildModelConverter from '/ckeditor5/engine/conversion/buildmodelconverter.js';
import buildViewConverter from '/ckeditor5/engine/conversion/buildviewconverter.js';

import AttributeElement from '/ckeditor5/engine/view/attributeelement.js';

import Enter from '/ckeditor5/enter/enter.js';
import Typing from '/ckeditor5/typing/typing.js';
import Paragraph from '/ckeditor5/paragraph/paragraph.js';
import Undo from '/ckeditor5/undo/undo.js';

class Link extends Feature {
	init() {
		const editor = this.editor;
		const data = editor.data;
		const editing = editor.editing;

		// Allow bold attribute on all inline nodes.
		editor.document.schema.allow( { name: '$inline', attributes: [ 'link' ] } );

		// Build converter from model to view for data and editing pipelines.
		buildModelConverter().for( data.modelToView, editing.modelToView )
			.fromAttribute( 'link' )
			.toElement( ( href ) => new AttributeElement( 'a', { href } ) );

		// Build converter from view to model for data pipeline.
		buildViewConverter().for( data.viewToModel )
			.fromElement( 'a' )
			.toAttribute( ( viewElement ) => ( { key: 'link', value: viewElement.getAttribute( 'href' ) } ) );
	}
}

const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/;

class AutoLinker extends Feature {
	init() {
		this.editor.document.on( 'change', ( event, type, changes, batch ) => {
			if ( type != 'insert' ) {
				return;
			}

			for ( let value of changes.range.getItems( { singleCharacters: true } ) ) {
				const walker = new TreeWalker( {
					direction: 'backward',
					startPosition: Position.createAfter( value )
				} );

				const currentValue = walker.next().value;
				const text = currentValue.item.data;

				if ( !text ) {
					return;
				}

				let matchedUrl = urlRegex.exec( text );

				if ( !matchedUrl ) {
					return;
				}

				const doc = this.editor.document;
				const url = matchedUrl[ 0 ];
				const offset = _getLastPathPart( currentValue.nextPosition.path ) + matchedUrl.index;
				const livePos = LivePosition.createFromParentAndOffset( currentValue.item.parent, offset );

				doc.enqueueChanges( () => {
					const urlRange = Range.createFromPositionAndShift( livePos, url.length );
					batch.setAttribute( urlRange, 'link', url );
				} );
			}
		} );
	}
}

function _getLastPathPart( path ) {
	return path[ path.length - 1 ];
}

ClassicEditor.create( document.querySelector( '#editor' ), {
	features: [ Enter, Typing, Paragraph, Undo, Link, AutoLinker ],
	toolbar: [ 'undo', 'redo' ]
} );
