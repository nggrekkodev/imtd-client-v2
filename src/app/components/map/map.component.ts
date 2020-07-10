import { Component, OnInit } from '@angular/core';
import { Router, Event } from '@angular/router';
import { IDropdownSettings } from 'ng-multiselect-dropdown';
import {
  typesWithID,
  sectorsWithID,
  departments,
  distances,
  cities,
  LocationForm,
} from '../../models/Location';
import { LocationService } from 'src/app/services/location.service';
import { compareCityName } from '../../utils/compare';
import {
  TYPE_ENTREPRISE,
  TYPE_FORMATION,
  TYPE_LABORATOIRE,
  TYPE_ASSOCIATION_INSTITUTION,
} from '../../models/Location';
import { popupHTML } from 'src/app/utils/popup';
import { getIcon } from '../../utils/getIcon';

import { tileLayer, latLng, circle, polygon, marker, icon } from 'leaflet';
import 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/images/marker-icon.png';
import * as L from 'leaflet';
import * as HDF from '../../utils/HautsDeFranceGeojson';

import { environment } from './../../../environments/environment';

const FRONTEND_URL = `${environment.frontendURL}/locations`;
const BACKEND_UPLOADS = `${environment.imtdUploads}`;

@Component({
  selector: 'app-map',
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
  readonly FRONTEND_URL: string = `${environment.frontendURL}/locations`;
  readonly BACKEND_UPLOADS: string = `${environment.imtdUploads}`;

  readonly TYPE_ENTREPRISE: string = TYPE_ENTREPRISE;
  readonly TYPE_FORMATION: string = TYPE_FORMATION;
  readonly TYPE_LABORATOIRE: string = TYPE_LABORATOIRE;
  readonly TYPE_ASSOCIATION_INSTITUTION: string = TYPE_ASSOCIATION_INSTITUTION;

  /**
   * Form Attributes
   */
  showForm: boolean = true;
  showResults: boolean = false;

  searchByDepartment: boolean = false;
  searchByArea: boolean = false;

  // Types Multiselect
  locationTypes = typesWithID;
  selectedTypes = [];
  typeDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'typeId',
    textField: 'typeText',
    selectAllText: 'Tout sélectionner',
    unSelectAllText: 'Tout désélectionner',
    allowSearchFilter: false,
  };

  // Sectors Multiselect
  locationSectors = sectorsWithID;
  selectedSectors = [];
  sectorDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'sectorId',
    textField: 'sectorText',
    selectAllText: 'Tout sélectionner',
    unSelectAllText: 'Tout désélectionner',
    allowSearchFilter: false,
  };

  // Deparments Multiselect
  locationDepartments = departments;
  selectedDepartments = [];
  DepartmentDropdownSettings: IDropdownSettings = {
    singleSelection: false,
    idField: 'departmentCode',
    textField: 'departmentName',
    selectAllText: 'Tout sélectionner',
    unSelectAllText: 'Tout désélectionner',
    allowSearchFilter: false,
  };

  // Distance Singleselect
  locationDistances = distances;
  selectedDistance = [];
  DistanceDropdownSettings: IDropdownSettings = {
    singleSelection: true,
    idField: 'distanceId',
    textField: 'distanceText',
    allowSearchFilter: false,
  };

  // City Singleselect
  locationCities = [...cities].sort(compareCityName);
  selectedCity = [];
  CityDropdownSettings: IDropdownSettings = {
    singleSelection: true,
    idField: 'cityId',
    textField: 'cityName',
    allowSearchFilter: false,
  };

  /**
   * Map attributes
   */
  map: L.Map;

  // Map options
  options = {
    layers: [
      L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        {
          // L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 16,
          // minZoom: 13,
          attribution: '',
        }
      ),
    ],
    zoom: 8,
    center: L.latLng(50, 2.8),
  };

  // Icons
  laboratoireIcon = {
    icon: L.icon({
      iconSize: [25, 41],
      iconAnchor: [10, 41],
      popupAnchor: [2, -40],
      // specify the path here
      iconUrl: 'assets/laboratoire.svg',
      shadowUrl:
        'https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png',
    }),
  };

  associationIcon = {
    icon: L.icon({
      iconSize: [25, 41],
      iconAnchor: [10, 41],
      popupAnchor: [2, -40],
      // specify the path here
      iconUrl: 'assets/institution.svg',
      shadowUrl:
        'https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png',
    }),
  };

  entrepriseIcon = {
    icon: L.icon({
      iconSize: [25, 41],
      iconAnchor: [10, 41],
      popupAnchor: [2, -40],
      // specify the path here
      iconUrl: 'assets/entreprise.svg',
      shadowUrl:
        'https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png',
    }),
  };

  formationIcon = {
    icon: L.icon({
      iconSize: [25, 41],
      iconAnchor: [10, 41],
      popupAnchor: [2, -40],
      // specify the path here
      iconUrl: 'assets/formation.svg',
      shadowUrl:
        'https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png',
    }),
  };

  defaultIcon = {
    icon: L.icon({
      iconSize: [25, 41],
      iconAnchor: [10, 41],
      popupAnchor: [2, -40],
      // specify the path here
      iconUrl: 'assets/marker.png',
      shadowUrl:
        'https://unpkg.com/leaflet@1.4.0/dist/images/marker-shadow.png',
    }),
  };

  departmentsPolygons: any = [];
  departmentsLayerGroup: L.LayerGroup;

  locations: LocationForm[] = []; // data
  activeLocations: LocationForm[] = []; // displayed locations
  selectedLocation: LocationForm;
  selectedMarkerLocation: LocationForm;

  markers: any = []; // markers
  activeMarkers: L.Marker[] = []; // displayed markers
  selectedMarker: L.Marker;
  selectedMarkerPopup: L.Marker;

  canRefreshMap: boolean = true;

  markersLayerGroup: L.LayerGroup; // layer group of markers
  activeMarkersLayerGroup: L.LayerGroup; // displayed layer group of markers
  selectedMarkerLayerGroup: L.LayerGroup;

  markerClusterData: any[] = [];
  markerClusterGroup = L.markerClusterGroup({});
  markerClusterOptions: L.MarkerClusterGroupOptions = {
    showCoverageOnHover: true,
    zoomToBoundsOnClick: true,
    polygonOptions: {
      weight: 1.0,
      color: '#007e42',
      opacity: 0.5,
      fill: true,
      fillColor: '#007e42',
      fillOpacity: 0.2,
    },
    spiderfyOnMaxZoom: true,
    iconCreateFunction: function (cluster) {
      return L.divIcon({
        className: 'cluster-icon',
        iconSize: [40, 40],
        html: `${cluster.getChildCount()}`,
      });
    },
  };

  constructor(
    private locationService: LocationService,
    private router: Router
  ) {}

  ngOnInit() {}

  onShowResults() {
    this.showResults = true;
    this.showForm = false;
  }

  onShowForm() {
    this.showForm = true;
    this.showResults = false;
  }

  onSelectSearchByDepartment() {
    if (this.searchByArea !== this.searchByDepartment) {
      this.searchByArea = !this.searchByArea;
    }
    this.searchByDepartment = !this.searchByDepartment;
  }

  onSelectSearchByArea() {
    if (this.searchByArea !== this.searchByDepartment) {
      this.searchByDepartment = !this.searchByDepartment;
    }
    this.searchByArea = !this.searchByArea;
  }

  onSubmit() {
    console.log(this.selectedTypes, this.selectedSectors);

    // Query parameter object
    const params = {};

    // Construct type[in] param
    if (this.selectedTypes.length > 0) {
      const types = [];
      this.selectedTypes.forEach((el) => types.push(el.typeText));
      params['type[in]'] = types.join(',');
    }

    // Construct sector[in] param
    if (this.selectedSectors.length > 0) {
      const sectors = [];
      this.selectedSectors.forEach((el) => sectors.push(el.sectorText));
      params['sectors[in]'] = sectors.join(',');
    }

    // Construct departmentName[in] param
    if (this.searchByDepartment && this.selectedDepartments.length > 0) {
      const departments = [];
      this.selectedDepartments.forEach((el) =>
        departments.push(el.departmentName)
      );
      params['departmentName[in]'] = departments.join(',');
    }

    // Construct position param
    if (
      this.searchByArea &&
      this.selectedDistance.length > 0 &&
      this.selectedCity.length > 0
    ) {
      // console.log(this.selectedDistance);
      // console.log(this.selectedCity);

      const city = cities.filter(
        (el) => el.cityId === this.selectedCity[0].cityId
      );
      const distance = distances.filter(
        (el) => el.distanceId === this.selectedDistance[0].distanceId
      );

      const position = `${distance[0].distanceValue},${city[0].cityLatitude},${city[0].cityLongitude}`;
      params['position'] = position;
    }

    console.log(params);

    this.locationService.getLocations(params).subscribe(
      (res) => {
        console.log(res);
        this.clearMarkers();
        this.locations = res.data;
        this.refreshMap();
        this.onShowResults();
      },
      (err) => {
        console.log(err);
      }
    );
  }

  onMapReady(map: L.Map) {
    this.map = map;

    // Department styling
    const style = {
      color: '#0094af',
      weight: 1,
      fillColor: '#0094af',
      fillOpacity: 0.05,
    };

    // Add departments to map
    new L.GeoJSON(HDF.Somme, { style: style }).addTo(map);
    new L.GeoJSON(HDF.Aisne, { style: style }).addTo(map);
    new L.GeoJSON(HDF.Nord, { style: style }).addTo(map);
    new L.GeoJSON(HDF.Oise, { style: style }).addTo(map);
    new L.GeoJSON(HDF.PasDeCalais, { style: style }).addTo(map);

    this.map
      .on('moveend', (event) => {
        // If a popup is opened and out of map, close it
        if (
          this.selectedMarker &&
          !this.map.getBounds().contains(this.selectedMarker.getLatLng())
        ) {
          // console.log('closepoup on moveend');
          this.closePopup();
        }
        // Refresh markers
        this.refreshMap();
      })
      .on('mouseout', (event) => {
        // console.log('mouseout');
        this.closePopup();
      });

    this.onSubmit();
  }

  markerClusterReady(markerCluster: L.MarkerClusterGroup) {
    this.markersLayerGroup = markerCluster;
  }

  getIcon(location: LocationForm) {
    let icon;
    switch (location.type) {
      case TYPE_ENTREPRISE:
        icon = this.entrepriseIcon;
        break;
      case TYPE_FORMATION:
        icon = this.formationIcon;
        break;
      case TYPE_LABORATOIRE:
        icon = this.laboratoireIcon;
        break;
      case TYPE_ASSOCIATION_INSTITUTION:
        icon = this.associationIcon;
        break;

      default:
        icon = this.defaultIcon;
        break;
    }
    return icon;
  }

  // Check if the location is withing the map view bounds
  isLocationInMapBounds(location, mapBounds) {
    return (
      location.latitude <= mapBounds.getNorth() &&
      location.latitude >= mapBounds.getSouth() &&
      location.longitude >= mapBounds.getWest() &&
      location.longitude <= mapBounds.getEast()
    );
  }

  // Refresh the visible markers on the map
  refreshMap() {
    if (!this.canRefreshMap) return;

    const mapBounds = this.map.getBounds();

    this.activeMarkers = [];
    this.activeLocations = [];

    setInterval(() => {}, 1);

    this.locations.forEach((location) => {
      const icon = this.getIcon(location);
      const popupText = popupHTML(location);

      if (this.isLocationInMapBounds(location, mapBounds)) {
        this.activeLocations.push(location);

        // VERSION 2
        const marker = L.marker([location.latitude, location.longitude], icon)
          // .on('click', (event) => {
          //   if (this.selectedMarker) {
          //     console.log('new marker');
          //   } else {
          //     console.log('not new maker');
          //   }
          //   // console.log('click');
          //   // console.log(event);
          //   // event.target.openPopup();
          // })
          .bindPopup(popupText, {
            autoPan: true,
            autoClose: false,
            // keepInView: true,
            // autoPanPadding: new L.Point(100, 100),
          })
          .on('popupopen', (popup) => {
            // console.log('popup opened !');
            this.canRefreshMap = false;
            this.selectedMarker = marker;
          })
          .on('popupclose', (popup) => {
            // console.log('popup closed !');
            this.selectedMarker = null;
            this.canRefreshMap = true;
            // this.refreshMap();
          });

        this.activeMarkers.push(marker);
      }
    });

    // With Cluster
    this.markerClusterData = this.activeMarkers;
  }

  navigateToLocation(location: LocationForm) {
    this.router.navigate([`/locations/${location._id}`]);
  }

  onClickListItem(event: MouseEvent) {
    const elem = event.target as HTMLElement;
    const target = elem.nextSibling as HTMLElement;
    if (target.classList.contains('show')) {
      target.classList.remove('show');
    } else {
      target.classList.add('show');
    }
    // console.log(elem);
    // console.log(target);
    // console.log(elem.nextSibling as HTMLElement );
    this.collapseAllItems();
  }

  onMouseResultsContainer() {
    // console.log('onMouseResultsContainer');
    this.closePopup();
  }

  onMouseEnterLocation(location: LocationForm) {
    // console.log('onMouseEnterLocation');
    this.markerClusterData = [];

    const popupText = popupHTML(location);
    const icon = this.getIcon(location);

    this.selectedMarker = L.marker(
      [location.latitude, location.longitude],
      icon
    ).bindPopup(popupText);

    this.markerClusterData = [this.selectedMarker];

    // const markers = [];
    // markers.push(this.selectedMarker);
    // this.selectedMarkerLayerGroup = L.layerGroup(markers);

    // this.map.addLayer(this.selectedMarkerLayerGroup);
  }

  onMouseLeaveLocation(location: LocationForm) {
    // this.collapseAllItems();
    // if (this.map.hasLayer(this.selectedMarkerLayerGroup))
    //   this.map.removeLayer(this.selectedMarkerLayerGroup);

    this.markerClusterData = this.activeMarkers;
  }

  // Collapse all uncollapsed item in list of results
  collapseAllItems() {
    document
      .querySelectorAll('.collapse')
      .forEach((el) => el.classList.remove('show'));
  }

  closePopup() {
    if (this.selectedMarker) {
      this.selectedMarker.closePopup();
      this.selectedMarker = null;
      this.canRefreshMap = true;
    }
  }

  reset() {
    this.clearForm();
    this.clearMarkers();
    this.refreshMap();
  }

  clearForm() {
    this.locations = [];
    this.activeLocations = [];
    this.selectedMarker = null;
    this.selectedCity = [];
    this.selectedDepartments = [];
    this.selectedDistance = [];
    this.selectedSectors = [];
    this.selectedTypes = [];
  }

  clearMarkers() {
    this.canRefreshMap = true;
    this.markerClusterData = [];
  }
}
