// src/declarations.d.ts
import * as React from 'react';
import * as H from 'history';

declare module 'react-router-dom' {
  interface match<P> {
    params: P;
    isExact: boolean;
    path: string;
    url: string;
  }

  interface StaticContext {
    statusCode?: number;
  }

  interface RouteComponentProps
    P = {},
    C = StaticContext,
    S = H.LocationState
  > {
    history: H.History<S>,
    location: H.Location<S>,
    match: match<P>,
    staticContext?: C,
  }

  interface RouteProps {
    location?: H.Location;
    component?: React.ComponentType<RouteComponentProps<any>> | React.ComponentType<any>;
    render?: (props: RouteComponentProps<any>) => React.ReactNode;
    children?: ((props: RouteComponentProps<any>) => React.ReactNode) | React.ReactNode;
    path?: string | string[];
    exact?: boolean;
    sensitive?: boolean;
    strict?: boolean;
  }

  interface RedirectProps {
    to: H.LocationDescriptor | ((location: H.Location) => H.LocationDescriptor);
    push?: boolean;
    from?: string;
    path?: string;
    exact?: boolean;
    strict?: boolean;
  }

  class BrowserRouter extends React.Component<any> {}
  class HashRouter extends React.Component<any> {}
  class Router extends React.Component<any> {}
  class Route extends React.Component<RouteProps, any> {}
  class Redirect extends React.Component<RedirectProps, any> {}
  class Link extends React.Component<any> {}
  class NavLink extends React.Component<any> {}
  class Switch extends React.Component<any> {}
}