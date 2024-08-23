import type { FeatureCollection } from "@deck.gl-community/editable-layers";

export function filterPoly(points: [number, number][], xData: Float32Array, yData: Float32Array) {
    if (xData.length !== yData.length) throw new Error('xData and yData must have the same length');
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;
    for (const pt of points) {
        minX = Math.min(minX, pt[0]);
        maxX = Math.max(maxX, pt[0]);
        minY = Math.min(minY, pt[1]);
        maxY = Math.max(maxY, pt[1]);
    }

    const predicate = (i: number) => {
        const x = xData[i];
        const y = yData[i];
        let inside = false;
        if (x < minX || x > maxX || y < minY || y > maxY || Number.isNaN(x) || Number.isNaN(y)) {
            return false;
        }
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            const xi = points[i][0];
            const yi = points[i][1];
            const xj = points[j][0];
            const yj = points[j][1];

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    return new Uint32Array(xData.length).map((_, i) => i).filter(predicate);
}

/** this works, but is slow... */
export function filterFeatureCollection(fc: FeatureCollection, xData: Float32Array, yData: Float32Array) {
    const features = fc.features.filter(f => f.geometry.type === 'Polygon' && f.properties?.visible); //this could be more general
    // for now, we only support polygons because we assume the first element of the coordinates array is the outer ring(?)
    // ^^ above copilot comment is probably right - if there were more complex polygon topologies, we'd need to handle them differently
    // but this should work for all shapes that can be drawn with the ui as of now
    const selectedDataIndices = new Uint32Array(xData.length);
    let count = 0;
    for (const feature of features) {
        const points = feature.geometry.coordinates[0] as [number, number][];
        const indices = filterPoly(points, xData, yData);
        for (const index of indices) {
            selectedDataIndices[count++] = index;
        }
    }
    return selectedDataIndices.slice(0, count);
}