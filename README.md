# deck.gl EditableGeoJsonLayer Example

Figuring out the community `EditableGeoJsonLayer` in deck.gl.

This is now [deplyed to netlify](https://deckgl-editable-geojson.netlify.app/).

Some notes on things that may be worth patching in PRs... I anticipate using this layer fairly heavily in the near future, so may take on more of the maintenance of it.

## Current issues:

`@luma.gl/*@9.0.25` for some reason leads to shader linking errors; downgrading to `@luma.gl/*@9.0.24` fixes this.

The typing of the `getCursor()` method potentially returning `null` caused a niggle with TS that I currently work-around by sub-classing `EditableGeoJsonLayer` and overriding that method.

`TransformMode` breaks due to behaviour inherited from `RotateMode` when `selectedFeatureIndexes` is empty `[]` - tries to `getGuides()`, ends up with `NaN` / `Infinity` and fails to catch that.

As soon as any `deviceProps` are passed to `<DeckGL>` (even empty `{}`), we get errors `"deck: Cannot access 'WebGPUDevice' before initialization undefined"`.

