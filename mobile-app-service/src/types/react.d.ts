declare module "react" {
  export interface StatelessComponent<P = {}> extends React.ComponentType<P> {
    (props: P & { children?: React.ReactNode }, context?: any): React.ReactElement | null;
  }

  export interface FunctionComponent<P = {}> extends StatelessComponent<P> {}
  export type FC<P = {}> = FunctionComponent<P>;

  export interface ReactElement<
    P = any,
    T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>
  > {
    type: T;
    props: P;
    key: Key | null;
  }

  export interface ReactNode {
    children?: ReactNode;
  }

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;

  export const Fragment: any;
}

declare module "react/jsx-runtime" {
  export default any;
  export const jsx: any;
  export const jsxs: any;
}
