export {};

declare global {
  interface Window {
    SelfieSegmentation: any;
    FaceMesh: any;
    Hands: any;
    Camera: any;
    cocoSsd: any;
    tf: any;
    drawConnectors: any;
    drawLandmarks: any;
    FACEMESH_TESSELATION: any;
    FACEMESH_CONTOURS: any;
    HAND_CONNECTIONS: any;
    cv: any;
  }
}
