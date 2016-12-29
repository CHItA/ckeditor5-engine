/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals console:false, document */

import Document from 'ckeditor5-engine/src/view/document';
import { setData } from 'ckeditor5-engine/src/dev-utils/view';

const viewDocument = new Document();
viewDocument.createRoot( document.getElementById( 'editor' ) );

setData( viewDocument,
	'<container:p><attribute:b>foo</attribute:b>bar</container:p>' +
	'<container:p>bom</container:p>' );

viewDocument.on( 'selectionChange', ( evt, data ) => {
	console.log( data );
	viewDocument.selection.setTo( data.newSelection );
} );

viewDocument.render();
