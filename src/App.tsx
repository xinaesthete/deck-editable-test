import { useMemo, useState, type CSSProperties } from 'react';
import DeckGL from 'deck.gl';
import {
  EditableGeoJsonLayer,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawPolygonByDraggingMode,
  ModifyMode,
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

type DrawModes = DrawPolygonMode | DrawLineStringMode | DrawPolygonByDraggingMode | ModifyMode;
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
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState<number[]>([]);

  const layer = new PatchEditableGeoJsonLayer({
    data: features,
    mode,
    selectedFeatureIndexes,
    onEdit: ({ updatedData }) => {
      setFeatures(updatedData);
    },
    onHover(pickingInfo) {
      // we get a lot of warnings about 'selectedFeatureIndexes out of range' - why?
      // because when we hover over a point, the index is a value that relates to points within the feature
      // the only indices that are valid are those that relate to the features themselves...
      // also, the type of pickingInfo doesn't have a featureType property, so we cast it to any for now
      if ((pickingInfo as any).featureType === 'points') return;
      setSelectedFeatureIndexes(pickingInfo.index !== -1 ? [pickingInfo.index] : []);
      // setSelectedFeatureIndexes(features.features.map((_, i) => i));
    },
    getFillColor: () => [0, 100, 100, 128],
  });
  const controlStyle = useMemo(() => ({
    zIndex: 1,
    position: 'absolute',
    top: '1em',
    right: '1em',
  } as CSSProperties), []);
  const drawPoly = mode instanceof DrawPolygonMode && !(mode instanceof DrawPolygonByDraggingMode);
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

      <div className='controls' style={controlStyle}>
        <button
          className={`button ${mode instanceof DrawLineStringMode ? 'active' : ''}`}
          onClick={() => setMode(() => new DrawLineStringMode())}
        >
          Line
        </button>
        <button
          className={`button ${drawPoly ? 'active' : ''}`}
          onClick={() => setMode(() => new DrawPolygonMode())}
        >
          Polygon
        </button>
        <button
          className={`button ${mode instanceof DrawPolygonByDraggingMode ? 'active' : ''}`}
          onClick={() => setMode(() => new DrawPolygonByDraggingMode())}
        >
          Lasso
        </button>
        <button
          className={`button ${mode instanceof ModifyMode ? 'active' : ''}`}
          onClick={() => setMode(() => new ModifyMode())}
        >
          Edit
        </button>
      </div>
    </>
  );
}
