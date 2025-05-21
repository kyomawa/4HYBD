declare module "react" {
  export interface StatelessComponent<P = {}> extends React.ComponentType<P> {
    (props: P & { children?: React.ReactNode }, context?: any): React.ReactElement | null;
  }

  export interface FunctionComponent<P = {}> extends StatelessComponent<P> {}
  export type FC<P = {}> = FunctionComponent<P>;

  export interface ReactElement
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

  export interface Provider<T> {
    $$typeof: Symbol;
    props: ProviderProps<T>;
  }

  export interface ProviderProps<T> {
    value: T;
    children?: ReactNode;
  }

  export interface Context<T> {
    Provider: Provider<T>;
    Consumer: Consumer<T>;
    displayName?: string;
  }

  export interface Consumer<T> {
    $$typeof: Symbol;
    props: ConsumerProps<T>;
  }

  export interface ConsumerProps<T> {
    children: (value: T) => ReactNode;
  }

  export type Key = string | number;

  export interface JSXElementConstructor<P> {
    (props: P): ReactElement | null;
  }

  export function useState<T>(initialState: T | (() => T)): [T, (newState: T | ((prevState: T) => T)) => void];
  export function useEffect(effect: () => void | (() => void), deps?: readonly any[]): void;
  export function useContext<T>(context: Context<T>): T;
  export function useRef<T>(initialValue: T): { current: T };
  export function useReducer<R extends React.Reducer<any, any>, I>(
    reducer: R,
    initialArg: I,
    init?: (arg: I) => React.ReducerState<R>
  ): [React.ReducerState<R>, React.Dispatch<React.ReducerAction<R>>];
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly any[]): T;
  export function useMemo<T>(factory: () => T, deps: readonly any[] | undefined): T;
  export function createContext<T>(defaultValue: T): Context<T>;
  export function createRef<T>(): { current: T | null };

  export type Reducer<S, A> = (prevState: S, action: A) => S;
  export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  export type Dispatch<A> = (value: A) => void;

  export const Fragment: unique symbol;
  export const StrictMode: unique symbol;
  export const Suspense: JSXElementConstructor<{ fallback?: ReactNode }>;

  export type ComponentType<P = {}> = ComponentClass<P> | FunctionComponent<P>;
  export interface ComponentClass<P = {}, S = {}> {
    new(props: P, context?: any): Component<P, S>;
    displayName?: string;
    defaultProps?: Partial<P>;
    contextType?: Context<any>;
  }

  export class Component<P = {}, S = {}> {
    constructor(props: P, context?: any);
    setState<K extends keyof S>(
      state: ((prevState: Readonly<S>, props: Readonly<P>) => (Pick<S, K> | S | null)) | (Pick<S, K> | S | null),
      callback?: () => void
    ): void;
    forceUpdate(callback?: () => void): void;
    render(): ReactNode;
    readonly props: Readonly<P> & Readonly<{ children?: ReactNode }>;
    state: Readonly<S>;
    context: any;
    refs: {
      [key: string]: any;
    };
  }

  export const Children: {
    map<T, C>(children: C | C[], fn: (child: C, index: number) => T): C extends null | undefined ? C : Array<Exclude<T, boolean | null | undefined>>;
    forEach<C>(children: C | C[], fn: (child: C, index: number) => void): void;
    count(children: any): number;
    only<C>(children: C): C extends any[] ? never : C;
    toArray(children: ReactNode | ReactNode[]): Array<Exclude<ReactNode, boolean | null | undefined>>;
  };

  export function memo<P extends object>(
    Component: FunctionComponent<P>,
    propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
  ): FunctionComponent<P>;

  export function forwardRef<T, P = {}>(
    render: (props: P, ref: React.Ref<T>) => React.ReactElement | null
  ): React.ForwardRefExoticComponent<React.PropsWithoutRef<P> & React.RefAttributes<T>>;

  export type Ref<T> = { current: T | null } | ((instance: T | null) => void);
  export type LegacyRef<T> = string | Ref<T>;
  export type RefAttributes<T> = {
    ref?: Ref<T>;
  };
  export type PropsWithRef<P> = P & { ref?: React.Ref<any> };
  export type PropsWithoutRef<P> = P & { ref?: never };
  export type ForwardRefExoticComponent<P> = React.FunctionComponent<P> & {
    displayName?: string;
    defaultProps?: Partial<P>;
  };
}

declare module "react/jsx-runtime" {
  export default any;
  export const jsx: any;
  export const jsxs: any;
}