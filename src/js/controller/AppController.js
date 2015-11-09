require('../mapview/MapView');
require('esri-leaflet-geocoder');
require('sidebar-v2/js/leaflet-sidebar');
require('leaflet-groupedlayercontrol');
var humane = require('humane-js');

L.App = L.App || {};

L.App.AppController = L.Class.extend({

  statics: {},

  options: {},

  initialize: function(options) {
    console.log('app.controller.AppController::initialize', arguments);
    L.setOptions(this, options);

    this.mapView = new L.App.MapView();

    this.searchControl = new L.esri.Geocoding.Controls.Geosearch({
      providers: [
        new L.esri.Geocoding.Controls.Geosearch.Providers.GeocodeService({
          url: 'http://sjcgis.org/arcgis/rest/services/Tools/Polaris_Geolocator/GeocodeServer',
          label: 'Polaris Geocoder',
          proxy: 'http://sjcgis.org/proxy/proxy.ashx'
        })
      ],
      useArcgisWorldGeocoder: false,
      mapAttribution: null,
      position: 'topright',
      useMapBounds: false
    }).addTo(this.mapView._map);

    this.results = new L.featureGroup().addTo(this.mapView._map);

    this.sidebar = new L.control.sidebar('sidebar').addTo(this.mapView._map);

    this.sidebar.open('home');

    var layerOptions = {
      exclusiveGroups: ["Shoreline Designations"]
    };

    var baseLayers = this.mapView.getBaseLayers();
    var layerGroups = this.mapView.getLayerGroups();

    this.layerControl = new L.control.groupedLayers(baseLayers, layerGroups, layerOptions);
    this.layerControl.addTo(this.mapView._map);

    this.setupConnections();
  },

  setupConnections: function() {
    console.log('app.controller.AppController::setupConnections', arguments);

    var that = this;

    var locationMarker = L.AwesomeMarkers.icon({
      icon: 'fa-thumb-tack',
      prefix: 'fa',
      markerColor: 'red',
      iconColor: 'white'
    });

    this.searchControl.on('results', function(data) {
      that.results.clearLayers();
      if(data.results.length === 0){
        humane.log('No results from search');
      } else {
        for(var i = data.results.length - 1; i >= 0; i--) {
          var marker = L.marker(data.results[i].latlng, {
            icon: locationMarker,
            title: data.results[i].text,
            clickable: true
          });
          that.results.addLayer(marker);
          marker.bindPopup(data.results[i].text).openPopup();
        }
      }
    });

    this.results.on('contextmenu', function(evt) {
      that.results.clearLayers();
    });

  }

});
