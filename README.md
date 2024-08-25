# deck.gl EditableGeoJsonLayer Example

Figuring out the community `EditableGeoJsonLayer` in deck.gl.

Some notes on things that may be worth patching in PRs... I anticipate using this layer fairly heavily in the near future, so may take on more of the maintenance of it.

## Current issues:

`@luma.gl/*@9.0.25` for some reason leads to shader linking errors; downgrading to `@luma.gl/*@9.0.24` fixes this.

The typing of the `getCursor()` method potentially returning `null` caused a niggle with TS that I currently work-around by sub-classing `EditableGeoJsonLayer` and overriding that method.

`TransformMode` breaks due to behaviour inherited from `RotateMode` when `selectedFeatureIndexes` is empty `[]` - tries to `getGuides()`, ends up with `NaN` / `Infinity` and fails to catch that.

As soon as any `deviceProps` are passed to `<DeckGL>` (even empty `{}`), we get errors `"deck: Cannot access 'WebGPUDevice' before initialization undefined"`.

Some of the luma documentation needs review, e.g.

### https://luma.gl/docs/api-reference/webgpu/ is inconsistent in referring to WebGL / WebGPU

To use a luma.gl WebGPU Device with raw WebGPU calls, the application needs to access the GPUDevice. The raw WebGPU handle is available on the WebGPUDevice subclass:

```ts
// @ts-expect-error
const gl = device.handle;
```

With a bit more work, typescript users can retrieve the WebGLRenderingContext without ignoring type errors:

```ts
import {Device, cast} from '@luma.gl/core';
import {WebGPUDevice} from '@luma.gl/webgpu'; // Installs the WebGPUDevice adapter

function f(device: Device) {
  const webgpuDevice = device as WebGPUDevice;
  const gpuDevice: GPUDevice = webgpuDevice.handle; // Get underlying WebGPU device
  ...
}
```

