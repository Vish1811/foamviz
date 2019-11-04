import React, { Component } from 'react';
import DeckGL from 'deck.gl';
import { AmbientLight, PointLight, LightingEffect } from '@deck.gl/core';
import { StaticMap } from 'react-map-gl';
import Geohash from 'latlon-geohash';
import { LayerControls, HEXAGON_CONTROLS } from './controls';
import { tooltipStyle } from './style';
import { renderLayers } from './deckgl-layers';

// Set your mapbox access token here
const MAPBOX_ACCESS_TOKEN =
  'pk.eyJ1IjoiaGthbWJvaiIsImEiOiJjazFkZnd2bWcwN2JnM25xcGNraDQxeW5kIn0.rGIXi0HRiNRTjgGYQCf_rg';

const ambientLight = new AmbientLight({
  color: [255, 255, 255],
  intensity: 1.0
});

const pointLight1 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-0.144528, 49.739968, 80000]
});

const pointLight2 = new PointLight({
  color: [255, 255, 255],
  intensity: 0.8,
  position: [-3.807751, 54.104682, 8000]
});

const lightingEffect = new LightingEffect({
  ambientLight,
  pointLight1,
  pointLight2
});

export default class App extends Component {
  constructor(props) {
    super(props);
    this.mapRef = React.createRef();
    this._getDataForCurrentViewport = this._getDataForCurrentViewport.bind(
      this
    );
    // this._getPointCoords = this._getPointCoords.bind(this);
    this._getValInUSD = this._getValInUSD.bind(this);
    this.state = {
      viewport: {
        longitude: -74,
        latitude: 40.7,
        zoom: 11,
        minZoom: 5,
        maxZoom: 16,
        pitch: 45,
        bearing: 0
      },
      hover: {
        x: 0,
        y: 0,
        hoveredObject: null
      },
      points: [],
      FOAMTokenInUSD: 0,
      settings: Object.keys(HEXAGON_CONTROLS).reduce(
        (accu, key) => ({
          ...accu,
          [key]: HEXAGON_CONTROLS[key].value
        }),
        {}
      ),
      style: 'mapbox://styles/mapbox/dark-v9'
    };
  }

  async componentDidMount() {
    const currBbox = {
      _ne: {
        lng: '-73.878593',
        lat: '40.790939'
      },
      _sw: {
        lng: '-74.028969',
        lat: '40.636102'
      }
    };
    this._fetchData(currBbox);
    this._setUserLocation();
    this.setState({
      FOAMTokenInUSD: await this._getValInUSD()
    });
  }

  _fetchData(bbox) {
    fetch(
      `https://map-api-direct.foam.space/poi/filtered?swLng=${bbox._sw.lng}&swLat=${bbox._sw.lat}&neLng=${bbox._ne.lng}&neLat=${bbox._ne.lat}&limit=10000&offset=0`
    )
      .then(result => result.json())
      .then(json => {
        const points = [];
        json.forEach((item, index) => {
          const temp = this._hexToDecimal(item.state.deposit);
          const pointCoords = this._getPointCoords(item.geohash);
          points[index] = {
            position: [
              parseFloat(pointCoords[0].toFixed(4)),
              parseFloat(pointCoords[1].toFixed(4))
            ],
            pickup: item[2],
            stakedvalue: temp
          };
        });
        this.setState({
          points
        });
      });
  }

  _setUserLocation() {
    navigator.geolocation.getCurrentPosition(position => {
      const newViewport = {
        ...this.state.viewport,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };
      this.setState({
        viewport: newViewport
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  _getPointCoords(geohash) {
    const coords = Geohash.decode(geohash);
    return [coords.lon, coords.lat, 0];
  }

  // eslint-disable-next-line class-methods-use-this
  _hexToDecimal(hex) {
    return parseInt(hex, 16) * Math.pow(10, -18);
  }

  // eslint-disable-next-line class-methods-use-this
  _getSumOfFoamTokens(points) {
    let sum = 0;
    points.forEach(item => {
      sum += item.stakedvalue;
    });
    return sum.toFixed(2);
  }

  // eslint-disable-next-line class-methods-use-this
  _getValInUSD() {
    return fetch('https://poloniex.com/public?command=returnTicker')
      .then(res => res.json())
      .then(json => {
        return Promise.resolve(json.USDC_BTC.last * json.BTC_FOAM.last);
      });
  }

  async _onHover({ x, y, object }) {
    if (object && object !== null && object !== undefined) {
      const details = {
        latitude: object.position[0],
        longitude: object.position[1],
        numOfPoints: (object.points && object.points.length) || 0,
        sumOfFoamTokens: this._getSumOfFoamTokens(object.points),
        sumValInUSD: (
          this._getSumOfFoamTokens(object.points) * this.state.FOAMTokenInUSD
        ).toFixed(2)
      };
      this.setState({ hover: { x, y, hoveredObject: object, details } });
    } else {
      this.setState({ hover: { x, y, hoveredObject: object } });
    }
  }

  _updateLayerSettings(settings) {
    this.setState({ settings });
  }

  _getDataForCurrentViewport() {
    const newBbox = this.mapRef.getMap().getBounds();
    const bbox = {
      _ne: {
        lng: newBbox._ne.lng,
        lat: newBbox._ne.lat
      },
      _sw: {
        lng: newBbox._sw.lng,
        lat: newBbox._sw.lat
      }
    };

    this._fetchData(bbox);
  }

  render() {
    const { hover, settings, points } = this.state;
    if (!points.length) {
      return null;
    }
    return (
      <div>
        {hover.details && (
          <div
            style={{
              ...tooltipStyle,
              transform: `translate(${hover.x}px, ${hover.y}px)`
            }}
          >
            <div className="">
              <div>Latitude: {hover.details.latitude}</div>
              <div>Longitude: {hover.details.longitude}</div>
              <div>POI's: {hover.details.numOfPoints}</div>
              <div>
                Accumulated sum of FOAM tokens: {hover.details.sumOfFoamTokens}
              </div>
              <div>
                Accumulated value of FOAM tokens: ${hover.details.sumValInUSD}
              </div>
            </div>
          </div>
        )}
        <LayerControls
          settings={settings}
          propTypes={HEXAGON_CONTROLS}
          onChange={settings => this._updateLayerSettings(settings)}
        />
        <DeckGL
          layers={renderLayers({
            data: this.state.points,
            onHover: hover => this._onHover(hover),
            settings
          })}
          effects={[lightingEffect]}
          initialViewState={{ ...this.state.viewport }}
          controller
          onDragEnd={this._getDataForCurrentViewport}
        >
          <StaticMap
            ref={map => (this.mapRef = map)}
            mapStyle={this.state.style}
            mapboxApiAccessToken={MAPBOX_ACCESS_TOKEN}
            onLoad={this._getDataForCurrentViewport}
          />
        </DeckGL>
      </div>
    );
  }
}
