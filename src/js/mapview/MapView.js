var turfcentroid = require('turf-centroid');

L.App = L.App || {};
L.App.MapView = L.Class.extend({

  statics: {},

  options: {},

  initialize: function(options) {
    console.log('app.mapview.MapView::initialize', arguments);

    L.setOptions(this, options);

    this.legendTemplate = '<li class="legendItem"><img width="{width}" height="{height}" src="data:{contentType};base64,{imageData}"><span>{label}</span></li>';

    this._map = null;
    this._setupMap();
  },

  _setupMap: function() {
    console.log('app.mapview.MapView::_setupMap', arguments);

    this._map = L.map('map', {
      zoomControl: false,
      minZoom: 9
    }).setView([48.6, -123.0], 11);

    this._createBasemapLayers();
    this._createOperationalLayers();
    this._setupConnections();

  },

  _setupConnections: function() {
    console.log('app.mapview.MapView::_setupConnections', arguments);

  },

  _createBasemapLayers: function() {
    console.log('app.mapview.MapView::_createBasemapLayers', arguments);

    this._baseLayers = null;

    var that = this;

    var aerialBasemap = L.esri.tiledMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/Basemaps/Aerials_2013_WM/MapServer',
      attribution: 'Pictometry International',
      useCors: false
    });

    var referenceOverlay = L.esri.tiledMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/Basemaps/Reference_Overlay_WM/MapServer',
      useCors: false
    });

    var compPlan = L.esri.dynamicMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/Polaris/ComprehensivePlan/MapServer',
      layers: [4,5,6],
      position: 'back',
      useCors: false
    });

    compPlan.legend(function(err, legend) {
      if(err) {
        humane.log('Error retrieiving legend for comprehensive plan');
      } else {
        var html = '<div class="legendContainer">';
        for(var i=0, len = legend.layers.length; i < len; i++) {
          html += '<ul>';
          if (compPlan.options.layers.indexOf(legend.layers[i].layerId) != -1){
            for(var j=0, jlen = legend.layers[i].legend.length; j < jlen; j++ ) {
              html += L.Util.template(that.legendTemplate, legend.layers[i].legend[j]);
            }
          }
          html += '</ul>';
        }
        html += '</div>';
        document.getElementById('compPlanLegend').innerHTML = html;
      }
    });

    var generalBasemap = L.esri.tiledMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/Basemaps/General_Basemap_WM/MapServer',
      attribution: 'San Juan County GIS',
      useCors: false
    });

    var criticalAreas = L.esri.dynamicMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/Habitat/Critical_Areas/MapServer',
      position: 'back',
      useCors: false
    });

    criticalAreas.legend(function(err, legend) {
      if(err) {
        humane.log('Error retrieving legend for critical areas');
      } else {
        var html = '<div class="legendContainer">';
        for(var i=0, len = legend.layers.length-1; i < len; i++) {
          html += '<ul>';
          for(var j=0, jlen = legend.layers[i].legend.length; j < jlen; j++ ) {
            html += L.Util.template(that.legendTemplate, legend.layers[i].legend[j]);
          }
          html += '</ul>';
        }
        html+= '</div>';
        document.getElementById('criticalAreasLegend').innerHTML = html;
      }
    });

    var imageryBasemap = L.layerGroup([aerialBasemap, referenceOverlay]);

    var criticalAreasBasemap = L.layerGroup([generalBasemap, criticalAreas]);


    this._baseLayers = {
      'Imagery': imageryBasemap,
      'Land Use': compPlan,
      'Critical Areas': criticalAreasBasemap
    };
    this._map.addLayer(imageryBasemap);

  },

  _createOperationalLayers: function() {
    console.log('app.mapview.MapView::_createOperationalLayers', arguments);

    var that = this;

    this._proposedChangeMarkers = L.geoJson(null, {
      onEachFeature: function(feature, layer) {
        layer.bindPopup(feature.properties);
        layer.options.clickable = false;
      }
    });

    L.esri.Tasks.query({
      url: 'http://sjcgis.org/arcgis/rest/services/SMP/Proposed_Shoreline_Designations/MapServer/3',
      proxy: 'http://sjcgis.org/proxy/proxy.ashx'
    }).simplify(this._map, 1).where('1=1').run(function (err, data, response) {
      var centroids = data.features.map(function(feature) {
        var properties = feature.properties;
        var centroid = turfcentroid(feature);
        centroid.properties = properties;
        return centroid;
      });
      data.features = centroids;
      that._proposedChangeMarkers.addData(data).addTo(that._map);
    });


    this._proposedDesigPoly = L.esri.dynamicMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/SMP/Proposed_Shoreline_Designations/MapServer',
      layers: [3,6,7],
      useCors: false,
      opacity: 0.6
    }).addTo(this._map);

    this._proposedDesigPoly.legend(function(err, legend) {
      if(err) {
        humane.log('Error retrieiving legend for proposed designations');
      } else {
        var html = '<div class="legendContainer">';
        for(var i=0, len = legend.layers.length; i < len; i++) {
          if (legend.layers[i].layerId === 7){
            html += '<ul>';
            for(var j=0, jlen = legend.layers[i].legend.length; j < jlen; j++ ) {
              html += L.Util.template(that.legendTemplate, legend.layers[i].legend[j]);
            }
            html += '</ul>';
          }
        }
        html += '</div>';
        document.getElementById('propDesigLegend').innerHTML = html;
      }
    });

    this._proposedDesigPoly.bindPopup(function(error, featureCollection) {
      if(error || featureCollection.features.length === 0) {
        return false;
      } else {
        var feature = featureCollection.features[0];
        return that.getPopupTemplate(feature);
      }
    });

    this._existDesigPoly = L.esri.dynamicMapLayer({
      url: 'http://sjcgis.org/arcgis/rest/services/SMP/Proposed_Shoreline_Designations/MapServer',
      layers: [10,11],
      useCors: false,
      opacity: 0.6
    });

    this._existDesigPoly.bindPopup(function(error, featureCollection) {
      if(error || featureCollection.features.length === 0) {
        return false;
      } else {
        var feature = featureCollection.features[0];
        return that.getPopupTemplate(feature);
      }
    });

  },

  getPopupTemplate: function(feature) {
    console.log('app.mapview.MapView::getPopupTemplate', arguments);

    var template;
    var refinedProperties = {
      change: feature.properties['ED Change'],
      reason: feature.properties['ED Change Reason'],
      PD: feature.properties['Proposed ED'],
      ED: feature.properties['Existing ED'],
      island: feature.properties.Island
    };
    if(refinedProperties.change === 'Yes') {
      template = '<p>Proposed Change from {ED} to {PD}</p>';
      template += '<p>Reason: {reason}</p>';
      template += '<p>Island: {island}</p>';
    } else {
      template = '<p>Designation: {ED}</p>';
      template += '<p>Island: {island}</p>';
    }
    return L.Util.template(template, refinedProperties);
  },

  getFeatureCentroid: function(feature) {
    console.log('app.mapview.MapView::getFeatureCentroid', arguments);



  },

  getLayerGroups: function() {
    console.log('app.mapview.MapView::getLayerGroups', arguments);

    var groupedOverlays = {
      "Shoreline Designations": {
        "Existing": this._existDesigPoly,
        "Proposed": this._proposedDesigPoly
      },
      "Markers": {
        "Proposed Changes": this._proposedChangeMarkers
      }
    };
    return groupedOverlays;
  },

  getBaseLayers: function() {
    console.log('app.mapview.MapView::getBaseLayers', arguments);

    return this._baseLayers;
  }
});
