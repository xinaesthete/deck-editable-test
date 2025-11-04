import { type Layer, LayerExtension, type UpdateParameters } from "@deck.gl/core";


export class ScatterDensityExtension extends LayerExtension {
  static get componentName(): string {
    return "ScatterDensityExtension";
  }
  getShaders(this: Layer<ScatterDensityExtension>, extension: this) {
    return {
      ...super.getShaders(extension), modules: [
        {
          name: "ScatterDensityExtension",
          uniformTypes: {
            opacity: "f32",
          },
          inject: {
            // todo - add a uniform for ~kernelSigma, use UBO for uniforms (previous version is broken).
            // todo - change picking behavior
            "fs:#decl": "uniform ScatterDensityExtensionUniforms { float opacity; } scatterDensity;",
            "fs:#main-end": `
                    //---- ScatterDensityExtension
                    const float e = 2.718281828459045;
                    float d = length(unitPosition);
                    // kernalSigma relates to dst in px in muspan, but denom uniform should be pre-computed
                    // kernel = np.exp(-( dst**2 / ( 2.0 * kernelSigma**2 ) ) )
                    // denom = 2*c^2 where c is the standard deviation / kernelSigma
                    // for muspan default kernelRadius=150, kernelSigma=50 => c = 1/3
                    // 2*(1/3)**2 => 0.222...
                    float _a = exp(-(d*d)/(0.222222222));
                    // should have an instance attribute for weight
                    fragColor.a = _a * scatterDensity.opacity;
                    //---- end ScatterDensityExtension
                    ////                    
                    `,
          },
        },
      ]
    };
  }
  updateState(this: Layer<ScatterDensityExtension>, params: UpdateParameters<Layer<ScatterDensityExtension>>) {
    const { props } = params;
    const { opacity } = props;
    for (const model of this.getModels()) {
      model.shaderInputs.setProps({
        "ScatterDensityExtension": {
          opacity,
        },
      });
    }
  }
}