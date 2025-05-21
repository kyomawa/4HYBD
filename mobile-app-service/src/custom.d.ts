// src/custom.d.ts
import React from "react";

declare module "*.png" {
  const content: any;
  export default content;
}

declare module "react" {
  export type ComponentType<P = {}> = React.ComponentClass<P> | React.FunctionComponent<P>;
}

declare module "react-router-dom" {
  export interface RouteChildrenProps {
    location: any;
    history: any;
    match: any;
  }
}
