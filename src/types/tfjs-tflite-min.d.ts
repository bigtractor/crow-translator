// The ESM entry of @tensorflow/tfjs-tflite@0.0.1-alpha.10 imports
// "./tflite_web_api_client", which the package ships under wasm/ instead of
// dist/, so webpack cannot bundle it. The UMD build is self-contained, so we
// import that and reuse the package's own type definitions.
declare module "@tensorflow/tfjs-tflite/dist/tf-tflite.min.js" {
  export * from "@tensorflow/tfjs-tflite";
}
