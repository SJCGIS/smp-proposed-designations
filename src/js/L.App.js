var L = require('leaflet');

require('drmonty-leaflet-awesome-markers');

// since leaflet is bundled into the browserify package it won't be able to detect where the images
// solution is to point it to where you host the the leaflet images yourself
L.Icon.Default.imagePath = 'img';

require('esri-leaflet');
require('esri-leaflet-legend');

require('./controller/AppController');
