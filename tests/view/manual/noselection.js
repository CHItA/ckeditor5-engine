/**
 * @license Copyright (c) 2003-2015, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/* globals document */

import Document from 'ckeditor5/engine/view/document.js';
import { setData } from 'ckeditor5/engine/dev-utils/view.js';

const viewDocument = new Document();
viewDocument.createRoot( document.getElementById( 'editor' ) );

setData( viewDocument,
	'<container:p>foo</container:p>' +
	'<container:p>bar</container:p>' );

viewDocument.render();
