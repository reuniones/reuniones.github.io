var __env = {};

// Import variables if present (from env.js)
if (window) {
    Object.assign(__env, window.__env);
}


var app = angular.module('single-page-app', ['ngRoute']);

//app.config(function ($routeProvider, $locationProvider) {

//    $routeProvider
//        .when('/', {
//            templateUrl: 'inicio.html',
//            controller: mainController
//        })
//        .when('/predicacion', {
//            templateUrl: 'predicacion/predicacion.html',
//            controller: mainController
//        })
//        .when('/salidas', {
//            templateUrl: 'predicacion/salidas.html',
//            controller: mainController
//        })
//        .when('/predicacion', {
//            templateUrl: 'predicacion/predicacion.html',
//            controller: mainController
//        })
//        .when('/territorios', {
//            templateUrl: 'predicacion/territorios.html',
//            controller: mainController
//        })
//        .when('/informe', {
//            templateUrl: 'predicacion/informe.html',
//            controller: mainController
//        })
//        .when('/reuniones', {
//            templateUrl: 'reuniones/reuniones.html',
//            controller: mainController
//        })
//        .when('/vivo', {
//            templateUrl: 'reuniones/vivo.html',
//            controller: mainController
//        })
//        .when('/finde', {
//            templateUrl: 'reuniones/finde.html',
//            controller: mainController
//        })
//        .when('/semana', {
//            templateUrl: 'reuniones/semana.html',
//            controller: mainController
//        })
//        .when('/programa', {
//            templateUrl: 'reuniones/programa.html',
//            controller: mainController
//        });

//    // use the HTML5 History API
//    $locationProvider.html5Mode(true);
//});

// app.js



// Register environment in AngularJS as constant
app.constant('__env', __env);

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {


    $routeProvider
        .when('/', {
            templateUrl: __env.paginaInicio, title: 'Inicio'
        })
        .when('/predicacion', {
            templateUrl: 'predicacion/predicacion.html', title: 'Predicación'
        })
  .when('/salidas', {
      templateUrl: 'predicacion/salidas.html', title: 'Salidas al ministerio del campo'
  })
  .when('/territorios', {
      templateUrl: 'predicacion/territorios.html', title: 'Territorios'
  })
  .when('/informe', {
      templateUrl: 'predicacion/informe.html', title: 'Informe de predicación'
  })
  .when('/reuniones', {
      templateUrl: 'reuniones/reuniones.html', title: 'Reuniones'
  })
  .when('/vivo', {
      templateUrl: 'reuniones/emision.html', title: 'Emisión en directo'
  })
  .when('/finde', {
      templateUrl: 'reuniones/finde.html', title: 'Co. Churruarín'
  })
  .when('/semana', {
      templateUrl: 'reuniones/semana.html', title: 'Co. Churruarín'
  })

  .when('/programa', {
      templateUrl: 'reuniones/programa.html', title: 'Programa de las reuniones semanales'
  });

    //$locationProvider.html5Mode(true);

}]);

app.controller('AppCtrl', ['$scope', '__env', function ($scope, __env) {
    $scope.$on('$routeChangeSuccess', function (event, data) {
        $scope.pageTitle = __env.nombreCongregacion + ' - ' + data.title;
    });
}]);


app.controller('cfgController', function ($scope, __env) {

    $scope.congregacion = __env.nombreCongregacion; //"Co. Churruarín";
    $scope.urlfinde = "Hello world";
    $scope.mnuPredicacion = __env.mnuPredicacion;
    //$scope.mnuPredicacion = __env.Salidas;
    $scope.mnuSalidas = __env.mnuSalidas;
    $scope.mnuTerritorios = __env.mnuTerritorios;
    $scope.mnuInforme = __env.mnuInforme;
    $scope.mnuReuniones = __env.mnuReuniones;
    $scope.mnuPrograma = __env.mnuPrograma;
    $scope.mnuEmision = __env.mnuEmision;

});

//.controller('dummy', ['$scope', '$sce', function ($scope, $sce) {

//    $scope.url = $sce.trustAsResourceUrl('https://www.angularjs.org');

//    $scope.changeIt = function () {
//        $scope.url = $sce.trustAsResourceUrl('https://docs.angularjs.org/tutorial');
//    }
//}]);

app.controller('transmision', ['$scope', '$sce', '__env', function ($scope, $sce, __env) {
    var videosemana = __env.videoIdSemana //"x4a2fbi";
    var videofinde = __env.videoIdSemana //"x4jw7bs";
    var hoy = new Date();
    var videohoy
    if (hoy.getDay() == 6 || hoy.getDay() == 0) {
        videohoy = videosemana;
    } else {
        videohoy = videofinde;
    };

    var urldigestor1 = __env.videoUrlDigestor1; //"http://www.dailymotion.com/embed/video/";
    var urldigestor2 = __env.videoUrlDigestor2; //"?api=postMessage&id=player&syndication=lr:175159&autoplay=1&mute=0&info=0&logo=0&related=0&social=0&controls=1&quality=auto&html=1&chromeless=0&theme=dark";
    var urldigestor2Flash = __env.videoUrlDigestor2Flash; //"http://www.dailymotion.com/embed/video/";
    var videoUrlStream = __env.videoUrlStream
    $scope.urlvideo = $sce.trustAsResourceUrl(urldigestor1 + videohoy + urldigestor2);
    $scope.urlvideoflash = $sce.trustAsResourceUrl(urldigestor1 + videohoy + urldigestor2Flash);
    $scope.urlvideostream = videoUrlStream + videohoy;
    $scope.test = hoy.getDay()

}]);

app.controller('transmisionfull', ['$scope', '$sce', '__env', function ($scope, $sce, __env) {
    var videosemana = __env.videoIdSemana //"x4a2fbi";
    var videofinde = __env.videoIdSemana //"x4jw7bs";
    var hoy = new Date();
    var videohoy
    if (hoy.getDay() == 6 || hoy.getDay() == 0) {
        videohoy = videosemana;
    } else {
        videohoy = videofinde;
    };

    var urldigestor1 = __env.videoUrlDigestor1; //"http://www.dailymotion.com/embed/video/";
    var urldigestor2 = __env.videoUrlDigestor2; //"?api=postMessage&id=player&syndication=lr:175159&autoplay=1&mute=0&info=0&logo=0&related=0&social=0&controls=1&quality=auto&html=1&chromeless=0&theme=dark";
    var urldigestor2Flash = __env.videoUrlDigestor2Flash; //"http://www.dailymotion.com/embed/video/";
    var videoUrlStream = __env.videoUrlStream
    $scope.urlvideo = $sce.trustAsResourceUrl(urldigestor1 + videohoy + urldigestor2);
    $scope.urlvideoflash = $sce.trustAsResourceUrl(urldigestor1 + videohoy + urldigestor2Flash);
    $scope.urlvideostream = videoUrlStream + videohoy;
    var urlvideostream = videoUrlStream + videohoy;
    //$window.location.href = urlvideostream;

}]);

app.controller('programa', ['$scope', '$sce', '__env', function ($scope, $sce, __env) {
    $scope.urlPrograma = $sce.trustAsResourceUrl(__env.programaUrl1 + __env.programaIdSheets + __env.programaUrl2);
    $scope.urlProgramaDescargaPdf = $sce.trustAsResourceUrl(__env.programaUrl1 + __env.programaIdSheets + __env.programaUrlDescargaPdf);

}]);

app.controller('salidas', ['$scope', '$sce', '__env', function ($scope, $sce, __env) {
    $scope.urlSalidas = $sce.trustAsResourceUrl(__env.salidasUrl1 + __env.salidasIdSheets + __env.salidasUrl2);
   

}]);

app.controller('territorios', ['$scope', '__env', function ($scope, __env) {
    

    cartodb.createVis('$scope', 'https://abelbour.cartodb.com/api/v2/viz/b9ead05c-da2c-11e4-b0ec-0e853d047bba/viz.json', {
        shareable: true,
        title: false,
        description: false,
        search: false,
        tiles_loader: true,
        center_lat: -31.749299255325756,
        center_lon: -60.479693412780755,
        zoom: 15,
        cartodb_logo: false,
        mobile_layout: true,
        layer_selector: true
    })
.done(function (vis, layers) {
    // layer 0 is the base layer, layer 1 is cartodb layer
    // setInteraction is disabled by default
    layers[1].setInteraction(true);
    var sublayer = layers[1].getSubLayer(2);


    //layers[1].on('featureOver', function(e, latlng, pos, data) {
    //  cartodb.log.log(e, latlng, pos, data);
    //});
    // you can get the native map to work with it
    var map = vis.getNativeMap();
    // now, perform any operations you need
    // map.setZoom(3);
    // map.panTo([50.5, 30.5]);
})
.error(function (err) {
    console.log(err);
});


}]);


////var myApp = angular.module('myApp', []);
//app.value('mapId', 'map');
//app.value('tiles', 'http://{s}.tile.opencyclemap.org/cycle/{z}/{x}/{y}.png');

//app.value('layerData', {
//    user_name: 'eczajk1',
//    sublayers: [{
//        name: "sample data",
//        sql: "SELECT * FROM tl_2014_us_cd114 WHERE statefp = '24'",
//        cartocss: "#tl_2014_us_cd114{ polygon-fill: #FF6600; polygon-opacity: 0.7; line-color: #FFF; line-width: 1; line-opacity: 1;}"
//    }]
//});

//app.directive('map', function (mapId, tiles, layerData) {

//    return {

//        restrict: 'A',
//        template: '<div id="map"></div>',

//        link: function (scope, elm, attrs, controller) {

//            var map = L.map(mapId, {
//                zoom: 7,
//                minZoom: 6,
//                maxZoom: 19,
//                center: [39, -77],
//                zoomControl: false,
//            });
//            var tl = L.tileLayer(tiles);
//            tl.addTo(map);

//            cartodb.Tiles.getTiles(layerData, function (cdbtiles, err) {
//                if (cdbtiles == null) {
//                    console.log("error: ", err.errors.join('\n'));
//                    return;
//                }

//                L.tileLayer(cdbtiles.tiles[0]).addTo(map);
//            });
//        }
//    }
//});




//var cities = [
//    {
//        city : 'Toronto',
//        desc : 'This is the best city in the world!',
//        lat : 43.7000,
//        long : -79.4000
//    },
//    {
//        city : 'New York',
//        desc : 'This city is aiiiiite!',
//        lat : 40.6700,
//        long : -73.9400
//    },
//    {
//        city : 'Chicago',
//        desc : 'This is the second best city in the world!',
//        lat : 41.8819,
//        long : -87.6278
//    },
//    {
//        city : 'Los Angeles',
//        desc : 'This city is live!',
//        lat : 34.0500,
//        long : -118.2500
//    },
//    {
//        city : 'Las Vegas',
//        desc : 'Sin City...\'nuff said!',
//        lat : 36.0800,
//        long : -115.1522
//    }
//];

//Angular App Module and Controller

//app.controller('MapCtrl', function ($scope) {

//var mapOptions = {
//    zoom: 4,
//    center: new google.maps.LatLng(40.0000, -98.0000),
//    mapTypeId: google.maps.MapTypeId.TERRAIN
//}

//$scope.map = new google.maps.Map(document.getElementById('map'), mapOptions);

//$scope.markers = [];

//var infoWindow = new google.maps.InfoWindow();

//var createMarker = function (info){

//    var marker = new google.maps.Marker({
//        map: $scope.map,
//        position: new google.maps.LatLng(info.lat, info.long),
//        title: info.city
//    });
//    marker.content = '<div class="infoWindowContent">' + info.desc + '</div>';

//    google.maps.event.addListener(marker, 'click', function(){
//        infoWindow.setContent('<h2>' + marker.title + '</h2>' + marker.content);
//        infoWindow.open($scope.map, marker);
//    });

//    $scope.markers.push(marker);

//}  

//for (i = 0; i < cities.length; i++){
//    createMarker(cities[i]);
//}

//$scope.openInfoWindow = function(e, selectedMarker){
//    e.preventDefault();
//    google.maps.event.trigger(selectedMarker, 'click');
//}

//function initMap() {
//    var map = new google.maps.Map(document.getElementById('map'), {
//        center: {lat: -31.745740, lng: -60.489201},
//        zoom: 15
//    });

//    var layermanzanas = new google.maps.FusionTablesLayer({
//        query: {
//            select: '\'location\'',
//            from: '1pTZXlKgkn51RCRBQ4tbSEC4fMrBEg8sjyWBicoHF'
//        }
//    });

//    var layerterritorios = new google.maps.FusionTablesLayer({
//        query: {
//            select: '\'location\'',
//            from: '1cVMM0RmM9Es-JjIUMK0fsFMIvUastcPek-lTRgqh'
//        },
//        //styles: [{
//        //    polygonOptions: {
//        //        fillColor: '#00000000',
//        //        fillOpacity: 0,
//        //        strokeColor: "#rrggbb"
//        //    }
//        //}]
//    });

//    layermanzanas.setMap(map);
//    layerterritorios.setMap(map);

//});

