import { useMemo, useState, type CSSProperties, useCallback } from 'react';
import DeckGL, { ScatterplotLayer } from 'deck.gl';
import { MaskExtension } from '@deck.gl/extensions';
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
import { aggregateIndices, filterPoly } from './utils';
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
//EditableGeoJsonLayer extends EditableLayer<FeatureCollection, EditableGeojsonLayerProps<FeatureCollection>>
//type EditableGeojsonLayerProps<DataT = any> = EditableLayerProps & {
//  data: DataT;
//  ...
class PatchEditableGeoJsonLayer extends EditableGeoJsonLayer {
  static componentName = "PatchEditableGeoJsonLayer";
  getCursor({ isDragging }: { isDragging: boolean }) {
    return super.getCursor({ isDragging }) || 'grab'; //nb, somewhat forced by supertype not to use a different string
  }
}

function FeaturePanel({ 
  features, setFeatures, selectedFeatureIndexes, setSelectedFeatureIndexes, data, selectedDataIndices, setSelectedDataIndices
}: 
  { features: FeatureCollection, setFeatures: (features: FeatureCollection) => void, 
    selectedFeatureIndexes: number[], setSelectedFeatureIndexes: (indexes: number[]) => void,
    data: { x: Float32Array, y: Float32Array, size: Float32Array, length: number },
    selectedDataIndices: Uint32Array, setSelectedDataIndices: (indices: Uint32Array) => void
  }) {
  const numFeatures = features.features.length;
  return (
    <div className='feature-panel'>
      <div>Features: {numFeatures}</div>
      {features.features.map((feature, i) => (
        <div key={feature.id || i} className={selectedFeatureIndexes.includes(i) ? 'active' : ''}
        onMouseOver={() => setSelectedFeatureIndexes([i])}
        onMouseOut={() => setSelectedFeatureIndexes([])}
        onClick={() => {
          // const points = feature.geometry.coordinates[0] as [number, number][];
          // const t = Date.now();
          // setSelectedDataIndices(filterPoly(points, data.x, data.y));
          // console.log('filterPoly', points.length, Date.now()-t);
        }}
        >
          {feature.geometry.type}
          <input type='checkbox' checked={feature.properties?.visible} onChange={(e) => {
            const newFeatures = features.features.slice();
            newFeatures[i] = { ...feature, properties: { ...feature.properties, visible: e.target.checked } };
            setFeatures({ ...features, features: newFeatures });
          }} />
          <button type='button' onClick={() => {
            const newFeatures = features.features.slice();
            //this can be problematic where we rely on the index of the feature in the array
            //-- right now, we have a bug here, but not clear why as we rebuild the whole featureDataIndexMap...
            //-- the only sensible strategy is to have a unique id for each feature and use that as much as possible
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
  //35621990 - cells in adenoma dataset
  //806104 - cells in sample 10171
  //447042 - cillian run12
  const n = 1e6;
  const data = useMemo(() => {
    const { longitude, latitude } = INITIAL_VIEW_STATE;
    const r = () => (2*(Math.random()-0.5));
    // const p = () => [longitude + r()*0.2, latitude + r()*0.1] as [number, number];
    const x = new Float32Array(n).map(() => longitude + r()*0.2);
    const y = new Float32Array(n).map(() => latitude + r()*0.1);
    const size = new Float32Array(n).map(() => 5+Math.random()*10);
    // return new Array(447042).fill(0).map(() => ({ position: p(), size: 5+Math.random()*10 }));
    return { x, y, size, length: n };
  }, [n]);

  const [features, setFeaturesX] = useState<FeatureCollection>({
    type: 'FeatureCollection',
    features: []
  });  
  const [mode, setMode] = useState<DrawModes>(() => new DrawPolygonByDraggingMode());
  const [selectedFeatureIndexes, setSelectedFeatureIndexes] = useState<number[]>([]);
  const [selectedDataIndices, setSelectedDataIndices] = useState<Uint32Array>(new Uint32Array(0));
  const [featureDataIndexMap, setFeatureDataIndexMap] = useState<Map<number, Uint32Array>>(new Map());
  
  const setFeatures = useCallback((features: FeatureCollection, updatedIndexes?: number[]) => {
    setFeaturesX(features);
    return;
    if (updatedIndexes) {
      const newMap = new Map(featureDataIndexMap);
      for (const i of updatedIndexes) {
        const points = features.features[i].geometry.coordinates[0] as [number, number][];
        const indices = filterPoly(points, data.x, data.y);
        //XXX i is liable to be different if we've removed features, so we should probably use the feature id instead
        newMap.set(i, indices);
      }  
      const newIndices = aggregateIndices(features, newMap, n);
      setFeatureDataIndexMap(newMap);
      setSelectedDataIndices(newIndices);
    } else {
      // return;
      console.warn('No updated indexes provided... doing it the slow (and still wrong) way');
      // setSelectedDataIndices(filterFeatureCollection(features, data.x, data.y));
      const newMap = new Map();
      for (let i=0; i<features.features.length; i++) {
        const points = features.features[i].geometry.coordinates[0] as [number, number][];
        const indices = filterPoly(points, data.x, data.y);
        newMap.set(i, indices);
      }
      const newIndices = aggregateIndices(features, featureDataIndexMap, n);
      setSelectedDataIndices(newIndices);
      setFeatureDataIndexMap(newMap);
    }
  }, [n, data.x, data.y, featureDataIndexMap]);  

  
  const editLayer = new PatchEditableGeoJsonLayer({
    data: features,
    mode,
    selectedFeatureIndexes,
    onEdit: ({ updatedData, editContext, editType }) => {
      const featureIndexes = editContext.featureIndexes as number[];
      console.log('onEdit', editType, featureIndexes);
      for (const f of updatedData.features) {
        //would be nice to type our feature properties, even if in a somewhat ad-hoc way
        if (!Object.keys(f.properties).includes('visible')) f.properties.visible = true;
      }
      setFeatures(updatedData, featureIndexes);
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
      // ** maybe what we need to consider is having separate FeatureCollections for different types of features,
      // ** and then we can have a separate non-editable GeoJsonLayer for the 'invisible' / hidden features
      // if (features.features[pickingInfo.index]?.properties?.visible === false) return;
      
      // this logic is still not perfect in that if two objects overlap and we try to move the mouse from one to the other, 
      // the first one will not remain selected so the point we were aiming for will disappear... 
      // we could maybe fix this by only updating the selectedFeatureIndexes when we go out of the bounds of the current feature?
      setSelectedFeatureIndexes(pickingInfo.index !== -1 ? [pickingInfo.index] : []);
      // setSelectedFeatureIndexes(features.features.map((_, i) => i));
    },
    id: 'edit',
    operation: 'mask+draw', //what does this do? -- something useful...
    getFillColor: (feature, isSelected) => [isSelected ? 100 : 0, 100, 100, feature.properties?.visible ? 128 : 0],
    getLineWidth: 1,
    onClick(_pickingInfo, event) {
      console.log(event.type);
    },
    onDragStart() {
      // stop picking when dragging...
      // seems to make some logical sense, but is considered an error by deck.gl
      // "Picked non-existent layer. Is picking buffer corrupt?"
      // seems to me that _onpointermove should be checking for isDragging before calling getPicks()
      // setIsDragging(true);
    },
    onDragEnd() {
      // setIsDragging(false);
    },
    pickingRadius: 4,
    // pickable: !isDragging,
  });

  const scatterplotLayer = useMemo(() => {
    return new ScatterplotLayer({
      id: 'scatterplot-layer',
      data,
      getPosition: (_, {index}) => [data.x[index], data.y[index]], //todo use target array
      getRadius: (_, {index}) => data.size[index] * 0.5,
      getFillColor: [255, 255, 255],
      opacity: 0.1,
      pickable: false, // even though these are non-pickable, they still incur a performance cost mostly to do with the number of points & readPixels
    });
  }, [data]);
  const highlightLayer = useMemo(() => {
    return new ScatterplotLayer({
      id: 'highlight-layer',
      data,
      getPosition: (_, {index}) => [data.x[index], data.y[index]], //todo use target array
      getRadius: (_, {index}) => data.size[index] * 0.5,
      // data: selectedDataIndices,//.map(i => data[i]), //suboptimal
      // getPosition: i => [data.x[i], data.y[i]], //todo use target array
      // getRadius: i => data.size[i],
      getFillColor: [0, 255, 0],
      opacity: 0.5,
      pickable: false,
      maskId: 'edit',
      extensions: [new MaskExtension({ id: 'mask' })],
    });
  }, [selectedDataIndices, data]);
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
        layers={[
          scatterplotLayer, 
          highlightLayer,
          editLayer, 
        ]}
        getCursor={editLayer.getCursor.bind(editLayer)}
        // drawPickingColors={true}
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
      <FeaturePanel {...{features, setFeatures, selectedFeatureIndexes, setSelectedFeatureIndexes, data, selectedDataIndices, setSelectedDataIndices}} />
    </>
  );
}
