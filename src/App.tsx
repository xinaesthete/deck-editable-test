import { useMemo, useState, type CSSProperties } from 'react';
import DeckGL, { ScatterplotLayer } from 'deck.gl';
import {
  EditableGeoJsonLayer,
  DrawLineStringMode,
  DrawPolygonMode,
  DrawPolygonByDraggingMode,
  ModifyMode,
  TransformMode,
  TranslateMode,
  CompositeMode,
  type FeatureCollection,
  // type Feature //different Feature to the one in FeatureCollection???
} from '@deck.gl-community/editable-layers';
import 'mapbox-gl/dist/mapbox-gl.css';
import StaticMap from 'react-map-gl';
//7.319726 45.738033
const INITIAL_VIEW_STATE = {
  longitude: 7.319726,
  latitude: 45.738033,
  zoom: 13,
  pitch: 0,
  bearing: 0
};

const accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

type DrawModes = DrawPolygonMode | DrawLineStringMode | DrawPolygonByDraggingMode | CompositeMode;
class PatchEditableGeoJsonLayer extends EditableGeoJsonLayer {
  static componentName = "PatchEditableGeoJsonLayer";
  getCursor({ isDragging }: { isDragging: boolean }) {
    return super.getCursor({ isDragging }) || 'grab'; //nb, somewhat forced by supertype not to use a different string
  }
}

function FeaturePanel({ features, setFeatures, selectedFeatureIndexes, setSelectedFeatureIndexes }: 
  { features: FeatureCollection, setFeatures: (features: FeatureCollection) => void, 
    selectedFeatureIndexes: number[], setSelectedFeatureIndexes: (indexes: number[]) => void 
  }) {
  const numFeatures = features.features.length;
  return (
    <div className='feature-panel'>
      <div>Features: {numFeatures}</div>
      {features.features.map((feature, i) => (
        <div key={feature.id || i} className={selectedFeatureIndexes.includes(i) ? 'active' : ''}
        onMouseOver={() => setSelectedFeatureIndexes([i])}
        onMouseOut={() => setSelectedFeatureIndexes([])}
        >
          {feature.geometry.type}
          <input type='checkbox' checked={feature.properties?.visible} onChange={(e) => {
            const newFeatures = features.features.slice();
            newFeatures[i] = { ...feature, properties: { ...feature.properties, visible: e.target.checked } };
            setFeatures({ ...features, features: newFeatures });
          }} />
          <button type='button' onClick={() => {
            const newFeatures = features.features.slice();
            newFeatures.splice(i, 1);
            setFeatures({ ...features, features: newFeatures });
            setSelectedFeatureIndexes([]);
          }}>x</button>
        </div>
      ))}
    </div>
  );
}


export default function GeometryEditor() {
  const [features, setFeatures] = useState<FeatureCollection>({
    type: 'FeatureCollection',
    features: []
  });
  const [mode, setMode] = useState<DrawModes>(() => new DrawPolygonByDraggingMode());
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState<number[]>([]);

  const data = useMemo(() => {
    const { longitude, latitude } = INITIAL_VIEW_STATE;
    const p = () => [longitude + Math.random()*0.5 - 0.25, latitude + Math.random()*0.5 - 0.25];
    return new Array(1e6).fill(0).map(() => ({ position: p(), size: 5+Math.random()*10 }));
  }, []);

  const layer = new PatchEditableGeoJsonLayer({
    data: features,
    mode,
    selectedFeatureIndexes,
    onEdit: ({ updatedData }) => {
      // for (const i in featureIndexes) // lies, this is undefined
      for (const f of updatedData.features) {
        //would be nice to type our feature properties, even if in a somewhat ad-hoc way
        if (!Object.keys(f.properties).includes('visible')) f.properties.visible = true;
      }
      setFeatures(updatedData);
    },
    onHover(pickingInfo) {
      if (!(mode instanceof CompositeMode)) return;
      // we get a lot of warnings about 'selectedFeatureIndexes out of range' - why?
      // because when we hover over a point, the index is a value that relates to points within the feature
      // the only indices that are valid are those that relate to the features themselves...
      // also, the type of pickingInfo doesn't have a featureType property, so we cast it to any for now
      if ((pickingInfo as any).featureType === 'points') return;
      
      // -- try to avoid selecting invisible features
      // this doesn't work very well because it won't override the underlying picking logic, can't see how to make certain features unselectable
      // if (features.features[pickingInfo.index]?.properties?.visible === false) return;
      
      // this logic is still not perfect in that if two objects overlap and we try to move the mouse from one to the other, 
      // the first one will not remain selected so the point we were aiming for will disappear... 
      // we could maybe fix this by only updating the selectedFeatureIndexes when we go out of the bounds of the current feature?
      setSelectedFeatureIndexes(pickingInfo.index !== -1 ? [pickingInfo.index] : []);
      // setSelectedFeatureIndexes(features.features.map((_, i) => i));
    },
    operation: 'mask+draw', //what does this do?
    getFillColor: (feature, isSelected) => [isSelected ? 100 : 0, 100, 100, feature.properties?.visible ? 128 : 0],
    getLineWidth: 1,
    onClick(_pickingInfo, event) {
      console.log(event.type);
    },
  });

  const scatterplotLayer = useMemo(() => {
    return new ScatterplotLayer({
      id: 'scatterplot-layer',
      data,
      getRadius: d => d.size,
      getFillColor: [255, 0, 0],
      opacity: 0.25,
      // pickable: true,
    });
  }, [data]);
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
        layers={[scatterplotLayer, layer]}
        getCursor={layer.getCursor.bind(layer)}
      >
        <StaticMap 
        // accessToken={accessToken}
        mapboxAccessToken={accessToken}
        collectResourceTiming={false}
        mapStyle="mapbox://styles/mapbox/dark-v11"
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
          className={`button ${mode instanceof CompositeMode ? 'active' : ''}`}
          onClick={() => setMode(() => new CompositeMode([
            // new TransformMode(),
            new TranslateMode(),
            new ModifyMode(), 
          ]))}
        >
          Edit
        </button>
      </div>
      {/* <FeaturePanel features={features} selectedFeatureIndexes={selectedFeatureIndexes} setSelectedFeatureIndexes={setSelectedFeatureIndexes} /> */}
      <FeaturePanel {...{features, setFeatures, selectedFeatureIndexes, setSelectedFeatureIndexes}} />
    </>
  );
}
