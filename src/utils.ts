/**
 * @param {Array<[number, number]>} args
 */
export function filterPoly(args: [number, number][], xData: Float32Array, yData: Float32Array) {
    const points = args;
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
    const data1 = xData;
    const data2 = yData;
    const vs = points;

    const predicate = (i: number) => {
        const x = data1[i];
        const y = data2[i];
        let inside = false;
        if (x < minX || x > maxX || y < minY || y > maxY || Number.isNaN(x) || Number.isNaN(y)) {
            return false;
        }
        for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            const xi = vs[i][0];
            const yi = vs[i][1];
            const xj = vs[j][0];
            const yj = vs[j][1];

            const intersect = ((yi > y) !== (yj > y))
                && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    return new Uint32Array(data1.length).map((_, i) => i).filter(predicate);
}