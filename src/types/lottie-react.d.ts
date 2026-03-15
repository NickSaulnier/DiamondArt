declare module 'lottie-react' {
  import { type ComponentType } from 'react';

  interface LottieProps {
    animationData?: object;
    loop?: boolean;
    style?: React.CSSProperties;
  }

  const Lottie: ComponentType<LottieProps>;
  export default Lottie;
}
