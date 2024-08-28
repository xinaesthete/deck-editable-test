# deck.gl EditableGeoJsonLayer Example

Figuring out the community `EditableGeoJsonLayer` in deck.gl.

This is now [deplyed to netlify](https://deckgl-editable-geojson.netlify.app/).

Some notes on things that may be worth patching in PRs... I anticipate using this layer fairly heavily in the near future, so may take on more of the maintenance of it.

## Current issues:

Changing luma.gl versions can at times cause weird shader error that is still being tracked down (https://github.com/visgl/luma.gl/issues/2222).

The typing of the `getCursor()` method potentially returning `null` caused a niggle with TS that I currently work-around by sub-classing `EditableGeoJsonLayer` and overriding that method.

`TransformMode` breaks due to behaviour inherited from `RotateMode` when `selectedFeatureIndexes` is empty `[]` - tries to `getGuides()`, ends up with `NaN` / `Infinity` and fails to catch that.

Passing `spector` or `debug` in `deviceProps` to `<DeckGL>` cause errors. Luma version 9.0.25 fixes the issue where even `deviceProps={{}}` would cause an error.