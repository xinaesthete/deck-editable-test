import { useState } from 'react';
import DeckGL from 'deck.gl';
import {
  EditableGeoJsonLayer,
  DrawLineStringMode,
  DrawPolygonMode,
  type FeatureCollection
} from '@deck.gl-community/editable-layers';
import 'mapbox-gl/dist/mapbox-gl.css';
import StaticMap from 'react-map-gl';

const INITIAL_VIEW_STATE = {
  longitude: -122.41669,
  latitude: 37.7853,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type DrawModes = DrawPolygonMode | DrawLineStringMode;
class PatchEditableGeoJsonLayer extends EditableGeoJsonLayer {
  static componentName = "PatchEditableGeoJsonLayer";
  getCursor({ isDragging }: { isDragging: boolean }) {
    return super.getCursor({ isDragging }) || 'grab'; //nb, somewhat forced by supertype not to use a different string
  }
}


export default function GeometryEditor() {
  const [features, setFeatures] = useState<FeatureCollection>({
    type: 'FeatureCollection',
    features: []
  });
  const [mode, setMode] = useState<DrawModes>(() => new DrawPolygonMode());
  const [selectedFeatureIndexes] = useState([]);

  const layer = new PatchEditableGeoJsonLayer({
    data: features,
    mode,
    selectedFeatureIndexes,
    onEdit: ({ updatedData }) => {
      setFeatures(updatedData);
    }
  });

  return (
    <>
      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={{
          doubleClickZoom: false
        }}
        layers={[layer]}
        getCursor={layer.getCursor.bind(layer)}
      >
        <StaticMap 
        // accessToken={accessToken}
        mapboxAccessToken={accessToken}
        collectResourceTiming={false}
      />
      </DeckGL>

      <div className='controls'>
        <button
          className={`button ${mode instanceof DrawLineStringMode ? 'active' : ''}`}
          onClick={() => setMode(() => new DrawLineStringMode())}
        >
          Line
        </button>
        <button
          className={`button ${mode instanceof DrawPolygonMode ? 'active' : ''}`}
          onClick={() => setMode(() => new DrawPolygonMode())}
        >
          Polygon
        </button>
      </div>
    </>
  );
}
