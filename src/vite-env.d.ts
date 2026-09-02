/// <reference types="vite/client" />

declare module "jstat" {
  export const jStat: {
    studentt: {
      cdf: (value: number, degreesOfFreedom: number) => number;
      inv: (probability: number, degreesOfFreedom: number) => number;
    };
    centralF: {
      cdf: (value: number, numeratorDegrees: number, denominatorDegrees: number) => number;
    };
    chisquare: {
      cdf: (value: number, degreesOfFreedom: number) => number;
    };
  };
}
