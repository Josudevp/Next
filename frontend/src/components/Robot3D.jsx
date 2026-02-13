import Spline from '@splinetool/react-spline';
import '../App.css'

export default function Robot3D() {
  return (
    <div className="h-105 w-full flex justify-center items-center relative overflow-hidden">
      <div className="w-full h-[120%] absolute -top-[5%]">
        <Spline scene="https://prod.spline.design/9dHbiIYbbd-WCjPU/scene.splinecode" />
      </div>
    </div>
  );
}

